/* Thor-Hub · Version 1 (MVP)
 * Ansichten: Übersicht (#) und Steckbrief (#<id>), Sprache DE/EN.
 * Daten: data/steckbriefe.json (von Hand gepflegt, Texte als {de, en}).
 * Helfer: Artifact-Fähigkeit „sample“ (Claude fragen); fehlt sie, greift Plan B.
 */
(function () {
  "use strict";

  const main = document.getElementById("main");
  const ON_PAGES = /\.github\.io$/.test(location.hostname);
  const LANG_KEY = "thorhub-lang";
  const state = { entries: [], byId: new Map(), query: "", checks: new Map(), sample: undefined, abort: null, lang: initialLang() };

  /* ---------- Sprache ---------- */
  const I18N = {
    de: {
      tagline: "Dual-Screen-Mods, Recomps und Apps für den AYN Thor",
      lead: "Für jeden Mod steht hier, was du zum Installieren brauchst, ob er etwas kostet und ob der Code offen liegt. Wenn er nicht startet, schau in die Liste der bekannten Fehler.",
      searchLabel: "Spiel suchen", searchPh: "z. B. Minish Cap, Stardew, BO2",
      countAll: n => `${n} Mods, Recomps und Apps`, countHits: n => n === 1 ? "1 Treffer" : `${n} Treffer`,
      didYouMean: "Kein genauer Treffer. Meintest du ", none: "Noch nicht im Hub. Prüf die Schreibweise oder schau später wieder vorbei.",
      gridLabel: "Mods, Recomps und Apps", chipsLabel: "Kennzeichen",
      type: { "dual-screen-mod": "Dual-Screen-Mod", recomp: "Recomp", app: "App" },
      cost: { free: "kostenlos", patreon: "Patreon", none_mentioned: "keine Bezahlung erwähnt" },
      os: { yes: "Open Source", unclear: "Open Source: unklar", no: "kein Open Source" },
      checked: d => "geprüft am " + d, autoChip: "automatisch · nicht geprüft",
      back: "← Alle Mods",
      asOf: d => `Stand ${d}. Im Zweifel gilt die Originalquelle.`,
      autoNotice: (d, stars, active) => `Automatisch aus GitHub-Daten erstellt (Stand ${d}) und von niemandem geprüft. ${stars} Sterne auf GitHub, zuletzt aktiv am ${active}. Lies vor der Installation die README und lade nur aus der Originalquelle.`,
      checkNote: "Prüfnotiz: ",
      needs: "Du brauchst", progress: (a, b) => `${a} von ${b} erledigt`, toSource: "Zur Originalquelle ↗", license: "Lizenz: ",
      errors: "Bekannte Fehler", noErrors: "Die Quelle nennt bisher keine bekannten Fehler. Nutze den Helfer oder frag im Entwickler-Thread.",
      cause: "Ursache: ", source: "Quelle: ",
      status: { solved: "Lösung bekannt", open: "offen", limitation: "Einschränkung", note: "Hinweis" },
      helper: "Installationshelfer", helperLabel: "Dein Problem",
      helperPh: "z. B. „Die Texte fehlen, ich nutze eine deutsche ROM.“",
      helperHint: "Beschreibe Fehlermeldung, Version oder ROM-Region. Der Helfer antwortet nur aus diesem Steckbrief.",
      ask: "Helfer fragen", thinking: "Helfer sucht im Steckbrief", wait: "Moment, ich schaue nach",
      offPages: "In dieser öffentlichen Version ist der Helfer noch ausgeschaltet. Er läuft bisher nur in einer Testversion.",
      offHere: "Der Helfer ist hier gerade nicht verfügbar.", off: "Helfer aus",
      offBody: ["Schau unten unter „Bekannte Fehler“. Steht dein Problem nicht dabei, frag im ", "Entwickler-Thread", " nach."],
      empty: "Bitte beschreibe zuerst dein Problem.", hintLabel: "Hinweis",
      rate: "Gerade zu viele Anfragen. Bitte in einer Minute noch einmal versuchen.", parse: "Die Antwort war unvollständig. Bitte noch einmal fragen.",
      fail: "Der Helfer konnte nicht antworten.", failTail: " Bis dahin helfen die bekannten Fehler oder der ", errLabel: "Fehler",
      more: "Mehr dazu: ", knownErr: id => `Bekannter Fehler ${id}`, askThread: ["Frag im ", "Entwickler-Thread", " nach. Dort lesen die Entwickler mit."],
      kinds: { loesung: "Lösung", offen: "Bekannt, noch ohne Lösung", rueckfrage: "Rückfrage", unbekannt: "Unbekannt" },
      loadFail: "Die Steckbriefe konnten nicht geladen werden. Bitte Seite neu laden.",
      navHub: "Hub", navEvidence: "Build Evidence (D3)", skip: "Zum Inhalt springen", langGroup: "Sprache",
      footer: "Der Thor-Hub stellt keine Dateien bereit. Downloads laufen immer über die Originalquelle. MVP V1 von Teddy Tang, HdM, WiSe 2026/27. Neue Mods kommen jede Woche automatisch dazu und werden nicht von Hand geprüft. Die Bilder sind eigene Pixel-Art-Motive, keine Originalgrafiken der Spiele.",
      answerLang: "Deutsch", du: "per Du"
    },
    en: {
      tagline: "Dual-screen mods, recomps and apps for the AYN Thor",
      lead: "For every mod you'll find what you need to install it, whether it costs anything and whether the code is open. If it won't start, check the list of known issues.",
      searchLabel: "Search a game", searchPh: "e.g. Minish Cap, Stardew, BO2",
      countAll: n => `${n} mods, recomps and apps`, countHits: n => n === 1 ? "1 result" : `${n} results`,
      didYouMean: "No exact match. Did you mean ", none: "Not in the hub yet. Check the spelling or come back later.",
      gridLabel: "Mods, recomps and apps", chipsLabel: "Labels",
      type: { "dual-screen-mod": "Dual-screen mod", recomp: "Recomp", app: "App" },
      cost: { free: "free", patreon: "Patreon", none_mentioned: "no payment mentioned" },
      os: { yes: "Open source", unclear: "Open source: unclear", no: "Not open source" },
      checked: d => "checked " + d, autoChip: "automatic · not checked",
      back: "← All mods",
      asOf: d => `As of ${d}. If in doubt, the original source wins.`,
      autoNotice: (d, stars, active) => `Created automatically from GitHub data (as of ${d}) and not checked by anyone. ${stars} stars on GitHub, last active on ${active}. Read the README before installing and only download from the original source.`,
      checkNote: "Note: ",
      needs: "You need", progress: (a, b) => `${a} of ${b} done`, toSource: "Go to original source ↗", license: "License: ",
      errors: "Known issues", noErrors: "The source doesn't list any known issues yet. Try the helper or ask in the developer thread.",
      cause: "Cause: ", source: "Source: ",
      status: { solved: "fix known", open: "open", limitation: "limitation", note: "note" },
      helper: "Install helper", helperLabel: "Your problem",
      helperPh: "e.g. \"Text is missing, I'm using a German ROM.\"",
      helperHint: "Describe the error message, version or ROM region. The helper only answers from this page.",
      ask: "Ask the helper", thinking: "Helper is checking this page", wait: "One moment",
      offPages: "The helper is switched off in this public version. So far it only runs in a test version.",
      offHere: "The helper isn't available here right now.", off: "Helper off",
      offBody: ["Check \"Known issues\" below. If your problem isn't there, ask in the ", "developer thread", "."],
      empty: "Please describe your problem first.", hintLabel: "Note",
      rate: "Too many requests right now. Please try again in a minute.", parse: "The answer came back incomplete. Please ask again.",
      fail: "The helper couldn't answer.", failTail: " Until then, the known issues or the ", errLabel: "Error",
      more: "More: ", knownErr: id => `Known issue ${id}`, askThread: ["Ask in the ", "developer thread", ". The developers read along there."],
      kinds: { loesung: "Fix", offen: "Known, no fix yet", rueckfrage: "Question", unbekannt: "Unknown" },
      loadFail: "The mod pages couldn't be loaded. Please reload.",
      navHub: "Hub", navEvidence: "Build evidence (D3)", skip: "Skip to content", langGroup: "Language",
      footer: "The Thor-Hub doesn't host any files. Downloads always go through the original source. MVP V1 by Teddy Tang, HdM, winter term 2026/27. New mods are added automatically every week and aren't checked by hand. The images are original pixel art, not artwork from the games.",
      answerLang: "English", du: "in a casual tone"
    }
  };
  const t = key => I18N[state.lang][key];
  const tr = v => (v && typeof v === "object" && !Array.isArray(v)) ? (v[state.lang] || v.de || "") : (v == null ? "" : v);

  function initialLang() {
    try { const s = localStorage.getItem(LANG_KEY); if (s === "de" || s === "en") return s; } catch (_) {}
    return /^de\b/i.test(navigator.language || "") ? "de" : "en";
  }
  function setLang(lang) {
    if (lang === state.lang) return;
    state.lang = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch (_) {}
    applyChrome();
    if (state.entries.length) route();
  }
  // Seitenrahmen (Navigation, Fußzeile, Sprachknöpfe) übersetzen
  function applyChrome() {
    document.documentElement.lang = state.lang;
    document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
    const ev = document.querySelector("[data-evidence-link]");
    if (ev) ev.setAttribute("href", state.lang === "en" ? "evidence.en.html" : "evidence.html");
    const grp = document.querySelector(".lang");
    if (grp) grp.setAttribute("aria-label", t("langGroup"));
    document.querySelectorAll(".lang [data-lang]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === state.lang)));
  }

  /* ---------- kleine DOM-Helfer (kein innerHTML für fremde Texte) ---------- */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : String(kid));
    return el;
  }
  const ext = (href, label, cls) => h("a", { href, target: "_blank", rel: "noopener noreferrer", class: cls }, label);
  function fmtDate(iso) {
    const d = new Date(iso + "T12:00:00");
    return isNaN(d) ? iso : d.toLocaleDateString(state.lang === "en" ? "en-GB" : "de-DE");
  }
  const picture = (e, cls) => e.bild ? h("img", { class: cls, src: e.bild, alt: tr(e.bild_alt), width: "320", height: "180", loading: "lazy", decoding: "async" }) : null;

  /* ---------- Labels ---------- */
  function chips(e) {
    const list = h("ul", { class: "chips", "aria-label": t("chipsLabel") });
    list.append(h("li", { class: "chip type" }, t("type")[e.typ] || e.typ));
    list.append(h("li", { class: "chip " + (e.kosten === "free" ? "ok" : e.kosten === "patreon" ? "warn" : "") }, t("cost")[e.kosten] || e.kosten));
    list.append(h("li", { class: "chip " + (e.open_source === "yes" ? "ok" : "warn") }, t("os")[e.open_source] || e.open_source));
    if (e.pruefdatum) list.append(h("li", { class: "chip ok" }, t("checked")(fmtDate(e.pruefdatum))));
    else if (e.auto) list.append(h("li", { class: "chip warn" }, t("autoChip")));
    return list;
  }

  /* ---------- Übersicht ---------- */
  function renderOverview() {
    document.title = "Thor-Hub";
    const input = h("input", { id: "q", type: "search", autocomplete: "off", spellcheck: "false", placeholder: t("searchPh"), "aria-describedby": "status" });
    input.value = state.query;
    const status = h("p", { id: "status", class: "status", role: "status", "aria-live": "polite" });
    const grid = h("ul", { class: "grid", "aria-label": t("gridLabel") });

    function update() {
      state.query = input.value;
      const r = window.ThorSearch.search(state.query, state.entries);
      grid.replaceChildren(...r.results.map(tile));
      status.replaceChildren();
      if (r.mode === "all") status.append(t("countAll")(r.results.length));
      else if (r.mode === "direct") status.append(t("countHits")(r.results.length));
      else if (r.mode === "suggest") {
        status.append(t("didYouMean"),
          h("button", { class: "linkish", type: "button", onclick: () => { location.hash = r.suggestion.id; } }, r.suggestion.spiel), "?");
      } else status.append(t("none"));
    }
    input.addEventListener("input", update);

    main.replaceChildren(
      h("div", { class: "brand" }, h("img", { class: "logo", src: "logo.svg", alt: "", width: "44", height: "44" }),
        h("h1", { tabindex: "-1" }, "Thor-Hub"), h("span", { class: "tag" }, t("tagline"))),
      h("p", { class: "lead" }, t("lead")),
      h("div", { class: "search", role: "search" }, h("label", { for: "q" }, t("searchLabel")), input),
      status, grid
    );
    update();
    return main.querySelector("h1");
  }

  function tile(e) {
    return h("li", {},
      h("a", { class: "tile", href: "#" + e.id },
        picture(e, "tile-img"),
        h("div", { class: "tile-body" }, h("h2", {}, e.spiel), h("p", { class: "mod" }, e.mod_name), chips(e))));
  }

  /* ---------- Steckbrief ---------- */
  function renderDetail(e) {
    document.title = e.spiel + " · Thor-Hub";
    const checks = state.checks.get(e.id) || new Set();
    state.checks.set(e.id, checks);

    const progress = h("span", { class: "progress" });
    const setProgress = () => { progress.textContent = t("progress")(checks.size, e.du_brauchst.length); };
    const needs = h("ul", { class: "checklist" }, e.du_brauchst.map((n, i) => {
      const cb = h("input", { type: "checkbox" });
      cb.checked = checks.has(i);
      cb.addEventListener("change", () => { cb.checked ? checks.add(i) : checks.delete(i); setProgress(); });
      return h("li", {}, h("label", {}, cb, h("span", {}, tr(n))));
    }));
    setProgress();

    const errors = e.bekannte_fehler.length
      ? h("ul", { class: "errors" }, e.bekannte_fehler.map(errorItem))
      : h("p", { class: "empty" }, t("noErrors"));

    const notice = e.auto && !e.pruefdatum ? h("p", { class: "notice" },
      t("autoNotice")(fmtDate(e.entwurf_vom), e.sterne ?? "?", e.zuletzt_aktiv ? fmtDate(e.zuletzt_aktiv) : "?")) : null;

    main.replaceChildren(
      h("a", { class: "back", href: "#" }, t("back")),
      h("article", { class: "detail" },
        picture(e, "hero"),
        h("h1", { tabindex: "-1" }, e.spiel),
        h("p", { class: "mod" }, e.mod_name),
        chips(e),
        h("p", { class: "kurz" }, tr(e.kurz)),
        notice,
        h("section", { class: "card", "aria-labelledby": "needs-h" },
          h("h2", { id: "needs-h" }, t("needs"), progress), needs,
          h("div", { class: "actions" }, ext(e.originalquelle, t("toSource"), "btn")),
          e.weitere_quellen.length ? h("ul", { class: "sources" }, e.weitere_quellen.map(s => h("li", {}, ext(s.url, tr(s.titel))))) : null,
          h("p", { class: "hint" }, t("license") + tr(e.lizenz)),
          e.auto ? null : h("p", { class: "hint" }, t("asOf")(fmtDate(e.pruefdatum || e.entwurf_vom)))
        ),
        helperSection(e),
        h("section", { class: "card", "aria-labelledby": "err-h" }, h("h2", { id: "err-h" }, t("errors")), errors)
      )
    );
    return main.querySelector("h1");
  }

  function errorItem(f) {
    const cls = f.status === "solved" ? "ok" : f.status === "open" ? "warn" : "";
    return h("li", { class: "error", id: "fehler-" + f.id },
      h("h3", {}, h("span", { class: "eid" }, f.id), tr(f.symptom), h("span", { class: "chip " + cls }, t("status")[f.status] || f.status)),
      h("p", {}, h("strong", {}, t("cause")), tr(f.ursache)),
      h("ol", {}, f.loesung.map(s => h("li", {}, tr(s)))),
      h("p", { class: "src" }, t("source"), ext(f.quelle_url, tr(f.quelle))));
  }

  function highlightError(id) {
    document.querySelectorAll(".error.hit").forEach(x => x.classList.remove("hit"));
    const el = document.getElementById("fehler-" + id);
    if (!el) return;
    el.classList.add("hit");
    el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  }

  /* ---------- Helfer ---------- */
  function helperSection(e) {
    const ta = h("textarea", { id: "frage", maxlength: "1000", placeholder: t("helperPh"), "aria-describedby": "helper-hint" });
    const btn = h("button", { class: "btn", type: "button" }, t("ask"));
    const out = h("div", { "aria-live": "polite" });
    const hint = h("p", { id: "helper-hint", class: "hint" }, t("helperHint"));
    const label = h("label", { for: "frage", class: "hint" }, t("helperLabel"));
    const section = h("section", { class: "card helper", "aria-labelledby": "helper-h" },
      h("h2", { id: "helper-h" }, t("helper")), label, ta, hint, h("div", { class: "actions" }, btn), out);

    const showPlanB = () => {
      ta.disabled = true; btn.disabled = true;
      if (ON_PAGES) { ta.hidden = true; btn.hidden = true; label.hidden = true; }
      hint.textContent = ON_PAGES ? t("offPages") : t("offHere");
      const [a, link, b] = t("offBody");
      out.replaceChildren(answerBox("unbekannt", t("off"), [h("p", {}, a, ext(e.entwickler_thread, link), b)]));
    };

    const submit = async () => {
      const q = ta.value.trim();
      if (!q) { out.replaceChildren(answerBox("fehler", t("hintLabel"), [h("p", {}, t("empty"))])); ta.focus(); return; }
      if (!state.sample) { showPlanB(); return; }
      if (state.abort) state.abort.abort();
      const ac = new AbortController(); state.abort = ac;
      btn.disabled = true;
      out.replaceChildren(answerBox("", t("thinking"), [h("p", { class: "dots" }, t("wait"))]));
      try {
        const res = await state.sample(buildPrompt(e, q), { modelTier: "quick", signal: ac.signal });
        out.replaceChildren(renderAnswer(e, parseAnswer(res.text)));
      } catch (err) {
        if (ac.signal.aborted) return;
        const code = err && err.code;
        if (code === "not_granted") { showPlanB(); return; }
        const msg = code === "rate_limited" ? t("rate") : code === "parse" ? t("parse") : t("fail");
        out.replaceChildren(answerBox("fehler", t("errLabel"), [h("p", {}, msg + t("failTail"), ext(e.entwickler_thread, t("askThread")[1]), ".")]));
      } finally {
        if (state.abort === ac) state.abort = null;
        if (!ta.disabled) btn.disabled = false;
      }
    };
    btn.addEventListener("click", submit);
    ta.addEventListener("keydown", ev => { if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) submit(); });

    whenSample().then(s => { if (!s && section.isConnected) showPlanB(); });
    return section;
  }

  function answerBox(kind, label, body) {
    return h("div", { class: "answer " + kind }, h("div", { class: "kind" }, label), body);
  }

  function buildPrompt(e, question) {
    const statusWord = { solved: "geloest", open: "offen", limitation: "einschraenkung", note: "hinweis" };
    const wissen = {
      spiel: e.spiel, mod: e.mod_name, typ: e.typ, du_brauchst: e.du_brauchst.map(tr),
      originalquelle: e.originalquelle, entwickler_thread: e.entwickler_thread,
      bekannte_fehler: e.bekannte_fehler.map(f => ({ id: f.id, status: statusWord[f.status] || f.status, symptom: tr(f.symptom), ursache: tr(f.ursache), loesung: f.loesung.map(tr) }))
    };
    return [
      `Du bist der Installationshelfer des Thor-Hub. Antworte auf ${t("answerLang")}, kurz und freundlich, ${t("du")}.`,
      "REGELN:",
      "- Nutze AUSSCHLIESSLICH das WISSEN unten. Kein Allgemeinwissen, keine Vermutungen, keine anderen Mods.",
      "- Passt die Frage eindeutig zu einem bekannten Fehler mit Lösung: art=\"loesung\", verweis=dessen id, schritte=die Lösungsschritte dieses Eintrags.",
      "- Passt sie zu einem bekannten Fehler mit status \"offen\": art=\"offen\", verweis=dessen id, erkläre, dass es noch keine Lösung gibt.",
      "- Passt sie zu einer Voraussetzung aus du_brauchst, die offenbar fehlt: art=\"loesung\", verweis=null, schritte nennen die fehlende Voraussetzung.",
      "- Fehlt eine Angabe, um zwischen Einträgen zu unterscheiden: art=\"rueckfrage\" mit genau einer kurzen Frage.",
      "- Sonst: art=\"unbekannt\". Erfinde nichts.",
      "- Empfiehl nie Downloads außerhalb der Originalquelle, nie das Löschen von Spielständen und nie das dauerhafte Abschalten von Sicherheitsfunktionen.",
      "Antworte NUR mit JSON: {\"art\":\"loesung\"|\"offen\"|\"rueckfrage\"|\"unbekannt\",\"verweis\":\"<id>\"|null,\"text\":\"1-2 Sätze\",\"schritte\":[\"...\"],\"frage\":\"...\"|null}",
      "",
      "WISSEN:", JSON.stringify(wissen),
      "",
      "FRAGE:", question
    ].join("\n");
  }

  function parseAnswer(text) {
    const m = String(text || "").match(/\{[\s\S]*\}/);
    if (!m) throw { code: "parse" };
    let a; try { a = JSON.parse(m[0]); } catch (_) { throw { code: "parse" }; }
    if (!["loesung", "offen", "rueckfrage", "unbekannt"].includes(a.art)) a.art = "unbekannt";
    return a;
  }

  function renderAnswer(e, a) {
    const ref = a.verweis && e.bekannte_fehler.find(f => f.id === a.verweis);
    if (a.verweis && !ref) a.verweis = null; // nur echte Einträge verlinken
    const body = [];
    if (a.text) body.push(h("p", {}, a.text));
    if (a.art === "loesung" && Array.isArray(a.schritte) && a.schritte.length) body.push(h("ol", {}, a.schritte.map(s => h("li", {}, s))));
    if (a.art === "rueckfrage" && a.frage) body.push(h("p", {}, h("strong", {}, a.frage)));
    if (ref) {
      body.push(h("p", {}, t("more"),
        h("button", { class: "linkish", type: "button", onclick: () => highlightError(ref.id) }, t("knownErr")(ref.id)),
        " · " + t("source"), ext(ref.quelle_url, tr(ref.quelle))));
      setTimeout(() => highlightError(ref.id), 50);
    }
    if (a.art === "unbekannt" || a.art === "offen") {
      const [x, link, y] = t("askThread");
      body.push(h("p", {}, x, ext(e.entwickler_thread, link), y));
    }
    if (a.art === "rueckfrage") setTimeout(() => { const el = document.getElementById("frage"); if (el) el.focus(); }, 50);
    return answerBox(a.art, t("kinds")[a.art], body);
  }

  // window.claude kann verzögert erscheinen; null nach Zeitüberschreitung → Plan B
  let samplePromise = null;
  function whenSample() {
    if (samplePromise) return samplePromise;
    samplePromise = (async () => {
      if (ON_PAGES) { state.sample = null; return null; } // auf GitHub Pages gibt es „Claude fragen“ nicht
      for (let i = 0; i < 60 && !(window.claude && window.claude.use); i++) await new Promise(r => setTimeout(r, 100));
      try { state.sample = window.claude && window.claude.use ? await window.claude.use("sample") : null; }
      catch (_) { state.sample = null; }
      return state.sample;
    })();
    return samplePromise;
  }

  /* ---------- Routing ---------- */
  let routed = false;
  function route() {
    if (state.abort) { state.abort.abort(); state.abort = null; }
    const id = decodeURIComponent(location.hash.slice(1));
    const entry = state.byId.get(id);
    const heading = entry ? renderDetail(entry) : renderOverview();
    window.scrollTo(0, 0);
    if (heading && routed) heading.focus({ preventScroll: true }); // Fokus nur bei Ansichtswechsel, nicht beim ersten Laden
    routed = true;
  }

  const skip = document.querySelector(".skip");
  if (skip) skip.addEventListener("click", ev => { ev.preventDefault(); main.focus(); });
  document.querySelectorAll(".lang [data-lang]").forEach(b => b.addEventListener("click", () => setLang(b.dataset.lang)));

  async function boot() {
    applyChrome();
    whenSample();
    try {
      const res = await fetch("data/steckbriefe.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      state.entries = await res.json();
      state.entries.forEach(e => state.byId.set(e.id, e));
    } catch (err) {
      main.replaceChildren(h("p", { class: "fatal" }, t("loadFail")));
      console.error("[Thor-Hub] Daten nicht geladen:", err);
      return;
    }
    window.addEventListener("hashchange", route);
    route();
  }
  boot();
})();
