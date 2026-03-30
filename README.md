# VIZR

**Browser-Based Visual System**

VIZR ist ein browserbasiertes Live-Visual-System, das lokale Bilder in dynamische, audioreaktive Visuals verwandelt. Es ist bewusst minimal gehalten und fokussiert sich auf eine rohe, analoge Ästhetik ohne komplizierte Editoren oder Timelines.

## Konzept

VIZR ist kein klassischer Visualizer, der einfach nur Frequenzen als Balken darstellt. Es ist ein "Visual System", das Bilder in verschiedene Rollen (Background, Poster, Logo, Overlay, Flash) einteilt und diese intelligent zur Musik animiert. 

Das System läuft komplett lokal in deinem Browser. Deine Bilder werden nirgendwo hochgeladen.

## Schnellstart

1. **Bilder hochladen:** Klicke auf "Upload Assets" oder ziehe deine Bilder per Drag & Drop in das Fenster.
2. **Audioquelle wählen:** Wähle zwischen "Ambient" (simulierte Peaks), "Microphone" (Live-Audio), "Screen Audio" (System-Audio) oder "File" (lokale Audiodatei).
3. **Start:** Das System beginnt sofort, deine Bilder im aktuellen visuellen Modus (VHS / Broken TV) zu animieren.

## Neue Features

- **Beat-Synced Zoom:** Ein musikalisches, Groove-basiertes Zoom-System (Hold, Drift, Pulse), das auf den Kick-Drum reagiert und organische Kamerabewegungen mit einem 4-Beat-Pattern erzeugt.
- **White Transparency:** Ein intelligenter Shader-Effekt, der weiße/helle Bereiche in Vordergrund- und Overlay-Bildern automatisch transparent macht – perfekt, um Logos oder Motive mit weißem Hintergrund nahtlos in die Szene zu integrieren.
- **VIZR Remote:** Steuere die Visuals live über dein Smartphone! Scanne einfach den QR-Code im Setup-Bildschirm, um Effekte, Intensität und Bildwechsel in Echtzeit zu dirigieren. Die Verbindung startet jetzt automatisch, merkt sich deine Session und verbindet sich bei Abbrüchen selbstständig neu.
- **Subtle Surface Effects & Build-Up Intensifier:** Ein neues System für organische, subtile Oberflächeneffekte (Micro-Flicker, feines Rauschen) und eine intelligente Build-Up-Erkennung, die musikalische Spannungsbögen mit passenden visuellen Veränderungen (Slow Zoom, reduziertes Motion, Drop Pulse) begleitet.
- **Drift Offset:** Ein subtiler, intervallbasierter Bildversatz, der organisch und leicht instabil wirkt. Er reagiert dezent auf Bass/Groove-Energie, aktiviert sich kurzzeitig und kehrt dann langsam in die Ausgangsposition zurück, um Wiederholungen zu vermeiden.
- **Lokale Audiodateien:** Du kannst jetzt auch direkt MP3- oder WAV-Dateien in den Browser laden, um sie als Audioquelle zu nutzen.
- **Erweiterte Effekt-Toggles:** Schalte gezielt einzelne Effekte wie Glitch, VHS, Curvature, Noise, Flicker, RGB Split, White Transparency und Drift Offset an oder aus.
- **Überarbeitetes UI:** Ein aufgeräumtes Interface mit "FX Settings", verbesserten Modals für Impressum & Datenschutz sowie einer optimierten FAQ-Sektion.

## Nutzung

- **Dateinamen-Tags:** Du kannst das Verhalten deiner Bilder steuern, indem du bestimmte Tags in den Dateinamen schreibst (z.B. `poster__color__peak.jpg`). Mehr dazu im [Asset Naming Guide](ASSET_NAMING_GUIDE.md).
- **Steuerung:** Das System läuft weitgehend automatisch, lässt sich aber über das Web-Interface oder die Smartphone-Remote live beeinflussen.
- **Vollbild:** Nutze die F11-Taste deines Browsers für das beste Erlebnis.

## Hinweise zum Beta-Status

VIZR befindet sich aktuell in einer frühen Entwicklungsphase. 
- Das Tool ist bewusst minimal gehalten.
- Features und das Verhalten der Audio-Reaktivität können sich in zukünftigen Updates ändern.
- Weitere visuelle Modi und Erweiterungen sind geplant.

---

**Weitere Dokumentation:**
- [Projektübersicht](PROJECT_OVERVIEW.md)
- [Systemarchitektur](SYSTEM_ARCHITECTURE.md)
- [Asset Naming Guide](ASSET_NAMING_GUIDE.md)
- [Audio-Visual Logik](AUDIO_VISUAL_LOGIC.md)
- [Visuelle Modi](VISUAL_MODES.md)
- [FAQ](FAQ.md)
