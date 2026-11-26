#!/usr/bin/env node
/* Thor-Hub · automatische Aufnahme neuer Mods und Recomps (ohne KI)
 *
 * Läuft wöchentlich als GitHub Action. Sucht auf GitHub nach passenden Repos,
 * baut aus den Repo-Daten einen Steckbrief und hängt ihn an data/steckbriefe.json an.
 * Bereits automatisch aufgenommene Einträge bekommen frische Issues und Metadaten.
 * Von Hand angelegte Steckbriefe (ohne "auto") werden nie verändert.
 *
 * Aufruf:
 *   node scripts/discover.mjs                      # echte GitHub-API (GITHUB_TOKEN empfohlen)
 *   node scripts/discover.mjs --fixture f.json     # Testdaten statt API
 *   node scripts/discover.mjs --dry-run            # nichts schreiben, nur ausgeben
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "data", "steckbriefe.json");
const BLOCK = path.join(ROOT, "data", "sperrliste.json");

export const CONFIG = {
  queries: [
    '"ayn thor" in:name,description,readme',
    '"thor" "dual screen" in:description,readme',
    '"dual-screen" android apk in:description,readme',
    'recomp android apk in:description,readme',
  ],
  // Treffer muss eines davon in Name, Beschreibung oder Topics haben. „Thor“ allein reicht nicht (zu viele fremde Treffer).
  mustMention: /(ayn[\s-]?thor|dual[\s-]?screen|second[\s-]screen|recomp)/i,
  minStars: 3,             // weniger Sterne: zu unsicher
  maxAgeDays: 365,         // seit einem Jahr nicht mehr gepflegt: raus
  minRepoAgeDays: 14,      // ganz neue Repos: erst mal abwarten (Schutz vor Wegwerf-Repos)
  maxNewPerRun: 5,
  maxIssues: 5,
};

const DAY = 86400000;
const slug = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
const words = s => s.replace(/[-_.]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim();
const both = s => ({ de: s, en: s });

/* ---------- GitHub-Zugriff ---------- */
function makeApi(fixture) {
  if (fixture) {
    return {
      search: async q => fixture.search[q] || [],
      releases: async full => fixture.releases?.[full] || [],
      issues: async full => fixture.issues?.[full] || [],
    };
  }
  const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "thor-hub-discover" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const get = async url => {
    const res = await fetch("https://api.github.com" + url, { headers });
    if (!res.ok) throw new Error(`GitHub ${res.status} für ${url}`);
    return res.json();
  };
  return {
    search: async q => (await get(`/search/repositories?q=${encodeURIComponent(q)}&sort=updated&per_page=30`)).items || [],
    releases: async full => get(`/repos/${full}/releases?per_page=5`).catch(() => []),
    issues: async full => (await get(`/repos/${full}/issues?state=open&per_page=30`).catch(() => [])).filter(i => !i.pull_request),
  };
}

/* ---------- Filter ---------- */
export function passesFilter(repo, now = Date.now()) {
  const text = `${repo.name} ${repo.description || ""} ${(repo.topics || []).join(" ")}`;
  if (repo.archived || repo.disabled) return "archiviert";
  if (!CONFIG.mustMention.test(text)) return "passt thematisch nicht";
  if ((repo.stargazers_count || 0) < CONFIG.minStars) return "zu wenige Sterne";
  if (now - Date.parse(repo.pushed_at) > CONFIG.maxAgeDays * DAY) return "zu lange nicht gepflegt";
  if (now - Date.parse(repo.created_at) < CONFIG.minRepoAgeDays * DAY) return "zu neu";
  return null;
}

/* ---------- Steckbrief aus Repo-Daten ---------- */
export function buildEntry(repo, releases, issues, today) {
  const desc = (repo.description || "").trim();
  const text = `${repo.name} ${desc} ${(repo.topics || []).join(" ")}`;
  const hasApk = releases.some(r => (r.assets || []).some(a => /\.apk$/i.test(a.name)));
  const isRecomp = /recomp|port\b|native/i.test(text) && !/dual[\s-]?screen/i.test(text);
  const patreon = /patreon/i.test(desc) || (repo.homepage || "").includes("patreon");
  const license = repo.license && repo.license.spdx_id && repo.license.spdx_id !== "NOASSERTION" ? repo.license.spdx_id : null;
  const nice = words(repo.name);

  const du_brauchst = [
    { de: "Ein Dual-Screen-Gerät wie den AYN Thor (laut automatischer Einordnung, bitte in der README prüfen)", en: "A dual-screen device like the AYN Thor (auto-detected, please check the README)" },
    hasApk ? { de: "APK aus den Releases der Originalquelle", en: "APK from the original source's releases" }
           : { de: "Installationsweg laut README der Originalquelle (kein APK im Release gefunden)", en: "Install steps from the original source's README (no APK found in releases)" },
    { de: "Weitere Voraussetzungen wie Spieldateien oder ROM: siehe README", en: "Other requirements such as game files or ROM: see README" },
  ];

  const bekannte_fehler = issues.slice(0, CONFIG.maxIssues).map((i, n) => ({
    id: "A" + (n + 1),
    status: "open",
    symptom: both(i.title.trim()),
    ursache: { de: "Unbekannt (offenes Issue).", en: "Unknown (open issue)." },
    loesung: [{ de: `Noch keine Lösung veröffentlicht. Issue #${i.number} verfolgen.`, en: `No fix published yet. Follow issue #${i.number}.` }],
    quelle: { de: `GitHub-Issue #${i.number}`, en: `GitHub issue #${i.number}` },
    quelle_url: i.html_url,
  }));

  return {
    id: slug(repo.name) || slug(repo.full_name),
    auto: true,
    repo: repo.full_name,
    spiel: nice,
    mod_name: repo.full_name,
    typ: isRecomp ? "recomp" : "dual-screen-mod",
    bild: "images/auto.svg",
    bild_alt: { de: "Pixelbild: Spielmodul mit Fragezeichen", en: "Pixel art: a game cartridge with a question mark" },
    namensvarianten: [...new Set([repo.name, nice, ...(repo.topics || []).map(words)])],
    kurz: desc ? { de: `Beschreibung aus GitHub: ${desc}`, en: `Description from GitHub: ${desc}` }
               : { de: "Keine Beschreibung auf GitHub.", en: "No description on GitHub." },
    du_brauchst,
    kosten: patreon ? "patreon" : "none_mentioned",
    open_source: license ? "yes" : "unclear",
    lizenz: license || { de: "nicht angegeben", en: "not stated" },
    originalquelle: repo.html_url,
    entwickler_thread: repo.has_issues ? `${repo.html_url}/issues` : repo.html_url,
    weitere_quellen: repo.homepage ? [{ titel: { de: "Projektseite", en: "Project page" }, url: repo.homepage }] : [],
    bekannte_fehler,
    sterne: repo.stargazers_count,
    zuletzt_aktiv: repo.pushed_at.slice(0, 10),
    pruefdatum: null,
    entwurf_vom: today,
  };
}

/* ---------- Ablauf ---------- */
export async function run({ api, entries, blocklist, today, now = Date.now(), log = console.log }) {
  const known = new Set(entries.map(e => (e.originalquelle || "").toLowerCase().replace(/\/$/, "")));
  const knownIds = new Set(entries.map(e => e.id));
  const blocked = new Set(blocklist.map(u => u.toLowerCase().replace(/\/$/, "")));
  const seen = new Map();

  for (const q of CONFIG.queries) for (const r of await api.search(q)) seen.set(r.full_name, r);

  let added = 0;
  const report = { added: [], refreshed: [], skipped: [] };
  for (const repo of seen.values()) {
    const url = repo.html_url.toLowerCase();
    if (blocked.has(url)) { report.skipped.push([repo.full_name, "Sperrliste"]); continue; }
    const existing = entries.find(e => (e.originalquelle || "").toLowerCase().replace(/\/$/, "") === url);
    if (existing && !existing.auto) continue;               // von Hand gepflegt: nie anfassen
    const why = passesFilter(repo, now);
    if (why) { report.skipped.push([repo.full_name, why]); continue; }
    if (!existing && added >= CONFIG.maxNewPerRun) { report.skipped.push([repo.full_name, "Limit pro Lauf"]); continue; }

    const entry = buildEntry(repo, await api.releases(repo.full_name), await api.issues(repo.full_name), today);
    if (existing) {
      entry.id = existing.id; entry.entwurf_vom = existing.entwurf_vom;
      entries[entries.indexOf(existing)] = entry; report.refreshed.push(repo.full_name);
    } else {
      while (knownIds.has(entry.id)) entry.id += "-2";
      knownIds.add(entry.id); known.add(url); entries.push(entry); added++; report.added.push(repo.full_name);
    }
  }
  // Auto-Einträge, die auf der Sperrliste gelandet sind, wieder entfernen
  const before = entries.length;
  const kept = entries.filter(e => !(e.auto && blocked.has((e.originalquelle || "").toLowerCase())));
  if (kept.length !== before) log(`Entfernt (Sperrliste): ${before - kept.length}`);
  log(`Neu: ${report.added.length} · aufgefrischt: ${report.refreshed.length} · übersprungen: ${report.skipped.length}`);
  report.added.forEach(r => log("  + " + r));
  report.skipped.slice(0, 20).forEach(([r, w]) => log(`  - ${r}: ${w}`));
  return { entries: kept, report };
}

async function main() {
  const args = process.argv.slice(2);
  const fixArg = args.indexOf("--fixture");
  const fixture = fixArg >= 0 ? JSON.parse(await readFile(args[fixArg + 1], "utf8")) : null;
  const dry = args.includes("--dry-run");
  const entries = JSON.parse(await readFile(DATA, "utf8"));
  const blocklist = JSON.parse(await readFile(BLOCK, "utf8").catch(() => "[]"));
  const today = new Date().toISOString().slice(0, 10);
  const { entries: out } = await run({ api: makeApi(fixture), entries, blocklist, today });
  const json = JSON.stringify(out, null, 2) + "\n";
  if (dry) { console.log(`(Probelauf) ${out.length} Steckbriefe, nichts geschrieben.`); return; }
  await writeFile(DATA, json);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error(err.message); process.exit(1); });
}
