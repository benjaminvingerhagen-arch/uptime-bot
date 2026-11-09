# Uptime-bot

Sjekker nettsidene i `sites.json` hvert 5. minutt med GitHub Actions.

- **Side nede** → det åpnes en sak (issue) merket `nede`, og GitHub sender deg e-post.
- **Oppe igjen** → saken får en kommentar med hvor lenge siden var nede, og lukkes automatisk (ny e-post).
- En side regnes som oppe ved HTTP 200–399 innen 15 sek. Mislykkede sjekker prøves én gang til etter 10 sek, så korte blaff ikke gir varsel.
- Siste status ligger i Actions-fanen → nyeste kjøring → oppsummeringstabell.

## Legge til eller fjerne en side

Rediger `sites.json`. Valgfrie felt per side:

```json
{ "name": "Clientkeep", "url": "https://clientkeep.no/api/health", "keyword": "ok", "timeoutMs": 20000 }
```

`keyword` gjør at sjekken også krever at en bestemt tekst finnes på siden — nyttig hvis en side kan svare 200 med en feilside.

## Oppsett

1. Lag et **offentlig** repo (f.eks. `uptime-bot`). Offentlige repoer har ubegrenset Actions-tid; et privat repo med sjekk hvert 5. min ville brukt opp gratiskvoten (2000 min/mnd). Repoet inneholder bare domenenavn, ingen hemmeligheter.
2. Last opp filene og push til `main`.
3. Actions → Uptime → **Run workflow** for en første test.
4. Sjekk at du får e-post fra GitHub: Settings → Notifications → «Issues» må være på for e-post.
