import { defineShikiSetup } from "@slidev/types";
import { transformerNotationDiff } from "@shikijs/transformers";

// Élénkebb szintaxis-színek a sötétkék háttéren (az alapértelmezett vitesse-dark tompa).
// A diff-jelölés (// [!code ++] és // [!code --]) a változást mutatja az előző lépéshez képest.
export default defineShikiSetup(() => ({
  themes: { dark: "one-dark-pro", light: "one-dark-pro" },
  transformers: [transformerNotationDiff()],
}));
