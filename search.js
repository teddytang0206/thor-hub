/* Thor-Hub · Suche ohne KI (feste Regeln)
 * Direkte Treffer: Suchbegriff steckt in Name oder Variante (oder alle Wörter darin).
 * Unscharfe Treffer („Meintest du …?“): Ähnlichkeit aus Tippfehler-Abstand und Zeichen-Trigrammen.
 * Läuft im Browser (window.ThorSearch) und in Node (module.exports) für Tests.
 */
(function (root) {
  "use strict";

  function normalize(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/\bii\b/g, "2")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }
  const compact = s => normalize(s).replace(/ /g, "");

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }

  function trigrams(s) {
    const t = new Set(), p = "  " + s + " ";
    for (let i = 0; i < p.length - 2; i++) t.add(p.slice(i, i + 3));
    return t;
  }
  function dice(a, b) {
    const A = trigrams(a), B = trigrams(b);
    let n = 0; A.forEach(x => { if (B.has(x)) n++; });
    return (2 * n) / (A.size + B.size || 1);
  }

  // Ähnlichkeit zweier Wörter 0..1
  function wordSim(q, w) {
    if (w.startsWith(q) && q.length >= 2) return 1;
    const lev = 1 - levenshtein(q, w) / Math.max(q.length, w.length);
    return Math.max(lev, dice(q, w));
  }

  // Ähnlichkeit Anfrage ↔ Name: jedes Anfragewort sucht sein bestes Gegenstück
  function phraseSim(query, name) {
    const qw = normalize(query).split(" ").filter(Boolean);
    const nw = normalize(name).split(" ").filter(Boolean);
    if (!qw.length || !nw.length) return 0;
    const perWord = qw.map(q => Math.max(...nw.map(w => wordSim(q, w))));
    const avg = perWord.reduce((a, b) => a + b, 0) / perWord.length;
    const whole = dice(compact(query), compact(name));
    return Math.max(avg, whole);
  }

  function namesOf(entry) {
    return [entry.spiel, entry.mod_name].concat(entry.namensvarianten || []);
  }

  function isDirect(query, entry) {
    const q = normalize(query), qc = compact(query);
    if (!q) return true;
    const qWords = q.split(" ");
    return namesOf(entry).some(n => {
      const nn = normalize(n), nc = compact(n);
      return nc.includes(qc) || qWords.every(w => nn.split(" ").some(x => x.startsWith(w)));
    });
  }

  function bestScore(query, entry) {
    let best = 0, label = entry.spiel;
    namesOf(entry).forEach(n => { const s = phraseSim(query, n); if (s > best) { best = s; label = n; } });
    return { score: best, matchedName: label };
  }

  /**
   * @returns {{mode:"all"|"direct"|"suggest"|"none", results:Array, suggestion:object|null}}
   */
  function search(query, entries, opts) {
    const threshold = (opts && opts.threshold) || 0.55;
    if (!normalize(query)) return { mode: "all", results: entries.slice(), suggestion: null };
    const direct = entries.filter(e => isDirect(query, e));
    if (direct.length) return { mode: "direct", results: direct, suggestion: null };
    const scored = entries.map(e => Object.assign({ entry: e }, bestScore(query, e)))
      .sort((a, b) => b.score - a.score);
    const top = scored[0];
    if (top && top.score >= threshold) {
      const close = scored.filter(s => s.score >= threshold && s.score >= top.score - 0.08).map(s => s.entry);
      return { mode: "suggest", results: close, suggestion: top.entry };
    }
    return { mode: "none", results: [], suggestion: null };
  }

  const api = { normalize, levenshtein, phraseSim, search };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ThorSearch = api;
})(typeof window !== "undefined" ? window : this);
