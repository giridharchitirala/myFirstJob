import { Link } from "@tanstack/react-router";
import { Mail, ShieldCheck } from "lucide-react";

export const SUPPORT_EMAIL = "indoretechnologypvt@gmail.com";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">CampusHire</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            A verified placement board. Every post is reviewed before it goes live and
            removed automatically when the community flags it as fake.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Explore</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">Job board</Link></li>
            <li><Link to="/dashboard" className="hover:text-foreground">My posts</Link></li>
            <li><Link to="/auth" className="hover:text-foreground">Sign in</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Support</h4>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Mail className="h-4 w-4" /> {SUPPORT_EMAIL}
          </a>
          <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4" /> Moderated 24/7 · auto-removal at 15 reports
          </p>
        </div>
      </div>
      <div className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground">
        Developed by <span className="font-semibold text-foreground">Shanmukh</span> ·
        © {new Date().getFullYear()} CampusHire. All rights reserved.
      </div>
    </footer>
  );
}