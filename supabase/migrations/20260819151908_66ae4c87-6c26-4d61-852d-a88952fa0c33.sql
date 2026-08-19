CREATE TABLE public.chat_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room text NOT NULL DEFAULT 'general',
  user_name text NOT NULL DEFAULT 'Member',
  last_read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, room)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_reads TO authenticated;
GRANT ALL ON public.chat_reads TO service_role;
ALTER TABLE public.chat_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY chat_reads_read_authenticated ON public.chat_reads FOR SELECT TO authenticated USING (true);
CREATE POLICY chat_reads_insert_own ON public.chat_reads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY chat_reads_update_own ON public.chat_reads FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY chat_reads_delete_own ON public.chat_reads FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.job_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  editor_id uuid,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_edits_job_idx ON public.job_edits (job_id, created_at DESC);
GRANT SELECT ON public.job_edits TO authenticated;
GRANT ALL ON public.job_edits TO service_role;
ALTER TABLE public.job_edits ENABLE ROW LEVEL SECURITY;
CREATE POLICY job_edits_read_admin_or_owner ON public.job_edits FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
  OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_edits.job_id AND j.posted_by = auth.uid())
);

CREATE OR REPLACE FUNCTION public.log_job_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE diff jsonb := '{}'::jsonb;
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title THEN diff := diff || jsonb_build_object('title', jsonb_build_array(OLD.title, NEW.title)); END IF;
  IF NEW.company IS DISTINCT FROM OLD.company THEN diff := diff || jsonb_build_object('company', jsonb_build_array(OLD.company, NEW.company)); END IF;
  IF NEW.location IS DISTINCT FROM OLD.location THEN diff := diff || jsonb_build_object('location', jsonb_build_array(OLD.location, NEW.location)); END IF;
  IF NEW.job_type IS DISTINCT FROM OLD.job_type THEN diff := diff || jsonb_build_object('job_type', jsonb_build_array(OLD.job_type, NEW.job_type)); END IF;
  IF NEW.work_mode IS DISTINCT FROM OLD.work_mode THEN diff := diff || jsonb_build_object('work_mode', jsonb_build_array(OLD.work_mode, NEW.work_mode)); END IF;
  IF NEW.experience IS DISTINCT FROM OLD.experience THEN diff := diff || jsonb_build_object('experience', jsonb_build_array(OLD.experience, NEW.experience)); END IF;
  IF NEW.salary IS DISTINCT FROM OLD.salary THEN diff := diff || jsonb_build_object('salary', jsonb_build_array(OLD.salary, NEW.salary)); END IF;
  IF NEW.description IS DISTINCT FROM OLD.description THEN diff := diff || jsonb_build_object('description', jsonb_build_array(left(coalesce(OLD.description,''),200), left(coalesce(NEW.description,''),200))); END IF;
  IF NEW.apply_url IS DISTINCT FROM OLD.apply_url THEN diff := diff || jsonb_build_object('apply_url', jsonb_build_array(OLD.apply_url, NEW.apply_url)); END IF;
  IF NEW.deadline IS DISTINCT FROM OLD.deadline THEN diff := diff || jsonb_build_object('deadline', jsonb_build_array(OLD.deadline, NEW.deadline)); END IF;
  IF NEW.batch_year IS DISTINCT FROM OLD.batch_year THEN diff := diff || jsonb_build_object('batch_year', jsonb_build_array(OLD.batch_year, NEW.batch_year)); END IF;
  IF NEW.image_url IS DISTINCT FROM OLD.image_url THEN diff := diff || jsonb_build_object('image_url', jsonb_build_array(OLD.image_url, NEW.image_url)); END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN diff := diff || jsonb_build_object('status', jsonb_build_array(OLD.status::text, NEW.status::text)); END IF;

  IF diff <> '{}'::jsonb THEN
    INSERT INTO public.job_edits (job_id, editor_id, changes) VALUES (NEW.id, auth.uid(), diff);
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.log_job_edit() FROM public, anon, authenticated;

CREATE TRIGGER jobs_log_edit AFTER UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.log_job_edit();

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reads;