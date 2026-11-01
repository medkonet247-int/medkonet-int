CREATE TABLE public.universities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, university_type public.university_type NOT NULL, state text NOT NULL, location text NOT NULL, verification_status text NOT NULL DEFAULT 'Unverified' CHECK (verification_status IN ('Unverified','Verified')), active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), created_by uuid, updated_by uuid,
 CONSTRAINT university_name_length CHECK (char_length(trim(name)) BETWEEN 2 AND 200), CONSTRAINT university_state_length CHECK (char_length(trim(state)) BETWEEN 2 AND 100), CONSTRAINT university_location_length CHECK (char_length(trim(location)) BETWEEN 2 AND 160)
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.universities TO authenticated;
GRANT ALL ON public.universities TO service_role;
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
CREATE POLICY universities_admin ON public.universities FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE POLICY universities_member ON public.universities FOR SELECT TO authenticated USING(public.can_read_academic_content() AND verification_status='Verified' AND active);
CREATE UNIQUE INDEX universities_name_ci ON public.universities(lower(trim(name)));
CREATE INDEX universities_directory_filters ON public.universities(verification_status,active,university_type,state);
ALTER TABLE public.applications ADD COLUMN university_id uuid REFERENCES public.universities(id) ON DELETE RESTRICT;
CREATE INDEX applications_university_id ON public.applications(university_id);
CREATE INDEX applications_reporting_date ON public.applications(submitted_at);
CREATE TABLE public.representative_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT, application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE RESTRICT, status text NOT NULL DEFAULT 'Proposed' CHECK(status IN ('Proposed','Inactive')), assigned_at timestamptz, notes text NOT NULL DEFAULT '' CHECK(char_length(notes)<=2000), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.representative_assignments TO authenticated;
GRANT ALL ON public.representative_assignments TO service_role;
ALTER TABLE public.representative_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY representatives_admin_only ON public.representative_assignments FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
COMMENT ON TABLE public.representative_assignments IS 'Preparation only. No representative roles or permissions; no application surface reads or assigns records.';
CREATE FUNCTION public.university_audit_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
IF TG_OP='DELETE' THEN
 IF EXISTS(SELECT 1 FROM public.applications WHERE university_id=OLD.id) OR EXISTS(SELECT 1 FROM public.representative_assignments WHERE university_id=OLD.id) THEN RAISE EXCEPTION 'Deactivate a linked university instead'; END IF;
 INSERT INTO public.audit_log(actor_id,action,target_id,details) VALUES(auth.uid(),'university_deleted',OLD.id,jsonb_build_object('old',to_jsonb(OLD))); RETURN OLD;
END IF;
NEW.name:=trim(NEW.name); NEW.state:=trim(NEW.state); NEW.location:=trim(NEW.location); NEW.updated_at:=now(); NEW.updated_by:=auth.uid();
IF TG_OP='INSERT' THEN NEW.created_at:=now(); NEW.created_by:=auth.uid(); ELSE NEW.created_at:=OLD.created_at; NEW.created_by:=OLD.created_by; END IF;
INSERT INTO public.audit_log(actor_id,action,target_id,details) VALUES(auth.uid(),CASE WHEN TG_OP='INSERT' THEN 'university_created' WHEN NEW.active IS DISTINCT FROM OLD.active THEN CASE WHEN NEW.active THEN 'university_reactivated' ELSE 'university_deactivated' END WHEN NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN CASE WHEN NEW.verification_status='Verified' THEN 'university_verified' ELSE 'university_unverified' END ELSE 'university_edited' END,NEW.id,jsonb_build_object('old',CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,'new',to_jsonb(NEW))); RETURN NEW; END $$;
CREATE TRIGGER university_audit BEFORE INSERT OR UPDATE OR DELETE ON public.universities FOR EACH ROW EXECUTE FUNCTION public.university_audit_guard();
CREATE OR REPLACE FUNCTION public.applications_review_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF auth.uid() IS NULL THEN RETURN NEW; END IF;
IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
IF (NEW.user_id,NEW.full_name,NEW.email,NEW.whatsapp_number,NEW.university,NEW.university_type,NEW.state,NEW.course,NEW.current_level,NEW.reason_for_joining,NEW.submitted_at) IS DISTINCT FROM (OLD.user_id,OLD.full_name,OLD.email,OLD.whatsapp_number,OLD.university,OLD.university_type,OLD.state,OLD.course,OLD.current_level,OLD.reason_for_joining,OLD.submitted_at) THEN RAISE EXCEPTION 'Only review fields can be changed'; END IF;
IF NEW.university_id IS DISTINCT FROM OLD.university_id THEN
 INSERT INTO public.audit_log(actor_id,action,target_id,details) VALUES(auth.uid(),'university_application_matched',NEW.id,jsonb_build_object('from',OLD.university_id,'to',NEW.university_id,'typed_university',OLD.university));
 IF (NEW.application_status,NEW.reviewed_at,NEW.reviewed_by) IS NOT DISTINCT FROM (OLD.application_status,OLD.reviewed_at,OLD.reviewed_by) THEN RETURN NEW; END IF;
END IF;
NEW.reviewed_at:=now(); NEW.reviewed_by:=auth.uid();
IF NEW.application_status IS DISTINCT FROM OLD.application_status THEN
 INSERT INTO public.audit_log(actor_id,action,target_id,details) VALUES(auth.uid(),'application_'||lower(NEW.application_status::text),NEW.id,jsonb_build_object('from',OLD.application_status,'to',NEW.application_status));
 IF NEW.application_status='Approved' THEN INSERT INTO public.user_roles(user_id,role) VALUES(NEW.user_id,'member') ON CONFLICT DO NOTHING; ELSE DELETE FROM public.user_roles WHERE user_id=NEW.user_id AND role='member'; END IF;
END IF; RETURN NEW; END $$;
CREATE FUNCTION public.directory_universities(_q text DEFAULT '', _type text DEFAULT '', _state text DEFAULT '', _verification text DEFAULT '', _active text DEFAULT '', _page integer DEFAULT 1) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE admin boolean:=public.has_role(auth.uid(),'admin'); result jsonb; BEGIN
IF NOT admin AND NOT public.can_read_academic_content() THEN RAISE EXCEPTION 'Forbidden'; END IF;
IF _page<1 OR _page>100000 OR char_length(_q)>200 THEN RAISE EXCEPTION 'Invalid filter'; END IF;
WITH visible AS (SELECT u.* FROM public.universities u WHERE (admin OR (u.active AND u.verification_status='Verified'))), filtered AS (SELECT * FROM visible u WHERE (_q='' OR position(lower(_q) in lower(u.name))>0) AND (_type='' OR u.university_type::text=_type) AND (_state='' OR u.state=_state) AND (NOT admin OR _verification='' OR u.verification_status=_verification) AND (NOT admin OR _active='' OR u.active=(_active='Active'))), paged AS (SELECT * FROM filtered ORDER BY name,id LIMIT 12 OFFSET ((_page-1)*12)), rows AS (SELECT u.id,u.name,u.university_type,u.state,u.location,u.verification_status,u.active,CASE WHEN admin THEN (SELECT count(*) FROM public.applications a WHERE a.university_id=u.id AND a.application_status='Approved') ELSE NULL END AS approved_count,(SELECT count(*) FROM public.applications a JOIN public.membership_management m ON m.application_id=a.id WHERE a.university_id=u.id AND a.application_status='Approved' AND m.onboarded_at IS NOT NULL) AS onboarded_count FROM paged u)
SELECT jsonb_build_object('rows',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY name) FROM rows r),'[]'::jsonb),'total',(SELECT count(*) FROM filtered),'states',coalesce((SELECT jsonb_agg(s.state ORDER BY s.state) FROM (SELECT DISTINCT state FROM visible) s),'[]'::jsonb)) INTO result; RETURN result; END $$;
REVOKE ALL ON FUNCTION public.directory_universities(text,text,text,text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.directory_universities(text,text,text,text,text,integer) TO authenticated;
CREATE FUNCTION public.university_matching_queue(_q text DEFAULT '', _page integer DEFAULT 1) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
IF _page<1 OR char_length(_q)>200 THEN RAISE EXCEPTION 'Invalid filter'; END IF;
RETURN (WITH groups AS (SELECT university AS name,count(*) AS total FROM public.applications WHERE university_id IS NULL AND (_q='' OR position(lower(_q) in lower(university))>0) GROUP BY university) SELECT jsonb_build_object('rows',coalesce((SELECT jsonb_agg(to_jsonb(g)) FROM (SELECT * FROM groups ORDER BY name LIMIT 12 OFFSET ((_page-1)*12)) g),'[]'::jsonb),'total',(SELECT count(*) FROM groups))); END $$;
REVOKE ALL ON FUNCTION public.university_matching_queue(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.university_matching_queue(text,integer) TO authenticated;
CREATE FUNCTION public.match_university(_typed text, _university_id uuid DEFAULT NULL, _new jsonb DEFAULT NULL) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE uid uuid:=_university_id; changed integer; BEGIN
IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
IF _typed IS NULL OR char_length(_typed)>200 OR (_university_id IS NULL)=(_new IS NULL) THEN RAISE EXCEPTION 'Choose an existing or new university'; END IF;
PERFORM pg_advisory_xact_lock(hashtext(_typed));
IF NOT EXISTS(SELECT 1 FROM public.applications WHERE university_id IS NULL AND university=_typed) THEN RAISE EXCEPTION 'No unmatched applications remain'; END IF;
IF _new IS NOT NULL THEN INSERT INTO public.universities(name,university_type,state,location) VALUES(_typed,(_new->>'university_type')::public.university_type,_new->>'state',_new->>'location') RETURNING id INTO uid; END IF;
IF NOT EXISTS(SELECT 1 FROM public.universities WHERE id=uid AND active) THEN RAISE EXCEPTION 'Choose an active university'; END IF;
UPDATE public.applications SET university_id=uid WHERE university_id IS NULL AND university=_typed; GET DIAGNOSTICS changed=ROW_COUNT; RETURN changed; END $$;
REVOKE ALL ON FUNCTION public.match_university(text,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.match_university(text,uuid,jsonb) TO authenticated;
CREATE FUNCTION public.membership_reports(_from date DEFAULT NULL, _to date DEFAULT NULL, _period text DEFAULT 'month') RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE result jsonb; BEGIN
IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
IF (_from IS NOT NULL AND _to IS NOT NULL AND _from>_to) OR _period NOT IN ('week','month') THEN RAISE EXCEPTION 'Invalid date range'; END IF;
WITH scoped AS (SELECT a.*,m.onboarded_at FROM public.applications a LEFT JOIN public.membership_management m ON m.application_id=a.id WHERE (_from IS NULL OR a.submitted_at>=(_from::timestamp AT TIME ZONE 'Africa/Lagos')) AND (_to IS NULL OR a.submitted_at<((_to+1)::timestamp AT TIME ZONE 'Africa/Lagos'))), grouped AS (SELECT u.id,u.name,u.state,count(*) AS total,count(*) FILTER(WHERE a.application_status='Pending') AS pending,count(*) FILTER(WHERE a.application_status='Approved') AS approved,count(*) FILTER(WHERE a.application_status='Rejected') AS rejected,count(*) FILTER(WHERE a.application_status='Approved' AND a.onboarded_at IS NOT NULL) AS onboarded FROM scoped a JOIN public.universities u ON u.id=a.university_id GROUP BY u.id,u.name,u.state), unmatched AS (SELECT university AS name,count(*) AS total FROM scoped WHERE university_id IS NULL GROUP BY university), approvals AS (SELECT a.id,coalesce((SELECT min(l.created_at) FROM public.audit_log l WHERE l.target_id=a.id AND l.action='application_approved'),CASE WHEN a.application_status='Approved' THEN a.reviewed_at END) AS at FROM public.applications a), growth_events AS (SELECT date_trunc(_period,submitted_at AT TIME ZONE 'Africa/Lagos')::date AS period,count(*) AS applications,0::bigint AS approvals FROM scoped GROUP BY 1 UNION ALL SELECT date_trunc(_period,at AT TIME ZONE 'Africa/Lagos')::date,count(*),0::bigint FROM approvals WHERE false GROUP BY 1 UNION ALL SELECT date_trunc(_period,at AT TIME ZONE 'Africa/Lagos')::date,0::bigint,count(*) FROM approvals WHERE at IS NOT NULL AND (_from IS NULL OR at>=(_from::timestamp AT TIME ZONE 'Africa/Lagos')) AND (_to IS NULL OR at<((_to+1)::timestamp AT TIME ZONE 'Africa/Lagos')) GROUP BY 1), growth AS (SELECT period,sum(applications) AS applications,sum(approvals) AS approvals FROM growth_events GROUP BY period)
SELECT jsonb_build_object('total',(SELECT count(*) FROM scoped),'universities',(SELECT count(DISTINCT university_id) FROM scoped),'states',(SELECT count(DISTINCT state) FROM scoped),'unmatchedTotal',(SELECT count(*) FROM scoped WHERE university_id IS NULL),'rows',coalesce((SELECT jsonb_agg(to_jsonb(g) ORDER BY name) FROM grouped g),'[]'::jsonb),'unmatched',coalesce((SELECT jsonb_agg(to_jsonb(n) ORDER BY name) FROM unmatched n),'[]'::jsonb),'growth',coalesce((SELECT jsonb_agg(to_jsonb(g) ORDER BY period) FROM growth g),'[]'::jsonb)) INTO result; RETURN result; END $$;
REVOKE ALL ON FUNCTION public.membership_reports(date,date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.membership_reports(date,date,text) TO authenticated;
CREATE FUNCTION public.representative_preparation_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF; IF TG_OP='DELETE' THEN INSERT INTO public.audit_log(actor_id,action,target_id) VALUES(auth.uid(),'representative_preparation_deleted',OLD.id); RETURN OLD; END IF; NEW.updated_at:=now(); NEW.updated_by:=auth.uid(); INSERT INTO public.audit_log(actor_id,action,target_id) VALUES(auth.uid(),'representative_preparation_saved',NEW.id); RETURN NEW; END $$;
CREATE TRIGGER representative_preparation_audit BEFORE INSERT OR UPDATE OR DELETE ON public.representative_assignments FOR EACH ROW EXECUTE FUNCTION public.representative_preparation_guard();