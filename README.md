# ADW tananyag: alapelvek

Cél: lépésről lépésre felépíteni egy ADW-t (Agentic Development Workflow) úgy, hogy
minden lépés egyetlen új koncepciót mutat be. A forrás a `playwright-adw-toolkit`,
de abból csak a desztillált elvet vesszük át, a toolkit-specifikus részeket (Redmine,
Playwright, registry, sync) nem.

Vezérelv a toolkit P1 elve: **az ügynök alkot, a TypeScript dönt.** Minden lépés ezt
az elvet erősíti egy újabb oldalról.

## 1. Munkafolyamat modellezés

- Koncepció: a workflow egy gráf (node-ok id szerint) és egyetlen ciklus. A ciklus
  olvassa `state.next`-et, lépteti a node-ot, alkalmazza az `Outcome`-ot, menti az
  állapotot, ismétel a záró node-ig.
- Kulcs: a node soha nem írja `state.next`-et, csak `{ kind: "next", to }`-t ad vissza.
  Az állapot egy `state.json`, ami a teljes igazság (P2), ezért a futás bármikor
  megszakítható és folytatható.
- Tananyag lépés: két-három ScriptNode, egy EndNode, egy loop, egy JSON állapotfájl.
  Még nincs LLM.

## 2. Nyílt, típusos kommunikáció

- Koncepció: minden node JSON inputot olvas fájlból és egy Zod sémával validált JSON
  választ ad (P4). Az input fájl az egyetlen igazságforrás, a riport a validált
  válaszból generálódik, nem az ügynök írja.
- Kulcs: `io/<seq>-<name>-{input,output}.json`, minden output séma egy közös alapot
  bővít (`status`, `done[]`, `problems[]`).
- Tananyag lépés: az 1. lépés node-jai fájlon keresztül beszélnek, séma validálással.
  Még mindig nincs LLM.

## 3. Determinisztikus node-ok készítése

- Koncepció: ExecNode. Nehéz, de determinisztikus lépés (kinyerés, tesztfuttatás, git
  művelet), ami logot és riportot ír, és `Failure`-t adhat vissza.
- Kulcs: a külvilág (git, npm, tesztfuttató) egy `services/` réteg mögött van (P5),
  a node csak a service-t hívja.
- Tananyag lépés: egy "futtasd a teszteket és írd ki az eredményt" ExecNode és egy
  DecisionNode, ami zöld/piros alapján ágazik el.

## 4. Ügynök node-ok bevezetése

- Koncepció: AgentNode. Egy futás = egy headless CLI folyamat, friss kontextussal (P3).
  A prompt egy fájl `{{változókkal}}`, a válasz formáját JSON séma kényszeríti, egy
  újrapróbálás a hibával kiegészített prompttal, második hiba = stuck.
- Kulcs: a template metódus (`guard`, `input`, `vars`, `apply`) elválasztja a
  gépezetet a tartalomtól. Az ügynök csak ott kap szerepet, ahol ítélet kell.
- Tananyag lépés: egyetlen AgentNode (pl. "diagnosztizáld a piros futást"), a
  3. lépés DecisionNode-ja ide ágazik.

## 5. Ciklusok és korlátok

- Koncepció: a visszacsatolás (implement, teszt, javít) ciklus, de a számláló és a
  határ (`LIMITS`, `iteration`) a TypeScript-ben él, sosem az ügynök memóriájában.
- Kulcs: `max_reached` és `stuck` kimenetek, egy deklarált failure node, ahová a loop
  automatikusan irányít. A failure node hibája nem pörög, a végére megy.
- Tananyag lépés: a 4. lépés ciklussá zárása iterációs limittel és failure node-dal.

## 6. Triage (kód, Jev, olcsó LLM)

- Koncepció: a drága ügynök elé olcsóbb szűrőket teszünk, sorrendben: kód (szabály),
  Jev (típusos ítélet, Choice/Noul/Score), olcsó LLM. Az ügynök csak a maradékot kapja,
  a triage eredményét priorként az inputjában.
- Kulcs: ha minden hiba "mechanikus", az ügynök ki is marad. Jev kikapcsolva vagy hibázik:
  minden az ügynökhöz megy, a futás nem áll meg.
- Tananyag lépés: egy triage ExecNode a 4. lépés AgentNode-ja elé.

## 7. "Near the loop" működés és kommunikáció

- Koncepció: a workflow magától indul és nem kér engedélyt előre. Kidolgozza a
  megoldást (branch, commit, riport), de éles műveletet (merge, push, ticket zárás)
  nem végez. Ha kész, jóváhagyást kér, és az ember döntése alapján lép tovább.
- Kulcs: a döntési pont egy DecisionNode a workflow végén, ami `approval` állapotot
  vár. A kérés és a válasz ugyanaz a típusos csatorna, mint a node-ok között
  (JSON fájl vagy ticket komment), a futás `--resume`-mal folytatódik a válasz után.
  Elutasításkor az emberi jegyzet `should_fix` inputként megy egy új iterációba.
- Tananyag lépés: az 5. lépés ciklusa után egy "javaslat kész, jóváhagyod?" állapot,
  egy jóváhagyó parancs és a folytatás.

## 8. "Off the loop" működés

- Koncepció: nincs jóváhagyási pont. Egy állapotmentes poller (hook) figyel egy külső
  rendszert (ticket státusz), indít, és az éles műveletet is maga végzi (merge, lezárás).
  Minden tick a külső státuszból és a `.adw/` fából vezeti le, mit tegyen, ezért
  bármikor újraindítható.
- Kulcs: az ember csak a státuszváltással kommunikál. Egy futás egy repón (lock, P7),
  soros feldolgozás. A 7. lépés jóváhagyó DecisionNode-ja itt a kódban eldöntött
  feltétel (zöld gate + reviewer ok) lesz.
- Tananyag lépés: egy minimális poller egy JSON-alapú "ticket" tábla fölött, ami a
  7. lépés workflow-ját indítja és jóváhagyás nélkül zárja le.

## Döntések

- D1. Új, minimális engine-t írunk lépésről lépésre, a toolkit engine-jét nem importáljuk.
- D2. Egy git repo, lépésenként egy branch (`01-workflow`, `02-typed-io`, ...), minden
  branch az előzőre épül. Ára: egy korai lépés javítását végig kell rebase-elni.
- D3. A P3 (friss kontextus) és a P5 (services réteg) elvet a 4. és a 3. lépés vezeti be,
  nem kapnak külön lépést.
- D4. "Near the loop" = automatikus indulás, kidolgozott megoldás, éles művelet csak
  jóváhagyás után. "Off the loop" = jóváhagyás nélkül, a gate dönt.

## Nyitott

- Q1. Célfeladat. Nem fejlesztőknek is érthető üzleti feladat kell. Jelöltek:
  - O1. Ügyfélszolgálati válaszlevél (javaslat): fiktív webshop, beérkező e-mail,
    tudásbázis fájlok. Gate: kódban ellenőrzött szabályok (ügyszám, tiltott ígéret,
    hossz, nyelv). Ügynök: válasz írása, piros gate diagnózisa. Triage: sablonkérdés
    kódból, Jev kategória és sürgősség. Near the loop: operátor hagyja jóvá a küldést.
    Off the loop: inbox poller, alacsony kockázatú kategória automatikusan megy.
    A "küldés" a tananyagban fájl mozgatása `sent/` mappába.
  - O2. Fordítás glosszáriummal: gate placeholderek, számok, glosszárium; lektor hagy jóvá.
  - O3. Számlaellenőrzés: a gate természetes, de az ügynöki ítélet gyenge, elvetve.
