# Projektübersicht

VIZR ist ein browserbasiertes Visual-System, das lokale Bilder in dynamische, audioreaktive Live-Visuals verwandelt.

## Projektidee

Die Idee hinter VIZR ist es, ein Tool zu schaffen, das sofort einsatzbereit ist und ohne komplexe Einarbeitung funktioniert. Es richtet sich an Musiker, DJs, VJs und Kreative, die schnell und unkompliziert visuelle Begleitung für ihre Musik benötigen.

VIZR verzichtet bewusst auf Timelines, Keyframes und komplizierte Editoren. Stattdessen nutzt es ein intelligentes System, das Bilder basierend auf ihren Dateinamen (Tags) und der Audioanalyse automatisch in Szene setzt.

## Ziel

Das Ziel von VIZR ist es, eine rohe, analoge und musikalische Ästhetik zu erzeugen. Die Visuals sollen nicht wie ein generischer Winamp-Visualizer aussehen, sondern wie ein durchdachtes, reaktives System, das mit der Musik "tanzt".

## Designphilosophie

- **Minimalismus:** Die Benutzeroberfläche ist auf das Nötigste reduziert. Keine überladenen Menüs, keine unzähligen Regler.
- **Browser-Based:** Alles läuft lokal im Browser. Keine Installation, keine Cloud-Uploads, keine Latenz durch externe Server.
- **Remote Control:** Über eine WebSockets-Verbindung lässt sich VIZR live und latenzfrei per Smartphone steuern, ohne dass Mediendaten übertragen werden. Die Verbindung ist robust, merkt sich Sessions und startet Visuals automatisch.
- **System statt Filter:** VIZR ist kein einfacher Bildfilter. Es ist ein System, das Bilder in Rollen (Background, Poster, Logo, Overlay) einteilt und diese intelligent kombiniert (z.B. durch automatische "Transparency Modes" für nahtloses Blending).
- **Musikalität:** Die Audio-Reaktivität ist nicht nur an die Lautstärke gekoppelt, sondern an musikalische Elemente wie Kick, Clap, Hi-Hats und Bass Groove. Ein intelligentes 4-Beat-Pattern sorgt für organische, Groove-basierte Zoom-Bewegungen anstatt mechanischer Wiederholungen. Eine Build-Up-Erkennung begleitet musikalische Spannungsbögen.
- **Asset Editor (Refined):** Ein intuitiver Workflow zum Verwalten deiner Bilder. Du kannst jetzt Assets schrittweise hinzufügen (incremental adding), einzelne Bilder wieder entfernen und die Liste jederzeit erweitern, ohne den aktuellen Stand zu verlieren.
- **Analoge Ästhetik:** Der Fokus liegt auf einer rohen, unperfekten Ästhetik (VHS, CRT, Glitches, Subtle Surface Effects), die an alte Röhrenfernseher und Broadcast-Störungen erinnert.
