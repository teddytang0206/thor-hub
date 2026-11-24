const S = require('../search.js');
const data = require('../data/steckbriefe.json');
const cases = [
  ["minish", "minish-cap", "direct"],
  ["minsh cap", "minish-cap", "suggest"],
  ["stardwe valey", "stardew-valley", "suggest"],
  ["pokemon emerlad", "pokemon-emerald", "suggest"],
  ["Pokémon Smaragd", "pokemon-emerald", "direct"],
  ["blak ops 2", "black-ops-2", "suggest"],
  ["Black Ops II", "black-ops-2", "direct"],
  ["bo2", "black-ops-2", "direct"],
  ["twilight princes", "dusklight", "direct"],
  ["twiligt prinzess", "dusklight", "suggest"],
  ["duskligt", "dusklight", "suggest"],
  ["zelda", null, "direct"],
  ["mario kart", null, "none"],
  ["", null, "all"],
];
let fail = 0;
for (const [q, id, mode] of cases) {
  const r = S.search(q, data);
  const ids = r.results.map(e => e.id);
  const okMode = r.mode === mode;
  const okId = id === null ? true : (mode === "suggest" ? r.suggestion && r.suggestion.id === id : ids.includes(id));
  const ok = okMode && okId;
  if (!ok) fail++;
  console.log(ok ? "OK  " : "FAIL", JSON.stringify(q).padEnd(22), r.mode.padEnd(8), ids.join(","));
}
console.log(fail ? `${fail} fehlgeschlagen` : "alle bestanden");
process.exit(fail ? 1 : 0);
