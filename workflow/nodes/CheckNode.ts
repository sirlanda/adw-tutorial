import { z } from "zod";
import { ExecNode } from "../../engine/ExecNode";
import { NodeOutputBaseSchema } from "../../engine/NodeOutput";
import type { Outcome } from "../../engine/Outcome";
import type { ReplyContext } from "../ReplyContext";
import type { Mail, Reply, ReplyState } from "../state";

const CheckOutputSchema = NodeOutputBaseSchema.extend({ green: z.boolean() });
type CheckOutput = z.infer<typeof CheckOutputSchema>;
type CheckInput = { mail: Mail; reply: Reply };

// A kapu. A szabályokat a Checker service tudja, a node csak a szerződést adja hozzá.
export class CheckNode extends ExecNode<ReplyState, CheckInput, CheckOutput> {
  constructor(
    protected readonly ctx: ReplyContext,
    to: string,
  ) {
    super(ctx, "check", "checker", to, CheckOutputSchema);
  }

  protected input(state: ReplyState): CheckInput {
    return { mail: state.mail!, reply: state.draft! };
  }

  protected async run(_state: ReplyState, input: CheckInput): Promise<CheckOutput> {
    const problems = this.ctx.checker.check(input.mail, input.reply);
    const green = problems.every((p) => !p.startsWith("[error]"));
    return {
      status: green ? "ok" : "issues",
      done: [`${problems.length} szabálysértés, a kapu ${green ? "zöld" : "piros"}`],
      problems,
      green,
    };
  }

  protected apply(state: ReplyState, out: CheckOutput): Outcome | null {
    state.check = { green: out.green, problems: out.problems };
    return null;
  }
}
