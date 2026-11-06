# ADW tananyag: alapelvek

Cél: lépésről lépésre felépíteni egy ADW-t (Agentic Development Workflow) úgy, hogy
minden lépés egyetlen új koncepciót mutat be. A forrás a `playwright-adw-toolkit`,
de abból csak a desztillált elvet vesszük át, a toolkit-specifikus részeket (Redmine,
Playwright, registry, sync) nem.

Vezérelv a toolkit P1 elve: **az ügynök alkot, a TypeScript dönt.** Minden lépés ezt
az elvet erősíti egy újabb oldalról.

## A megvalósítás

Egy git repo, lépésenként egy branch, minden branch az előzőre épül. A példa: a fiktív
Napsugár Kertészet ügyfélszolgálata, hat beérkező levél (`inbox/`), tudásbázis (`kb/`), a
válasz az `outbox/`-ba (jóváhagyásra) vagy a `sent/`-be (elküldve) kerül.

```bash
bun install
bun adw.ts T-1002                      # egy levél feldolgozása, élő claude hívással
ADW_AGENT=replay bun adw.ts T-1002     # ugyanez a rögzített futásból (.adw/T-1002/01), LLM nélkül
bun adw.ts T-1006 --status | --approve | --reject "jegyzet"   # 07-től
bun hook.ts --once [--all]             # 08-tól: az egész inbox, --all: újra, replay-hez
```

Minden futás nyoma: `.adw/<ticket>/<futás>/` (`state.json`, `log.jsonl`, `io/`, `reports/`,
`logs/`, `jev/`). A `01` futás minden branchen a rögzített, a replay ebből olvas.

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

Vezérelv: **az ügynök alkot, a TypeScript dönt.** Útvonal, számláló, korlát, küldés mind
kódban; az ügynök ír, javít, összefoglal.

## Döntések

- D1. Új, minimális engine-t írunk lépésről lépésre, a toolkit engine-jét nem importáljuk.
- D2. Egy git repo, lépésenként egy branch (`01-workflow`, `02-typed-io`, ...), minden
  branch az előzőre épül. Ára: egy korai lépés javítását végig kell rebase-elni.
- D3. A P3 (friss kontextus) és a P5 (services réteg) elvet a 4. és a 3. lépés vezeti be,
  nem kapnak külön lépést.
- D4. "Near the loop" = automatikus indulás, kidolgozott megoldás, éles művelet csak
  jóváhagyás után. "Off the loop" = jóváhagyás nélkül, a gate dönt.

- D5. Célfeladat: ügyfélszolgálati válaszlevél (fiktív kertészet). A "küldés" fájlmozgatás
  a `sent/` mappába, a "letöltés" az `inbox/` olvasása.
- D6. Replay: a `.adw/` nyom a branch része, `ADW_AGENT=replay` a rögzített válaszokat adja
  vissza (ügynök és Jev), a demo így determinisztikus. Élő hívás a tartalék.
- D7. A slide deck a `slides/` mappában, minden branchen változatlanul, a `justfile`-lal
  együtt a lánc aljáról. A branch-páronkénti diffeket `scripts/snippets.sh` adja (segédanyag).
