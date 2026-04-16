import type { BlockDefinition } from "@openblock/shared";

export default {
  name: "reels-analysis",
  displayName: "Reels Analysis",
  description: "Save and analyze Instagram reels with transcripts",
  version: "0.1.0",
  nav: [
    {
      section: "Reels Analysis",
      items: [
        { label: "Reels", path: "/reels-analysis/reels", icon: "Film" },
      ],
    },
  ],
  routePrefix: "reels-analysis",
} satisfies BlockDefinition;
