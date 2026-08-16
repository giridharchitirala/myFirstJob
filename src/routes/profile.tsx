import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Building2, GraduationCap, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAND } from "@/lib/brand";

const title = `My profile — ${BRAND}`;
const description = "Manage your fresher or recruiter profile, skills, college details and email job alerts.";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Add your name").max(80),
  headline: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(600).optional(),
  college: z.string().trim().max(120).optional(),
  grad_year: z.string().max(4).optional(),
  skills: z.string().trim().max(300).optional(),
  linkedin_url: z.string().trim().url("LinkedIn must be a valid URL").max(300).optional().or(z.literal("")),
  location: z.string().trim().max(120).optional(),
  company_name: z.string().trim().max(120).optional(),
  company_website: z.string().trim().url("Website must be a valid URL").max(300).optional().or(z.literal("")),
});

function ProfilePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    headline: "",
    bio: "",
    college: "",
    grad_year: "",
    skills: "",
    linkedin_url: "",
    location: "",
    company_name: "",
    company_website: "",
  });
  const [accountType, setAccountType] = useState("student");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      full_name: data.full_name ?? "",
      headline: data.headline ?? "",
      bio: data.bio ?? "",
      college: data.college ?? "",
      grad_year: data.grad_year ? String(data.grad_year) : "",
      skills: data.skills ?? "",
      linkedin_url: data.linkedin_url ?? "",
      location: data.location ?? "",
      company_name: data.company_name ?? "",
      company_website: data.company_website ?? "",
    });
    setAccountType(data.account_type ?? "student");
    setNotify(data.notify_email ?? true);
  }, [data]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const isHr = accountType === "hr";

  async function save() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    setBusy(true);
    const d = parsed.data;
    const { error } = await supabase.from("profiles").upsert({
      id: user!.id,
      full_name: d.full_name,
      headline: d.headline || null,
      bio: d.bio || null,
      college: d.college || null,
      grad_year: d.grad_year ? Number(d.grad_year) : null,
      skills: d.skills || null,
      linkedin_url: d.linkedin_url || null,
      location: d.location || null,
      company_name: d.company_name || null,
      company_website: d.company_website || null,
      account_type: accountType,
      notify_email: notify,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile saved");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-foreground">
          {isHr ? <Building2 className="h-6 w-6 text-grape" /> : <GraduationCap className="h-6 w-6 text-brand-deep" />}
          My profile
        </h1>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-4 w-4" /> {isHr ? "Recruiter details" : "Fresher details"}
            </CardTitle>
            <CardDescription>{user?.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              {[
                { id: "student", label: "I'm a fresher" },
                { id: "hr", label: "I'm a company / HR" },
              ].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setAccountType(o.id)}
                  className={`flex-1 rounded-lg border border-border px-3 py-2 text-sm ${
                    accountType === o.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Full name</Label>
                <Input value={form.full_name} maxLength={80} onChange={(e) => set("full_name", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Headline</Label>
                <Input
                  value={form.headline}
                  maxLength={120}
                  placeholder={isHr ? "Talent acquisition, Acme" : "B.Tech CSE '26 · React & Java"}
                  onChange={(e) => set("headline", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>City</Label>
                <Input value={form.location} maxLength={120} onChange={(e) => set("location", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>LinkedIn</Label>
                <Input value={form.linkedin_url} maxLength={300} placeholder="https://" onChange={(e) => set("linkedin_url", e.target.value)} />
              </div>
              {isHr ? (
                <>
                  <div className="space-y-1">
                    <Label>Company</Label>
                    <Input value={form.company_name} maxLength={120} onChange={(e) => set("company_name", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Company website</Label>
                    <Input value={form.company_website} maxLength={300} placeholder="https://" onChange={(e) => set("company_website", e.target.value)} />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label>College</Label>
                    <Input value={form.college} maxLength={120} onChange={(e) => set("college", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Graduation year</Label>
                    <Input
                      value={form.grad_year}
                      inputMode="numeric"
                      maxLength={4}
                      onChange={(e) => set("grad_year", e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="space-y-1">
              <Label>Skills</Label>
              <Input value={form.skills} maxLength={300} placeholder="React, SQL, Python" onChange={(e) => set("skills", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>About</Label>
              <Textarea rows={4} maxLength={600} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-accent/40 p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Email me matching jobs</p>
                <p className="text-xs text-muted-foreground">
                  Only if you allow it — we email new approved openings that match your skills.
                </p>
              </div>
              <Switch checked={notify} onCheckedChange={setNotify} />
            </div>

            <Button onClick={save} disabled={busy} className="w-full">
              {busy ? "Saving…" : "Save profile"}
            </Button>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}