---
theme: default
colorSchema: dark
themeConfig:
  primary: "#f28c28"
title: Agentic Development Workflow
info: IT nap 2026-11-07
class: text-center
highlighter: shiki
twoslash: false
lineNumbers: false
drawings:
  persist: false
transition: slide-left
mdc: true
---

<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->

# Agentic Development Workflow

Nyolc lépés egy működő ADW-ig

<div class="pt-8 text-sm opacity-70">IT nap · 2026. november 7.</div>

---

# Van esélyünk az AI-jal szemben?

- Ha okosabb nálunk, akkor úgyis mindegy
- Ha nem, akkor meg ne mi menjünk utána

<br>

Gyorsabban ír kódot, mint te valaha. De hogyan tudod vállalni érte a felelősséget,
ha nem tudod, hogy mi a mögöttes gondolat?

<br>

Vibe coding csak olyan helyeken működik, ahol nem fontos a konzisztens működés.

---

# Hogyan haladjunk tehát gyorsabban?

<div class="grid grid-cols-2 gap-8 pt-4">
<div>

## Dolgozzon úgy, mint én

- nem kell magyarázni
- tudom vállalni érte a felelősséget

</div>
<div>

## Dolgozzon úgy, mint én soha

- gyorsan
- párhuzamosan
- fáradhatatlanul

</div>
</div>

---

# Akkor tehát most teljesen kiadjuk magunkat?

- most az nyer, aki gyorsabban és olcsóbban szállít
- a fejlesztők eddig is *collective code ownership*-ben gondolkoztak
- aki *kopf-monopol*-ban, annak eddig sem volt jövője

<br>

<v-click>

**Az ügynök alkot, a TypeScript dönt.**

Ez az egy mondat a következő nyolc lépés.

</v-click>

---
layout: section
---

# A feladat

Napsugár Kertészet, ügyfélszolgálat

---

# Hat levél, egy tudásbázis

<div class="grid grid-cols-2 gap-6 text-sm">
<div>

| Ticket | Levél |
| --- | --- |
| T-1001 | Mikor vannak nyitva szombaton? |
| T-1002 | Elszáradt a 3 hete vett leander |
| T-1003 | HARMADSZOR ÍROK!!! Hol a rendelésem? |
| T-1004 | A Kosár gomb nem működik Safarin |
| T-1005 | Visszaküldeném, de 20 napja vettem |
| T-1006 | 200 db tuja céges rendelés, nov. 25-ig |

</div>
<div>

```
kb/
├── faq.md          nyitvatartás, szállítás, fizetés
├── szabalyzat.md   14 nap, 30 napos növénygarancia
├── hangnem.md      megszólítás, aláírás, tiltott szavak
└── sablon/         nyitvatartas.md, szallitas.md

inbox/T-1001.json … T-1006.json     a levelek
outbox/                             jóváhagyásra vár
sent/                               elküldve
.adw/<ticket>/<futás>/              a futás nyoma
```

Letöltés és küldés: determinisztikus kód.
Az ügynök csak a `kb/`-t és a saját input fájlját olvassa.

</div>
</div>

---

# Nyolc lépés, nyolc branch

<div class="grid grid-cols-2 gap-6 text-sm">
<div>

1. **Gráf és ciklus** – a state fájl az igazság
2. **Típusos szerződés** – JSON be, séma szerint JSON ki
3. **Determinisztikus node** – kapu, döntés, services
4. **Ügynök node** – friss folyamat, prompt fájl, séma

</div>
<div>

5. **Ciklus és korlát** – a számláló a kódban él
6. **Triage** – kód, Jev, olcsó LLM, csak a maradék az ügynöknek
7. **Near the loop** – kidolgoz, aztán kérdez
8. **Off the loop** – a kapu dönt, a poller küld

</div>
</div>

<br>

```mermaid {theme: 'base', scale: 0.6, flowchart: {nodeSpacing: 18, rankSpacing: 36, padding: 6}, themeVariables: {primaryColor: '#0b3566', primaryTextColor: '#e8eef7', primaryBorderColor: '#6fb3e8', lineColor: '#a9b9d1', edgeLabelBackground: '#05224a', fontFamily: 'inherit', fontSize: '16px'}}
flowchart LR
  fetch --> triage --> write --> check --> gate --> send
  check -- piros --> fix --> check
  gate -- döntésre vár --> propose["propose, ember dönt"] --> gate
  triage -- L2 / L3 --> escalate
  fix -. elakad, kimerül a korlát .-> escalate
  classDef agent fill:#3a2410,stroke:#f28c28,color:#ffd9b3
  classDef human fill:#1a3a5c,stroke:#ffffff,stroke-dasharray: 4 3,color:#ffffff
  class write,fix agent
  class propose human
```

Minden lépés egy branch, minden branch az előzőre épül. Az LLM a 4. lépésben jelenik meg.

---
layout: section
---

# 1. Gráf és ciklus

`01-workflow`

---

# Egy gráf, egy ciklus, egy fájl

<div class="grid grid-cols-2 gap-4 text-xs">
<div>

```ts {all|1-3|6-8|12-19}
export type Outcome =
  | { kind: "next"; to: string }
  | Failure; // stuck | max_reached

abstract class Node<S> {
  abstract step(state: S): Promise<Outcome>;
  abstract targets(): string[];
}

// Workflow.run: az EGYETLEN ciklus
while (true) {
  const node = this.nodes.get(state.next);
  if (node instanceof EndNode) { ... return; }
  const outcome = await node.step(state);
  this.ws.log({ event: "step", node: node.id, outcome });
  if (outcome.kind === "next") state.next = outcome.to;
  else { state.status = outcome.kind; state.next = end; }
  this.save(state);
}
```

</div>
<div>

- A node **nem írja** a `state.next`-et, csak megmondja, merre menne
- A ciklus léptet, alkalmaz, **ment**, naplóz
- `state.json` = a futás teljes igazsága, a folyamat memóriájában semmi
- Bekötési hiba indulás előtt bukik (`validate()`)

<br>

```bash
bun adw.ts T-1002 --stop-after fetch
bun adw.ts T-1002 --resume
```

```json
{ "ticket_id": "T-1002", "execution_id": "01",
  "status": "running", "next": "draft",
  "mail": { "subject": "Elszáradt leander", ... } }
```

A folytatás a `draft`-nál indul, mert a fájl tudja, hol tart.

</div>
</div>

---
layout: section
---

# 2. Nyílt, típusos kommunikáció

`02-typed-io`

---

# Fájlból be, séma szerint ki

<div class="grid grid-cols-2 gap-4 text-xs">
<div>

```ts
export const NodeOutputBaseSchema = z.object({
  status: z.enum(["ok", "issues", "stuck"]),
  done: z.array(z.string()),
  problems: z.array(z.string()), // "[severity] hely: mi a baj"
  stuck_reason: z.string().optional(),
});
```

```ts {all|3-5|8-10}
abstract class ExecNode<S, In, Out> extends Node<S> {
  abstract input(state: S): In;
  abstract run(state: S, input: In): Promise<Out>;
  abstract apply(state: S, out: Out): Outcome | null;

  async step(state: S): Promise<Outcome> {
    const input = this.input(state);
    files.writeInput(input);
    const raw = await this.run(state, input);
    const out = this.schema.parse(raw);  // a szerződés
    files.writeOutput(out);
    files.writeReport(out);  // generált, nem a node írja
    state.seq += 1;
    return this.apply(state, out) ?? next(this.to);
  }
}
```

</div>
<div>

```
.adw/T-1002/01/
├── state.json
├── log.jsonl
├── io/
│   ├── 1-fetcher-input.json
│   ├── 1-fetcher-output.json
│   ├── 2-drafter-input.json
│   └── 2-drafter-output.json
└── reports/
    ├── 1-fetcher.md
    └── 2-drafter.md
```

```json
{ "status": "ok",
  "done": ["sablon vázlat elkészült"],
  "problems": [],
  "reply": { "subject": "Re: Elszáradt leander",
             "body": "Köszönjük levelét, ..." } }
```

- Az input fájl az **egyetlen** forrás a feladatról
- Ami nem fér a sémába, a `parse`-nál bukik
- A riport az outputból **generálódik**

</div>
</div>

---
layout: section
---

# 3. Determinisztikus node-ok

`03-exec-node`

---

# A kapu kódban dönt

<div class="grid grid-cols-2 gap-4 text-xs">
<div>

```ts {all|1-4|8-12}
const FORBIDDEN = /\b(garantál|biztosan|ingyen|azonnal|mindenképp)/i;
const ORDER_NUMBER = /NK-\d{6}/g;
const SIGNATURE = "Napsugár Kertészet ügyfélszolgálat";
const MAX_WORDS = 150;

export class Checker {
  check(mail: Mail, reply: Reply): string[] {
    const problems: string[] = [];
    if (!reply.subject.includes(`[${mail.ticket_id}]`))
      problems.push(`[error] subject: nincs [${mail.ticket_id}]`);
    if (!/^Kedves .+!/.test(body))
      problems.push("[error] body: nincs 'Kedves ...!' megszólítás");
    // ... aláírás, tiltott szó, hossz, nyelv, rendelésszám
    return problems;
  }
}
```

```ts
const afterCheck = new DecisionNode<ReplyState>("after_check", [
  { label: "zöld", when: (s) => s.check?.green === true, to: "end" },
]); // nincs igaz ág = stuck
```

</div>
<div>

A sablon vázlat a kapun:

```md
## Problémák
- [error] subject: hiányzik az ügy azonosítója: [T-1002]
- [error] body: nem 'Kedves ...!' megszólítással kezdődik
- [error] body: nem a '... ügyfélszolgálat' aláírással végződik
- [error] body: a rendelésszám (NK-240317) nincs a válaszban
```

```json
{ "event": "step", "node": "after_check",
  "outcome": { "kind": "stuck",
               "reason": "after_check: egyik ág sem igaz (zöld)" } }
```

- Hat szabály, ugyanarra a levélre mindig ugyanaz az eredmény
- A külvilág (`Mailbox`, később `Sender`, `Jev`) a `services/` mögött
- Még nincs LLM, és a rendszer már „működik”: tudja, hogy rossz

</div>
</div>

---
layout: section
---

# 4. Az ügynök belép

`04-agent-node`

---

# Friss folyamat, prompt fájl, kényszerített séma

<div class="grid grid-cols-2 gap-4 text-xs">
<div>

```md
---
allowed-tools: Read, Glob, Grep
model: sonnet
---
# Válaszlevél írása
Te a Napsugár Kertészet ügyfélszolgálatának munkatársa vagy.
Az ügy azonosítója: {{ticket_id}}.

## Eljárás
1. Olvasd el az input fájlt: {{input_file}}.
2. Olvasd el a tudásbázist a {{kb_dir}} mappából ...
3. Írd meg a választ. Csak a tudásbázis tényeit használd.
4. A forma a `hangnem.md` szerint ...
```

```ts
const args = ["-p", prompt,
  "--output-format", "stream-json", "--verbose",
  "--json-schema", JSON.stringify(schema),
  "--append-system-prompt", systemPrompt,
  "--allowedTools", "Read,Glob,Grep",
  "--disallowedTools", "WebFetch,WebSearch,Bash,Write,Edit"];
spawn("claude", args, { cwd, env: filteredEnv() });
```

</div>
<div>

```ts {all|3-5|7-13}
export class Writer extends AgentNode<ReplyState, In, Out> {
  constructor(ctx, to) {
    super(ctx, "write", to, { name: "writer",
      promptFile: "writer.md",
      schema: NodeOutputBaseSchema.extend({ reply: ReplySchema }) });
  }
  protected input(state) {
    return { mail: state.mail! };
  }
  protected apply(state, out) {
    state.draft = out.reply;
    return null;
  }
}
```

- Egy hívás = egy új `claude` folyamat, **semmi** a korábbi kontextusból
- A séma a CLI-n kényszerítve, Zod-dal ellenőrizve, **egy** retry a hibával
- Kulcsok kiszűrve a gyerekfolyamatból, web és bash tiltva

</div>
</div>

---

# Mit látott az ügynök, mit csinált

<div class="grid grid-cols-2 gap-4 text-xs">
<div>

```bash
ADW_AGENT=replay bun adw.ts T-1002      # felvételről, 1 s
bun adw.ts T-1002                       # élőben, 20 s, 0.18 USD
```

Az átiratból (`logs/2-writer.jsonl`), amit olvasott:

```
.adw/T-1002/01/io/2-writer-input.json
kb/faq.md
kb/hangnem.md
kb/szabalyzat.md
```

```md
## Problémák
- (nincs)                              ← a kapu zöld
```

</div>
<div>

```json
{ "status": "issues",
  "done": [
    "Elolvastam az input levelet (T-1002, leander, NK-240317)",
    "Elolvastam a hangnem.md, szabalyzat.md és faq.md fájlokat",
    "Megírtam a választ a 30 napos növénygarancia alapján"
  ],
  "problems": [
    "[minor] reply.body: a tudásbázis nem ad gondozási tanácsot ..."
  ],
  "reply": {
    "subject": "[T-1002] Re: Elszáradt leander",
    "body": "Kedves Szabó Péter!\n\nSajnáljuk, hogy az NK-240317 ..."
  } }
```

`ReplayAgent`: ugyanaz a gépezet, a válasz a rögzített `io/` fájlból.
A demo determinisztikus, az élő hívás a tartalék.

</div>
</div>

---
layout: section
---

# 5. Ciklus és korlát

`05-loop-limits`

---

# Az ügynök javít, a kód számol

<div class="grid grid-cols-2 gap-4 text-xs">
<div>

````md magic-move
```ts
// workflow/graph.ts a 03-ban: pirosra nincs ág, a futás elakad
const green = (s) => s.check?.green === true;
const afterCheck = new DecisionNode<ReplyState>("after_check", [
  { label: "zöld", when: green, to: "end" },
]);
```
```ts
// workflow/graph.ts a 05-ben: a piros ág a ciklus
const green = (s) => s.check?.green === true;
const afterCheck = new DecisionNode<ReplyState>("after_check", [
  { label: "zöld", when: green, to: "end" },
  { label: "piros", when: (s) => !green(s), to: "fix" },
]);
```
````

```ts {all|1|4-9|10-14}
export const LIMITS: Limits = { maxFix: 2 };

export class Fixer extends AgentNode<...> {
  protected guard(state: ReplyState): Failure | null {
    if (state.iteration >= this.ctx.limits.maxFix)
      return { kind: "max_reached",
        reason: `fixer: ${state.iteration} kör után még piros` };
    return null;
  }
  protected apply(state, out) {
    state.draft = out.reply;
    state.iteration += 1;
    return null;
  }
}
```

```ts
// Workflow.run: elakadás → failure node; ha az is elakad → end
state.next = this.def.failure && node.id !== this.def.failure
  ? this.def.failure : this.def.end;
```

</div>
<div>

Egy szabály, amit az ügynök **nem** kaphat meg (jogi osztály, csak a kapuban):

```md
- [error] body: reklamációnál kötelező a jogorvoslati mondat
  az aláírás előtt: 'Panaszával a lakóhelye szerinti
  békéltető testülethez is fordulhat.'
```

```
T-1003/01:  writer → check (piros) → fix → check (zöld)
            iteration: 0 → 1
T-1003/02:  ADW_MAX_FIX=0 → guard → max_reached → escalate
```

```md
## Elvégezve
- [error] body: az aláírás elé beillesztettem a kötelező
  jogorvoslati mondatot ... A levél többi része változatlan.
```

- Tíz élő futásból tíz zöld volt elsőre: a prompt szabályait tartja
- A kapu azt is tartja, amit az ügynök nem tudhat
- A javítás ügynöki munka, a **hányszor** a kódé

</div>
</div>

---
layout: section
---

# 6. Triage

`06-triage` · kód, Jev, olcsó LLM

---

# Olcsótól a drágáig

<div class="grid grid-cols-2 gap-4 text-xs">
<div>

```ts {all|2-5|7-9|11-17}
protected async run(_state, input): Promise<TriagerOutput> {
  // 1. kód: sablonkérdés
  const template = this.ctx.templates.match(input.mail);
  if (template)
    return { ..., route: "template", template, triage: null };
  // 2. Jev: hat kérdés egy kérésben, párhuzamosan
  const a = await this.ctx.jev.judge("triage",
    { subject, body }, triageQuestions());
  if (!a) return { ..., route: "write" };  // Jev nélkül is megy
  // 3. a döntés kódban: csak magabiztos L2/L3 megy emberhez
  const level = a.support_level;
  const escalate = level.choice !== "L1" &&
    level.confidence >= JEV_THRESHOLDS.escalateConfidence;
  return { ..., route: escalate ? "escalate" : "write", triage };
}
```

```ts
importance:    score("Üzleti súly?", [kicsi, közepes, nagy]),
urgency:       score("Sürgős?", [nem, napokon belül, ma]),
deadline:      choice("Határidő?", { none, today, this_week, date }),
tone:          choice("Hangnem?", { angry, neutral, friendly }),
complexity:    score("Összetett?", [sablon, tudásbázis, egyedi]),
support_level: choice("Ki oldja meg?", { L1, L2, L3 }),
```

</div>
<div>

| Ticket | Jev | Út |
| --- | --- | --- |
| T-1001 | nem futott | sablon, **0** ügynökhívás |
| T-1002 | L1 0.94, friendly | writer |
| T-1003 | L1 0.96, **angry** | writer, prior az inputban |
| T-1004 | **L3 1.00** | haiku összefoglaló → átadás |
| T-1005 | **L2 0.66** | haiku összefoglaló → átadás |
| T-1006 | L2 0.28, küszöb alatt | writer |

```json
{ "event": "jev", "model": "jev-1.14.0",
  "input_tokens": 1004, "duration_ms": 208 }
```

- Jev nem generál és nem ír: valószínűséget ad
- A küszöb (`0.6`) a kódban: a valószínűség adat, a döntés a miénk
- Jev nélkül vagy hibánál minden az ügynökhöz megy, a futás nem áll meg

</div>
</div>

---

# A modell a feladathoz

| Lépcső | Mit csinál | Idő | Költség |
| --- | --- | --- | --- |
| kód (sablon) | ismert kérdésre kész válasz | 0 ms | 0 |
| Jev, 6 kérdés | ítél: szint, hangnem, sürgősség, súly | 208 ms | ~0 |
| haiku összefoglaló | három sor az átadó kollégának | 6 s | 0.006 USD |
| writer (sonnet) | megírja a választ a tudásbázisból | 20 s | 0.18 USD |
| fixer (opus) | a kapu hibáit javítja, a levél többi része marad | 20 s | 0.15 USD |

<br>

```json
{ "status": "ok", "done": [
  "Jev: L3 (1.00), hangnem friendly, sürgősség 0.8, súly 0.7",
  "emberhez megy, ügynök nem ír választ" ] }
```

<br>

- **Jev ítél, Haiku összefoglal, Sonnet ír, Opus javít.** Egy node, egy modell, egy cél.
- A hat levélből kettő nem is jut el a drága modellig, egy pedig ügynök nélkül megy ki.
- A modell a prompt fájl frontmatterében (`model: haiku | sonnet | opus`), nem a kódban.

---
layout: section
---

# 7. Near the loop

`07-near-the-loop` · kidolgoz, aztán kérdez

---

# Magától indul, éles műveletet csak jóváhagyás után

<div class="grid grid-cols-2 gap-4 text-xs">
<div>

````md magic-move
```ts
// engine/Outcome.ts a 01-ben, workflow/graph.ts a 05-ben
export type Outcome =
  | { kind: "next"; to: string }
  | Failure;

  { label: "zöld", when: green, to: "end" },
```
```ts
// a 07-ben: a futás meg tud állni, a zöld levél is a kapuhoz megy
export type Outcome =
  | { kind: "next"; to: string }
  | { kind: "waiting"; at: string; reason: string }
  | Failure;

  { label: "zöld", when: green, to: "gate" },
```
````

```ts {all|1-5|8-10}
const decision = (s) => s.approval?.decision;
const gate = new DecisionNode<ReplyState>("gate", [
  { label: "jóváhagyva",
    when: (s) => decision(s) === "approved", to: "send" },
  { label: "elutasítva",
    when: (s) => decision(s) === "rejected", to: "fix" },
  { label: "döntésre vár", when: () => true, to: "propose" },
]);

// Fixer.input: a kapu hibái és az ember jegyzete EGY csatornán
const human = decision(state) === "rejected"
  ? [`[human] jegyzet: ${state.approval.note}`] : [];
return { mail, draft, problems: [...check.problems, ...human] };
```

```ts
// adw.ts --approve / --reject: a döntés a state-be, aztán --resume
state.approval = { decision, note, at };
state.status = "running";
```

</div>
<div>

```bash
bun adw.ts T-1006
#  vége: status=waiting next=gate   → outbox/T-1006.md

bun adw.ts T-1006 \
  --reject "Kérdezd meg, hogy jogosult-e ÁFA visszatérítésre!"
#  gate → fix → check → gate → propose → waiting  (iteration 1)

bun adw.ts T-1006 --approve
#  gate → send → end                → sent/T-1006.md
```

```
reports/
├── 3-writer.md    5-propose.md    8-propose.md
├── 4-checker.md   6-fixer.md      9-send.md
└──                7-checker.md
```

- Nem az ember indít: a workflow kidolgozza, és **megáll**
- Az éles művelet (`send`) csak a `gate`-en át érhető el
- A jegyzet nem chat: típusos input a következő körnek
- A futás ugyanaz a `01`, a `--resume` folytatja

</div>
</div>

---
layout: section
---

# 8. Off the loop

`08-off-the-loop` · a kapu dönt, a poller küld

---

# A kapu első ága kódban

<div class="grid grid-cols-2 gap-4 text-xs">
<div>

````md magic-move
```ts
// workflow/graph.ts a 07-ben: a döntés az emberé
const is = (v) => (s) => s.approval?.decision === v;
const gate = new DecisionNode<ReplyState>("gate", [
  { label: "jóváhagyva", when: is("approved"), to: "send" },
  { label: "elutasítva", when: is("rejected"), to: "fix" },
  { label: "döntésre vár", when: () => true, to: "propose" },
]);
```
```ts
// workflow/graph.ts a 08-ban: az alacsony kockázat kódban megy ki
const is = (v) => (s) => s.approval?.decision === v;
const gate = new DecisionNode<ReplyState>("gate", [
  { label: "automatikus", when: autoSend, to: "send" },
  { label: "jóváhagyva", when: is("approved"), to: "send" },
  { label: "elutasítva", when: is("rejected"), to: "fix" },
  { label: "döntésre vár", when: () => true, to: "propose" },
]);
```
````

```ts
// workflow/policy.ts, ÚJ fájl: egy helyen, számokkal
const AUTO_SEND = { minLevelConfidence: 0.8, maxImportance: 1.5 };

function autoSend(s: ReplyState): boolean {
  if (s.check?.green !== true) return false;
  if (s.triage?.route === "template") return true;
  const jev = s.triage?.jev;
  if (!jev) return false;
  return jev.support_level === "L1"
    && jev.support_level_confidence >= AUTO_SEND.minLevelConfidence
    && jev.tone !== "angry"
    && jev.importance <= AUTO_SEND.maxImportance;
}
```

</div>
<div>

```bash
bun hook.ts --once          # élőben 97 s, replay 2 s
```

| ticket | út | Jev | hívás | iter | eredmény |
| --- | --- | --- | --- | --- | --- |
| T-1001 | template | - | 0 | 0 | **elküldve automatikusan** |
| T-1002 | write | L1, friendly | 2 | 1 | **elküldve automatikusan** |
| T-1003 | write | L1, angry | 2 | 1 | jóváhagyásra vár |
| T-1004 | escalate | L3 | 1 | 0 | átadva (L3) |
| T-1005 | escalate | L2 | 1 | 0 | átadva (L2) |
| T-1006 | write | L2, bizonytalan | 1 | 0 | jóváhagyásra vár |

```ts
// hook.ts, ÚJ fájl: állapotmentes tick az inbox/ és a .adw/ fölött
const fresh = tickets.filter((t) => !existsSync(adwDir(t)));
for (const ticket of fresh)
  Bun.spawnSync(["bun", "adw.ts", ticket]);  // soros, lock alatt
```

- Az ember csak a kockázatos ügyeknél van ott
- A poller bármikor leállítható és újraindítható: nincs saját állapota
- Egy futás egy repón (`RunLock`)

</div>
</div>

---

# Miért nem elég egy skill?

<div class="text-sm">
<v-clicks>

| Kérdés | Skill | ADW | Lépés |
| --- | --- | --- | --- |
| Ki dönt, merre megy a folyamat? | az ügynök, a szöveg alapján | `DecisionNode`, kódban | 1, 3 |
| Mi az igazság a futásról? | a beszélgetés, és elvész | `state.json`, `--resume` | 1, 2 |
| Mennyit lát egyszerre? | mindent, egy kontextusban | egy node, egy input fájl, friss folyamat | 4 |
| Mi állítja meg a rossz választ? | a saját ítélete | `Checker`: olyan szabály is, amit nem tudhat | 3, 5 |
| Hányszor próbálkozhat? | ameddig a kontextus bírja | `guard()`, `LIMITS.maxFix` | 5 |
| Mibe kerül? | minden levél a drága modellnek | kód, Jev, haiku, csak a maradék az ügynöknek | 6 |
| Mikor kérdez embert? | ha a szöveg szerint kell, és észreveszi | `waiting`, a kapu | 7 |
| Ki indítja, ki küldi? | az ember | `hook.ts`, `autoSend` | 8 |
| Visszajátszható, mérhető? | nem | `io/`, `log.jsonl`, replay | 2, 4 |

</v-clicks>
</div>

<div v-click class="grid grid-cols-2 gap-8 pt-6 text-center">
<div>
<img src="/skill.svg" class="h-28 mx-auto" alt="svájci bicska" />
<div class="pt-2 text-lg">Skill</div>
</div>
<div>
<img src="/adw.svg" class="h-28 mx-auto" alt="gyár" />
<div class="pt-2 text-lg">ADW</div>
</div>
</div>

<!--
A skill egy prompt fájl, amit az ügynök elolvas. Kell is: a 4. lépés prompt fájlja pontosan ez.
De minden, ami a skillben van, az ügynök kontextusában él, és az ügynök dönti el, mit kezd vele.

A táblázat soronként jön. A végén a két kép: a skill egy multitool, egy eszköz az ügynök kezében,
sok mindenre jó, de ő fogja. Az ADW egy gyár: a folyamat, a kapu, a számláló, a kiszállítás kódban.

A skill az ügynök eszköze, az ADW az üzemeltetőé. A skill az ADW-ben egy node promptja.

Mindent meg lehet csinálni `skill` segítségével is (kérdezd McGywer-t), de nem hatékony és nem konzisztens.

Ikonok: game-icons.net, Lorc és Delapouite, CC BY 3.0.
-->

---
layout: section
---

# Tactical Agentic Coding

4 KPI, 12 leverage point

---

# A négy KPI a futás nyomából jön

<img src="/tac-kpis.png" alt="4 KPI: Size, Attempts, Streak, Presence" class="mx-auto rounded" style="max-height: 430px" />

<!--
Size: mekkora munka megy felügyelet nélkül. Nálunk: hány node fut le egy futásban, hány levél egy tickben.

Attempts: hányszor kell nekifutni, a cél az egy. Nálunk: az iteration a state-ben, a retry a naplóban.

Streak: hány sikeres futás egymás után. Nálunk: a clean futások sora a hook naplójában.

Presence: mennyit kell mellette ülni, a cél a nulla. Nálunk: az approval döntések aránya az összes futáshoz.

Egymásra épülnek: Size nő, Attempts egyre tart, Streak nő, és ez viszi a Presence-t nullára.
-->

---

# A négy KPI a futás nyomából jön

| KPI | Honnan | Melyik lépés |
| --- | --- | --- |
| **Size** | node-ok egy futásban, levelek egy tickben | 1, 8 |
| **Attempts** | `iteration` a state-ben, retry a naplóban | 4, 5 |
| **Streak** | `clean` futások sora a hook naplójában | 7, 8 |
| **Presence** | `approval` döntések / összes futás | 7, 8 |

<br>

```
Size ↑  →  Attempts → 1  →  Streak ↑  →  Presence → 0
```

A `state.json` és a `log.jsonl` nem csak a folytatáshoz kell: **ebből számolod a KPI-t**.
A mai hat levélnél: 7 hívás, 2 javítási kör, 2 emberi döntés, 0 elakadás.

---

# A tizenkét leverage point a lépésekre vetítve

<img src="/tac-leverage.png" alt="12 leverage point" class="mx-auto rounded" style="max-height: 430px" />

<!--
1. Context: az ügynök friss folyamatban csak az input fájlt és a kb/-t látja, se többet, se kevesebbet (4).

2. Models: a feladathoz a modell: Jev ítél, Haiku összefoglal, Sonnet ír, Opus javít (6).

3. Prompts: a prompt fájl lépésenkénti eljárás, változókkal és kényszerített sémával, nem chat (4).

4. Tools: allowlist Read, Glob, Grep, tiltva a web és a bash, a kulcsok kiszűrve a gyerekfolyamatból (4).

5. stdout: minden node-ról riport és átirat, és az ügynök a kapu hibáiból tanul a következő körben (2, 3, 5).

6. Architecture: gráf és egyetlen ciklus, a külvilág a services mögött, semmi meglepetés (1, 3).

7. Types: Zod séma a node-ok közt, Choice és Score a Jev-ből, ami nem fér a sémába, a parse-nál bukik (2, 6).

8. Plans: a gráf maga a terv, a döntés és a korlát benne van, nem a promptban (1, 5).

9. Documentation: a kb/ az ügynök dokumentációja, azon kívül nem tud semmit, és ez szándékos (4).

10. Templates: prompt fájlok és sablonválasz kódból, a sablonkérdésre el sem indul ügynök (4, 6).

11. Tests: a Checker a zárt hurok, és azt is tartja, amit az ügynök nem tudhat (3, 5).

12. ADWs: a trigger, a környezet és a review kódban: hook, lock, gate, autoSend (8).
-->

---

# A tizenkét leverage point a lépésekre vetítve

<div class="grid grid-cols-2 gap-6 text-sm">
<div>

| In-agent | Lépés | |
| --- | --- | --- |
| Context | 4 | friss folyamat, csak az input fájl és a `kb/` |
| Models | 6 | Jev ítél, Haiku összefoglal, erős modell ír |
| Prompts | 4 | fájl, template, séma; nem chat |
| Tools | 4 | allowlist: Read, Glob, Grep; semmi web, semmi bash |

</div>
<div>

| Through-agent | Lépés | |
| --- | --- | --- |
| stdout | 2, 3 | riport és átirat minden node-ról |
| Architecture | 1, 3 | gráf + ciklus, külvilág a services mögött |
| Types | 2, 6 | Zod a node-ok közt, Choice/Score a Jev-ből |
| Plans | 1, 5 | a gráf maga a terv |
| Documentation | 4 | a `kb/` az ügynök dokumentációja |
| Templates | 4, 6 | prompt fájlok, sablonválasz kódból |
| Tests | 3, 5 | a Checker a zárt hurok |
| ADWs | 8 | trigger, környezet, review kódban |

</div>
</div>

---

# El kell mondani

<div class="grid grid-cols-2 gap-8">
<div>

**Cél: dark factory**

- út: *in-the-loop* (1–6) ≫ *near-the-loop* (7) ≫ *out-of-the-loop* (8)
- út: lépésről lépésre, egyszerre egy koncepció

**Cél: én üzemeltetem**

- út: az erőforrások legalább fele az *agentic layer*-re megy
- a kapu, a korlát, a triage: ez a réteg

</div>
<div>

**Cél: mindent értek**

- út: *magyarázd* – `done[]`, `problems[]`, riport, átirat
- út: *úgy csináld, ahogy én tenném* – a `kb/` és a prompt fájl

**Cél: szállító független**

- út: kis feladatok – egy node, egy prompt, egy cél
- út: több agent – `Agent` interface: `claude`, `replay`, bármi
- út: független futtatás – `hook.ts`, lock, resume

</div>
</div>

<br>

<div class="text-center text-lg">

**Az ügynök alkot, a TypeScript dönt.**

</div>

---
layout: center
class: text-center
---

# Köszönöm

`adw-tutorial` · 8 branch · minden futás visszajátszható

<div class="text-sm opacity-70 pt-4">just demo 1 … just demo 8 · just slides</div>

<!--
prettier-ignore-end
-->
