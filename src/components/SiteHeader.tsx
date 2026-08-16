import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, MessagesSquare, Megaphone, Rocket, Shield, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BRAND } from "@/lib/brand";

const linkCls =
  "rounded-full px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

export function SiteHeader() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-foreground">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Rocket className="h-4 w-4" />
          </span>
          {BRAND}
        </Link>
        <nav className="ml-auto flex flex-wrap items-center gap-1 text-sm">
          <Link to="/" className={linkCls}>Jobs</Link>
          <Link to="/shoutouts" className={linkCls}>
            <Megaphone className="mr-1 inline h-4 w-4 text-brand-deep" />Shoutouts
          </Link>
          <Link to="/chat" className={linkCls}>
            <MessagesSquare className="mr-1 inline h-4 w-4 text-sky" />Chat
          </Link>
          {user && <Link to="/dashboard" className={linkCls}>My posts</Link>}
          {user && (
            <Link to="/profile" className={linkCls}>
              <UserRound className="mr-1 inline h-4 w-4 text-mint" />Profile
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" className={linkCls}>
              <Shield className="mr-1 inline h-4 w-4 text-coral" />Admin
            </Link>
          )}
          {user ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
            >
              <LogOut className="mr-1 h-4 w-4" /> Sign out
            </Button>
          ) : (
            <Button size="sm" onClick={() => navigate({ to: "/auth" })}>Sign in</Button>
          )}
        </nav>
      </div>
    </header>
  );
}