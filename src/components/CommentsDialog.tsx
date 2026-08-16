import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { timeAgo, type JobRow } from "@/lib/jobs";

export function CommentsDialog({
  job,
  onOpenChange,
}: {
  job: JobRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const { data } = useQuery({
    queryKey: ["comments", job?.id],
    enabled: !!job,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_comments")
        .select("*")
        .eq("job_id", job!.id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const text = body.trim();
      if (!user) throw new Error("Sign in to comment");
      if (text.length < 2) throw new Error("Write a comment first");
      const { error } = await supabase.from("job_comments").insert({
        job_id: job!.id,
        user_id: user.id,
        author_name: (user.user_metadata?.["full_name"] as string) || user.email?.split("@")[0] || "Member",
        body: text.slice(0, 800),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["comments", job?.id] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not comment"),
  });

  async function remove(id: string) {
    const { error } = await supabase.from("job_comments").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["comments", job?.id] });
  }

  return (
    <Dialog open={!!job} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
          <DialogDescription>{job?.title} · {job?.company}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {data?.map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-accent/30 p-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
                {c.author_name}
                <span className="font-normal text-muted-foreground">{timeAgo(c.created_at)}</span>
                {(isAdmin || c.user_id === user?.id) && (
                  <button className="ml-auto text-muted-foreground hover:text-foreground" onClick={() => remove(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{c.body}</p>
            </div>
          ))}
          {(data?.length ?? 0) === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No comments yet.</p>
          )}
        </div>
        {user ? (
          <div className="space-y-2">
            <Textarea
              rows={3}
              maxLength={800}
              placeholder="Ask a question or share what you know about this role…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <Button className="w-full" onClick={() => add.mutate()} disabled={add.isPending}>
              {add.isPending ? "Posting…" : "Post comment"}
            </Button>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">Sign in to join the discussion.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}