/* Thor-Hub · Version 1 (MVP)
 * Ansichten: Übersicht (#) und Steckbrief (#<id>).
 * Daten: data/steckbriefe.json (von Hand gepflegt).
 * Helfer: Artifact-Fähigkeit „sample“ (Claude fragen); fehlt sie, greift Plan B.
 */
(function () {
  "use strict";

  const main = document.getElementById("main");
  const ON_PAGES = /\.github\.io$/.test(location.hostname);
  const state = { entries: [], byId: new Map(), query: "", checks: new Map(), sample: undefined, abort: null };

  /* ---------- kleine DOM-Helfer (kein innerHTML für fremde Texte) ---------- */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "text") el.textContent = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : String(kid));
    return el;
  }
  const ext = (href, label, cls) => h("a", { href, target: "_blank", rel: "noopener noreferrer", class: cls }, label);

  /* ---------- Labels ---------- */
  function chips(e) {
    const list = h("ul", { class: "chips", "aria-label": "Kennzeichen" });
    list.append(h("li", { class: "chip type" }, e.typ));
    const free = e.kosten === "kostenlos";
    const patreon = /patreon/i.test(e.kosten);
    list.append(h("li", { class: "chip " + (free ? "ok" : patreon ? "warn" : "") }, free ? "kostenlos" : patreon ? "Patreon" : e.kosten));
    const os = e.open_source === "ja";
    list.append(h("li", { class: "chip " + (os ? "ok" : "warn") }, os ? "Open Source" : "Open Source: " + e.open_source));
    list.append(h("li", { class: "chip " + (e.pruefdatum ? "ok" : "warn") },
      e.pruefdatum ? "geprüft am " + fmtDate(e.pruefdatum) : "Entwurf · ungeprüft"));
    return list;
  }
  function fmtDate(iso) {
    const d = new Date(iso + "T12:00:00");
    return isNaN(d) ? iso : d.toLocaleDateString("de-DE");
  }

  /* ---------- Übersicht ---------- */
  function renderOverview() {
    document.title = "Thor-Hub";
    const input = h("input", {
      id: "q", type: "search", autocomplete: "off", spellcheck: "false",
      placeholder: "z. B. Minish Cap, Stardew, BO2", value: state.query, "aria-describedby": "status"
    });
    const status = h("p", { id: "status", class: "status", role: "status", "aria-live": "polite" });
    const grid = h("ul", { class: "grid", "aria-label": "Mods und Recomps" });

    function update() {
      state.query = input.value;
      const r = window.ThorSearch.search(state.query, state.entries);
      grid.replaceChildren(...r.results.map(tile));
      status.replaceChildren();
      if (r.mode === "all") status.append(`${r.results.length} Mods und Recomps`);
      else if (r.mode === "direct") status.append(`${r.results.length} Treffer`);
      else if (r.mode === "suggest") {
        status.append("Kein genauer Treffer. Meintest du ",
          h("button", { class: "linkish", type: "button", onclick: () => { location.hash = r.suggestion.id; } }, r.suggestion.spiel),
          "?");
      } else status.append("Noch nicht im Hub. Prüf die Schreibweise oder schau später wieder vorbei.");
    }
    input.addEventListener("input", update);

    main.replaceChildren(
      h("div", { class: "brand" }, h("h1", { tabindex: "-1" }, "Thor-Hub"), h("span", { class: "tag" }, "Dual-Screen-Mods und Recomps für den AYN Thor")),
      h("p", { class: "lead" }, "Für jeden Mod steht hier, was du zum Installieren brauchst, ob er etwas kostet und ob der Code offen liegt. Wenn er nicht startet, schau in die Liste der bekannten Fehler."),
      h("div", { class: "search", role: "search" }, h("label", { for: "q" }, "Spiel suchen"), input),
      status, grid
    );
    update();
    return main.querySelector("h1");
  }

  function tile(e) {
    return h("li", {},
      h("a", { class: "tile", href: "#" + e.id },
        h("h2", {}, e.spiel), h("p", { class: "mod" }, e.mod_name), chips(e)));
  }

  /* ---------- Steckbrief ---------- */
  function renderDetail(e) {
    document.title = e.spiel + " · Thor-Hub";
    const checks = state.checks.get(e.id) || new Set();
    state.checks.set(e.id, checks);

    const progress = h("span", { class: "progress" });
    const setProgress = () => { progress.textContent = `${checks.size} von ${e.du_brauchst.length} erledigt`; };
    const needs = h("ul", { class: "checklist" }, e.du_brauchst.map((n, i) => {
      const cb = h("input", { type: "checkbox", checked: checks.has(i) });
      cb.addEventListener("change", () => { cb.checked ? checks.add(i) : checks.delete(i); setProgress(); });
      return h("li", {}, h("label", {}, cb, h("span", {}, n)));
    }));
    setProgress();

    const errors = e.bekannte_fehler.length
      ? h("ul", { class: "errors" }, e.bekannte_fehler.map(errorItem))
      : h("p", { class: "empty" }, "Die Quelle nennt bisher keine bekannten Fehler. Nutze den Helfer oder frag im Entwickler-Thread.");

    const notice = e.pruefdatum ? null : h("p", { class: "notice" },
      `Entwurf vom ${fmtDate(e.entwurf_vom)}: aus der Originalquelle zusammengefasst, noch nicht geprüft. Im Zweifel gilt die Originalquelle.`,
      e.pruefnotiz ? h("br") : null, e.pruefnotiz ? "Prüfnotiz: " + e.pruefnotiz : null);

    main.replaceChildren(
      h("a", { class: "back", href: "#" }, "← Alle Mods"),
      h("article", { class: "detail" },
        h("h1", { tabindex: "-1" }, e.spiel),
        h("p", { class: "mod" }, e.mod_name),
        chips(e),
        h("p", { class: "kurz" }, e.kurz),
        notice,
        h("section", { class: "card", "aria-labelledby": "needs-h" },
          h("h2", { id: "needs-h" }, "Du brauchst", progress), needs,
          h("div", { class: "actions" }, ext(e.originalquelle, "Zur Originalquelle ↗", "btn")),
          e.weitere_quellen.length ? h("ul", { class: "sources" }, e.weitere_quellen.map(s => h("li", {}, ext(s.url, s.titel)))) : null,
          h("p", { class: "hint" }, `Lizenz: ${e.lizenz}`)
        ),
        helperSection(e),
        h("section", { class: "card", "aria-labelledby": "err-h" }, h("h2", { id: "err-h" }, "Bekannte Fehler"), errors)
      )
    );
    return main.querySelector("h1");
  }

  function errorItem(f) {
    const statusCls = f.status === "Lösung bekannt" ? "ok" : f.status === "offen" ? "warn" : "";
    return h("li", { class: "error", id: "fehler-" + f.id },
      h("h3", {}, h("span", { class: "eid" }, f.id), f.symptom, h("span", { class: "chip " + statusCls }, f.status)),
      h("p", {}, h("strong", {}, "Ursache: "), f.ursache),
      h("ol", {}, f.loesung.map(s => h("li", {}, s))),
      h("p", { class: "src" }, "Quelle: ", ext(f.quelle_url, f.quelle)));
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
    const ta = h("textarea", { id: "frage", maxlength: "1000",
      placeholder: "z. B. „Die Texte fehlen, ich nutze eine deutsche ROM.“", "aria-describedby": "helper-hint" });
    const btn = h("button", { class: "btn", type: "button" }, "Helfer fragen");
    const out = h("div", { "aria-live": "polite" });
    const hint = h("p", { id: "helper-hint", class: "hint" },
      "Beschreibe Fehlermeldung, Version oder ROM-Region. Der Helfer antwortet nur aus diesem Steckbrief.");
    const section = h("section", { class: "card helper", "aria-labelledby": "helper-h" },
      h("h2", { id: "helper-h" }, "Installationshelfer"), h("label", { for: "frage", class: "hint" }, "Dein Problem"), ta, hint,
      h("div", { class: "actions" }, btn), out);

    const showPlanB = () => {
      ta.disabled = true; btn.disabled = true;
      if (ON_PAGES) { ta.hidden = true; btn.hidden = true; section.querySelector("label").hidden = true; }
      hint.textContent = ON_PAGES
        ? "In dieser öffentlichen Version ist der Helfer noch ausgeschaltet. Er läuft bisher nur in einer Testversion."
        : "Der Helfer ist hier gerade nicht verfügbar.";
      out.replaceChildren(answerBox("unbekannt", "Helfer aus",
        [h("p", {}, "Schau unten unter „Bekannte Fehler“. Steht dein Problem nicht dabei, frag im ", ext(e.entwickler_thread, "Entwickler-Thread"), " nach.")]));
    };

    const submit = async () => {
      const q = ta.value.trim();
      if (!q) { out.replaceChildren(answerBox("fehler", "Hinweis", [h("p", {}, "Bitte beschreibe zuerst dein Problem.")])); ta.focus(); return; }
      if (!state.sample) { showPlanB(); return; }
      if (state.abort) state.abort.abort();
      const ac = new AbortController(); state.abort = ac;
      btn.disabled = true;
      out.replaceChildren(answerBox("", "Helfer sucht im Steckbrief", [h("p", { class: "dots" }, "Einen Moment")]));
      try {
        const res = await state.sample(buildPrompt(e, q), { modelTier: "quick", signal: ac.signal });
        out.replaceChildren(renderAnswer(e, parseAnswer(res.text)));
      } catch (err) {
        if (ac.signal.aborted) return;
        const code = err && err.code;
        if (code === "not_granted") { showPlanB(); return; }
        const msg = code === "rate_limited" ? "Gerade zu viele Anfragen. Bitte in einer Minute noch einmal versuchen."
          : code === "parse" ? "Die Antwort war unvollständig. Bitte noch einmal fragen."
          : "Der Helfer konnte nicht antworten.";
        out.replaceChildren(answerBox("fehler", "Fehler", [h("p", {}, msg + " Bis dahin helfen die bekannten Fehler oder der "), ext(e.entwickler_thread, "Entwickler-Thread"), "."]));
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
    const wissen = {
      spiel: e.spiel, mod: e.mod_name, typ: e.typ, du_brauchst: e.du_brauchst,
      originalquelle: e.originalquelle, entwickler_thread: e.entwickler_thread,
      bekannte_fehler: e.bekannte_fehler.map(f => ({ id: f.id, symptom: f.symptom, ursache: f.ursache, loesung: f.loesung, status: f.status }))
    };
    return [
      "Du bist der Installationshelfer des Thor-Hub. Antworte auf Deutsch, kurz und freundlich, per Du.",
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
      body.push(h("p", {}, "Mehr dazu: ",
        h("button", { class: "linkish", type: "button", onclick: () => highlightError(ref.id) }, `Bekannter Fehler ${ref.id}`),
        " · Quelle: ", ext(ref.quelle_url, ref.quelle)));
      setTimeout(() => highlightError(ref.id), 50);
    }
    if (a.art === "unbekannt" || a.art === "offen")
      body.push(h("p", {}, "Frag im ", ext(e.entwickler_thread, "Entwickler-Thread"), " nach. Dort lesen die Entwickler mit."));
    const labels = { loesung: "Lösung", offen: "Bekannt, noch ohne Lösung", rueckfrage: "Rückfrage", unbekannt: "Unbekannt" };
    if (a.art === "rueckfrage") setTimeout(() => { const t = document.getElementById("frage"); if (t) t.focus(); }, 50);
    return answerBox(a.art, labels[a.art], body);
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

  document.querySelector(".skip").addEventListener("click", ev => { ev.preventDefault(); main.focus(); });

  async function boot() {
    whenSample();
    try {
      const res = await fetch("data/steckbriefe.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      state.entries = await res.json();
      state.entries.forEach(e => state.byId.set(e.id, e));
    } catch (err) {
      main.replaceChildren(h("p", { class: "fatal" }, "Die Steckbriefe konnten nicht geladen werden. Bitte Seite neu laden."));
      console.error("[Thor-Hub] Daten nicht geladen:", err);
      return;
    }
    window.addEventListener("hashchange", route);
    route();
  }
  boot();
})();
