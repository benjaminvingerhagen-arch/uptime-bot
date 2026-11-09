// Varsling via GitHub Issues: åpner en sak når en side går ned, og lukker den når siden er oppe igjen.
// GitHub sender e-post til deg for hver ny sak og hver lukking (du nevnes med @ i saken).

import { readFile, appendFile } from "node:fs/promises";

const results = JSON.parse(await readFile("results.json", "utf8"));
const repo = process.env.GITHUB_REPOSITORY;
const owner = process.env.GITHUB_REPOSITORY_OWNER;
const token = process.env.GITHUB_TOKEN;
const runUrl = `${process.env.GITHUB_SERVER_URL}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`;
const LABEL = "nede";

async function gh(path, method = "GET", body) {
  const res = await fetch(`${process.env.GITHUB_API_URL || "https://api.github.com"}/repos/${repo}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 422) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const titleFor = (r) => `🔴 NEDE: ${r.name} (${r.url})`;
const fmtTime = (iso) => new Date(iso).toLocaleString("nb-NO", { timeZone: "Europe/Oslo" });

await gh("/labels", "POST", { name: LABEL, color: "d73a4a", description: "Side som er nede" }); // 422 hvis den finnes

const open = await gh(`/issues?state=open&labels=${LABEL}&per_page=100`);

for (const r of results) {
  const issue = open.find((i) => i.title === titleFor(r));
  if (!r.ok && !issue) {
    await gh("/issues", "POST", {
      title: titleFor(r),
      labels: [LABEL],
      body: `@${owner} **${r.name}** svarer ikke.\n\n- URL: ${r.url}\n- Feil: ${r.error}\n- Oppdaget: ${fmtTime(r.checkedAt)}\n- Kjøring: ${runUrl}\n\nSaken lukkes automatisk når siden er oppe igjen.`,
    });
    console.log(`Åpnet sak for ${r.name}`);
  } else if (r.ok && issue) {
    const minutes = Math.round((new Date(r.checkedAt) - new Date(issue.created_at)) / 60000);
    await gh(`/issues/${issue.number}/comments`, "POST", {
      body: `✅ @${owner} **${r.name}** er oppe igjen (${fmtTime(r.checkedAt)}, HTTP ${r.status}, ${r.ms} ms). Nede i ca. ${minutes} min.`,
    });
    await gh(`/issues/${issue.number}`, "PATCH", { state: "closed" });
    console.log(`Lukket sak for ${r.name}`);
  }
}

// Oppsummering på kjøringens side i Actions
const rows = results.map((r) => `| ${r.ok ? "✅" : "❌"} | ${r.name} | ${r.url} | ${r.ok ? `${r.status}` : r.error} | ${r.ms} ms |`);
await appendFile(process.env.GITHUB_STEP_SUMMARY,
  `### Status ${fmtTime(new Date().toISOString())}\n\n| | Side | URL | Svar | Tid |\n|---|---|---|---|---|\n${rows.join("\n")}\n`);
