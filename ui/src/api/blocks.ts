import type { BlockDefinition } from "@openblock/shared";
import { api } from "./client";

export const blocksApi = {
  listAvailable: () => api.get<BlockDefinition[]>("/blocks"),
};
