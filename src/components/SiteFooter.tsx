import { Link } from "@tanstack/react-router";
import { Heart, Mail, Sparkles } from "lucide-react";
import { BRAND, DEVELOPER, SUPPORT_EMAIL, TAGLINE, quoteOfTheDay } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-accent/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="text-lg font-bold text-foreground">{BRAND}</p>
          <p className="mt-2 text-sm text-muted-foreground">{TAGLINE}</p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-foreground">
            <Sparkles className="h-3.5 w-3.5" /> {quoteOfTheDay()}
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-foreground">Explore</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">Fresher jobs</Link></li>
            <li><Link to="/shoutouts" className="hover:text-foreground">Shoutouts &amp; referrals</Link></li>
            <li><Link to="/chat" className="hover:text-foreground">Group chat</Link></li>
            <li><Link to="/profile" className="hover:text-foreground">My profile</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-foreground">Support</p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-2 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <Mail className="h-4 w-4" /> {SUPPORT_EMAIL}
          </a>
          <p className="mt-4 text-xs text-muted-foreground">
            Posts flagged by 15 members are removed automatically.
          </p>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {BRAND} · Developed with{" "}
        <Heart className="inline h-3 w-3 text-coral" /> by {DEVELOPER}
      </div>
    </footer>
  );
}