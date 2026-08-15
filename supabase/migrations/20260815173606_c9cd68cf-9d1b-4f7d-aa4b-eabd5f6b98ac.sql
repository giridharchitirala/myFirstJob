
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  banned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TYPE public.post_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  company text NOT NULL,
  location text,
  job_type text,
  work_mode text,
  experience text,
  salary text,
  description text,
  apply_url text,
  deadline date,
  batch_year int,
  image_url text,
  status public.post_status NOT NULL DEFAULT 'pending',
  report_count int NOT NULL DEFAULT 0,
  views int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT ON public.jobs TO anon;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs_public_read_approved" ON public.jobs FOR SELECT TO anon, authenticated
  USING (status = 'approved');
CREATE POLICY "jobs_read_own_or_admin" ON public.jobs FOR SELECT TO authenticated
  USING (posted_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "jobs_insert_own" ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (posted_by = auth.uid());
CREATE POLICY "jobs_update_own_or_admin" ON public.jobs FOR UPDATE TO authenticated
  USING (posted_by = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (posted_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "jobs_delete_own_or_admin" ON public.jobs FOR DELETE TO authenticated
  USING (posted_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.job_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT 'fake',
  details text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, user_id)
);
GRANT SELECT, INSERT ON public.job_reports TO authenticated;
GRANT ALL ON public.job_reports TO service_role;
ALTER TABLE public.job_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_insert_own" ON public.job_reports FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "reports_select_own_or_admin" ON public.job_reports FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TABLE public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_actions TO authenticated;
GRANT ALL ON public.admin_actions TO service_role;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_admin_read" ON public.admin_actions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "audit_admin_insert" ON public.admin_actions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') AND actor_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_job_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c int;
BEGIN
  UPDATE public.jobs SET report_count = report_count + 1 WHERE id = NEW.job_id
    RETURNING report_count INTO c;
  IF c >= 15 THEN
    INSERT INTO public.admin_actions (actor_id, action, target_type, target_id, meta)
    VALUES (NULL, 'auto_delete_reported_post', 'job', NEW.job_id::text, jsonb_build_object('reports', c));
    DELETE FROM public.jobs WHERE id = NEW.job_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_job_report AFTER INSERT ON public.job_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_job_report();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER jobs_touch BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  IF lower(NEW.email) = 'giridharchitirala@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT jsonb_build_object(
    'total_jobs', (SELECT count(*) FROM public.jobs),
    'pending', (SELECT count(*) FROM public.jobs WHERE status='pending'),
    'approved', (SELECT count(*) FROM public.jobs WHERE status='approved'),
    'rejected', (SELECT count(*) FROM public.jobs WHERE status='rejected'),
    'reports', (SELECT count(*) FROM public.job_reports),
    'users', (SELECT count(*) FROM public.profiles),
    'banned', (SELECT count(*) FROM public.profiles WHERE banned)
  ) INTO result;
  RETURN result;
END; $$;

CREATE POLICY "job_images_public_read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'job-images');
CREATE POLICY "job_images_auth_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'job-images' AND owner = auth.uid());
CREATE POLICY "job_images_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'job-images' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin')));
