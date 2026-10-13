# RECIPES · musikalische Welten ohne Menüs

**Produktregel:** Ein Recipe ist genau **eine sofort spielbare harmonische Welt**, kein neuer Sequencer-Modus. Auf dem Startbildschirm zwei große Chips: `CLASSIC` oder `✦ GHIBLI DREAM`. Antippen, Musik hören. Danach bleiben PLAY / FLIP / SAVE, SPICE, FEEL, KEEP 1 / ALL 4, ROOT und TYPE identisch.

## Erste Klangwelt: GHIBLI DREAM

*Inoffizielle, eigenständige Hommage an die harmonischen Farben von Joe Hisaishis Filmmusik. Keine Originalmelodien, Transkriptionen, Samples oder Arrangements aus Filmen.* 

**Quellen und Interpretation**

- Sungwijit (2021), *The Analysis of One Summer's Day Composed by Joe Hisaishi*: quartale, sus- und erweiterte Akkorde, lydische Modi, Arpeggios. https://rsucon.rsu.ac.th/2021/paper/1923
- Universiti Malaysia Sarawak (2018/2020), *Application Of Film Music Harmonic Techniques By Joe Hisaishi Into Instrumental Pop Music*: Quartklänge, Tonartwechsel und Harmonie-Clichés, aus Analyse von sechs OSTs. https://ir.unimas.my/id/eprint/28966/
- Musiktheoretische Diskussion *Path of the Wind*: schwebende sus-Harmonien, gemeinsame Töne, uneindeutige Zentren. Unabhängige Interpretation, keine definitive Analyse. https://music.stackexchange.com/questions/69210/analyzing-hisaishi-joes-path-of-the-wind-1

Aus diesen Prinzipien komponieren wir **neue, eigene harmonische Ausgangspunkte**. Ein Modul kann Musik *inspirieren*, ohne den Stil eines konkreten lebenden Künstlers exakt nachzuahmen.

**Wie es klingt**

- Weite Akkorde mit großen None-Tönen: `maj9` und `m9`.
- Schweben statt harter Auflösung: `sus2`, `sus4`, `add9`.
- Sanfte harmonische Bewegung mit gemeinsamen Noten.
- Mit mehr SPICE: geliehener Mollakkord auf Stufe IV, ♭VII-Färbung, sekundäre Dominanten und lydische ♯4-Atmosphäre.
- WARM / CRISPY / CHEESY bleiben **zusätzliche FEEL-Färbungen innerhalb des Recipes**.

**Technik:** `recipes/ghibli-dream.json` enthält 8 **neu erdachte** vierteilige Startfolgen und 15 gewichtete Harmoniebausteine mit `minSpice`-Schwellen. Beim FLIP werden passende Akkorde bevorzugt und Kontext/Loop-Ende weiter bewertet. Root/Type-Pins werden beachtet; KEEP 1 respektiert das ausgewählte Element; ALL 4 ersetzt alle vier Akkorde. Die Regeln erzeugen keine garantierte subjektive 'Perfektion', sondern eingeschränkte musikalisch plausiblere Vorschläge.

## Ein neues Recipe erstellen

1. Neues `recipes/meine-welt.json` nach dem Schema der existierenden JSON-Datei erstellen. `id`, `name`, `suggested*`, `templates`, `palette`, `minSpice`, `weight` hinzufügen.
2. `node tools/build-recipes.mjs` ausführen, um das Rezept ins **autarke HTML** einzubetten. Keine Web-Abhängigkeit oder Laufzeit-Downloads.
3. Einen **sichtbaren Chip** mit `data-recipe="meine-welt"` in der `recipechoices`-Leiste ergänzen. Bei vielen Recipes später **seitlich scrollbare Chips** statt tiefer Menüs nutzen.
4. `node tests/recipes.test.mjs`, `node tests/harmony.test.mjs`, `python3 tests/browser_test.py` testen. Testen, wie sich das Recipe **anfühlt und anhört**, nicht bloß ob der Code läuft.
5. Technische Quellen angeben und prüfen, dass keine fremden Melodien oder geschützten Audioassets kopiert werden.

**Auf dem FM1 später:** Ein UI-Slot `RECIPES` oder ein langer Druck auf einen freien Button öffnet eine einzige seitlich schaltbare Rezeptleiste; Encoder oder zwei Tasten wählen die Welt. Die Rezeptdaten lassen sich als Tabellen in Flash ablegen. Das Browser-Rezept-JSON ist **noch nicht** in die portable C-Engine oder eine Felucca-Firmware integriert.