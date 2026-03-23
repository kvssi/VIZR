# Audio-Visual Logik

VIZR übersetzt Audiosignale in visuelle Effekte. Das System analysiert das eingehende Audiosignal (Mikrofon, System-Audio oder lokale Audiodatei) in Echtzeit und extrahiert musikalische Merkmale, um die Visuals dynamisch und rhythmisch zu steuern.

## Wie Audio in Visuals übersetzt wird

Das Audio-System (`AudioAnalyzer`) nutzt die Web Audio API, um das Audiosignal in Frequenzbänder (Low, Mid, High) aufzuteilen und Transienten (schnelle Lautstärkeänderungen) zu erkennen. Diese Daten werden an die Visual Engine (WebGL) übergeben, um die visuellen Effekte zu steuern.

### Frequenzbänder

- **Low (Bass):** Tiefe Frequenzen (z.B. Kick-Drum, Bassline).
- **Mid (Mitten):** Mittlere Frequenzen (z.B. Vocals, Snare, Synths).
- **High (Höhen):** Hohe Frequenzen (z.B. Hi-Hats, Cymbals).

### Transienten-Erkennung

Das System erkennt schnelle Lautstärkeänderungen (Transienten) in den Frequenzbändern, um musikalische Elemente wie Kick, Clap und Hi-Hats zu identifizieren.

## Musikalisches Verhalten

Die Visuals reagieren nicht nur auf die Gesamtlautstärke, sondern auf spezifische musikalische Elemente:

### 1. Kick (Low Frequencies)

- **Erkennung:** Starke Transienten im Low-Frequenzband (z.B. Kick-Drum).
- **Visual Mapping:**
  - **Puls / Druck:** Ein kurzer, subtiler Zoom-Effekt (Screen Punch).
  - **Mini-Zoom:** Das Bild wird kurzzeitig vergrößert.
  - **Kontrast / Helligkeit:** Ein leichter Push in Kontrast und Helligkeit.
- **Verhalten:** Der Kick erzeugt einen klaren, rhythmischen Puls, der die Visuals antreibt, ohne chaotische Verzerrungen zu verursachen.

### 2. Clap / Snare (Mid Frequencies)

- **Erkennung:** Transienten im Mid-Frequenzband (z.B. Clap, Snare).
- **Visual Mapping:**
  - **Kurze visuelle Akzente:** Ein kurzer Blitz (Flash).
  - **Crackle / Tear:** Ein schnelles horizontales Knistern oder Reißen im Bild.
  - **RGB Split:** Ein kurzer, subtiler RGB-Farbversatz.
- **Verhalten:** Claps und Snares setzen scharfe, deutliche Akzente, die sich vom Kick-Puls abheben.

### 3. Hi-Hats (High Frequencies)

- **Erkennung:** Kurze Transienten im High-Frequenzband (z.B. Hi-Hats).
- **Visual Mapping:**
  - **Feine Flicker / Noise:** Ein subtiles Flimmern und Rauschen.
  - **Scanline Sparkle:** Ein leichtes Funkeln in den Scanlines.
  - **Tiny Noise Modulation:** Eine winzige Modulation des Rauschens.
- **Verhalten:** Hi-Hats fügen feine, hochfrequente Texturen hinzu, die auf dem Bild tanzen, ohne das gesamte Bild zu erschüttern.

### 4. Bass Groove (Smoothed Low-Mid Movement)

- **Erkennung:** Geglättete, anhaltende Energie im Low-Frequenzband (z.B. Bassline).
- **Visual Mapping:**
  - **Langsame Bewegung / Drift:** Eine langsame, fließende Verschiebung des Hintergrunds.
  - **Background Breathing:** Der Hintergrund "atmet" im Takt des Basses.
  - **Drift Speed:** Die Geschwindigkeit der langsamen Bewegung wird durch die Bass-Energie gesteuert.
- **Verhalten:** Der Bass Groove sorgt für eine kontinuierliche, fließende Bewegung zwischen den Kicks und verleiht den Visuals einen Groove.

### 5. Peak Detection & Event-basierte Glitches

- **Erkennung:** Starke, plötzliche Audio-Peaks (z.B. Drops, laute Kicks).
- **Visual Mapping:**
  - **Event-basierte Glitches:** Kurze, intensive visuelle Störungen (z.B. Flicker Bursts, Horizontal Tearing, Tracking Roll, Noise Bursts).
  - **Bildwechsel:** Bei starken Peaks werden die Bilder (Background, Poster, Overlay) häufiger gewechselt.
- **Verhalten:** Peaks lösen seltene, aber wirkungsvolle visuelle Events aus, die den Höhepunkt der Musik betonen.
