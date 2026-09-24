# Röstbrüder – Masterplan, Website & Studio

Strategie, UX/UI-Konzept, **die neue Website** und das Admin-Dashboard **Röstbrüder Studio** für die [Röstbrüder Kaffeerösterei](https://roestbrueder.com/) in Weimar – in einer App, mit gemeinsamen Daten.

| Bereich | Inhalt |
| --- | --- |
| [`docs/MASTERPLAN.md`](docs/MASTERPLAN.md) | Gesamtstrategie: Positionierung, Ziele, Personas, Website-Relaunch, Social Media & Werbung, Roadmap, KPIs, Budget |
| [`docs/UX-UI-KONZEPT.md`](docs/UX-UI-KONZEPT.md) | Design-System, Informationsarchitektur, User Journeys, Wireframes für Website & Studio, Barrierefreiheit |
| [`docs/SOCIAL-MEDIA-WERBUNG-PLAYBOOK.md`](docs/SOCIAL-MEDIA-WERBUNG-PLAYBOOK.md) | Kanal-Playbooks, Formate, Reel-Skripte, 12-Wochen-Redaktionsplan, Kampagnen-Architektur, Budgets, Tracking |
| [`studio/`](studio/) | Die App: öffentliche Website unter `/`, Admin-Dashboard unter `/studio` (React + Vite + Tailwind) |
| [`supabase/migrations/`](supabase/migrations/) | SQL-Schema für Phase 2 (Mehrbenutzer, Freigaben, API-Import) – noch nicht angewendet |

## Website (`/`)

Der klickbare Relaunch-Prototyp für roestbrueder.com:

- **Startseite** – Hero mit Kaffeetüten, „Jede Bohne hat einen Namen“, Mini-Geschmacksfinder, Abo-Kalender, beide Cafés mit Live-Öffnungsstatus, nächste Workshops, Herkunft, Posts direkt aus dem Studio.
- **Shop & Produktseiten** – Filter nach Art, Zubereitung und Röstgrad; Größe, Mahlgrad, Geschmacksprofil, Namensgeschichte, passende Kaffees.
- **Geschmacksfinder** – Quiz in 5 Schritten mit Empfehlung, teilbarem Ergebnis und Abo-Option.
- **Kaffee-Abo** – Konfigurator (Kaffee, Menge, Rhythmus, Mahlgrad) und Abo verschenken.
- **Workshops** – Termine mit freien Plätzen, Buchung mit Kalender-Download.
- **Cafés** – Öffnungszeiten live, Wochenplan, Anfahrt.
- **Herkunft** – „Vom Feld in die Tasse“ und der interaktive **Bohnen-Pass**.
- **Anleitungen** – Brühanleitungen mit **Brüh-Timer** und Rechner.
- **Warenkorb & Kasse** – Demo-Checkout, merkt sich die UTM-Quelle.

Alle Inhalte (Sortiment, Preise, Workshop-Termine, Öffnungszeiten, Aktionsbanner, Startseiten-Text) kommen aus dem Studio. Bestellungen, Buchungen und Newsletter-Anmeldungen der Website landen dort. Preise, Aromen und Detailangaben sind **Beispielwerte**; Impressum und Datenschutz enthalten Platzhalter.

## Röstbrüder Studio (`/studio`)

- **Cockpit** – Kennzahlen, die Woche auf einen Blick, offene Freigaben, Pacing-Warnungen, Website & Shop, „Erste Schritte“ vom Demo zum echten Betrieb.
- **Redaktionskalender** – Monat, Woche, Liste; Drag & Drop; Einfärben nach Kanal, Säule oder Status; Anlässe im Kalender.
- **Content-Pipeline** – Kanban von *Idee* bis *Veröffentlicht*.
- **Post-Editor** – 8 Kanäle, 8 Formate, Zeichen- und Hashtag-Limits je Kanal, **Hook-Ideen**, Vorlagen, gute Posting-Zeiten, UTM-Links, Bild-Upload, **Live-Vorschau**.
- **Ideen & Jahresplan** – Backlog mit Voting, Säulen-Check, Anlässe-Timeline, 12-Monats-Plan.
- **Kampagnen & Werbung** – Timeline, Pacing mit Prognose, Funnel, Empfehlungen mit Ein-Klick-Aktionen, Tageswerte inkl. CSV-Import.
- **Budget-Planer** – Monat × Kanal, Szenarien S/M/L, Plan vs. Ist.
- **Website & Shop** – Sortiment mit Tüten-Vorschau, Workshop-Termine, Öffnungszeiten, Aktionsbanner, Bestellungen, Newsletter, Umsatz nach UTM-Quelle.
- **Analytics** – Follower-Wachstum, Interaktionsrate je Kanal, Posting-Zeit-Heatmap, Top-Posts.
- **Monatsreport** – automatischer Report mit Learnings und Ausblick, druck- und PDF-fähig.
- **Bibliothek** – Hashtag-Pools, Caption-Vorlagen, Markenstimme, Serien.
- **Einstellungen** – Darstellung, Kanäle, Team, Export/Import (JSON), Demo-Daten.

Tastatur: `N` neuer Post · `W` neue Kampagne · `⌘K`/`Strg+K` Befehlspalette · `G` + `C/K/P/I/W/B/S/A/R/L` Navigation.

## Starten

```bash
cd studio
npm install
npm run dev      # Website: http://localhost:5173 · Studio: http://localhost:5173/studio
npm run build    # Typecheck + Produktions-Build nach studio/dist
npm run lint     # oxlint
```

## Daten

Phase 1 speichert alles **lokal im Browser** (localStorage: `rb-studio-v1`, Warenkorb `rb-cart-v1`) und startet mit **Demo-Daten** – Posts, Kampagnen, Bestellungen und Kennzahlen sind Beispiele, keine echten Zahlen der Röstbrüder. Unter *Studio → Einstellungen → Daten* lässt sich alles exportieren, importieren, zurücksetzen oder leeren.

Phase 2 zieht auf Supabase um (`supabase/migrations/`): Login fürs Team, Freigabe-Protokoll, Bilder im Storage, echter Checkout und der Import von Kennzahlen über die Meta-, TikTok- und Google-APIs. Die Roadmap steht im [Masterplan](docs/MASTERPLAN.md).

## Deployment

`studio/` ist eine statische Single-Page-App. Auf Vercel als Root Directory `studio` wählen – `studio/vercel.json` leitet alle Routen auf `index.html` um. Vor einem öffentlichen Launch: echte Preise, Impressum und Datenschutz eintragen und das Studio hinter einen Login legen (Phase 2).
