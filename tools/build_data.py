"""Build data/library.json for v3 from the v2 data: premium copy, compass
coordinates, liner notes, sleeve art, and no 'logo' wording anywhere."""
import json, re, base64, urllib.parse

src = json.load(open('tools/library.src.json'))

GLOSS = {
 'bpm': ("Tempo, counted in beats per minute. The strongest lever on energy you have: 70 breathes, 120 strides, 160 runs.",
         "Set it by your cutting pace. Quick cuts sit well between 120 and 150; slow beauty shots between 70 and 100."),
 'bar': ("Four beats, counted as one unit. Musicians and editors plan in bars, not seconds.",
         "At 120 BPM a bar lasts exactly two seconds. Place every reveal on a bar line."),
 'downbeat': ("The first beat of a bar, and the heaviest.",
         "Cut the reveal, the title and the end card on a downbeat and the edit feels inevitable."),
 'four-on-the-floor': ("A kick drum on every beat: one, two, three, four.",
         "Momentum without apology. The engine under house, disco and most launch montages."),
 'backbeat': ("Kick on one and three, snare or clap on two and four.",
         "The head-nod of pop and hip hop. Familiar, steady and easy to cut to."),
 'half-time': ("The snare moves to beat three alone, so the groove feels half as fast.",
         "Makes a drop feel heavier without changing the tempo your edit is cut to."),
 'two-step': ("A broken kick, on one and the 'and' of three, in place of a kick on every beat.",
         "It skips where house marches. The lilt of UK garage and drum and bass."),
 'hi-hats': ("The ticking cymbals that fill the gaps between the drums.",
         "The cheapest way to raise energy: double them, from eighths to sixteenths."),
 'swing': ("Every second small note arrives a fraction late, and the rhythm begins to lope.",
         "Swing reads as human and unhurried. Straight time reads as engineered."),
 'syncopation': ("Accents placed between the beats rather than on them.",
         "Brings bounce and life. Keep it gentle under a narrator."),
 'kick': ("The low drum that marks the pulse.",
         "The moment the kick enters is usually the moment the picture starts to move."),
 'bass': ("The lowest line in the music. It carries the weight and names the chord.",
         "Phone speakers barely reach it, so good bass carries a few upper harmonics too."),
 'chords': ("Several notes sounded together: the harmony that sets the mood.",
         "Slow chord changes feel calm and expensive. Fast ones feel busy."),
 'melody': ("The line you could hum. The identity of the piece.",
         "Keep it clear of the voice-over and let it answer in the pauses."),
 'arpeggio': ("A chord played one note at a time, in a pattern.",
         "Reads as motion and computation, things quietly happening. A technology favourite."),
 'ostinato': ("A short figure repeated, bar after bar.",
         "Drives a montage without competing with the voice over it."),
 'major-minor': ("Major sounds bright and settled; minor sounds darker and more serious.",
         "Minor at a groove tempo reads as cool and premium, not sad."),
 'lydian': ("A major scale with its fourth note raised. It floats.",
         "Wonder and optimism, the future looking bright. Made for capability reveals."),
 'dorian': ("A minor scale with its sixth note raised. Minor, with a lift of hope.",
         "Smart and cool. The colour of deep house, lo-fi and funk."),
 'phrygian': ("A minor scale with its second note lowered. Tense, faintly menacing.",
         "Security, intrusion, threat. Use it when the film should feel dangerous."),
 'mixolydian': ("A major scale with its seventh note lowered.",
         "Confidence with a swagger. Fun without the cheese."),
 'sus': ("A chord with its third replaced, so it hangs unresolved.",
         "Leave it hanging through the build, resolve it on the end card, and it lands like an answer."),
 'seventh': ("Extra notes stacked on a chord for colour.",
         "Sevenths sound dreamy; ninths sound lush and expensive."),
 'progression': ("The order in which chords arrive, usually a loop of two to four.",
         "Where the loop starts and ends shapes the feeling more than the chords themselves."),
 'filter-sweep': ("A filter opening slowly, letting the bright frequencies back in.",
         "The most natural way to build towards a reveal."),
 'riser': ("A sound climbing in pitch, brightness or volume.",
         "Builds anticipation, and must end exactly on the downbeat of the reveal."),
 'stop-down': ("A deliberate silence, usually one beat, just before an impact.",
         "The reveal lands because of the silence before it, not because it is loud."),
 'drop': ("The moment the full arrangement arrives after a build.",
         "Put the product reveal exactly here."),
 'impact': ("A kick, a crash and a low boom struck together.",
         "Punctuation for a cut, a title or a reveal."),
 'button': ("One decisive final chord or hit.",
         "Land it on the end card and let it ring. Always stronger than a fade-out."),
 'breakdown': ("A passage where the drums step out and the harmony stays.",
         "Room for the most important line of your voice-over."),
 'sidechain': ("Everything else ducks each time the kick lands, so the track breathes.",
         "The euphoric push of house, French touch and future bass."),
 'reverb': ("The sound of a room around the notes.",
         "A large, dark reverb sounds expensive. Dry sounds close and modern."),
 'delay': ("Notes repeated in rhythm, each echo softer than the last.",
         "Adds depth and motion without adding a single part."),
 'pluck': ("A note that starts instantly and dies quickly.",
         "Crisp and precise, and it leaves space for a voice."),
 'pad': ("A sustained tone that swells in slowly and hangs.",
         "The emotional glue behind everything else."),
 'supersaw': ("Many slightly detuned sawtooth waves stacked into one.",
         "Huge, wide and euphoric. The sound of a festival drop."),
 '808': ("A long, booming electronic kick, tuned so it doubles as the bass.",
         "The low end of trap and phonk."),
 'distortion': ("Sound roughened on purpose, from gentle warmth to broken grit.",
         "A little is warmth; a lot is attitude. It also helps bass cut through a phone."),
 'drone': ("One low note held beneath everything.",
         "Tension in trailers and countdowns, or deep calm in ambient."),
 'motif': ("A two-to-five note idea that keeps returning.",
         "Bring it back on the end card and it becomes your sonic signature."),
 'build': ("A stretch where layers, brightness and density rise together.",
         "The musical shape of the tension before a reveal."),
 'intro': ("The opening seconds, which set the tone for everything after.",
         "On a social feed the most distinctive sound must arrive in the first second."),
 'waveform': ("The raw shape of a synthesised sound: sine, triangle, square or sawtooth.",
         "Sine is soft and pure. Sawtooth is bright and buzzing."),
 'voice-band': ("The frequencies speech lives in, roughly 300 Hz to 3 kHz.",
         "Keep the music quiet here whenever someone is talking."),
 'texture': ("Noise, crackle or air beneath the music.",
         "Gives a sense of place: vinyl, rain, a room."),
}

# liner note, compass (energy 0 hushed..1 charged, machine 0 hand-played..1 machine-built),
# sleeve art template, sleeve palette, cleaned use/avoid
STYLE = {
 '01-tech-keynote-minimal': ("Glass, aluminium and a raised fourth. The sound of a product that simply works.", .42, .80, 'grid',
     ['#E9E1CF', '#2C4A5A', '#C9A25A'], "Feature walkthroughs, interface animation, SaaS launches, hardware beauty shots", "Emotional founder stories"),
 '02-precision-pulse': ("One note, sixteen times a bar, and a filter that breathes. Engineered confidence.", .60, .88, 'bars',
     ['#1F2B33', '#8FB3C4', '#E3D6B8'], "Launch films for developer tools and infrastructure", "Playful consumer apps"),
 '03-deep-house': ("Late-night warmth at 122 BPM. Premium without trying to be.", .60, .46, 'circles',
     ['#233A33', '#C98A5E', '#EAD9B5'], "Fintech, lifestyle, feature montages, event recaps", "Serious security, intimate stories"),
 '04-nu-disco': ("Octave bass and a vibraphone hook. Joy, with good taste.", .72, .34, 'sunburst',
     ['#E8C77A', '#B8472F', '#2A1E14'], "Consumer launches and celebrations; the tasteful alternative to stock 'uplifting'", "Enterprise, security"),
 '05-synthwave': ("Neon on wet asphalt. Nostalgia for a future that never shipped.", .56, .72, 'horizon',
     ['#2B1D3A', '#E07A5F', '#F2CC8F'], "Retro-branded developer tools, terminals, gaming, hacker nostalgia", "Anything meant to feel like today"),
 '06-darksynth': ("Distortion in a key one half-step from danger. For products that guard the gate.", .78, .95, 'shards',
     ['#150F12', '#A3342A', '#D8CFC4'], "Security products, command-line tools with dark branding, AI-risk themes", "Friendly consumer, health"),
 '07-lofi-hiphop': ("Dusty drums, soft keys and a late snare. The sound of someone working carefully.", .18, .20, 'window',
     ['#D9C49C', '#5F7F6E', '#3A2A1E'], "Tutorials, coding timelapses, screen recordings with voice-over", "Launches that need excitement"),
 '08-uk-garage': ("A kick that skips and a shuffle that struts. Cool, and it knows it.", .70, .50, 'stripes',
     ['#EDE3D0', '#1E3A2F', '#C9A25A'], "Social reels, youthful consumer apps, fashion and lifestyle", "Formal enterprise, dense voice-over"),
 '09-liquid-dnb': ("Racing underneath, serene on top. Speed that never looks hurried.", .84, .56, 'waves',
     ['#16303A', '#7FC6B2', '#E9E1CF'], "Speed claims, fast-cut montages that still need feeling", "Dense voice-over, slow luxury shots"),
 '10-future-bass': ("A held breath, one beat of silence, then every speaker at once.", .92, .62, 'bloom',
     ['#F1D9B5', '#D0694F', '#6D51A0'], "Consumer app launch drops, creator tools, celebrations", "Understated premium, B2B"),
 '11-trap': ("Sliding 808s and rattling hats. An entrance, not an introduction.", .76, .64, 'monolith',
     ['#1B1714', '#B99DE2', '#C9A25A'], "Bold teasers, streetwear, sports, gaming", "Calm or trust-heavy brands"),
 '12-ambient': ("No drums, only air. Space for a voice to say something important.", .07, .58, 'moon',
     ['#DCE3E0', '#8FA9B8', '#2C3E48'], "Wellness, brand manifestos under voice-over, AI 'thinking' moments", "Fast-cut reels"),
 '13-piano-minimalism': ("Eight notes, repeated with care. Honesty, in the key of C.", .16, .05, 'keys',
     ['#F0E8D8', '#271D14', '#9A7430'], "Founder letters, mission films, why-we-built-this", "Hype reels"),
 '14-cinematic-trailer': ("Braam, ostinato, silence, impact. Reserve it for news worth the thunder.", .90, .34, 'rays',
     ['#1A1512', '#C9A25A', '#7C2B22'], "Big 'introducing' teasers, funding news (sparingly)", "Small feature updates"),
 '15-glitch-idm': ("Micro-clicks and wandering bleeps over a warm pad. Data, made musical.", .50, .98, 'pixels',
     ['#E6E0D2', '#3E6F95', '#B8472F'], "AI and data products, developer tools, interface animation synced to clicks", "Emotional consumer storytelling"),
 '16-chiptune': ("Square waves and noise drums. A wink to anyone who grew up with a cartridge.", .66, .90, 'checker',
     ['#F2CC8F', '#3D405B', '#E07A5F'], "Gamified features, developer humour, playful onboarding", "Premium, luxury"),
 '17-ticking-tension': ("A clock that doubles its pace. Every second is a promise.", .62, .76, 'clock',
     ['#EDE3D0', '#1B1714', '#A3342A'], "Countdown teasers, problem-statement sections", "Calm or friendly moments"),
 '18-boom-bap': ("A swung break and a jazzy piano. Crafted by hand, delivered with a nod.", .46, .14, 'arches',
     ['#C98A5E', '#2A1E14', '#E8D5A8'], "Founder stories with attitude, creative tools, developer community", "Futuristic, luxury"),
 '19-phonk': ("Cowbell, a blown-out 808 and no manners. Adrenaline for the feed.", .97, .76, 'zigzag',
     ['#D8CFC4', '#7C2B22', '#15100D'], "Hype edits, sports and gaming reels, meme-y posts", "B2B, premium, anything with voice-over"),
 '20-corporate-cliche': ("Claps, glockenspiel and C G Am F. Learn it by heart, then never ask for it.", .55, .30, 'stock',
     ['#D7D2C6', '#8B8578', '#5E594F'], "Nowhere near a technology audience. It signals stock music at once", "Tech launches"),
}

def fix_logo(s):
    if not isinstance(s, str):
        return s
    reps = [
        ('Put your logo on this frame and let it ring.', 'Hold your end card on this frame and let it ring.'),
        ('Land it on the logo frame and let it ring. Better than a fade-out.', 'Land it on the end card and let it ring. Always stronger than a fade-out.'),
        ('Button: one chord on the logo, then let it ring.', 'The button: one final chord on the end card, left to ring.'),
        ('Resolving it on the logo feels like an answer.', 'Resolved on the end card, it lands like an answer.'),
        ('Perfect for a logo.', 'Perfect under an end card.'),
        ('which makes a good move for a logo', 'which makes a fine move for an end card'),
        ('Put the product reveal, big cuts and the logo on a downbeat.', 'Cut the reveal, the title and the end card on a downbeat.'),
        ('the logo frame', 'the end card'), ('on the logo', 'on the end card'), ('for a logo', 'for an end card'),
        ('sonic logo', 'sonic signature'), ('the logo', 'the end card'), ('logo', 'end card'),
    ]
    for a, b in reps:
        s = s.replace(a, b)
    return s

def strudel_url(code):
    b = base64.b64encode(code.encode('utf-8')).decode()
    return 'https://strudel.cc/#' + urllib.parse.quote(b, safe='')

out = {'clips': [], 'glossary': {}}
for k, g in src['glossary'].items():
    d, w = GLOSS[k]
    g = dict(g); g['def'] = d; g['why'] = w
    g['hear'] = [[a, b, fix_logo(c)] for a, b, c in g.get('hear', [])]
    out['glossary'][k] = g

for c in src['clips']:
    c = json.loads(json.dumps(c))
    for m in c['moments']:
        t = m.get('term')
        if t in GLOSS and m['why'] == src['glossary'][t]['why']:
            m['why'] = GLOSS[t][1]
        for f in ('text', 'why', 'title'):
            m[f] = fix_logo(m[f])
        if m.get('term') in GLOSS and m.get('auto'):
            pass
    c['seg'] = [[('button' if lab.lower() in ('logo',) else fix_logo(lab)), a, b] for lab, a, b in c['seg']]
    c['code'] = fix_logo(c['code'])
    c['url'] = strudel_url(c['code'])
    c['body'] = fix_logo(c.get('body', '')) if c.get('body') else c.get('body')
    if c['kind'] == 'style':
        note, en, ma, art, pal, use, avoid = STYLE[c['id']]
        c.update(note=note, energy=en, machine=ma, art=art, palette=pal, use=use, avoid=avoid)
        if c['id'] == '20-corporate-cliche':
            c['title'] = 'Corporate uplifting'
        c['prompt'] = fix_logo(c['prompt'])
    out['clips'].append(c)

s = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
assert 'logo' not in s.lower(), [m.start() for m in re.finditer('logo', s.lower())][:5]
open('data/library.json', 'w').write(s)
print('ok', len(s))
