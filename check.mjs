// Helsesjekk av nettsider. Leser sites.json, sjekker hver URL og skriver results.json.
// En side regnes som OPPE hvis den svarer med HTTP 200–399 innen tidsgrensen.
// Mislykkede sjekker prøves på nytt én gang etter 10 sek, så et enkelt blaff ikke gir varsel.
// Valgfritt per side: "keyword" (tekst som må finnes på siden) og "timeoutMs".

import { readFile, writeFile } from "node:fs/promises";

const sites = JSON.parse(await readFile(new URL("./sites.json", import.meta.url), "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function checkOnce(site) {
  const started = Date.now();
  try {
    const res = await fetch(site.url, {
      redirect: "follow",
      signal: AbortSignal.timeout(site.timeoutMs ?? 15000),
      headers: { "user-agent": "uptime-bot/1.0 (+github actions)" },
    });
    const ms = Date.now() - started;
    if (res.status >= 400) return { ok: false, status: res.status, ms, error: `HTTP ${res.status}` };
    if (site.keyword) {
      const body = await res.text();
      if (!body.includes(site.keyword)) return { ok: false, status: res.status, ms, error: `Fant ikke teksten «${site.keyword}»` };
    }
    return { ok: true, status: res.status, ms };
  } catch (e) {
    const reason = e.name === "TimeoutError" ? "Tidsavbrudd" : (e.cause?.code || e.cause?.errors?.[0]?.code || e.cause?.message || e.message);
    return { ok: false, status: 0, ms: Date.now() - started, error: reason };
  }
}

async function check(site) {
  let r = await checkOnce(site);
  if (!r.ok) { await sleep(10000); r = await checkOnce(site); }
  return { ...site, ...r, checkedAt: new Date().toISOString() };
}

const results = await Promise.all(sites.map(check));
await writeFile("results.json", JSON.stringify(results, null, 2));

for (const r of results) {
  console.log(`${r.ok ? "✅ OPPE" : "❌ NEDE"}  ${r.name.padEnd(26)} ${r.url.padEnd(34)} ${r.ok ? `${r.status} på ${r.ms} ms` : r.error}`);
}
