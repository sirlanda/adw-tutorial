import { defineShikiSetup } from "@slidev/types";

// Élénkebb szintaxis-színek a sötétkék háttéren (az alapértelmezett vitesse-dark tompa).
export default defineShikiSetup(() => ({
  themes: { dark: "one-dark-pro", light: "one-dark-pro" },
}));
