import type { Workspace } from "./Workspace";

// Amit minden node-nak tudnia kell a futásról. A node ezen keresztül ér el mindent,
// importból semmit: így a teszt egy másik ctx-szel ugyanazt a node-ot futtatja.
export interface RunContext {
  root: string;
  ws: Workspace;
}
