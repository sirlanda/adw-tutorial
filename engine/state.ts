import { z } from "zod";

// Minden state.json ezekkel a mezőkkel indul; a workflow .extend()-del bővíti.
// A state sima adat: a szabályok a fölötte dolgozó kódban élnek, nem benne.
export const EngineStateSchema = z.object({
  ticket_id: z.string(),
  execution_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  status: z.enum(["running", "waiting", "clean", "stuck", "max_reached"]),
  next: z.string(),
  stuck_reason: z.string().optional(),
  iteration: z.number().int().default(0), // hányadik javítási kör (később)
  seq: z.number().int().default(1), // a következő io/riport fájl sorszáma
  nodes: z.record(z.string(), z.string()).default({}), // node neve -> utolsó státusza
});

export type EngineState = z.infer<typeof EngineStateSchema>;

export function engineState(ticketId: string, executionId: string, start: string): EngineState {
  const now = new Date().toISOString();
  return EngineStateSchema.parse({
    ticket_id: ticketId,
    execution_id: executionId,
    created_at: now,
    updated_at: now,
    status: "running",
    next: start,
  });
}
