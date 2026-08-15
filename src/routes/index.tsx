import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flag, Plus, Search, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { JobCard } from "@/components/JobCard";
import { PostJobDialog } from "@/components/PostJobDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JOB_TYPES, REPORT_LIMIT, WORK_MODES, type JobRow } from "@/lib/jobs";

const title = "CampusHire — verified placement & internship board";
const description =
  "Browse moderator-approved jobs and internships, post your own openings, and help remove fake listings from the board.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const REASONS = ["Fake or scam posting", "Duplicate post", "Wrong or misleading details", "Spam", "Offensive content"];

function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [mode, setMode] = useState("all");
  const [postOpen, setPostOpen] = useState(false);
  const [reportJob, setReportJob] = useState<JobRow | null>(null);
  const [reason, setReason] = useState(REASONS[0]!);
  const [details, setDetails] = useState("");

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs", "approved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as JobRow[];
    },
  });

  const report = useMutation({
    mutationFn: async () => {
      if (!reportJob || !user) throw new Error("Sign in to report a post");
      const { error } = await supabase.from("job_reports").insert({
        job_id: reportJob.id,
        user_id: user.id,
        reason,
        details: details.trim().slice(0, 500) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report submitted. Thank you for keeping the board clean.");
      setReportJob(null);
      setDetails("");
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Could not submit report";
      toast.error(msg.includes("duplicate") ? "You already reported this post." : msg);
    },
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (jobs ?? []).filter((j) => {
      const matches =
        !needle ||
        [j.title, j.company, j.location, j.description].some((v) => v?.toLowerCase().includes(needle));
      return matches && (type === "all" || j.job_type === type) && (mode === "all" || j.work_mode === mode);
    });
  }, [jobs, q, type, mode]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <section className="rounded-2xl border border-border bg-card p-8">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Every post is approved by a moderator
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Find your next role on a board people actually trust
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Real openings only. Anyone can post, moderators approve, and a listing flagged by{" "}
            {REPORT_LIMIT} people is deleted automatically.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              onClick={() => (user ? setPostOpen(true) : navigate({ to: "/auth" }))}
            >
              <Plus className="mr-1 h-4 w-4" /> Post an opening
            </Button>
            {!user && (
              <Button variant="outline" onClick={() => navigate({ to: "/auth" })}>
                Sign in
              </Button>
            )}
          </div>
        </section>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search role, company or location"
              value={q}
              maxLength={100}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {JOB_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modes</SelectItem>
              {WORK_MODES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-xl" />)}
          {!isLoading &&
            filtered.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onReport={(j) => (user ? setReportJob(j) : navigate({ to: "/auth" }))}
              />
            ))}
        </div>
        {!isLoading && filtered.length === 0 && (
          <p className="mt-16 text-center text-muted-foreground">
            No approved openings match your search yet.
          </p>
        )}
      </main>
      <SiteFooter />

      {user && (
        <PostJobDialog
          open={postOpen}
          onOpenChange={setPostOpen}
          userId={user.id}
          onPosted={() => qc.invalidateQueries({ queryKey: ["jobs"] })}
        />
      )}

      <Dialog open={!!reportJob} onOpenChange={(v) => !v && setReportJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-4 w-4" /> Report this post
            </DialogTitle>
            <DialogDescription>
              {REPORT_LIMIT} reports remove a listing automatically. False reports can get your account banned.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Details (optional)</Label>
              <Textarea rows={3} maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => report.mutate()} disabled={report.isPending}>
              {report.isPending ? "Sending…" : "Submit report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}