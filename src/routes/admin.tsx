import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Activity, CheckCircle2, Flag, ShieldAlert, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { REPORT_LIMIT, timeAgo, type JobRow } from "@/lib/jobs";
import { PostJobDialog } from "@/components/PostJobDialog";

const title = "Admin control centre — MyFirstJob";
const description = "Moderate submissions, review reports, manage members and audit every action on MyFirstJob.";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: AdminPage,
});

type Profile = { id: string; full_name: string | null; banned: boolean; created_at: string };
type AdminAction = {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  created_at: string;
  meta: Record<string, unknown> | null;
};
type Stats = {
  total_jobs?: number;
  pending_jobs?: number;
  approved_jobs?: number;
  rejected_jobs?: number;
  total_users?: number;
  banned_users?: number;
  total_reports?: number;
};

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editJob, setEditJob] = useState<JobRow | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin"] });
    qc.invalidateQueries({ queryKey: ["jobs"] });
  };

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "job_reports" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const stats = useQuery({
    queryKey: ["admin", "stats"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_stats");
      if (error) throw error;
      return (data ?? {}) as Stats;
    },
  });

  const jobs = useQuery({
    queryKey: ["admin", "jobs"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as JobRow[];
    },
  });

  const people = useQuery({
    queryKey: ["admin", "profiles"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, banned, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as Profile[];
    },
  });

  const audit = useQuery({
    queryKey: ["admin", "audit"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_actions")
        .select("id, action, target_type, target_id, created_at, meta")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as AdminAction[];
    },
  });

  async function setStatus(job: JobRow, status: "approved" | "rejected") {
    const { error } = await supabase.from("jobs").update({ status }).eq("id", job.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Post ${status}`);
    refresh();
  }

  async function removeJob(job: JobRow) {
    const { error } = await supabase.from("jobs").delete().eq("id", job.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Post deleted");
    refresh();
  }

  async function toggleBan(p: Profile) {
    const { error } = await supabase.from("profiles").update({ banned: !p.banned }).eq("id", p.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(p.banned ? "Member unbanned" : "Member banned");
    refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-10">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 text-center">
          <ShieldAlert className="h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-semibold text-foreground">Restricted area</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This control centre is available to platform administrators only.
          </p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const s = stats.data ?? {};
  const pending = (jobs.data ?? []).filter((j) => j.status === "pending");
  const reported = (jobs.data ?? []).filter((j) => j.report_count > 0).sort((a, b) => b.report_count - a.report_count);
  const all = (jobs.data ?? []).filter((j) => {
    const n = search.trim().toLowerCase();
    return !n || [j.title, j.company, j.location].some((v) => v?.toLowerCase().includes(n));
  });

  const cards = [
    { label: "Total posts", value: s.total_jobs ?? 0, icon: Activity },
    { label: "Awaiting approval", value: s.pending_jobs ?? 0, icon: CheckCircle2 },
    { label: "Live posts", value: s.approved_jobs ?? 0, icon: CheckCircle2 },
    { label: "Rejected", value: s.rejected_jobs ?? 0, icon: ShieldAlert },
    { label: "Members", value: s.total_users ?? 0, icon: Users },
    { label: "Banned", value: s.banned_users ?? 0, icon: ShieldAlert },
    { label: "Reports filed", value: s.total_reports ?? 0, icon: Flag },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-foreground">Control centre</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live monitoring · auto-removal triggers at {REPORT_LIMIT} reports.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Card key={c.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <c.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="pending" className="mt-8">
          <TabsList>
            <TabsTrigger value="pending">Approvals ({pending.length})</TabsTrigger>
            <TabsTrigger value="reported">Reported ({reported.length})</TabsTrigger>
            <TabsTrigger value="all">All posts</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="audit">Audit log</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <JobTable rows={pending} onApprove={(j) => setStatus(j, "approved")} onReject={(j) => setStatus(j, "rejected")} onDelete={removeJob} onEdit={setEditJob} />
          </TabsContent>

          <TabsContent value="reported" className="mt-4">
            <JobTable rows={reported} onApprove={(j) => setStatus(j, "approved")} onReject={(j) => setStatus(j, "rejected")} onDelete={removeJob} onEdit={setEditJob} />
          </TabsContent>

          <TabsContent value="all" className="mt-4 space-y-3">
            <Input placeholder="Search posts" value={search} maxLength={100} onChange={(e) => setSearch(e.target.value)} />
            <JobTable rows={all} onApprove={(j) => setStatus(j, "approved")} onReject={(j) => setStatus(j, "rejected")} onDelete={removeJob} onEdit={setEditJob} />
          </TabsContent>

          <TabsContent value="members" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {people.data?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name ?? "Member"}</TableCell>
                    <TableCell>{timeAgo(p.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant={p.banned ? "destructive" : "secondary"}>{p.banned ? "banned" : "active"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant={p.banned ? "outline" : "destructive"} onClick={() => toggleBan(p)}>
                        {p.banned ? "Unban" : "Ban"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit.data?.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.action}</TableCell>
                    <TableCell className="text-muted-foreground">{a.target_type} · {a.target_id.slice(0, 8)}</TableCell>
                    <TableCell>{timeAgo(a.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </main>
      <SiteFooter />
      {user && (
        <PostJobDialog
          open={!!editJob}
          onOpenChange={(v) => !v && setEditJob(null)}
          userId={user.id}
          job={editJob}
          onPosted={() => {
            setEditJob(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function JobTable({
  rows,
  onApprove,
  onReject,
  onDelete,
  onEdit,
}: {
  rows: JobRow[];
  onApprove: (j: JobRow) => void;
  onReject: (j: JobRow) => void;
  onDelete: (j: JobRow) => void;
  onEdit: (j: JobRow) => void;
}) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Nothing here right now.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Post</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Reports</TableHead>
          <TableHead>Age</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((j) => (
          <TableRow key={j.id}>
            <TableCell>
              <p className="font-medium text-foreground">{j.title}</p>
              <p className="text-xs text-muted-foreground">{j.company}{j.location ? ` · ${j.location}` : ""}</p>
            </TableCell>
            <TableCell>
              <Badge variant={j.status === "approved" ? "default" : j.status === "pending" ? "secondary" : "destructive"}>
                {j.status}
              </Badge>
            </TableCell>
            <TableCell className={j.report_count >= REPORT_LIMIT - 5 ? "font-semibold text-destructive" : ""}>
              {j.report_count}
            </TableCell>
            <TableCell>{timeAgo(j.created_at)}</TableCell>
            <TableCell className="space-x-2 text-right">
              {j.status !== "approved" && (
                <Button size="sm" onClick={() => onApprove(j)}>Approve</Button>
              )}
              {j.status !== "rejected" && (
                <Button size="sm" variant="outline" onClick={() => onReject(j)}>Reject</Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => onEdit(j)}>Edit</Button>
              <Button size="sm" variant="destructive" onClick={() => onDelete(j)}>Delete</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}