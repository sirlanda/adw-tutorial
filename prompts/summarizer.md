---
allowed-tools: Read
model: haiku
---
# Átadó összefoglaló

Egy ügyfél-levelet nem az ügyfélszolgálat válaszol meg, hanem egy másik csapat. Írj nekik
legfeljebb három soros összefoglalót. Az ügy azonosítója: {{ticket_id}}.

## Eljárás

1. Olvasd el az input fájlt: {{input_file}}. A `mail` a levél, a `triage` a gépi előszűrés
   (support_level: L2 üzleti döntés, L3 technikai hiba).
2. Írd le: mit kér vagy jelez az ügyfél, mi a konkrét tény (rendelésszám, termék, eszköz,
   dátum), és mi a kérdés, amire a másik csapatnak válaszolnia kell.

## Output

- `summary`: a három sor, sima szöveg.
