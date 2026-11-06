import { EndNode } from "./EndNode";
import type { Node } from "./Node";
import type { EngineState } from "./state";
import type { Workspace } from "./Workspace";

export interface WorkflowDef<S extends EngineState> {
  nodes: Node<S>[];
  start: string;
  end: string;
}

export interface RunOptions {
  /** Demo: a megadott node után a ciklus kilép, mintha megölték volna a folyamatot. */
  stopAfter?: string;
}

// A gráf és az EGYETLEN ciklus. Olvassa state.next-et, lépteti a node-ot, alkalmazza az
// Outcome-ot, menti a state-et, naplóz, és ismétel a záró node-ig.
export class Workflow<S extends EngineState> {
  private readonly nodes = new Map<string, Node<S>>();

  constructor(
    private readonly ws: Workspace,
    private readonly def: WorkflowDef<S>,
  ) {
    for (const node of def.nodes) this.nodes.set(node.id, node);
    this.validate();
  }

  /** Bekötési hiba indulás ELŐTT bukjon, ne a futás közepén. */
  private validate(): void {
    const end = this.nodes.get(this.def.end);
    if (!(end instanceof EndNode)) throw new Error(`a záró node (${this.def.end}) nem EndNode`);
    if (!this.nodes.has(this.def.start)) throw new Error(`nincs kezdő node: ${this.def.start}`);
    for (const node of this.nodes.values()) {
      for (const to of node.targets()) {
        if (!this.nodes.has(to)) throw new Error(`${node.id} -> ${to}: nincs ilyen node`);
      }
    }
  }

  private save(state: S): void {
    state.updated_at = new Date().toISOString();
    this.ws.save(state);
  }

  async run(state: S, opts: RunOptions = {}): Promise<void> {
    while (true) {
      const node = this.nodes.get(state.next);
      if (!node) throw new Error(`ismeretlen node: ${state.next}`);
      if (node instanceof EndNode) {
        state.status = "clean";
        this.save(state);
        this.ws.log({ event: "end", status: state.status });
        return;
      }

      const outcome = await node.step(state);
      this.ws.log({ event: "step", node: node.id, outcome });

      if (outcome.kind === "next") {
        state.next = outcome.to;
      } else {
        state.status = outcome.kind;
        state.stuck_reason = outcome.reason;
        state.next = this.def.end;
      }
      this.save(state);

      if (opts.stopAfter === node.id) {
        this.ws.log({ event: "stopped", after: node.id });
        return;
      }
    }
  }
}
