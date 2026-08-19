import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, CheckCheck, MessagesSquare, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { timeAgo } from "@/lib/jobs";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

const ROOMS = [
  { id: "general", label: "General" },
  { id: "referrals", label: "Referrals" },
  { id: "interviews", label: "Interview prep" },
  { id: "offcampus", label: "Off-campus drives" },
];

const title = `Freshers group chat — ${BRAND}`;
const description = "Live group chat rooms for freshers: referrals, interview prep and off-campus drive alerts.";

export const Route = createFileRoute("/chat")({
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
  component: ChatPage,
});

function ChatPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [room, setRoom] = useState("general");
  const [text, setText] = useState("");
  const [online, setOnline] = useState<{ id: string; name: string }[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const myName = useMemo(
    () =>
      (user?.user_metadata?.["full_name"] as string) || user?.email?.split("@")[0] || "Member",
    [user],
  );

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data } = useQuery({
    queryKey: ["chat", room],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room", room)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data.reverse();
    },
  });

  const { data: reads } = useQuery({
    queryKey: ["chat-reads", room],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_reads")
        .select("user_id, user_name, last_read_at")
        .eq("room", room);
      if (error) throw error;
      return data;
    },
  });

  const markRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("chat_reads")
      .upsert(
        { user_id: user.id, room, user_name: myName, last_read_at: new Date().toISOString() },
        { onConflict: "user_id,room" },
      );
  }, [user, room, myName]);

  // Live messages + read receipts
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`chat-room-${room}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages", filter: `room=eq.${room}` },
        () => qc.invalidateQueries({ queryKey: ["chat", room] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_reads", filter: `room=eq.${room}` },
        () => qc.invalidateQueries({ queryKey: ["chat-reads", room] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, room, qc]);

  // Presence: who is online in this room
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`presence-${room}`, {
      config: { presence: { key: user.id } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ name: string }>();
        setOnline(
          Object.entries(state).map(([id, metas]) => ({
            id,
            name: metas[0]?.name ?? "Member",
          })),
        );
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void channel.track({ name: myName });
      });
    return () => {
      supabase.removeChannel(channel);
      setOnline([]);
    };
  }, [user, room, myName]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [data?.length, room]);

  useEffect(() => {
    if (!user) return;
    void markRead();
  }, [user, room, data?.length, markRead]);

  const othersReads = (reads ?? []).filter((r) => r.user_id !== user?.id);
  const seenCount = (createdAt: string) =>
    othersReads.filter((r) => new Date(r.last_read_at).getTime() >= new Date(createdAt).getTime()).length;

  async function send() {
    const body = text.trim();
    if (!body || !user) return;
    setText("");
    const { error } = await supabase.from("chat_messages").insert({
      room,
      user_id: user.id,
      author_name: myName,
      body: body.slice(0, 800),
    });
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["chat", room] });
  }

  async function remove(id: string) {
    await supabase.from("chat_messages").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["chat", room] });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-foreground">
          <MessagesSquare className="h-6 w-6 text-sky" /> Group chat
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-mint" />
            </span>
            {online.length} online
          </span>
          <span className="flex flex-wrap gap-1">
            {online.slice(0, 6).map((o) => (
              <span key={o.id} className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                {o.id === user?.id ? "You" : o.name}
              </span>
            ))}
            {online.length > 6 && <span className="text-xs">+{online.length - 6} more</span>}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {ROOMS.map((r) => (
            <button
              key={r.id}
              onClick={() => setRoom(r.id)}
              className={cn(
                "rounded-full border border-border px-3 py-1 text-sm transition-colors",
                room === r.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="mt-4 h-[55vh] space-y-3 overflow-y-auto rounded-xl border border-border bg-card p-4">
          {data?.map((m) => {
            const mine = m.user_id === user?.id;
            return (
              <div key={m.id} className={cn("flex", mine && "justify-end")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                    mine ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground",
                  )}
                >
                  <p className="text-xs font-semibold opacity-80">
                    {m.author_name} · {timeAgo(m.created_at)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                  {mine && (
                    <p className="mt-1 inline-flex items-center gap-1 text-[11px] opacity-80">
                      {seenCount(m.created_at) > 0 ? (
                        <>
                          <CheckCheck className="h-3 w-3" /> Seen by {seenCount(m.created_at)}
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3" /> Sent
                        </>
                      )}
                    </p>
                  )}
                  {(mine || isAdmin) && (
                    <button className="mt-1 text-xs opacity-70 hover:opacity-100" onClick={() => remove(m.id)}>
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {(data?.length ?? 0) === 0 && (
            <p className="py-16 text-center text-muted-foreground">No messages yet — say hello.</p>
          )}
          <div ref={endRef} />
        </div>

        <div className="mt-3 flex gap-2">
          <Input
            value={text}
            maxLength={800}
            placeholder={`Message #${room}`}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
          />
          <Button onClick={() => void send()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}