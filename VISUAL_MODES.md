# Visuelle Modi

VIZR bietet verschiedene visuelle Modi, die das Aussehen und Verhalten der Live-Visuals bestimmen. Aktuell ist der **VHS / Broken TV Mode** der primäre Modus.

## VHS / Broken TV Mode

Dieser Modus simuliert die Ästhetik alter analoger Röhrenfernseher (CRT) und abgenutzter VHS-Kassetten. Er kombiniert eine ruhige, driftende Basis mit plötzlichen, event-basierten Störungen (Glitches), die durch die Musik ausgelöst werden.

### Ästhetik

- **Analog & Roh:** Der Look ist bewusst unperfekt, mit Rauschen, Farbverschiebungen (RGB Split) und Scanlines.
- **CRT-Krümmung:** Das Bild wird leicht gewölbt dargestellt, um die Form eines alten Röhrenbildschirms nachzuahmen.
- **Vignettierung:** Die Ränder des Bildes sind abgedunkelt, was den Fokus auf die Mitte lenkt.

### Verhalten: 90% Stabil, 10% Glitch

Ein wichtiges Designprinzip dieses Modus ist, dass er **nicht dauerhaft glitchy** ist. 

- **Die Basis (90% der Zeit):** Das Bild driftet langsam und organisch (gesteuert durch den Bass Groove). Die CRT-Effekte, das Rauschen und der RGB-Shift sind subtil. Das System wirkt wie ein alter Fernseher, der ein relativ stabiles, aber leicht verrauschtes Signal empfängt.
- **Die Events (10% der Zeit):** Plötzlich auftretende, kurze Störungen durchbrechen die Ruhe. Diese Glitches werden entweder durch starke Audio-Peaks (z.B. ein harter Kick oder Drop) oder zufällig (alle 1 bis 5 Sekunden) ausgelöst.

### Event-basierte Glitches

Wenn ein Glitch-Event ausgelöst wird, wählt das System zufällig einen der folgenden Effekte für einen Bruchteil einer Sekunde (0.1s bis 0.5s):

1. **Flicker Burst:** Schnelles, hartes Flackern der Helligkeit.
2. **Horizontal Tearing:** Das Bild zerreißt in horizontale Streifen, die seitlich verschoben werden (wie bei einem schlechten Tracking-Signal).
3. **Tracking Roll:** Das gesamte Bild rollt vertikal durch den Bildschirm (wie bei einem verlorenen V-Sync-Signal).
4. **Noise Burst:** Ein plötzlicher, starker Rausch-Schauer überlagert das Bild.

### Zusätzliche musikalische Reaktionen

Neben den großen Glitch-Events reagiert der Modus kontinuierlich auf die Musik:
- **Kick:** Erzeugt einen subtilen "Screen Punch" (leichtes Hineinzoomen) und pusht den Kontrast.
- **Clap/Snare:** Verursacht ein kurzes horizontales Knistern und einen kurzen RGB-Split.
- **Hi-Hats:** Lassen die Scanlines leicht funkeln und modulieren das Hintergrundrauschen.

### Live-Steuerung (Global Effect Sliders)

Die Intensität und Häufigkeit dieser Effekte lässt sich über die **Global Effect Sliders** im Web-Interface oder über die VIZR Remote-App in Echtzeit anpassen:
- **Complexity:** Steuert die Überlagerung und Intensität der Glitches.
- **Event Density:** Beeinflusst, wie oft zufällige Glitch-Events (unabhängig von der Musik) auftreten.
- **RGB Shift:** Erhöht oder verringert den chromatischen Farbversatz.
- **CRT Curvature:** Steuert die Wölbung des Röhrenfernseher-Effekts.

Dieser Modus ist ideal für elektronische Musik (Techno, House, Electro), da er die rhythmische Struktur der Musik in eine rohe, analoge visuelle Sprache übersetzt.
