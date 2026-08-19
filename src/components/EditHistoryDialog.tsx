import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { timeAgo, type JobRow } from "@/lib/jobs";

type EditRow = {
  id: string;
  editor_id: string | null;
  changes: Record<string, [unknown, unknown]>;
  created_at: string;
};

function label(v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

export function EditHistoryDialog({
  job,
  open,
  onOpenChange,
}: {
  job: JobRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["job-edits", job?.id],
    enabled: open && !!job,
    queryFn: async () => {
      const { data: edits, error } = await supabase
        .from("job_edits")
        .select("id, editor_id, changes, created_at")
        .eq("job_id", job!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows = (edits ?? []) as unknown as EditRow[];
      const ids = [...new Set(rows.map((r) => r.editor_id).filter(Boolean))] as string[];
      let names: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        names = Object.fromEntries((profs ?? []).map((p) => [p.id, p.full_name ?? "Member"]));
      }
      return rows.map((r) => ({ ...r, editorName: r.editor_id ? names[r.editor_id] ?? "Member" : "System" }));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <History className="h-5 w-5 text-grape" /> Edit history
          </DialogTitle>
          <DialogDescription>{job ? `${job.title} · ${job.company}` : ""}</DialogDescription>
        </DialogHeader>

        {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Loading history…</p>}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No edits recorded for this post yet.</p>
        )}

        <ol className="space-y-3">
          {data?.map((e) => (
            <li key={e.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{e.editorName}</p>
                <span className="text-xs text-muted-foreground">{timeAgo(e.created_at)}</span>
              </div>
              <div className="mt-2 space-y-1">
                {Object.entries(e.changes ?? {}).map(([field, pair]) => (
                  <div key={field} className="text-xs">
                    <Badge variant="secondary" className="mr-2">{field.replace(/_/g, " ")}</Badge>
                    <span className="text-muted-foreground line-through">{label(pair?.[0])}</span>
                    <span className="mx-1 text-muted-foreground">→</span>
                    <span className="text-foreground">{label(pair?.[1])}</span>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}