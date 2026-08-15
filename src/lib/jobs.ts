import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const JOB_TYPES = ["Full-time", "Internship", "Part-time", "Contract"] as const;
export const WORK_MODES = ["Onsite", "Remote", "Hybrid"] as const;
export const EXPERIENCE = ["Fresher", "0-1 yrs", "1-3 yrs", "3-5 yrs", "5+ yrs"] as const;
export const REPORT_LIMIT = 15;

export type JobRow = {
  id: string;
  posted_by: string;
  title: string;
  company: string;
  location: string | null;
  job_type: string | null;
  work_mode: string | null;
  experience: string | null;
  salary: string | null;
  description: string | null;
  apply_url: string | null;
  deadline: string | null;
  batch_year: number | null;
  image_url: string | null;
  status: "pending" | "approved" | "rejected";
  report_count: number;
  views: number;
  created_at: string;
  updated_at: string;
};

export const jobSchema = z.object({
  title: z.string().trim().min(3, "Role title is too short").max(120),
  company: z.string().trim().min(2, "Company name is too short").max(120),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  job_type: z.string().max(40),
  work_mode: z.string().max(40),
  experience: z.string().max(40),
  salary: z.string().trim().max(60).optional().or(z.literal("")),
  description: z.string().trim().min(20, "Add at least 20 characters of detail").max(4000),
  apply_url: z
    .string()
    .trim()
    .url("Apply link must be a valid URL")
    .max(500)
    .optional()
    .or(z.literal("")),
  deadline: z.string().max(20).optional().or(z.literal("")),
  batch_year: z.string().max(4).optional().or(z.literal("")),
});

export function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export async function signedImageUrl(path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from("job-images").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}