import { z } from "zod";

// Minden node-output ebből indul. A riport ebből generálódik, nem a node írja.
//   status:   ok = rendben; issues = elkészült, de vannak problémák; stuck = nem tudta elvégezni
//   done:     mi történt, egy sor egy tétel
//   problems: "[severity] hely: összefoglaló" sorok
export const NodeOutputBaseSchema = z.object({
  status: z.enum(["ok", "issues", "stuck"]),
  done: z.array(z.string()),
  problems: z.array(z.string()),
  stuck_reason: z.string().optional(),
});

export type NodeOutputBase = z.infer<typeof NodeOutputBaseSchema>;
