import { Node } from "./Node";
import { next, stuck, type Outcome } from "./Outcome";

export interface Branch<S> {
  label: string;
  when: (state: S) => boolean;
  to: string;
}

// Elágazás kódban. Az ágak sorrendje számít: az első igaz nyer. Ha egyik sem igaz, a
// futás elakad, mert egy nem kezelt eset nem mehet tovább csendben.
export class DecisionNode<S> extends Node<S> {
  constructor(
    id: string,
    private readonly branches: Branch<S>[],
  ) {
    super(id);
  }

  async step(state: S): Promise<Outcome> {
    const branch = this.branches.find((b) => b.when(state));
    if (!branch) return stuck(`${this.id}: egyik ág sem igaz (${this.branches.map((b) => b.label).join(", ")})`);
    return next(branch.to);
  }

  targets(): string[] {
    return this.branches.map((b) => b.to);
  }
}
