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

### 1. Kick (Low Frequencies) & Beat-Synced Zoom

- **Erkennung:** Starke Transienten im Low-Frequenzband (z.B. Kick-Drum).
- **Visual Mapping (Zustandsbasiert):**
  - **Pulse:** Ein kurzer Zoom-In Impuls auf dem Beat.
  - **Drift:** Ein sehr langsamer, weicher Zoom-Out zwischen den Beats.
  - **Hold:** Keine Zoom-Bewegung (für musikalische Pausen).
- **4-Beat-Pattern:** Das System zählt die Kicks und variiert die Reaktion, um mechanische Wiederholungen zu vermeiden (z.B. Beat 1: kleiner Pulse, Beat 2: keine Reaktion, Beat 3: subtiler Shift, Beat 4: starker Pulse oder Reset).
- **Parallax-Effekt:** Der Zoom wirkt sich zu 100% auf Poster-Layer und zu 40% auf Overlay-Layer aus. Backgrounds und Logos bleiben statisch.
- **Verhalten:** Der Kick erzeugt einen klaren, rhythmischen und organischen Groove, der die Visuals antreibt, ohne chaotisch zu wirken.

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

### 6. Build-Up Intensifier & Drop Pulse

- **Erkennung:** Kontinuierlicher Anstieg der Energie in den mittleren und hohen Frequenzen über einen längeren Zeitraum (z.B. Snare-Rolls, Riser), gefolgt von einem plötzlichen Abfall (Drop).
- **Visual Mapping:**
  - **Build-Up Phase:** Langsamer, unaufhaltsamer Zoom-In, Reduzierung der normalen Beat-Reaktionen, Zunahme von Micro-Texturen (Noise/Grain) und Kontrastverschiebungen. Die visuelle Spannung steigt spürbar an.
  - **Drop Pulse:** Sobald der Build-Up endet (der Drop einsetzt), wird ein massiver, kurzer visueller Impuls (Farbverschiebung, starker Zoom-Out) ausgelöst, der die aufgestaute Energie freisetzt.
- **Verhalten:** Simuliert das Gefühl eines musikalischen Spannungsbogens und sorgt für maximale visuelle Wirkung beim Drop.

### 7. Subtle Surface Effects

- **Erkennung:** Kontinuierliche Analyse der hohen Frequenzen (Hi-Hats, Rauschen) kombiniert mit langsamem, zufälligem Drift.
- **Visual Mapping:**
  - **Micro-Flicker & Grain:** Ein extrem feines, kaum wahrnehmbares Rauschen und Flackern, das wie analoges Filmmaterial oder eine alte Röhre wirkt.
  - **Minimal RGB Shift:** Eine ständige, winzige Farbverschiebung an den Kanten, die das Bild lebendig hält, selbst wenn die Musik ruhig ist.
- **Verhalten:** Verhindert, dass das Bild in ruhigen Passagen "tot" wirkt. Es fügt eine organische, analoge Textur hinzu, die das Bild atmen lässt.

### 8. Drift Offset

- **Erkennung:** Intervallbasiert (z.B. alle 8 Sekunden) kombiniert mit der Bass/Groove-Energie.
- **Visual Mapping:**
  - **Subtiler Bildversatz:** Ein sehr leichter horizontaler und/oder vertikaler Shift des gesamten Bildes.
  - **Weicher Übergang:** Der Effekt blendet sich sanft über 1-3 Sekunden ein, hält kurz an und kehrt dann langsam in die stabile Ausgangsposition zurück.
- **Verhalten:** Erzeugt ein organisch instabiles Gefühl, ohne zu dominieren oder sichtbare "Sprünge" zu verursachen. In ruhigen Passagen ist der Drift minimal bis nicht vorhanden, bei stärkerem Groove wird er leicht intensiver.
