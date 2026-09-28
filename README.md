# The Cue Library

A reading room for the music of moving pictures. Twenty original records for launch films, teasers, demos and reels, taken apart as they play, so people who make videos can ask for the right music by name.

Live at https://cue-library.vercel.app

## The rooms

- **The Record Wall**: twenty records with generated sleeve art, filters by kind of film, and a compass that finds records by feel.
- **The Listening Booth**: a floating player at the foot of every page. Hover it to open a bento of instruments: turntable, VU meters, the scrolling score, a mixing desk with solo and mute, a live spectrum, the running order, and the moment card that names each moment as it happens.
- **The Cutting Room**: drop in your own video (it never leaves the browser), mark the reveal, the end card and your cuts. The record is fitted so its drop lands on the reveal and its final chord on the end card, and plays in sync with your film. Tap tempo, cue sheet and shareable links included.
- **The Lexicon**: forty-six illustrated terms, each playable inside a record and pinnable to the slip.
- **The Call Slip**: writes a prompt for an AI music tool, or a brief for a composer, from everything gathered.

The background is a studio room painted in plain canvas code and re-rendered as watercolour (wobbling edges, pigment pooling, granulation, tide lines, paper grain), with rain, lamp light, dust and valve glow that react to the music.

## Structure

Static site, no build step. `index.html`, `assets/css`, `assets/js` (ES modules), `data/library.json`, `audio/` (per-part stems). `tools/build_data.py` regenerates `data/library.json` from `tools/library.src.json`.

## Credits

Every record was written as Strudel code (strudel.cc, AGPL-3.0) and rendered offline. Drums from the uzu-drumkit (public domain). Piano: the Salamander Grand by Alexander Holm (CC BY 3.0). Vibraphone, clap and gong from the VCSL (CC0). Everything else is synthesised.
