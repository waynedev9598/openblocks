import type { BlockDefinition } from "@openblock/shared";

export default {
  name: "starter",
  displayName: "Starter Block",
  description: "Example block demonstrating all OpenBlock patterns",
  version: "0.1.0",
  nav: [
    {
      section: "Starter",
      items: [
        { label: "Items", path: "/starter/items", icon: "List" },
        { label: "Board", path: "/starter/board", icon: "Kanban" },
      ],
    },
  ],
  routePrefix: "starter",
} satisfies BlockDefinition;
