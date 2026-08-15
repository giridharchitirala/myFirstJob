import { createFileRoute } from "@tanstack/react-router";
import PlacementApp from "@/components/PlacementApp";

const title = "Campus Placement Board — Jobs & Internships";
const description =
  "Browse, post and track campus placement drives, internships and job openings shared by students and admins.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: PlacementApp,
});
