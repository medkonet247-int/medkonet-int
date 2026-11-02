ALTER TABLE public.membership_settings ADD COLUMN representative_programme_active boolean NOT NULL DEFAULT false;

CREATE TABLE public.representative_allowlist (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text NOT NULL CHECK (email = lower(btrim(email)) AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' AND char_length(email) <= 320),
 university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
 status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Suspended','Revoked')),
 show_on_directory boolean NOT NULL DEFAULT false,
 notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 2000),
 granted_by uuid, granted_at timestamptz NOT NULL DEFAULT now(),
 status_changed_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
CREATE UNIQUE INDEX representative_allowlist_email ON public.representative_allowlist(email);
GRANT SELECT,INSERT,UPDATE ON public.representative_allowlist TO authenticated;
GRANT ALL ON public.representative_allowlist TO service_role;
ALTER TABLE public.representative_allowlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY representative_allowlist_admin ON public.representative_allowlist FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
COMMENT ON TABLE public.representative_allowlist IS 'Administrator-managed representative entries. Stored status is administrator intent; effective representative access is derived by is_active_representative(). One entry per email, so one person can never represent two universities.';
COMMENT ON TABLE public.representative_assignments IS 'DEPRECATED: retained preparation history from Phase 4. Representative grants now live in representative_allowlist. No application surface reads or writes this table.';

CREATE FUNCTION public.representative_programme_on() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT coalesce((SELECT representative_programme_active FROM public.membership_settings WHERE id), false) $$;
REVOKE ALL ON FUNCTION public.representative_programme_on() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.representative_programme_on() TO authenticated;

CREATE FUNCTION public.is_active_representative(_user_id uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE rep_email text; BEGIN
 IF _user_id IS NULL OR NOT public.representative_programme_on() THEN RETURN false; END IF;
 SELECT lower(email) INTO rep_email FROM auth.users WHERE id=_user_id AND email IS NOT NULL AND (email_confirmed_at IS NOT NULL OR confirmed_at IS NOT NULL);
 IF rep_email IS NULL THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.applications WHERE user_id=_user_id AND application_status='Approved') THEN RETURN false; END IF;
 RETURN EXISTS(SELECT 1 FROM public.representative_allowlist r JOIN public.universities u ON u.id=r.university_id WHERE r.email=rep_email AND r.status='Active' AND u.active AND u.verification_status='Verified');
END $$;
REVOKE ALL ON FUNCTION public.is_active_representative(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_active_representative(uuid) TO authenticated;

CREATE FUNCTION public.is_active_representative_of(_user_id uuid, _university_id uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE rep_email text; BEGIN
 IF _user_id IS NULL OR _university_id IS NULL OR NOT public.representative_programme_on() THEN RETURN false; END IF;
 SELECT lower(email) INTO rep_email FROM auth.users WHERE id=_user_id AND email IS NOT NULL AND (email_confirmed_at IS NOT NULL OR confirmed_at IS NOT NULL);
 IF rep_email IS NULL THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.applications WHERE user_id=_user_id AND application_status='Approved') THEN RETURN false; END IF;
 RETURN EXISTS(SELECT 1 FROM public.representative_allowlist r JOIN public.universities u ON u.id=r.university_id WHERE r.email=rep_email AND r.university_id=_university_id AND r.status='Active' AND u.active AND u.verification_status='Verified');
END $$;
REVOKE ALL ON FUNCTION public.is_active_representative_of(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_active_representative_of(uuid,uuid) TO authenticated;

CREATE FUNCTION public.representative_allowlist_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Forbidden'; END IF;
IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
NEW.email:=lower(btrim(NEW.email));
IF TG_OP='INSERT' THEN
 NEW.granted_by:=auth.uid(); NEW.granted_at:=now(); NEW.status_changed_at:=now(); NEW.updated_at:=now(); NEW.updated_by:=auth.uid();
 INSERT INTO public.audit_log(actor_id,action,target_id,details) VALUES(auth.uid(),'representative_granted',NEW.id,jsonb_build_object('email',NEW.email,'university_id',NEW.university_id,'status',NEW.status));
 RETURN NEW;
END IF;
IF OLD.status IS DISTINCT FROM NEW.status THEN
 NEW.status_changed_at:=now();
 INSERT INTO public.audit_log(actor_id,action,target_id,details) VALUES(auth.uid(),'representative_'||CASE WHEN NEW.status='Active' THEN 'reinstated' ELSE lower(NEW.status) END,NEW.id,jsonb_build_object('from',OLD.status,'to',NEW.status,'university_changed',OLD.university_id IS DISTINCT FROM NEW.university_id));
ELSIF OLD.university_id IS DISTINCT FROM NEW.university_id OR OLD.show_on_directory IS DISTINCT FROM NEW.show_on_directory OR OLD.notes IS DISTINCT FROM NEW.notes OR OLD.email IS DISTINCT FROM NEW.email THEN
 INSERT INTO public.audit_log(actor_id,action,target_id,details) VALUES(auth.uid(),'representative_edited',NEW.id,jsonb_build_object('old',to_jsonb(OLD),'new',to_jsonb(NEW)));
ELSE
 RETURN NEW;
END IF;
NEW.updated_at:=now(); NEW.updated_by:=auth.uid();
RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.representative_allowlist_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER representative_allowlist_audit BEFORE INSERT OR UPDATE ON public.representative_allowlist FOR EACH ROW EXECUTE FUNCTION public.representative_allowlist_guard();

CREATE TABLE public.representative_announcements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
 created_by uuid NOT NULL,
 title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
 message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 5000),
 status text NOT NULL DEFAULT 'Awaiting approval' CHECK (status IN ('Awaiting approval','Published','Rejected','Withdrawn')),
 admin_note text NOT NULL DEFAULT '' CHECK (char_length(admin_note) <= 2000),
 reviewed_at timestamptz, reviewed_by uuid, published_item_id uuid,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE ON public.representative_announcements TO authenticated;
GRANT ALL ON public.representative_announcements TO service_role;
ALTER TABLE public.representative_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY rep_announcements_admin ON public.representative_announcements FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE POLICY rep_announcements_insert ON public.representative_announcements FOR INSERT TO authenticated WITH CHECK(public.is_active_representative_of(auth.uid(),university_id) AND created_by=auth.uid() AND status='Awaiting approval');
CREATE POLICY rep_announcements_select ON public.representative_announcements FOR SELECT TO authenticated USING(created_by=auth.uid() AND public.is_active_representative(auth.uid()));
CREATE POLICY rep_announcements_update ON public.representative_announcements FOR UPDATE TO authenticated USING(created_by=auth.uid() AND status='Awaiting approval' AND public.is_active_representative(auth.uid())) WITH CHECK(created_by=auth.uid() AND status IN ('Awaiting approval','Withdrawn'));

CREATE FUNCTION public.representative_announcement_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Forbidden'; END IF;
IF TG_OP='INSERT' THEN
 NEW.title:=btrim(NEW.title); NEW.message:=btrim(NEW.message);
 IF NOT public.is_active_representative_of(auth.uid(),NEW.university_id) OR NEW.created_by IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Forbidden'; END IF;
 NEW.created_at:=now(); NEW.updated_at:=now();
 INSERT INTO public.audit_log(actor_id,action,target_id,details) VALUES(auth.uid(),'representative_proposal_submitted',NEW.id,jsonb_build_object('university_id',NEW.university_id));
 RETURN NEW;
END IF;
IF public.has_role(auth.uid(),'admin') THEN
 IF NEW.status IS DISTINCT FROM OLD.status THEN
  NEW.reviewed_at:=now(); NEW.reviewed_by:=auth.uid();
  INSERT INTO public.audit_log(actor_id,action,target_id,details) VALUES(auth.uid(),'representative_proposal_'||lower(replace(NEW.status,' ','_')),NEW.id,jsonb_build_object('from',OLD.status,'to',NEW.status,'published_item_id',NEW.published_item_id,'note',NEW.admin_note));
 ELSIF OLD.admin_note IS DISTINCT FROM NEW.admin_note THEN
  INSERT INTO public.audit_log(actor_id,action,target_id,details) VALUES(auth.uid(),'representative_proposal_note',NEW.id,jsonb_build_object('note',NEW.admin_note));
 ELSE
  RETURN NEW;
 END IF;
 NEW.updated_at:=now(); RETURN NEW;
END IF;
IF NEW.created_by IS DISTINCT FROM auth.uid() OR NOT public.is_active_representative_of(auth.uid(),NEW.university_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
IF OLD.status IS DISTINCT FROM 'Awaiting approval' THEN RAISE EXCEPTION 'Only pending proposals can be changed'; END IF;
IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IS DISTINCT FROM 'Withdrawn' THEN RAISE EXCEPTION 'Representatives can only withdraw proposals'; END IF;
IF NEW.admin_note IS DISTINCT FROM OLD.admin_note OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR NEW.published_item_id IS DISTINCT FROM OLD.published_item_id OR NEW.university_id IS DISTINCT FROM OLD.university_id THEN RAISE EXCEPTION 'Only proposal content can be changed'; END IF;
NEW.title:=btrim(NEW.title); NEW.message:=btrim(NEW.message); NEW.updated_at:=now();
INSERT INTO public.audit_log(actor_id,action,target_id,details) VALUES(auth.uid(),CASE WHEN NEW.status='Withdrawn' THEN 'representative_proposal_withdrawn' ELSE 'representative_proposal_edited' END,NEW.id,jsonb_build_object('from',OLD.status,'to',NEW.status));
RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.representative_announcement_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER representative_announcement_audit BEFORE INSERT OR UPDATE ON public.representative_announcements FOR EACH ROW EXECUTE FUNCTION public.representative_announcement_guard();

CREATE TABLE public.representative_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
 created_by uuid NOT NULL,
 category text NOT NULL CHECK (category IN ('Resources','Events','Mentorship','Technical problem','Welfare or support','Other')),
 message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 3000),
 status text NOT NULL DEFAULT 'Received' CHECK (status IN ('Received','In progress','Resolved')),
 admin_note text NOT NULL DEFAULT '' CHECK (char_length(admin_note) <= 2000),
 reviewed_at timestamptz, reviewed_by uuid,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT ON public.representative_reports TO authenticated;
GRANT ALL ON public.representative_reports TO service_role;
ALTER TABLE public.representative_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY rep_reports_admin ON public.representative_reports FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE POLICY rep_reports_insert ON public.representative_reports FOR INSERT TO authenticated WITH CHECK(public.is_active_representative_of(auth.uid(),university_id) AND created_by=auth.uid());
CREATE POLICY rep_reports_select ON public.representative_reports FOR SELECT TO authenticated USING(created_by=auth.uid() AND public.is_active_representative(auth.uid()));

CREATE FUNCTION public.representative_report_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Forbidden'; END IF;
IF TG_OP='INSERT' THEN
 NEW.message:=btrim(NEW.message);
 IF NOT public.is_active_representative_of(auth.uid(),NEW.university_id) OR NEW.created_by IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Forbidden'; END IF;
 NEW.created_at:=now(); NEW.updated_at:=now();
 INSERT INTO public.audit_log(actor_id,action,target_id,details) VALUES(auth.uid(),'representative_report_submitted',NEW.id,jsonb_build_object('category',NEW.category,'university_id',NEW.university_id));
 RETURN NEW;
END IF;
IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
IF NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.university_id IS DISTINCT FROM OLD.university_id OR NEW.category IS DISTINCT FROM OLD.category OR NEW.message IS DISTINCT FROM OLD.message THEN RAISE EXCEPTION 'Only report status can be updated'; END IF;
IF NEW.status IS DISTINCT FROM OLD.status OR NEW.admin_note IS DISTINCT FROM OLD.admin_note THEN
 NEW.reviewed_at:=now(); NEW.reviewed_by:=auth.uid(); NEW.updated_at:=now();
 INSERT INTO public.audit_log(actor_id,action,target_id,details) VALUES(auth.uid(),'representative_report_updated',NEW.id,jsonb_build_object('from',OLD.status,'to',NEW.status,'note',NEW.admin_note));
ELSE
 RETURN NEW;
END IF;
RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.representative_report_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER representative_report_audit BEFORE INSERT OR UPDATE ON public.representative_reports FOR EACH ROW EXECUTE FUNCTION public.representative_report_guard();

CREATE FUNCTION public.representative_context() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE rep record; uni record; result jsonb; BEGIN
 IF NOT public.is_active_representative(auth.uid()) THEN RETURN jsonb_build_object('active',false,'programme',public.representative_programme_on()); END IF;
 SELECT r.* INTO rep FROM public.representative_allowlist r JOIN auth.users au ON au.id=auth.uid() WHERE r.email=lower(au.email) AND r.status='Active' LIMIT 1;
 SELECT u.* INTO uni FROM public.universities u WHERE u.id=rep.university_id;
 SELECT jsonb_build_object('active',true,'university',jsonb_build_object('id',uni.id,'name',uni.name,'type',uni.university_type,'state',uni.state,'location',uni.location),'counts',jsonb_build_object('pending',(SELECT count(*) FROM public.applications WHERE university_id=uni.id AND application_status='Pending'),'approved',(SELECT count(*) FROM public.applications WHERE university_id=uni.id AND application_status='Approved'),'onboarded',(SELECT count(*) FROM public.applications a JOIN public.membership_management m ON m.application_id=a.id WHERE a.university_id=uni.id AND a.application_status='Approved' AND m.onboarded_at IS NOT NULL)),'granted_at',rep.granted_at) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.representative_context() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.representative_context() TO authenticated;

CREATE FUNCTION public.representative_welcome_list() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE uni_id uuid; result jsonb; BEGIN
 IF NOT public.is_active_representative(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT r.university_id INTO uni_id FROM public.representative_allowlist r JOIN auth.users au ON au.id=auth.uid() WHERE r.email=lower(au.email) AND r.status='Active' LIMIT 1;
 WITH list AS (SELECT a.full_name,a.course,a.current_level,(m.onboarded_at IS NOT NULL) AS onboarded FROM public.applications a LEFT JOIN public.membership_management m ON m.application_id=a.id WHERE a.university_id=uni_id AND a.application_status='Approved' ORDER BY a.submitted_at DESC,a.id LIMIT 500)
 SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO result FROM list x;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.representative_welcome_list() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.representative_welcome_list() TO authenticated;

CREATE FUNCTION public.representative_directory() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb; BEGIN
 IF NOT public.can_read_academic_content() THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF NOT public.representative_programme_on() THEN RETURN jsonb_build_object('programme',false,'reps','[]'::jsonb); END IF;
 WITH reps AS (SELECT a.full_name,u.name AS university FROM public.representative_allowlist r JOIN public.universities u ON u.id=r.university_id AND u.active AND u.verification_status='Verified' JOIN auth.users au ON lower(au.email)=r.email JOIN public.applications a ON a.user_id=au.id AND a.application_status='Approved' WHERE r.status='Active' AND r.show_on_directory ORDER BY u.name,a.full_name)
 SELECT jsonb_build_object('programme',true,'reps',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM reps x),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.representative_directory() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.representative_directory() TO authenticated;

CREATE FUNCTION public.representative_allowlist_admin() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb; BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 WITH entries AS (
  SELECT r.id,r.email,r.status,r.notes,r.show_on_directory,r.granted_at,r.status_changed_at,
   u.id AS university_id,u.name AS university_name,u.state AS university_state,u.active,u.verification_status,
   au.id AS user_id,(au.email_confirmed_at IS NOT NULL OR au.confirmed_at IS NOT NULL) AS confirmed,
   a.application_status::text AS application_status,a.full_name AS applicant_name,
   CASE WHEN au.id IS NULL OR (au.email_confirmed_at IS NULL AND au.confirmed_at IS NULL) THEN 'Awaiting registration'
        WHEN a.application_status IS NULL OR a.application_status<>'Approved' THEN 'Awaiting approval'
        ELSE r.status END AS display_status,
   (SELECT full_name FROM public.profiles WHERE id=au.id) AS profile_name,
   (SELECT full_name FROM public.profiles WHERE id=r.granted_by) AS granted_by_name
  FROM public.representative_allowlist r
  JOIN public.universities u ON u.id=r.university_id
  LEFT JOIN LATERAL (SELECT * FROM auth.users WHERE lower(email)=r.email ORDER BY created_at LIMIT 1) au ON true
  LEFT JOIN LATERAL (SELECT application_status,full_name FROM public.applications WHERE user_id=au.id ORDER BY submitted_at DESC LIMIT 1) a ON true
  ORDER BY r.created_at DESC)
 SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO result FROM entries x;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.representative_allowlist_admin() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.representative_allowlist_admin() TO authenticated;

CREATE FUNCTION public.representative_review_proposal(_id uuid,_action text,_title text DEFAULT NULL,_message text DEFAULT NULL,_note text DEFAULT NULL,_national boolean DEFAULT false) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE prop public.representative_announcements; uni record; item uuid; BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF _action NOT IN ('publish','reject') THEN RAISE EXCEPTION 'Unknown action'; END IF;
 SELECT * INTO prop FROM public.representative_announcements WHERE id=_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Proposal not found'; END IF;
 IF prop.status IS DISTINCT FROM 'Awaiting approval' THEN RAISE EXCEPTION 'This proposal was already reviewed'; END IF;
 IF _action='reject' THEN
  UPDATE public.representative_announcements SET status='Rejected',admin_note=coalesce(btrim(_note),''),reviewed_at=now(),reviewed_by=auth.uid(),updated_at=now() WHERE id=_id;
  RETURN NULL;
 END IF;
 IF _title IS NOT NULL THEN prop.title:=btrim(_title); END IF;
 IF _message IS NOT NULL THEN prop.message:=btrim(_message); END IF;
 IF char_length(prop.title) NOT BETWEEN 1 AND 200 OR char_length(prop.message) NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'Invalid announcement content'; END IF;
 SELECT u.name INTO uni FROM public.universities u WHERE u.id=prop.university_id;
 INSERT INTO public.content_items(kind,title,description,published,published_at,details)
  VALUES('announcements',prop.title,prop.message,true,now(),jsonb_build_object('announcement_date',to_char(now() AT TIME ZONE 'Africa/Lagos','YYYY-MM-DD'),'pinned',false,'university',CASE WHEN _national THEN '' ELSE coalesce(uni.name,'') END))
  RETURNING id INTO item;
 UPDATE public.representative_announcements SET status='Published',admin_note=coalesce(btrim(_note),''),reviewed_at=now(),reviewed_by=auth.uid(),published_item_id=item,title=prop.title,message=prop.message,updated_at=now() WHERE id=_id;
 RETURN item;
END $$;
REVOKE ALL ON FUNCTION public.representative_review_proposal(uuid,text,text,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.representative_review_proposal(uuid,text,text,text,text,boolean) TO authenticated;

CREATE FUNCTION public.representative_update_report(_id uuid,_status text,_note text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF _status NOT IN ('Received','In progress','Resolved') THEN RAISE EXCEPTION 'Invalid status'; END IF;
 UPDATE public.representative_reports SET status=_status,admin_note=coalesce(btrim(_note),''),reviewed_at=now(),reviewed_by=auth.uid(),updated_at=now() WHERE id=_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Report not found'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.representative_update_report(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.representative_update_report(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.settings_audit_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF auth.uid() IS NOT NULL THEN IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF; NEW.updated_by:=auth.uid();NEW.updated_at:=now(); INSERT INTO public.audit_log(actor_id,action,details) VALUES(auth.uid(),'settings_updated',jsonb_build_object('registration_open',NEW.registration_open,'representative_programme_active',NEW.representative_programme_active)); END IF; RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.manage_membership(_action text, _target uuid DEFAULT NULL, _data jsonb DEFAULT '{}'::jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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
 INSERT INTO public.membership_settings(id,whatsapp_link,invitation_template,registration_open,representative_programme_active,updated_by) VALUES(true,coalesce(_data->>'whatsapp_link',''),coalesce(_data->>'invitation_template',''),(_data->>'registration_open')::boolean,coalesce((_data->>'representative_programme_active')::boolean,false),actor)
 ON CONFLICT(id) DO UPDATE SET whatsapp_link=excluded.whatsapp_link,invitation_template=excluded.invitation_template,registration_open=excluded.registration_open,representative_programme_active=excluded.representative_programme_active,updated_at=now(),updated_by=actor;
 INSERT INTO public.audit_log(actor_id,action,details) VALUES(actor,'settings_changed',jsonb_build_object('registration_open',_data->'registration_open','representative_programme_active',_data->'representative_programme_active'));
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

INSERT INTO public.site_text(key,page,section,label,current_value,default_value,visibility,route,max_length)
SELECT e->>'key',e->>'page',e->>'section',left(btrim(e->>'value'),70),e->>'value',e->>'value','member',e->>'route',(e->>'max')::integer
FROM jsonb_array_elements($seed$[
 {"key":"rep.reps.intro","page":"representative","section":"reps","value":"A programme where approved members appointed by the MedKonet team support their own university.","route":"/representatives","max":1000},
 {"key":"rep.reps.explain","page":"representative","section":"reps","value":"Representatives are approved members who help welcome new members from their university, propose announcements for administrator approval and report community needs. They have restricted access and no administrator permissions.","route":"/representatives","max":1000},
 {"key":"rep.reps.not_active","page":"representative","section":"reps","value":"The representative programme is not active yet.","route":"/representatives","max":300},
 {"key":"rep.reps.none","page":"representative","section":"reps","value":"No representatives have been appointed yet.","route":"/representatives","max":300},
 {"key":"rep.reps.consent","page":"representative","section":"reps","value":"Representatives appear here only with their consent. Contact details are never shown.","route":"/representatives","max":300},
 {"key":"rep.denied.title","page":"representative","section":"denied","value":"Access denied","route":"/representative","max":300},
 {"key":"rep.denied.body","page":"representative","section":"denied","value":"This area is for authorised university representatives while the representative programme is active.","route":"/representative","max":300},
 {"key":"rep.denied.cta","page":"representative","section":"denied","value":"Go to your dashboard","route":"/representative","max":300},
 {"key":"rep.dash.title","page":"representative","section":"dashboard","value":"Representative dashboard","route":"/representative","max":300},
 {"key":"rep.dash.responsibilities","page":"representative","section":"dashboard","value":"Use members' names only to welcome them in the official WhatsApp community. Never share, copy or screenshot members' information outside MedKonet. Representatives have restricted access and no administrator permissions.","route":"/representative","max":1000},
 {"key":"rep.dash.my_university","page":"representative","section":"dashboard","value":"My university","route":"/representative","max":300},
 {"key":"rep.dash.pending","page":"representative","section":"dashboard","value":"Pending applications","route":"/representative","max":300},
 {"key":"rep.dash.approved","page":"representative","section":"dashboard","value":"Approved members","route":"/representative","max":300},
 {"key":"rep.dash.onboarded","page":"representative","section":"dashboard","value":"Onboarded members","route":"/representative","max":300},
 {"key":"rep.dash.welcome","page":"representative","section":"dashboard","value":"Members to welcome","route":"/representative","max":300},
 {"key":"rep.dash.welcome_hint","page":"representative","section":"dashboard","value":"Their contact details are never shared with representatives. Use the official WhatsApp community to welcome them.","route":"/representative","max":300},
 {"key":"rep.dash.welcome_empty","page":"representative","section":"dashboard","value":"No members to welcome yet.","route":"/representative","max":300},
 {"key":"rep.dash.course","page":"representative","section":"dashboard","value":"Course","route":"/representative","max":300},
 {"key":"rep.dash.level","page":"representative","section":"dashboard","value":"Level","route":"/representative","max":300},
 {"key":"rep.dash.onboarding","page":"representative","section":"dashboard","value":"Onboarding","route":"/representative","max":300},
 {"key":"rep.dash.onboarded_yes","page":"representative","section":"dashboard","value":"Confirmed","route":"/representative","max":300},
 {"key":"rep.dash.onboarded_no","page":"representative","section":"dashboard","value":"Not yet","route":"/representative","max":300},
 {"key":"rep.dash.proposal","page":"representative","section":"dashboard","value":"Propose an announcement","route":"/representative","max":300},
 {"key":"rep.dash.proposal_hint","page":"representative","section":"dashboard","value":"An administrator reviews every proposal before members can see it.","route":"/representative","max":300},
 {"key":"rep.dash.title_label","page":"representative","section":"dashboard","value":"Title","route":"/representative","max":300},
 {"key":"rep.dash.message_label","page":"representative","section":"dashboard","value":"Message","route":"/representative","max":300},
 {"key":"rep.dash.send_proposal","page":"representative","section":"dashboard","value":"Send proposal","route":"/representative","max":300},
 {"key":"rep.dash.withdraw","page":"representative","section":"dashboard","value":"Withdraw","route":"/representative","max":300},
 {"key":"rep.dash.edit_save","page":"representative","section":"dashboard","value":"Save changes","route":"/representative","max":300},
 {"key":"rep.dash.proposal_empty","page":"representative","section":"dashboard","value":"You have not proposed any announcements yet.","route":"/representative","max":300},
 {"key":"rep.dash.report","page":"representative","section":"dashboard","value":"Report a community need","route":"/representative","max":300},
 {"key":"rep.dash.report_hint","page":"representative","section":"dashboard","value":"Tell the administrators what your university community needs.","route":"/representative","max":300},
 {"key":"rep.dash.category","page":"representative","section":"dashboard","value":"Category","route":"/representative","max":300},
 {"key":"rep.dash.send_report","page":"representative","section":"dashboard","value":"Send report","route":"/representative","max":300},
 {"key":"rep.dash.report_empty","page":"representative","section":"dashboard","value":"You have not submitted any reports yet.","route":"/representative","max":300},
 {"key":"rep.dash.submissions","page":"representative","section":"dashboard","value":"My submissions","route":"/representative","max":300},
 {"key":"rep.dash.st_awaiting","page":"representative","section":"dashboard","value":"Awaiting admin approval","route":"/representative","max":300},
 {"key":"rep.dash.st_published","page":"representative","section":"dashboard","value":"Published","route":"/representative","max":300},
 {"key":"rep.dash.st_rejected","page":"representative","section":"dashboard","value":"Rejected","route":"/representative","max":300},
 {"key":"rep.dash.st_withdrawn","page":"representative","section":"dashboard","value":"Withdrawn","route":"/representative","max":300},
 {"key":"rep.dash.st_received","page":"representative","section":"dashboard","value":"Received","route":"/representative","max":300},
 {"key":"rep.dash.st_in_progress","page":"representative","section":"dashboard","value":"In progress","route":"/representative","max":300},
 {"key":"rep.dash.st_resolved","page":"representative","section":"dashboard","value":"Resolved","route":"/representative","max":300},
 {"key":"rep.admin.allowlist","page":"representative","section":"admin","value":"Representative allowlist","route":"/admin/representatives","max":300},
 {"key":"rep.admin.add","page":"representative","section":"admin","value":"Add representative","route":"/admin/representatives","max":300},
 {"key":"rep.admin.email","page":"representative","section":"admin","value":"Email address","route":"/admin/representatives","max":300},
 {"key":"rep.admin.university","page":"representative","section":"admin","value":"University","route":"/admin/representatives","max":300},
 {"key":"rep.admin.notes","page":"representative","section":"admin","value":"Internal notes","route":"/admin/representatives","max":300},
 {"key":"rep.admin.grant","page":"representative","section":"admin","value":"Add to allowlist","route":"/admin/representatives","max":300},
 {"key":"rep.admin.suspend","page":"representative","section":"admin","value":"Suspend","route":"/admin/representatives","max":300},
 {"key":"rep.admin.reinstate","page":"representative","section":"admin","value":"Reinstate","route":"/admin/representatives","max":300},
 {"key":"rep.admin.revoke","page":"representative","section":"admin","value":"Revoke","route":"/admin/representatives","max":300},
 {"key":"rep.admin.directory","page":"representative","section":"admin","value":"Show on the members' representatives page","route":"/admin/representatives","max":300},
 {"key":"rep.admin.proposals","page":"representative","section":"admin","value":"Announcement proposals","route":"/admin/representatives","max":300},
 {"key":"rep.admin.reports","page":"representative","section":"admin","value":"Community-need reports","route":"/admin/representatives","max":300},
 {"key":"rep.admin.publish","page":"representative","section":"admin","value":"Approve and publish","route":"/admin/representatives","max":300},
 {"key":"rep.admin.publish_national","page":"representative","section":"admin","value":"Publish as a national announcement","route":"/admin/representatives","max":300},
 {"key":"rep.admin.reject","page":"representative","section":"admin","value":"Reject","route":"/admin/representatives","max":300},
 {"key":"rep.admin.note","page":"representative","section":"admin","value":"Internal note","route":"/admin/representatives","max":300},
 {"key":"rep.admin.update_status","page":"representative","section":"admin","value":"Update status","route":"/admin/representatives","max":300},
 {"key":"rep.admin.restricted","page":"representative","section":"admin","value":"Representatives have restricted permissions: they never gain administrator access and only ever see their own university's limited information.","route":"/admin/representatives","max":1000},
 {"key":"rep.admin.st_awaiting_registration","page":"representative","section":"admin","value":"Awaiting registration","route":"/admin/representatives","max":300},
 {"key":"rep.admin.st_awaiting_approval","page":"representative","section":"admin","value":"Awaiting approval","route":"/admin/representatives","max":300},
 {"key":"rep.admin.st_active","page":"representative","section":"admin","value":"Active","route":"/admin/representatives","max":300},
 {"key":"rep.admin.st_suspended","page":"representative","section":"admin","value":"Suspended","route":"/admin/representatives","max":300},
 {"key":"rep.admin.st_revoked","page":"representative","section":"admin","value":"Revoked","route":"/admin/representatives","max":300},
 {"key":"rep.admin.programme","page":"representative","section":"admin","value":"Representative programme active","route":"/admin/representatives","max":300},
 {"key":"rep.admin.programme_hint","page":"representative","section":"admin","value":"While off, no representative can use representative features, even if allowlisted.","route":"/admin/representatives","max":300},
 {"key":"rep.admin.empty_allowlist","page":"representative","section":"admin","value":"No representatives have been added yet.","route":"/admin/representatives","max":300},
 {"key":"rep.admin.empty_proposals","page":"representative","section":"admin","value":"No proposals are waiting for review.","route":"/admin/representatives","max":300},
 {"key":"rep.admin.empty_reports","page":"representative","section":"admin","value":"No reports have been submitted.","route":"/admin/representatives","max":300},
 {"key":"rep.nav","page":"header","section":"nav","value":"Representative","route":"/representative","max":300}
]$seed$::jsonb) AS e
ON CONFLICT (key) DO NOTHING;