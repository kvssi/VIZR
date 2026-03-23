# Systemarchitektur

VIZR ist ein browserbasiertes Visual-System, das auf React und WebGL basiert. Es nutzt die Web Audio API zur Echtzeitanalyse von Audiosignalen und WebGL für performante, hardwarebeschleunigte visuelle Effekte.

## Aufbau des Systems

Das System besteht aus drei Hauptkomponenten:
1. **Benutzeroberfläche (React):** Verarbeitet Benutzereingaben (Datei-Uploads, Audioquellen-Auswahl, Intensitätsregler).
2. **Audio-Analyzer (Web Audio API):** Analysiert das eingehende Audiosignal in Echtzeit und extrahiert musikalische Merkmale (Kick, Clap, Hi-Hats, Bass Groove).
3. **Visual Engine (WebGL):** Rendert die hochgeladenen Bilder basierend auf den Audio-Daten und den zugewiesenen Rollen.

## Layer-System

VIZR nutzt ein Layer-System, um Bilder intelligent zu kombinieren. Bilder werden nicht einfach übereinandergelegt, sondern in verschiedene Rollen (Layer) eingeteilt:

1. **Background (bg):** Das Hintergrundbild. Es füllt den gesamten Bildschirm aus und reagiert auf langsame, tiefe Frequenzen (Bass Groove).
2. **Poster (fg/mid):** Das Hauptbild. Es wird im Vordergrund platziert und reagiert auf musikalische Akzente (z.B. Kick-Puls).
3. **Logo / Overlay:** Schwebende Elemente, Texturen oder Logos. Sie werden kleiner skaliert und reagieren auf hohe Frequenzen (Hi-Hats) oder kurze Akzente (Clap).
4. **Flash:** Kurze Event-Elemente, die nur bei starken Audio-Peaks (z.B. lauten Kicks oder Drops) sichtbar werden.

## Asset-System

Das Asset-System verwaltet die hochgeladenen Bilder. Es analysiert die Dateinamen der Bilder und weist ihnen basierend auf Tags (z.B. `poster`, `bg`, `logo`) die entsprechende Rolle im Layer-System zu. Wenn keine Tags vorhanden sind, versucht das System, die Rolle automatisch anhand des Bildformats (Hochformat, Querformat, Quadrat) zu erraten.

## Audio-System

Das Audio-System (`AudioAnalyzer`) nutzt die Web Audio API, um das Audiosignal in Echtzeit zu analysieren. Es extrahiert nicht nur die Gesamtlautstärke, sondern teilt das Signal in Frequenzbänder (Low, Mid, High) auf und erkennt Transienten (schnelle Lautstärkeänderungen), um musikalische Elemente wie Kick, Clap und Hi-Hats zu identifizieren. Diese Daten werden an die Visual Engine übergeben, um die visuellen Effekte zu steuern.
