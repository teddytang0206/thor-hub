import subprocess, time, sys
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8765", "-d", str(__import__("pathlib").Path(__file__).resolve().parent.parent)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
errors = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 412, "height": 900}, device_scale_factor=1)
        pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.goto("http://localhost:8765/index.html"); pg.wait_for_selector(".tile")
        print("Kacheln:", pg.locator(".tile").count(), "| Status:", pg.inner_text("#status"))
        pg.screenshot(path="/tmp/thor-hub-01_overview.png", full_page=True)
        pg.fill("#q", "stardwe valey"); print("Suche 'stardwe valey':", pg.inner_text("#status"))
        pg.screenshot(path="/tmp/thor-hub-02_suggest.png")
        pg.click("#status button"); pg.wait_for_selector(".detail")
        print("Nach 'Meintest du' ->", pg.inner_text(".detail h1"))
        pg.goto("http://localhost:8765/index.html#minish-cap"); pg.wait_for_selector(".detail")
        pg.locator(".checklist input").first.check()
        print("Fortschritt:", pg.inner_text(".progress"))
        time.sleep(6.5)  # sample-Wartezeit -> Plan B ohne Artifact-Umgebung
        print("Helfer-Hinweis:", pg.inner_text("#helper-hint"))
        pg.screenshot(path="/tmp/thor-hub-03_detail.png", full_page=True)
        pg.fill("#q", "") if pg.locator("#q").count() else None
        b.close()
finally:
    srv.terminate()
print("Konsolenfehler:", errors or "keine")
