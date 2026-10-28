CREATE TABLE public.content_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL CHECK (kind IN ('resources','events','mentorship','announcements')), title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200), description text NOT NULL DEFAULT '', published boolean NOT NULL DEFAULT false, published_at timestamptz, details jsonb NOT NULL DEFAULT '{}'::jsonb, file_path text UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.content_items TO authenticated;
GRANT ALL ON public.content_items TO service_role;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY content_admin_all ON public.content_items FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY content_member_published ON public.content_items FOR SELECT TO authenticated USING (published AND public.is_approved_member(auth.uid()));
CREATE INDEX content_kind_publish_date ON public.content_items(kind,published,published_at DESC);
CREATE INDEX content_search ON public.content_items USING gin(to_tsvector('english',title || ' ' || description));
CREATE TABLE public.resource_categories (name text PRIMARY KEY CHECK(length(trim(name)) BETWEEN 1 AND 100));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.resource_categories TO authenticated;
GRANT ALL ON public.resource_categories TO service_role;
ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY categories_admin ON public.resource_categories FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE POLICY categories_member ON public.resource_categories FOR SELECT TO authenticated USING(public.is_approved_member(auth.uid()));
ALTER TABLE public.membership_settings ADD COLUMN show_whatsapp_to_members boolean NOT NULL DEFAULT false;
CREATE FUNCTION public.content_audit_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE item public.content_items; act text; BEGIN IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF; IF TG_OP='DELETE' THEN item:=OLD; act:='content_deleted'; ELSE NEW.updated_at:=now(); IF NEW.published AND (TG_OP='INSERT' OR NOT OLD.published) THEN NEW.published_at:=now(); END IF; item:=NEW; act:=CASE WHEN TG_OP='INSERT' THEN 'content_created' WHEN NEW.published IS DISTINCT FROM OLD.published THEN CASE WHEN NEW.published THEN 'content_published' ELSE 'content_unpublished' END ELSE 'content_edited' END; END IF; INSERT INTO public.audit_log(actor_id,action,target_id,details) VALUES(auth.uid(),act,item.id,jsonb_build_object('kind',item.kind,'title',item.title,'published',item.published)); IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END $$;
CREATE TRIGGER content_audit BEFORE INSERT OR UPDATE OR DELETE ON public.content_items FOR EACH ROW EXECUTE FUNCTION public.content_audit_guard();
CREATE POLICY academic_files_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='academic-resources' AND (public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.content_items c WHERE c.file_path=name AND c.published AND public.is_approved_member(auth.uid()))));
CREATE FUNCTION public.set_member_whatsapp_visibility(_show boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF; INSERT INTO public.membership_settings(id,show_whatsapp_to_members) VALUES(true,_show) ON CONFLICT(id) DO UPDATE SET show_whatsapp_to_members=_show,updated_at=now(),updated_by=auth.uid(); END $$;
REVOKE ALL ON FUNCTION public.set_member_whatsapp_visibility(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_member_whatsapp_visibility(boolean) TO authenticated;
CREATE FUNCTION public.approved_whatsapp_link() RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT public.is_approved_member(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF; RETURN (SELECT whatsapp_link FROM public.membership_settings WHERE id AND show_whatsapp_to_members); END $$;
REVOKE ALL ON FUNCTION public.approved_whatsapp_link() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.approved_whatsapp_link() TO authenticated;