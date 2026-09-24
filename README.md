# Röstbrüder – Masterplan & Studio

Strategie, UX/UI-Konzept und das Admin-Dashboard **Röstbrüder Studio** für die Planung von Social Media und Werbung der [Röstbrüder Kaffeerösterei](https://roestbrueder.com/) in Weimar.

| Bereich | Inhalt |
| --- | --- |
| [`docs/MASTERPLAN.md`](docs/MASTERPLAN.md) | Gesamtstrategie: Positionierung, Ziele, Personas, Website-Relaunch, Social Media & Werbung, Roadmap, KPIs, Budget |
| [`docs/UX-UI-KONZEPT.md`](docs/UX-UI-KONZEPT.md) | Design-System, Informationsarchitektur, User Journeys, Wireframes für Website & Studio, Barrierefreiheit |
| [`docs/SOCIAL-MEDIA-WERBUNG-PLAYBOOK.md`](docs/SOCIAL-MEDIA-WERBUNG-PLAYBOOK.md) | Kanal-Playbooks, Formate, Reel-Skripte, 12-Wochen-Redaktionsplan, Kampagnen-Architektur, Budgets, Tracking |
| [`studio/`](studio/) | Das Admin-Dashboard (React + Vite + Tailwind) |
| [`supabase/migrations/`](supabase/migrations/) | SQL-Schema für Phase 2 (Mehrbenutzer, Freigaben, API-Import) – noch nicht angewendet |

## Röstbrüder Studio

Ein Cockpit für alles, was die Röstbrüder nach außen kommunizieren:

- **Cockpit** – Reichweite, Interaktionsrate, Follower, Werbeausgaben vs. Budget, ROAS; die Woche auf einen Blick; offene Freigaben, überfällige Posts und Pacing-Warnungen.
- **Redaktionskalender** – Monat, Woche und Liste; Posts per Drag & Drop umplanen; Einfärben nach Kanal, Säule oder Status; Anlässe (Tag des Kaffees, Zwiebelmarkt, Black Friday …) direkt im Kalender.
- **Content-Pipeline** – Kanban von *Idee* bis *Veröffentlicht*, mit Checklisten und Verantwortlichen.
- **Post-Editor** – acht Kanäle, acht Formate, Zeichenlimits je Kanal, Hashtag-Sets, Caption-Vorlagen, Vorschläge für gute Posting-Zeiten, UTM-Links, Bild-Upload und eine **Live-Vorschau** (Instagram, Reels/Stories, TikTok, Facebook, Google, Pinterest, Newsletter).
- **Kampagnen & Werbung** – Ziel, Kanäle, Budget, Laufzeit, Zielgruppe, UTM-Builder, Budget-Pacing, Funnel, Tageswerte, automatische Empfehlungen und eine Timeline über alle Kampagnen.
- **Budget-Planer** – Jahresplan pro Monat und Kanal, Szenarien S/M/L, Plan vs. Ist.
- **Ideen & Jahresplan** – Ideen-Backlog mit Voting, Anlässe der nächsten Monate, Content-Säulen-Check, Jahresübersicht.
- **Analytics** – Follower-Wachstum, Interaktionsrate je Kanal, Heatmap der besten Posting-Zeiten, Top-Posts, Säulen- und Formatvergleich.
- **Bibliothek** – Hashtag-Sets, Caption-Vorlagen, Markenstimme, wiederkehrende Formate.
- **Einstellungen** – Darstellung (hell/dunkel), Kanäle, Team, Export/Import (JSON), Demo-Daten.

Bedienung per Tastatur: `N` neuer Post · `W` neue Kampagne · `⌘K`/`Strg+K` Befehlspalette · `G` + `C/K/P/I/W/B/A/L` Navigation.

### Starten

```bash
cd studio
npm install
npm run dev      # http://localhost:5173
npm run build    # Typecheck + Produktions-Build nach studio/dist
npm run lint     # oxlint
```

### Daten

Phase 1 speichert alles **lokal im Browser** (localStorage, Schlüssel `rb-studio-v1`) und startet mit **Demo-Daten**: Posts, Kampagnen und Kennzahlen sind Beispiele und keine echten Zahlen der Röstbrüder. Unter *Einstellungen → Daten* lassen sich die Daten exportieren, importieren, zurücksetzen oder komplett leeren.

Phase 2 zieht auf Supabase um (`supabase/migrations/`): Login fürs Team, Freigabe-Protokoll, Bilder im Storage und der Import von Kennzahlen über die Meta-, TikTok- und Google-APIs. Die Roadmap steht im [Masterplan](docs/MASTERPLAN.md).

### Deployment

`studio/` ist eine statische Single-Page-App. Auf Vercel als Root Directory `studio` wählen – `studio/vercel.json` leitet alle Routen auf `index.html` um.
