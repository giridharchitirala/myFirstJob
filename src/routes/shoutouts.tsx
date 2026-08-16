import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Megaphone, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/jobs";
import { BRAND } from "@/lib/brand";

const title = `Shoutouts & referrals — ${BRAND}`;
const description =
  "Ask for referrals, share hiring updates and cheer on other freshers with short community shoutouts.";

export const Route = createFileRoute("/shoutouts")({
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
  component: ShoutoutsPage,
});

function ShoutoutsPage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["shoutouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shoutouts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const post = useMutation({
    mutationFn: async () => {
      const text = body.trim();
      if (!user) throw new Error("Sign in to post a shoutout");
      if (text.length < 3) throw new Error("Write a little more");
      const { error } = await supabase.from("shoutouts").insert({
        user_id: user.id,
        author_name: (user.user_metadata?.["full_name"] as string) || user.email?.split("@")[0] || "Member",
        body: text.slice(0, 500),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["shoutouts"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not post"),
  });

  async function remove(id: string) {
    const { error } = await supabase.from("shoutouts").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["shoutouts"] });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-foreground">
          <Megaphone className="h-6 w-6 text-brand-deep" /> Shoutouts
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Referral requests, drive alerts, interview tips — keep it short and useful.
        </p>

        {user ? (
          <div className="mt-6 rounded-xl border border-border bg-card p-4">
            <Textarea
              rows={3}
              maxLength={500}
              placeholder="Share something helpful for freshers…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="mt-2 flex justify-end">
              <Button onClick={() => post.mutate()} disabled={post.isPending}>
                {post.isPending ? "Posting…" : "Post shoutout"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-6 rounded-xl border border-border bg-accent/50 p-4 text-sm">
            Sign in to add your own shoutout.
          </p>
        )}

        <div className="mt-6 space-y-3">
          {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          {data?.map((s) => (
            <Card key={s.id} className="border-l-4 border-l-brand">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {s.author_name}
                  <span className="text-xs font-normal text-muted-foreground">{timeAgo(s.created_at)}</span>
                  {(isAdmin || s.user_id === user?.id) && (
                    <Button size="sm" variant="ghost" className="ml-auto" onClick={() => remove(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{s.body}</p>
              </CardContent>
            </Card>
          ))}
          {!isLoading && (data?.length ?? 0) === 0 && (
            <p className="py-12 text-center text-muted-foreground">No shoutouts yet. Be the first.</p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}