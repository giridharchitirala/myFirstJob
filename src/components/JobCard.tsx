import { useEffect, useState } from "react";
import { Building2, CalendarClock, Flag, MapPin, ExternalLink, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { signedImageUrl, timeAgo, type JobRow } from "@/lib/jobs";

export function JobCard({
  job,
  onReport,
  onComments,
  footer,
}: {
  job: JobRow;
  onReport?: (job: JobRow) => void;
  onComments?: (job: JobRow) => void;
  footer?: React.ReactNode;
}) {
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    signedImageUrl(job.image_url).then((u) => active && setImg(u));
    return () => {
      active = false;
    };
  }, [job.image_url]);

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      {img && (
        <img src={img} alt={`${job.company} — ${job.title}`} loading="lazy" className="h-40 w-full object-cover" />
      )}
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold leading-tight text-foreground">{job.title}</h3>
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" /> {job.company}
            </p>
          </div>
          <Badge variant="secondary">{job.job_type ?? "Job"}</Badge>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {job.location && (
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
          )}
          {job.work_mode && <span>{job.work_mode}</span>}
          {job.experience && <span>{job.experience}</span>}
          {job.salary && <span>{job.salary}</span>}
          {job.deadline && (
            <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />{job.deadline}</span>
          )}
        </div>
        {job.description && (
          <p className="line-clamp-3 text-sm text-muted-foreground">{job.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {job.apply_url && (
            <Button asChild size="sm">
              <a href={job.apply_url} target="_blank" rel="noopener noreferrer">
                Apply <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
          )}
          {onReport && (
            <Button size="sm" variant="ghost" onClick={() => onReport(job)}>
              <Flag className="mr-1 h-3.5 w-3.5" /> Report
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{timeAgo(job.created_at)}</span>
        </div>
        {footer}
      </CardContent>
    </Card>
  );
}