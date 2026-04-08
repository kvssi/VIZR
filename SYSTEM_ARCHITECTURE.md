# Systemarchitektur

VIZR ist ein browserbasiertes Visual-System, das auf React und WebGL basiert. Es nutzt die Web Audio API zur Echtzeitanalyse von Audiosignalen und WebGL für performante, hardwarebeschleunigte visuelle Effekte.

## Aufbau des Systems

Das System ist in einer modularen Architektur organisiert:
1. **Benutzeroberfläche (React - `src/ui/`):** Orchestriert den State und die verschiedenen Ansichten (`SetupView`, `LiveControls`, `Modals`).
2. **Audio-Analyzer (Web Audio API - `src/engine/AudioAnalyzer.ts`):** Extrahiert musikalische Merkmale (Kick, Clap, Bass) in Echtzeit. Isoliert vom React-Lifecycle für maximale Stabilität.
3. **Visual Engine (WebGL - `src/engine/VisualEngine.ts`):** Verwaltet das Rendering, die Shader-Logik und die Asset-Zuweisung.
4. **Asset-Management (React - `src/assets/`):** Enthält den `AssetEditor` und die Logik zur Metadaten-Extraktion.
5. **Remote-Control (Socket.io - `src/ui/RemoteControl/`):** Ermöglicht die Synchronisation mit mobilen Endgeräten. Nutzt dieselben UI-Komponenten (Modals, Toggles) wie die Haupt-App.
6. **Backend (Express - `server.ts`):** Ein Node.js-Backend für die WebSocket-Kommunikation.

## Layer-System

VIZR nutzt ein Layer-System, um Bilder intelligent zu kombinieren. Bilder werden nicht einfach übereinandergelegt, sondern in verschiedene Rollen (Layer) eingeteilt:

1. **Background (bg):** Das Hintergrundbild. Es füllt den gesamten Bildschirm aus und reagiert auf langsame, tiefe Frequenzen (Bass Groove). Bleibt vom Beat-Zoom unberührt, um räumliche Tiefe zu wahren.
2. **Poster (fg/mid):** Das Hauptbild. Es wird im Vordergrund platziert und reagiert stark auf musikalische Akzente (voller Beat-Synced Zoom). Helle Bereiche können durch "Transparency Modes" weich ausgeblendet werden.
3. **Logo / Overlay:** Schwebende Elemente, Texturen oder Logos. Sie werden kleiner skaliert, reagieren auf hohe Frequenzen (Hi-Hats) und machen den Beat-Zoom nur leicht mit (Parallax-Effekt).
4. **Flash:** Kurze Event-Elemente, die nur bei starken Audio-Peaks (z.B. lauten Kicks oder Drops) sichtbar werden. Bleiben statisch im Raum.

## Asset-System

Das Asset-System verwaltet die hochgeladenen Bilder. Es analysiert die Dateinamen der Bilder und weist ihnen basierend auf Tags (z.B. `poster`, `bg`, `logo`) die entsprechende Rolle im Layer-System zu. Wenn keine Tags vorhanden sind, versucht das System, die Rolle automatisch anhand des Bildformats (Hochformat, Querformat, Quadrat) zu erraten.

## Audio-System

Das Audio-System (`AudioAnalyzer`) nutzt die Web Audio API, um das Audiosignal in Echtzeit zu analysieren. Es unterstützt vier verschiedene Audioquellen:
- **Microphone:** Live-Eingabe über das Mikrofon.
- **Screen Audio:** System-Audio, das über die Bildschirmfreigabe des Browsers abgegriffen wird.
- **File:** Eine lokale Audiodatei (MP3, WAV), die direkt im Browser abgespielt wird.
- **Ambient:** Ein simuliertes Audiosignal mit regelmäßigen Peaks für Testzwecke.

Das System extrahiert nicht nur die Gesamtlautstärke, sondern teilt das Signal in Frequenzbänder (Low, Mid, High) auf und erkennt Transienten (schnelle Lautstärkeänderungen), um musikalische Elemente wie Kick, Clap und Hi-Hats zu identifizieren. Diese Daten werden an die Visual Engine übergeben, um die visuellen Effekte zu steuern.

## Remote Control System

VIZR beinhaltet ein Remote-Control-System, das es ermöglicht, die Visuals über ein zweites Gerät (z.B. ein Smartphone) zu steuern. 
- **Verbindung:** Die Hauptanwendung generiert einen QR-Code mit einer eindeutigen Room-ID. Das Smartphone scannt den Code und verbindet sich über WebSockets (Socket.io) mit demselben Raum. Die Room-ID wird im `localStorage` gespeichert, sodass Sessions auch nach einem Reload bestehen bleiben.
- **Auto-Start & Reconnect:** Sobald sich eine Remote verbindet, starten die Visuals auf dem Host automatisch mit einem weichen Fade-In. Bei Verbindungsabbrüchen versucht die Remote im Hintergrund kontinuierlich, sich neu zu verbinden.
- **Synchronisation:** Das Backend leitet lediglich Steuerbefehle (Slider-Werte, Button-Klicks, Bild-Uploads) zwischen den Clients weiter. Es werden keine Audiodaten oder großen Bilddateien über das Netzwerk gestreamt (mit Ausnahme von kleinen Bild-Uploads über die Remote, die als Base64-Strings übertragen werden).
- **Sicherheit:** Da die Hauptverarbeitung lokal im Browser stattfindet, bleibt die Latenz minimal und die Privatsphäre gewahrt.
