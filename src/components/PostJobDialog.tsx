import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXPERIENCE, JOB_TYPES, WORK_MODES, jobSchema } from "@/lib/jobs";

const empty = {
  title: "",
  company: "",
  location: "",
  job_type: "Full-time",
  work_mode: "Onsite",
  experience: "Fresher",
  salary: "",
  description: "",
  apply_url: "",
  deadline: "",
  batch_year: "",
};

export function PostJobDialog({
  open,
  onOpenChange,
  userId,
  onPosted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  onPosted: () => void;
}) {
  const [form, setForm] = useState({ ...empty });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof empty, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = jobSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setBusy(true);
    try {
      let imagePath: string | null = null;
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error("Image must be under 5 MB");
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("job-images").upload(path, file);
        if (upErr) throw upErr;
        imagePath = path;
      }
      const d = parsed.data;
      const { error } = await supabase.from("jobs").insert({
        posted_by: userId,
        title: d.title,
        company: d.company,
        location: d.location || null,
        job_type: d.job_type,
        work_mode: d.work_mode,
        experience: d.experience,
        salary: d.salary || null,
        description: d.description,
        apply_url: d.apply_url || null,
        deadline: d.deadline || null,
        batch_year: d.batch_year ? Number(d.batch_year) : null,
        image_url: imagePath,
      });
      if (error) throw error;
      toast.success("Submitted for review — it goes live once a moderator approves it.");
      setForm({ ...empty });
      setFile(null);
      onOpenChange(false);
      onPosted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit the post");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Post an opening</DialogTitle>
          <DialogDescription>
            Only genuine openings please. Posts flagged 15 times are removed automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Role title</Label>
              <Input value={form.title} maxLength={120} onChange={(e) => set("title", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Company</Label>
              <Input value={form.company} maxLength={120} onChange={(e) => set("company", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Input value={form.location} maxLength={120} onChange={(e) => set("location", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Salary / stipend</Label>
              <Input value={form.salary} maxLength={60} onChange={(e) => set("salary", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={form.job_type} onValueChange={(v) => set("job_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Work mode</Label>
              <Select value={form.work_mode} onValueChange={(v) => set("work_mode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WORK_MODES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Experience</Label>
              <Select value={form.experience} onValueChange={(v) => set("experience", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPERIENCE.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Batch year</Label>
              <Input value={form.batch_year} inputMode="numeric" maxLength={4} onChange={(e) => set("batch_year", e.target.value.replace(/\D/g, ""))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Apply link</Label>
            <Input value={form.apply_url} maxLength={500} placeholder="https://" onChange={(e) => set("apply_url", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Application deadline</Label>
            <Input type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea rows={5} value={form.description} maxLength={4000} onChange={(e) => set("description", e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>Poster image (optional)</Label>
            <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit for review"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}