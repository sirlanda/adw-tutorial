# ADW tananyag: Agentic Development Workflow lépésről lépésre

Ez a repo egy tananyag: nyolc lépésben, nyolc git branchen épít fel egy minimális
ADW-t (Agentic Development Workflow), ahol **az ügynök alkot, a kód dönt**. Minden lépés
egyetlen új koncepciót tesz hozzá az előzőhöz, és minden lépés futtatható, akár LLM nélkül is,
mert a rögzített futások visszajátszhatók.

A példafeladat szándékosan egyszerű: a fiktív Napsugár Kertészet ügyfélszolgálata hat
beérkező levélre válaszol. A levelek az `inbox/`-ban, a szabályok a `kb/` tudásbázisban,
a válasz az `outbox/`-ba (jóváhagyásra) vagy a `sent/`-be (elküldve) kerül.

Az anyag a 2026. november 7-i IT nap előadásához készült. A diák a `slides/` mappában
vannak, a módszertan IndyDevDan-től származik (lásd [Források](#források)).

## Mit mutat be

| Branch | Koncepció | Ami bekerül |
| --- | --- | --- |
| `01-workflow` | gráf és egy ciklus, a state fájl az igazság | `Outcome`, `Node`, `ScriptNode`, `EndNode`, `Workflow.run`, `Workspace`, `--resume`, `--stop-after` |
| `02-typed-io` | nyílt, típusos szerződés a node-ok között | Zod `EngineStateSchema`, `NodeOutputBaseSchema`, `ExecNode` (input, run, apply), `io/` és `reports/` fájlok |
| `03-exec-node` | determinisztikus munka és döntés, külvilág a services mögött | `Mailbox`, `Checker` (6 szabály), `DecisionNode`, a kapu: piros = elakadás |
| `04-agent-node` | az ügynök ott, ahol ítélet kell: friss folyamat, prompt fájl, séma, egy retry | `Agent`, `ClaudeAgent`, `ReplayAgent`, `Prompt`, `AgentNode`, `prompts/writer.md`, `systemprompt.md` |
| `05-loop-limits` | ciklus, de a számláló és a határ a kódban | `guard()`, `LIMITS.maxFix`, `Fixer`, `Escalate` failure node, a jogi szabály a kapuban |
| `06-triage` | olcsótól a drágáig: kód, Jev, olcsó LLM, csak a maradék az ügynöknek | `Templates`, `Jev` (6 párhuzamos kérdés), `Triager`, `Summarizer` (haiku), `JEV_THRESHOLDS` |
| `07-near-the-loop` | magától indul, kidolgoz, éles műveletet csak jóváhagyás után | `waiting` kimenet, `gate`, `Propose`, `Send`, `Sender`, `--approve`, `--reject` |
| `08-off-the-loop` | a kapu kódban dönt, a poller indít és küld | `autoSend` szabály, `RunLock`, `hook.ts` és a záró táblázat |

Útvonal, számláló, korlát, küldés mind kódban van. Az ügynök ír, javít, összefoglal.
A `main` csak a közös alapot tartalmazza: dokumentáció, `kb/`, `inbox/`, `justfile`, `slides/`.

## Előfeltételek

- [Bun](https://bun.sh) 1.4 vagy újabb (az engine és a diák is ezzel fut)
- [just](https://github.com/casey/just) a parancsokhoz
- [Claude Code](https://claude.com/claude-code) CLI (`claude`), csak az élő ügynökhíváshoz, a 4. lépéstől
- opcionálisan egy TypeSafe kulcs (`TYPESAFE_API_KEY`) a 6. lépés Jev triage-ához, lásd `.env.example`

Kulcs és `claude` nélkül is minden lépés végigjátszható, mert a repo tartalmazza a rögzített
futásokat, és a replay ezekből dolgozik.

## Telepítés

```bash
git clone https://github.com/sirlanda/adw-tutorial.git
cd adw-tutorial
just install        # bun install itt és a slides/ alatt
just                # a parancsok listája
```

## Használat

### Lépések között

```bash
just branches       # a branchek és az aktuális
just step 1         # ugrás az 1. lépésre (előtte takarít)
just next           # következő lépés
just prev           # előző lépés
just diff           # mi változott az előző lépéshez képest
just clean          # vissza a rögzített állapotra
```

### Egy lépés demója

A `just demo <n>` átvált a branchre, takarít, és lefuttatja az adott lépés parancslapját
(ugyanazt, ami az előadáson megy, lásd `ITnap20261107.md`):

```bash
just demo 1         # a gráf, a state.json és a log.jsonl
just demo 5         # a javító ciklus és a korlát
just demo 8         # a poller, automatikus küldés
```

### Futtatás kézzel

```bash
just run T-1002                     # egy levél, replay (rögzített ügynök- és Jev-válaszok)
just run T-1002 --stop-after fetch  # megáll egy node után
just resume T-1002                  # folytatás a state.json-ból
just live T-1002                    # ugyanez élő claude hívással (04-től, kb. 20 s)

just approve T-1006                 # jóváhagyás (07-től)
just reject T-1006 "Kérj szállítási címet"
just status T-1006

just hook                           # az egész inbox a pollerrel, replay (08-tól)
just hook-live                      # poller élő hívással
```

### Egy futás nyoma

Minden futás egy mappa: `.adw/<ticket>/<futás>/`. A `01` futás minden branchen rögzített,
a replay ebből olvas. A további futások a `just clean` parancsra eltűnnek.

```
.adw/T-1002/01/
├── state.json        a workflow állapota, ez az igazság, a --resume innen folytat
├── log.jsonl         eseménynapló: node_start, node_end, agent, jev, guard
├── io/               node-onként input és output JSON, az ügynök promptja
├── reports/          node-onként egy markdown riport
├── logs/             az ügynökhívások átirata (claude stream-json)
└── jev/              a Jev kérdések és válaszok
```

```bash
just state T-1002                   # state.json (az utolsó futás)
just log T-1002                     # log.jsonl
just reports T-1002                 # a node riportok
just tree T-1002 02                 # egy adott futás fájljai
```

### Replay és élő futás

`ADW_AGENT=replay` esetén az ügynök válaszát a rögzített `io/` fájlból, a Jev válaszát a
`jev/` fájlból adja vissza az engine, LLM hívás nélkül. A gépezet többi része (gráf, séma,
kapu, számláló, fájlok) ugyanúgy fut, ezért a demo determinisztikus és egy másodperc alatt
lefut. Az élő hívás a tartalék: `just live`, `just hook-live`.

### Diák

```bash
just slides         # Slidev a böngészőben, előadói nézet: /presenter
just slides-pdf     # export slides/export/adw.pdf
just slides-png     # export diánként PNG-be
```

A dián a `p` billentyű kapcsolja a rajzolást, rajzolás közben `S` toll, `L` vonal,
`A` nyíl, `R` téglalap, `E` ellipszis, `1`–`6` szín, `C` törlés, `Ctrl+Z` vissza.

## A kód szerkezete

```
adw.ts              egy levél feldolgozása: indítás, --resume, --approve, --reject, --status
hook.ts             poller az inbox fölött (08-tól)
engine/             a gépezet: Workflow, Node, ExecNode, AgentNode, DecisionNode, state, Workspace
engine/agent/       Agent interfész, ClaudeAgent (claude CLI alfolyamat), ReplayAgent
services/           külvilág: Mailbox, Checker, Sender, Templates, Jev
workflow/           a konkrét gráf: graph.ts, state.ts, policy.ts, triage.ts, nodes/
prompts/            a node-ok promptjai (writer, fixer, summarizer), frontmatterben a modell
systemprompt.md     közös rendszerprompt az ügynököknek
kb/                 a tudásbázis: szabályzat, hangnem, GYIK, jogi
inbox/ outbox/ sent/ a levelek útja
slides/             a Slidev deck, minden branchen azonos
scripts/            snippets.sh: branch-páronkénti diffek a diákhoz
```

Az `ExecNode` három horga a minta minden node-ra: `input()` kiveszi a state-ből, amit a node
láthat, `run()` elvégzi a munkát és outputot ad, `apply()` az egyetlen hely, ahol a validált
output a state-be kerül és eldől a következő node. Az `AgentNode` ugyanez, csak a `run()`
egy friss `claude` folyamat, prompt fájlból, kényszerített JSON sémával, egy újrapróbálással
és időkorláttal.

## Fejlesztés a láncon

Minden branch az előzőre épül. Egy lépés kódját azon a branchen kell módosítani, amelyik
bevezeti, utána a `just sync` sorban rebase-eli a `01..08` láncot. A `justfile`, a `slides/`
és a formázó-védelem (`.prettierignore`, `.markdownlint-cli2.yaml`) a `main` commitjaiban él,
ezért minden branchen azonos. Ezeket a `main`-en kell módosítani, aztán `just sync`.

```bash
just check          # típusellenőrzés
just verify         # minden rögzített futás visszajátszása az aktuális lépésen
just sync           # a lánc rebase-elése, tiszta fa kell hozzá
```

A `.adw/` nyom szándékosan a repo része, ne kerüljön `.gitignore`-ba.

## Döntések

- D1. Új, minimális engine lépésről lépésre, nem egy meglévő keretrendszer importálása.
- D2. Egy git repo, lépésenként egy branch, minden branch az előzőre épül. Ára: egy korai
  lépés javítását végig kell rebase-elni (`just sync`).
- D3. A friss kontextus és a services réteg elvét a 4. és a 3. lépés vezeti be, nem kapnak
  külön lépést.
- D4. "Near the loop" = automatikus indulás, kidolgozott megoldás, éles művelet csak
  jóváhagyás után. "Off the loop" = jóváhagyás nélkül, a kapu dönt.
- D5. Célfeladat: ügyfélszolgálati válaszlevél. A "küldés" fájlmozgatás a `sent/` mappába,
  a "letöltés" az `inbox/` olvasása.
- D6. Replay: a `.adw/` nyom a branch része, `ADW_AGENT=replay` a rögzített válaszokat adja
  vissza, a demo így determinisztikus. Élő hívás a tartalék.
- D7. A diák a `slides/` mappában, minden branchen változatlanul, a `justfile`-lal együtt a
  lánc aljáról.
- D8. A javító ciklust egy olyan szabály indítja, amit csak a `Checker` ismer (a jogorvoslati
  mondat). Az ügynök a prompt szabályait elsőre tartja, a kapu azt is tartja, amit az ügynök
  nem tudhat.

## Források

- IndyDevDan, a módszertan és a Tactical Agentic Coding: <https://www.youtube.com/@indydevdan>
- TypeSafe Jev, a triage eszköze: <https://typesafe.ai>
- Ingyenes ügynök-alternatívák a `claude` helyére: <https://opencode.ai>, <https://pi.dev>

## Licenc

MIT, lásd [LICENSE](LICENSE).
