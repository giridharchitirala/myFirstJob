import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { JobCard } from "@/components/JobCard";
import { PostJobDialog } from "@/components/PostJobDialog";
import { CommentsDialog } from "@/components/CommentsDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { JobRow } from "@/lib/jobs";

const title = "My posts — MyFirstJob";
const description = "Edit your fresher job posts and track approval status, views and report counts on MyFirstJob.";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editJob, setEditJob] = useState<JobRow | null>(null);
  const [commentJob, setCommentJob] = useState<JobRow | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["jobs", "mine", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("posted_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as JobRow[];
    },
  });

  async function remove(id: string) {
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Post deleted");
    qc.invalidateQueries({ queryKey: ["jobs"] });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-foreground">My posts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pending posts are visible only to you until a moderator approves them.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
          {data?.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onComments={setCommentJob}
              footer={
                <div className="flex items-center gap-2 border-t border-border pt-3">
                  <Badge
                    variant={job.status === "approved" ? "default" : job.status === "pending" ? "secondary" : "destructive"}
                  >
                    {job.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{job.report_count} reports</span>
                  <Button size="sm" variant="outline" className="ml-auto" onClick={() => setEditJob(job)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(job.id)}>
                    Delete
                  </Button>
                </div>
              }
            />
          ))}
        </div>
        {!isLoading && (data?.length ?? 0) === 0 && (
          <p className="mt-16 text-center text-muted-foreground">You haven't posted anything yet.</p>
        )}
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
            qc.invalidateQueries({ queryKey: ["jobs"] });
          }}
        />
      )}
      <CommentsDialog job={commentJob} onOpenChange={(v) => !v && setCommentJob(null)} />
    </div>
  );
}