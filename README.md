# Thor-Hub

Steckbriefe für Dual-Screen-Mods und Recomps auf dem AYN Thor. Zu jedem Mod steht dort, was man zum Installieren braucht, ob er etwas kostet, ob der Code offen ist und welche Fehler bekannt sind.

Kursprojekt „AI Startup Game“ an der HdM, WiSe 2026/27, von Teddy Tin Chi Tang.

- Live: https://teddytang0206.github.io/thor-hub/
- D3 Build Evidence: https://teddytang0206.github.io/thor-hub/evidence.html

## Stand

MVP V1 mit fünf Mods: Dusklight, Pokémon Emerald, The Minish Cap, Black Ops II (T6 Requiem) und Stardew Valley. Die Steckbriefe sind Entwürfe und noch nicht gegen die Quellen geprüft. Der Installationshelfer ist in dieser Version aus, weil er nur in einer Claude-Artifact-Seite läuft. Details stehen auf der Evidence-Seite.

Der Hub stellt keine Mod-Dateien bereit. Alle Downloads laufen über die Originalquellen.

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html`, `styles.css` | Seite und Gestaltung |
| `app.js` | Übersicht, Steckbrief-Ansicht, Abhak-Liste, Helfer (mit Plan B) |
| `search.js` | Suche ohne KI, verträgt Tippfehler |
| `data/steckbriefe.json` | Die fünf Steckbriefe, von Hand gepflegt |
| `evidence.html`, `evidence.en.html` | D3: Iterationslog, Prompts, Tools, Fehlversuche, nächster Test (Deutsch und Englisch) |
| `images/`, `logo.svg` | Eigene Pixel-Art-Bilder, keine Originalgrafiken der Spiele |
| `tests/` | Suchtest (Node) und Render-Check (Playwright) |

## Neue Mods kommen automatisch

Jeden Montag läuft die GitHub Action „Neue Mods suchen“ (`.github/workflows/neue-mods.yml`). Sie sucht auf GitHub nach Repos zu AYN Thor, Dual Screen und Recomps und nimmt passende ohne Prüfung auf. Der Steckbrief entsteht nur aus GitHub-Daten, ohne KI. Von Hand angelegte Steckbriefe bleiben unverändert.

- Von Hand starten: im Repo unter **Actions → Neue Mods suchen → Run workflow**
- Einen Mod wieder loswerden: seine Repo-Adresse in `data/sperrliste.json` eintragen, beim nächsten Lauf verschwindet er
- Filter anpassen (Sterne, Alter, Suchbegriffe): `CONFIG` oben in `scripts/discover.mjs`

Automatische Einträge sind auf der Seite als „automatisch · nicht geprüft“ markiert und zeigen einen Warnhinweis.

## Lokal starten

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

Die Seite lädt die Steckbriefe per `fetch`, deshalb funktioniert ein Doppelklick auf `index.html` nicht.

## Tests

```bash
node tests/search.test.js
node tests/discover.test.mjs
python3 tests/render_check.py   # braucht: pip install playwright && playwright install chromium
```

## Einen Steckbrief ändern

Alles steht in `data/steckbriefe.json`. Texte stehen dort als `{"de": "…", "en": "…"}`, damit der Sprachumschalter beide Fassungen anzeigen kann. Ein eigenes Bild kommt nach `images/` und wird im Feld `bild` eingetragen. Wenn ein Steckbrief gegen die Quelle geprüft ist, kommt das Datum in `pruefdatum` (Format `2026-11-30`). Die Seite zeigt dann „geprüft am …“ statt „Entwurf“.

## Mit KI gebaut

Planung, Code und Steckbrief-Entwürfe hat Claude (Opus 5.5) erstellt. Entschieden und korrigiert habe ich. Wie das ablief, steht in `evidence.html`.
