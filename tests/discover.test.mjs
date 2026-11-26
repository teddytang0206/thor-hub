// Offline-Test für scripts/discover.mjs mit erfundenen Repo-Daten (keine echten Projekte)
import { run, CONFIG } from "../scripts/discover.mjs";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const now = Date.parse("2026-11-26T10:00:00Z");
const repo = (name, o = {}) => ({
  name, full_name: "beispiel/" + name, html_url: "https://github.com/beispiel/" + name,
  description: "Dual screen mod for the AYN Thor", stargazers_count: 12, archived: false,
  pushed_at: "2026-11-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z",
  license: { spdx_id: "MIT" }, has_issues: true, topics: ["ayn-thor"], homepage: null, ...o,
});
const manual = JSON.parse(readFileSync(new URL("../data/steckbriefe.json", import.meta.url)));
const manualCopy = JSON.stringify(manual);
const tmc = repo("tmc-android", { full_name: "samyost1/tmc-android", html_url: "https://github.com/samyost1/tmc-android" });

const results = [
  repo("gute-mod"),
  repo("wenig-sterne", { stargazers_count: 1 }),
  repo("alt", { pushed_at: "2024-01-01T00:00:00Z" }),
  repo("brandneu", { created_at: "2026-11-20T00:00:00Z" }),
  repo("marvel-thor-wallpaper", { description: "Wallpapers of a superhero", topics: [] }),
  repo("gesperrt"),
  repo("cool-recomp", { description: "Native Android recomp of a PC game" }),
  repo("thor-launcher", { description: "A launcher for the AYN Thor", topics: ["android", "ayn-thor"] }),
  tmc,
];
const api = {
  search: async q => q === CONFIG.queries[0] ? results : [],
  releases: async f => f.endsWith("gute-mod") ? [{ assets: [{ name: "app-release.apk" }] }] : [],
  issues: async f => f.endsWith("gute-mod") ? [{ title: "Black screen on boot", number: 4, html_url: "https://github.com/beispiel/gute-mod/issues/4" }] : [],
};
const { entries, report } = await run({ api, entries: structuredClone(manual), blocklist: ["https://github.com/beispiel/gesperrt"], today: "2026-11-26", now, log: () => {} });

assert.deepEqual(report.added.sort(), ["beispiel/cool-recomp", "beispiel/gute-mod", "beispiel/thor-launcher"]);
const skipped = Object.fromEntries(report.skipped);
assert.equal(skipped["beispiel/wenig-sterne"], "zu wenige Sterne");
assert.equal(skipped["beispiel/alt"], "zu lange nicht gepflegt");
assert.equal(skipped["beispiel/brandneu"], "zu neu");
assert.equal(skipped["beispiel/marvel-thor-wallpaper"], "passt thematisch nicht");
assert.equal(skipped["beispiel/gesperrt"], "Sperrliste");
assert.equal(JSON.stringify(entries.slice(0, manual.length)), manualCopy, "Handgepflegte Steckbriefe dürfen sich nicht ändern");

const g = entries.find(e => e.repo === "beispiel/gute-mod");
assert.equal(g.auto, true); assert.equal(g.typ, "dual-screen-mod"); assert.equal(g.open_source, "yes");
assert.match(g.du_brauchst[1].de, /APK aus den Releases/);
assert.equal(g.bekannte_fehler[0].status, "open"); assert.equal(g.bekannte_fehler[0].quelle_url, "https://github.com/beispiel/gute-mod/issues/4");
assert.equal(entries.find(e => e.repo === "beispiel/cool-recomp").typ, "recomp");
const launcher = entries.find(e => e.repo === "beispiel/thor-launcher");
assert.equal(launcher.typ, "app");
assert.ok(!launcher.namensvarianten.includes("android"), "allgemeine Topics gehören nicht in die Namensvarianten");
launcher.bild = "images/eigenes.svg"; // eigenes Bild, das beim Auffrischen bleiben muss

// zweiter Lauf: keine Duplikate, Auto-Einträge werden aufgefrischt
const second = await run({ api, entries, blocklist: ["https://github.com/beispiel/gesperrt"], today: "2026-12-03", now, log: () => {} });
assert.equal(second.report.added.length, 0);
assert.deepEqual(second.report.refreshed.sort(), ["beispiel/cool-recomp", "beispiel/gute-mod", "beispiel/thor-launcher"]);
assert.equal(second.entries.find(e => e.repo === "beispiel/thor-launcher").bild, "images/eigenes.svg");
assert.equal(second.entries.find(e => e.repo === "beispiel/gute-mod").entwurf_vom, "2026-11-26");

// Sperrliste nachträglich: Auto-Eintrag verschwindet
const third = await run({ api, entries: second.entries, blocklist: ["https://github.com/beispiel/gute-mod"], today: "2026-12-10", now, log: () => {} });
assert.equal(third.entries.some(e => e.repo === "beispiel/gute-mod"), false);
console.log("discover: alle Prüfungen bestanden");
