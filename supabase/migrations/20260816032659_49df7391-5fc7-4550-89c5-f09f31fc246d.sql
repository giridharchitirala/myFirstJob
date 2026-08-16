ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS college text,
  ADD COLUMN IF NOT EXISTS grad_year integer,
  ADD COLUMN IF NOT EXISTS skills text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS company_website text,
  ADD COLUMN IF NOT EXISTS notify_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.job_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT 'Member',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.job_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_comments TO authenticated;
GRANT ALL ON public.job_comments TO service_role;
ALTER TABLE public.job_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_public_read" ON public.job_comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "comments_insert_own" ON public.job_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "comments_update_own_or_admin" ON public.job_comments FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "comments_delete_own_or_admin" ON public.job_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE TRIGGER job_comments_touch BEFORE UPDATE ON public.job_comments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.shoutouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT 'Member',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shoutouts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shoutouts TO authenticated;
GRANT ALL ON public.shoutouts TO service_role;
ALTER TABLE public.shoutouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shoutouts_public_read" ON public.shoutouts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "shoutouts_insert_own" ON public.shoutouts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "shoutouts_update_own_or_admin" ON public.shoutouts FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "shoutouts_delete_own_or_admin" ON public.shoutouts FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room text NOT NULL DEFAULT 'general',
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT 'Member',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_read_authenticated" ON public.chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "chat_insert_own" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "chat_delete_own_or_admin" ON public.chat_messages FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE INDEX IF NOT EXISTS job_comments_job_idx ON public.job_comments(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_room_idx ON public.chat_messages(room, created_at DESC);