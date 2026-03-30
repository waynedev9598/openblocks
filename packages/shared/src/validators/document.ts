import { z } from "zod";

export const createDocumentSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type CreateDocument = z.infer<typeof createDocumentSchema>;

export const updateDocumentSchema = createDocumentSchema.partial();

export type UpdateDocument = z.infer<typeof updateDocumentSchema>;
