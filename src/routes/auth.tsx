import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const title = "Sign in — MyFirstJob freshers board";
const description =
  "Join MyFirstJob as a fresher or as a company recruiter to post verified entry-level openings and get job alerts.";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(72),
  fullName: z.string().trim().max(80).optional(),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [accountType, setAccountType] = useState<"student" | "hr">("student");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, fullName });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: parsed.data.fullName || undefined,
              account_type: accountType,
              company_name: accountType === "hr" ? companyName.trim().slice(0, 120) : undefined,
            },
          },
        });
        if (error) throw error;
        toast.success("Account created — check your email to confirm, then start posting.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast.success("Welcome back");
      }
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{mode === "signin" ? "Welcome back" : "Create your MyFirstJob account"}</CardTitle>
            <CardDescription>
              Freshers-only board. Every post is reviewed by a moderator before it goes live.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode === "signup" && (
              <div className="flex gap-2">
                {([
                  { id: "student", label: "I'm a fresher" },
                  { id: "hr", label: "Company / HR" },
                ] as const).map((o) => (
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
            )}
            <Button variant="outline" className="w-full" onClick={google} type="button">
              Continue with Google
            </Button>
            <div className="text-center text-xs text-muted-foreground">or use email</div>
            <form onSubmit={submit} className="space-y-3">
              {mode === "signup" && (
                <div className="space-y-1">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={fullName} maxLength={80} onChange={(e) => setFullName(e.target.value)} />
                </div>
              )}
              {mode === "signup" && accountType === "hr" && (
                <div className="space-y-1">
                  <Label htmlFor="company">Company name</Label>
                  <Input
                    id="company"
                    value={companyName}
                    maxLength={120}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} maxLength={255} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="pr-10"
                    value={password}
                    maxLength={72}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>
            <button
              type="button"
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
            </button>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}