import { Node } from "./Node";
import { next, type Outcome } from "./Outcome";

// A legkisebb node: egy függvény a state fölött, aztán tovább a következőre.
export class ScriptNode<S> extends Node<S> {
  constructor(
    id: string,
    private readonly to: string,
    private readonly fn: (state: S) => void | Promise<void>,
  ) {
    super(id);
  }

  async step(state: S): Promise<Outcome> {
    await this.fn(state);
    return next(this.to);
  }

  targets(): string[] {
    return [this.to];
  }
}
