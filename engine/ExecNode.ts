import type { z } from "zod";
import { Node } from "./Node";
import { NodeFiles } from "./NodeFiles";
import { NodeOutputBaseSchema } from "./NodeOutput";
import { next, stuck, type Failure, type Outcome } from "./Outcome";
import type { RunContext } from "./RunContext";
import type { EngineState } from "./state";

/** A gépezet hibája: a node nem tudott érvényes outputot adni. A futás elakad, riport készül. */
export class NodeFailure extends Error {}

// Determinisztikus node típusos szerződéssel. A step() a sablon: input fájl, futás,
// validálás, output fájl, riport, apply. A leszármazott csak a három horgot adja.
export abstract class ExecNode<
  S extends EngineState,
  In,
  Out extends z.infer<typeof NodeOutputBaseSchema>,
> extends Node<S> {
  constructor(
    protected readonly ctx: RunContext,
    id: string,
    readonly name: string,
    protected readonly to: string,
    protected readonly schema: z.ZodType<Out>,
  ) {
    super(id);
  }

  /** Korlát-ellenőrzés a munka ELŐTT: ha egy limit elfogyott, a node el sem indul. */
  protected guard(_state: S): Failure | null {
    return null;
  }

  /** Mit kap a node a state-ből. Ez kerül az input fájlba, más forrása nincs. */
  protected abstract input(state: S): In;

  /** A munka. Visszaadja az outputot, a step validálja. */
  protected abstract run(state: S, input: In): Promise<Out>;

  /** Az egyetlen hely, ahol a validált output a state-be kerül. */
  protected abstract apply(state: S, out: Out): Failure | null;

  async step(state: S): Promise<Outcome> {
    const blocked = this.guard(state);
    if (blocked) {
      this.ctx.ws.log({ event: "guard", node: this.name, failure: blocked });
      return blocked;
    }
    const files = new NodeFiles(this.ctx.ws, state.seq, this.name);
    state.nodes[this.name] = "running";
    this.ctx.ws.save(state);
    this.ctx.ws.log({ event: "node_start", node: this.name, seq: state.seq });
    const started = Date.now();

    const input = this.input(state);
    files.writeInput(input);
    let out: Out;
    try {
      out = this.schema.parse(await this.run(state, input)); // a séma a szerződés: ami nem fér bele, itt bukik
    } catch (e) {
      if (!(e instanceof NodeFailure)) throw e;
      files.writeReport({ status: "stuck", done: [], problems: [], stuck_reason: e.message });
      state.nodes[this.name] = "stuck";
      state.seq += 1;
      this.ctx.ws.log({ event: "node_end", node: this.name, status: "stuck" });
      return stuck(e.message);
    }
    files.writeOutput(out);
    files.writeReport(out, { duration_s: ((Date.now() - started) / 1000).toFixed(1) });

    state.nodes[this.name] = out.status;
    state.seq += 1;
    this.ctx.ws.log({ event: "node_end", node: this.name, status: out.status });

    // Ha a node maga mondja, hogy elakadt, a futás is elakad; különben az apply dönt.
    if (out.status === "stuck") return stuck(out.stuck_reason ?? `${this.name}: stuck`);
    const failure = this.apply(state, out);
    return failure ?? next(this.to);
  }

  targets(): string[] {
    return [this.to];
  }
}
