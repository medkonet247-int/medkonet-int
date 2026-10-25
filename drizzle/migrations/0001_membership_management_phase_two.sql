CREATE TABLE public.membership_settings (id boolean PRIMARY KEY DEFAULT true CHECK(id), whatsapp_link text NOT NULL DEFAULT '', invitation_template text NOT NULL DEFAULT '', registration_open boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid);
GRANT SELECT, INSERT, UPDATE ON public.membership_settings TO authenticated;
GRANT ALL ON public.membership_settings TO service_role;
ALTER TABLE public.membership_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage settings" ON public.membership_settings FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.membership_management (application_id uuid PRIMARY KEY REFERENCES public.applications(id) ON DELETE CASCADE, rejection_reason text NOT NULL DEFAULT '', invited_at timestamptz, invited_by uuid, onboarded_at timestamptz, onboarded_by uuid, CHECK ((invited_at IS NULL) = (invited_by IS NULL)), CHECK ((onboarded_at IS NULL) = (onboarded_by IS NULL)), CHECK (onboarded_at IS NULL OR invited_at IS NOT NULL));
GRANT SELECT ON public.membership_management TO authenticated;
GRANT ALL ON public.membership_management TO service_role;
ALTER TABLE public.membership_management ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read management" ON public.membership_management FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE INDEX applications_name_search ON public.applications (lower(full_name));
CREATE INDEX applications_email_search ON public.applications (lower(email));
CREATE INDEX applications_filters_submission ON public.applications (application_status, university, state, submitted_at DESC);
CREATE INDEX audit_log_created ON public.audit_log (created_at DESC);
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=_user_id AND r.role=_role AND (_role <> 'admin' OR EXISTS(SELECT 1 FROM auth.users u JOIN public.admin_allowlist a ON lower(a.email)=lower(u.email) WHERE u.id=_user_id AND u.email_confirmed_at IS NOT NULL))) $$;
CREATE FUNCTION public.registration_is_open() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT coalesce((SELECT registration_open FROM public.membership_settings WHERE id=true),true) $$;
REVOKE ALL ON FUNCTION public.registration_is_open() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registration_is_open() TO anon,authenticated,service_role;
CREATE FUNCTION public.member_onboarding_status() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.applications a JOIN public.membership_management m ON m.application_id=a.id WHERE a.user_id=auth.uid() AND a.application_status='Approved' AND m.onboarded_at IS NOT NULL) $$;
REVOKE ALL ON FUNCTION public.member_onboarding_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.member_onboarding_status() TO authenticated;
CREATE FUNCTION public.manage_membership(_action text, _target uuid DEFAULT NULL, _data jsonb DEFAULT '{}'::jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.applications; actor uuid:=auth.uid(); email_value text; subject uuid; old_status text; new_status public.application_status;
BEGIN
 IF actor IS NULL OR NOT public.has_role(actor,'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF _action IN ('review','invited','onboarded') THEN
 SELECT * INTO a FROM public.applications WHERE id=_target FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
 INSERT INTO public.membership_management(application_id) VALUES(_target) ON CONFLICT DO NOTHING;
 IF _action='review' THEN
 new_status:=(_data->>'status')::public.application_status;
 IF new_status NOT IN ('Approved','Rejected') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
 UPDATE public.applications SET application_status=new_status WHERE id=_target;
 UPDATE public.membership_management SET rejection_reason=CASE WHEN new_status='Rejected' THEN coalesce(_data->>'reason','') ELSE '' END,
 invited_at=CASE WHEN new_status='Approved' THEN invited_at ELSE NULL END, invited_by=CASE WHEN new_status='Approved' THEN invited_by ELSE NULL END,
 onboarded_at=CASE WHEN new_status='Approved' THEN onboarded_at ELSE NULL END, onboarded_by=CASE WHEN new_status='Approved' THEN onboarded_by ELSE NULL END WHERE application_id=_target;
 IF new_status=a.application_status THEN
 UPDATE public.applications SET reviewed_at=now(),reviewed_by=actor WHERE id=_target;
 END IF;
 INSERT INTO public.audit_log(actor_id,action,target_id,details) VALUES(actor,'decision_recorded',_target,jsonb_build_object('from',a.application_status,'to',new_status,'reason',coalesce(_data->>'reason','')));
 ELSE
 IF a.application_status<>'Approved' THEN RAISE EXCEPTION 'Approval required'; END IF;
 IF _action='invited' THEN
 IF coalesce((SELECT whatsapp_link FROM public.membership_settings WHERE id=true),'')='' THEN RAISE EXCEPTION 'Configure the invitation link in Settings first'; END IF;
 UPDATE public.membership_management SET invited_at=now(), invited_by=actor WHERE application_id=_target AND invited_at IS NULL;
 ELSE
 UPDATE public.membership_management SET onboarded_at=now(),onboarded_by=actor WHERE application_id=_target AND invited_at IS NOT NULL AND onboarded_at IS NULL;
 END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'Already recorded or invitation not yet marked'; END IF;
 INSERT INTO public.audit_log(actor_id,action,target_id) VALUES(actor,CASE WHEN _action='invited' THEN 'invitation_marked_sent' ELSE 'onboarding_confirmed' END,_target);
 END IF;
 ELSIF _action='settings' THEN
 IF length(coalesce(_data->>'whatsapp_link',''))>2048 OR (coalesce(_data->>'whatsapp_link','')<>'' AND (_data->>'whatsapp_link') !~ '^https://[^[:space:]]+$') THEN RAISE EXCEPTION 'Use a valid HTTPS URL'; END IF;
 IF length(coalesce(_data->>'invitation_template',''))>5000 THEN RAISE EXCEPTION 'Template too long'; END IF;
 INSERT INTO public.membership_settings(id,whatsapp_link,invitation_template,registration_open,updated_by) VALUES(true,coalesce(_data->>'whatsapp_link',''),coalesce(_data->>'invitation_template',''),(_data->>'registration_open')::boolean,actor)
 ON CONFLICT(id) DO UPDATE SET whatsapp_link=excluded.whatsapp_link,invitation_template=excluded.invitation_template,registration_open=excluded.registration_open,updated_at=now(),updated_by=actor;
 INSERT INTO public.audit_log(actor_id,action,details) VALUES(actor,'settings_changed',jsonb_build_object('registration_open',_data->'registration_open'));
 ELSIF _action IN ('grant','revoke') THEN
 email_value:=lower(trim(_data->>'email'));
 IF email_value IS NULL OR email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Invalid email'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(email_value));
 SELECT id INTO subject FROM auth.users WHERE lower(email)=email_value;
 IF _action='grant' THEN
 INSERT INTO public.admin_allowlist(email,granted_by) VALUES(email_value,actor) ON CONFLICT(email) DO NOTHING;
 IF subject IS NOT NULL AND EXISTS(SELECT 1 FROM auth.users WHERE id=subject AND email_confirmed_at IS NOT NULL) THEN
 INSERT INTO public.user_roles(user_id,role) VALUES(subject,'admin') ON CONFLICT DO NOTHING;
 END IF;
 ELSE
 IF subject=actor THEN RAISE EXCEPTION 'You cannot revoke your own access'; END IF;
 IF EXISTS(SELECT 1 FROM public.admin_allowlist WHERE email=email_value AND (is_protected OR email='bionicz115@gmail.com')) THEN RAISE EXCEPTION 'The first administrator cannot be removed'; END IF;
 DELETE FROM public.admin_allowlist WHERE email=email_value;
 IF NOT FOUND THEN RAISE EXCEPTION 'Administrator not found'; END IF;
 DELETE FROM public.user_roles WHERE user_id=subject AND role='admin';
 END IF;
 INSERT INTO public.audit_log(actor_id,action,target_id,details) VALUES(actor,'administrator_'||_action,subject,jsonb_build_object('email',email_value));
 ELSE RAISE EXCEPTION 'Unknown action'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.manage_membership(text,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manage_membership(text,uuid,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.applications_review_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RETURN new; END IF;
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
 IF (new.user_id,new.full_name,new.email,new.whatsapp_number,new.university,new.university_type,new.state,new.course,new.current_level,new.reason_for_joining,new.submitted_at) IS DISTINCT FROM (old.user_id,old.full_name,old.email,old.whatsapp_number,old.university,old.university_type,old.state,old.course,old.current_level,old.reason_for_joining,old.submitted_at) THEN RAISE EXCEPTION 'Only review fields can be changed'; END IF;
 new.reviewed_at:=now(); new.reviewed_by:=auth.uid();
 IF new.application_status IS DISTINCT FROM old.application_status THEN
 INSERT INTO public.audit_log(actor_id,action,target_id,details) VALUES(auth.uid(),'application_'||lower(new.application_status::text),new.id,jsonb_build_object('from',old.application_status,'to',new.application_status));
 IF new.application_status='Approved' THEN INSERT INTO public.user_roles(user_id,role) VALUES(new.user_id,'member') ON CONFLICT DO NOTHING;
 ELSE DELETE FROM public.user_roles WHERE user_id=new.user_id AND role='member'; END IF;
 END IF;
 RETURN new;
END $$;
CREATE FUNCTION public.settings_audit_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF auth.uid() IS NOT NULL THEN IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF; NEW.updated_by:=auth.uid();NEW.updated_at:=now(); INSERT INTO public.audit_log(actor_id,action,details) VALUES(auth.uid(),'settings_updated',jsonb_build_object('registration_open',NEW.registration_open)); END IF; RETURN NEW; END $$;
CREATE TRIGGER settings_audit BEFORE INSERT OR UPDATE ON public.membership_settings FOR EACH ROW EXECUTE FUNCTION public.settings_audit_guard();