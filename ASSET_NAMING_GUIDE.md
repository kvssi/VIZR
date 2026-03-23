# Asset Naming Guide

VIZR nutzt ein intelligentes Dateinamen-System, um hochgeladenen Bildern automatisch Rollen und Verhaltensweisen zuzuweisen. Du kannst das Verhalten deiner Visuals steuern, indem du bestimmte Tags in den Dateinamen deiner Bilder schreibst.

## Vollständige Erklärung der Tags

Tags werden im Dateinamen durch doppelte Unterstriche (`__`) getrennt. Das Format ist:
`[Rolle]__[Format]__[Farbe]__[Verhalten].jpg`

### 1. Rolle (Role)
Bestimmt, auf welchem Layer das Bild angezeigt wird.
- `bg`: Hintergrundbild (füllt den Bildschirm).
- `fg` oder `poster`: Hauptbild im Vordergrund.
- `mid`: Mittlere Ebene, oft für zusätzliche Elemente.
- `overlay` oder `logo`: Schwebende Elemente, Texturen oder Logos (werden kleiner skaliert).
- `flash`: Kurze Event-Elemente, die nur bei starken Audio-Peaks sichtbar werden.

### 2. Format (Orientation)
Hilft dem System, das Bildverhältnis zu verstehen (optional, wird oft automatisch erkannt).
- `portrait`: Hochformat.
- `landscape`: Querformat.
- `square`: Quadratisch.

### 3. Farbe (Color)
Gibt dem System Hinweise zur Farbgebung (optional).
- `bw` oder `mono`: Schwarz-Weiß oder monochrom.
- `color`: Farbig.

### 4. Verhalten (Behavior)
Steuert, wie oft und wann das Bild angezeigt wird.
- `peak`: Das Bild erscheint bevorzugt bei starken Audio-Ausschlägen (Drops, laute Kicks).
- `rare`: Das Bild wird seltener ausgewählt.
- `frequent`: Das Bild wird häufiger ausgewählt.

## Beispiele

- `bg__landscape__color.jpg`: Ein farbiges Hintergrundbild im Querformat.
- `poster__portrait__bw__peak.png`: Ein schwarz-weißes Hauptbild im Hochformat, das bevorzugt bei lauten Audio-Peaks erscheint.
- `logo__square__rare.png`: Ein quadratisches Logo, das nur selten als Overlay eingeblendet wird.
- `flash__peak.jpg`: Ein Bild, das nur als kurzer Blitz bei starken Audio-Ausschlägen sichtbar wird.

## Best Practices

- **Nutze Tags bewusst:** Überlade deine Dateinamen nicht mit Tags. Nutze sie gezielt, um bestimmte Bilder hervorzuheben (z.B. `peak` für dein bestes Bild).
- **Mische Formate:** Lade eine Mischung aus Hoch- und Querformaten hoch, damit das System abwechslungsreiche Kompositionen erstellen kann.
- **Transparenz für Overlays:** Nutze PNG-Bilder mit transparentem Hintergrund für Logos und Overlays, damit sie sich gut in die Szene einfügen.
- **Ohne Tags:** Wenn du keine Tags verwendest, versucht VIZR, die Rolle anhand des Bildformats (Hochformat = Poster, Querformat = Background, Quadrat = Overlay) automatisch zu erraten.
