# FAQ

Hier findest du Antworten auf häufig gestellte Fragen zu VIZR.

## Nutzung

### Wie starte ich VIZR?
1. Lade deine Bilder hoch (per Drag & Drop oder über den "Upload Assets" Button).
2. Wähle eine Audioquelle (Ambient, Microphone oder Screen Audio).
3. Klicke auf "Start System".

### Welche Bilder eignen sich am besten?
VIZR funktioniert am besten mit einer Mischung aus verschiedenen Bildtypen:
- **Hintergründe:** Abstrakte Muster, Landschaften oder dunkle Texturen.
- **Hauptmotive (Poster):** Klare Motive, Porträts oder Objekte, die im Vordergrund stehen sollen.
- **Overlays/Logos:** PNG-Dateien mit transparentem Hintergrund (z.B. Bandlogos, Schriftzüge oder grafische Elemente).

### Muss ich meine Bilder speziell benennen?
Nein, das ist optional. Wenn du keine speziellen Dateinamen verwendest, versucht VIZR automatisch, die beste Rolle für ein Bild anhand seines Formats (Hochformat, Querformat, Quadrat) zu finden. 
Wenn du jedoch volle Kontrolle möchtest, kannst du das Tagging-System nutzen (siehe [Asset Naming Guide](ASSET_NAMING_GUIDE.md)).

### Werden meine Bilder ins Internet hochgeladen?
Nein. VIZR ist ein rein browserbasiertes System. Alle Bilder und Audiodaten werden lokal auf deinem Gerät verarbeitet. Es findet kein Upload auf externe Server statt.

### Wie wechsle ich in den Vollbildmodus?
Die beste Erfahrung hast du im Vollbildmodus deines Browsers. Drücke dazu in der Regel die Taste `F11` (Windows/Linux) oder `Cmd + Ctrl + F` (Mac).

## Audio & Reaktivität

### Warum reagieren die Visuals nicht auf mein Mikrofon?
Stelle sicher, dass du deinem Browser die Berechtigung erteilt hast, auf dein Mikrofon zuzugreifen. Wenn du die Berechtigung beim ersten Mal abgelehnt hast, musst du sie in den Einstellungen deines Browsers (meistens über das Schloss-Symbol in der Adressleiste) manuell wieder aktivieren.

### Was bedeutet "Ambient" Audio?
Der "Ambient"-Modus simuliert ein Audiosignal mit regelmäßigen Peaks (wie ein langsamer Herzschlag). Dies ist nützlich, um das System zu testen oder Visuals ohne externe Audioquelle laufen zu lassen.

### Kann ich Spotify oder YouTube als Audioquelle nutzen?
Ja. Wähle dazu die Audioquelle "Screen Audio" (Bildschirm-Audio). Dein Browser wird dich dann fragen, welchen Tab oder welches Fenster du freigeben möchtest. Wähle den Tab aus, in dem deine Musik läuft, und achte darauf, dass die Option "Audio freigeben" (Share audio) aktiviert ist.

## Einschränkungen

### Warum ruckeln die Visuals auf meinem alten Laptop?
VIZR nutzt WebGL für die Echtzeit-Berechnung der visuellen Effekte. Dies erfordert eine gewisse Grafikleistung. Auf sehr alten oder leistungsschwachen Geräten kann es zu Rucklern kommen. Schließe in diesem Fall andere ressourcenintensive Programme oder Browser-Tabs.

### Kann ich Videos hochladen?
Aktuell unterstützt VIZR nur statische Bilder (JPG, PNG, WebP). Die Unterstützung für kurze Videoloops ist für zukünftige Versionen geplant.

### Kann ich die Visuals als Video exportieren?
Eine direkte Exportfunktion ist derzeit nicht integriert. Du kannst jedoch Screen-Recording-Software (wie OBS Studio) verwenden, um die Visuals während der Wiedergabe aufzuzeichnen.
