import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { JobCard } from "@/components/JobCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { JobRow } from "@/lib/jobs";

const title = "My posts — CampusHire";
const description = "Track the approval status, views and report count of every opening you posted on CampusHire.";

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
    if (error) return toast.error(error.message);
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
              footer={
                <div className="flex items-center gap-2 border-t border-border pt-3">
                  <Badge
                    variant={job.status === "approved" ? "default" : job.status === "pending" ? "secondary" : "destructive"}
                  >
                    {job.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{job.report_count} reports</span>
                  <Button size="sm" variant="ghost" className="ml-auto" onClick={() => remove(job.id)}>
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
    </div>
  );
}