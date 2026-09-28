# The Cue Library

A reading room for the music of moving pictures. Twenty original records for launch videos, teasers, demos and reels. Every part of each record is animated as it plays, and every musical term is explained on an illustrated catalogue card, so people who make videos can learn the words to brief an AI music tool or an editor.

- **The listening booth**: a turntable player. Notes scroll across the score one row per part (drums, bass, chords, melody, FX), a colour-coded equaliser shows where each part sits, and a typed card names each moment (stop-down, drop, button) as it happens. Solo or mute any part.
- **The stacks**: twenty records filtered by kind of video, each with a copy-ready brief and prompt.
- **The card catalogue**: 46 terms in four drawers (rhythm, harmony, sound, video moves), each with an animated illustration and links to hear it in a record.

## How it is built

Plain static site: `index.html`, `assets/`, `data/library.json`, `audio/`. No build step.

Every record was composed as [Strudel](https://strudel.cc) code, rendered offline in headless Chromium one part at a time, and mastered. The page plays the parts together with the Web Audio API, which is what makes per-part analysis, soloing and muting possible.

## Credits and licences

- Drums: uzu-drumkit (public domain). Piano: Salamander Grand Piano by Alexander Holm (CC-BY 3.0). Vibraphone, clap and gong: VCSL (CC0). Everything else is synthesised.
- Strudel is free software by the TidalCycles community (AGPL-3.0). This site ships audio rendered with it, not Strudel itself.
- The records are original and free to use in your videos.
