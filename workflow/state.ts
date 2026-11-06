import { z } from "zod";
import { EngineStateSchema } from "../engine/state";

export const MailSchema = z.object({
  ticket_id: z.string(),
  from: z.string(),
  name: z.string(),
  subject: z.string(),
  received_at: z.string(),
  body: z.string(),
});

export const ReplySchema = z.object({
  subject: z.string(),
  body: z.string(),
});

// A válaszlevél-workflow állapota: az engine mezői plusz a saját adataink.
export const ReplyStateSchema = EngineStateSchema.extend({
  mail: MailSchema.optional(),
  draft: ReplySchema.optional(),
  check: z.object({ green: z.boolean(), problems: z.array(z.string()) }).optional(),
  handover: z.string().optional(), // az escalate node átadó sora
});

export type Mail = z.infer<typeof MailSchema>;
export type Reply = z.infer<typeof ReplySchema>;
export type ReplyState = z.infer<typeof ReplyStateSchema>;
