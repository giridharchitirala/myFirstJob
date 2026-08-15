import { Link, useNavigate } from "@tanstack/react-router";
import { Briefcase, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function SiteHeader() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
          <Briefcase className="h-5 w-5 text-primary" />
          CampusHire
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Link to="/" className="rounded-md px-3 py-2 text-muted-foreground hover:text-foreground">Jobs</Link>
          {user && (
            <Link to="/dashboard" className="rounded-md px-3 py-2 text-muted-foreground hover:text-foreground">
              My posts
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-muted-foreground hover:text-foreground">
              <Shield className="h-4 w-4" /> Admin
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