export const BRAND = "MyFirstJob";
export const TAGLINE = "Freshers-only jobs, shared by people who've been there.";
export const SUPPORT_EMAIL = "indoretechnologypvt@gmail.com";
export const DEVELOPER = "Shanmukh";

export const QUOTES = [
  "Your first job doesn't define you — it launches you.",
  "Someone once referred you a chance. Pass it on.",
  "Freshers helping freshers beats any job portal.",
  "The best opening is the one a friend told you about.",
  "Apply before you feel ready. Ready comes later.",
  "Every expert was once a fresher with no experience.",
] as const;

export function quoteOfTheDay() {
  const i = Math.floor(Date.now() / 86400000) % QUOTES.length;
  return QUOTES[i]!;
}