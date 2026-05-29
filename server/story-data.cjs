const SYMBOL_META = {
  "✨": { color: "#FFD700", rgb: "255,215,0" },
  "💼": { color: "#4361EE", rgb: "67,97,238" },
  "💬": { color: "#00B4D8", rgb: "0,180,216" },
  "🌸": { color: "#FF6B8A", rgb: "255,107,138" },
  "❤️": { color: "#FF4D6D", rgb: "255,77,109" },
  "☕": { color: "#C8956C", rgb: "200,149,108" },
  "💤": { color: "#7B2FBE", rgb: "123,47,190" },
};

const CHARACTERS = {
  monolith: {
    name: "Mira",
    seed:
      "Character MIRA: 26-year-old solo developer. Dark shoulder-length hair in a messy bun held by a yellow pencil. Small silver oval wire-frame glasses always on. Oversized washed-black hoodie, faded small Shibuya District logo on left chest. Black cotton joggers. Fuzzy dark-grey socks. Small silver stud earrings.",
    envSeed:
      "Setting: cramped Tokyo apartment studio, 3 AM. Two large curved monitors — left shows VS Code dark theme, right shows green terminal. Worn rainbow mechanical keyboard. Yellow sticky notes on monitor bezels. Dark matte ceramic mug always visible. Single rain-streaked window behind her showing blurred city lights. Only light source: cold blue-purple monitor glow casting neon-purple shadows on her face. Small oscillating desk fan in corner.",
  },
  architect: {
    name: "Kenji",
    seed:
      "Character KENJI: 29-year-old architect-designer. Slightly long tousled black hair falling across forehead. Sharp defined jaw, subtle stubble. White Oxford shirt with sleeves rolled to elbows. Charcoal slim-fit trousers. Thin gold analogue watch on left wrist. Bare feet.",
    envSeed:
      "Setting: private architect's studio, late evening into night. Massive oak drafting table covered in rolled paper blueprints and technical drawings. Technical pens and graphite pencils in a ceramic holder. Hanging English ivy in terracotta pots along the walls. Two tall arched windows showing city skyline fading from amber dusk to blue night. Single warm amber tungsten desk lamp. Half-drunk cold cup of tea.",
  },
  neoncoast: {
    name: "Yuna",
    seed:
      "Character YUNA: 24-year-old founder. Straight black hair cut to collarbone with a slight inward wave. Cream cable-knit oversized sweater, slightly large in the shoulders. Dark indigo slim jeans. White Technics-style over-ear headphones always present — on ears or resting around neck. Small gold hoop earrings. Black canvas tote bag beside her on the seat.",
    envSeed:
      "Setting: overnight coastal express train, car 3, window seat 12A. Deep navy pressed fabric seat. Small folding tray table. Outside: pitch-black coastal night, passing highway neon signs blurring — pinks, cyans, ambers streaking past continuously. Faint rhythmic clacking of train wheels on tracks. Dim warm ceiling light inside the car.",
  },
  theascent: {
    name: "Kai",
    seed:
      "Character KAI: 27-year-old competition rock climber. Lean and precise, calloused hands with chalk dust always present in the creases. Faded black athletic shorts and a worn technical tee, both with small chalk stains. A red beanie pushed back on his head. Climbing shoes hanging from his harness. Tape on two fingers of his right hand from an ongoing pulley strain he's ignoring.",
    envSeed:
      "Setting: indoor bouldering gym, 11 PM, almost closed. Overhang walls covered in colour-coded holds — blues and blacks tonight. Chalk dust suspended in the air under warm industrial spotlights. His crash pad pulled directly under the problem he's been working for three weeks. One other climber far across the gym, packing up. The sound of velcro, chalk bags, soft rubber on stone. A half-drunk energy drink on the bench beside his bag.",
  },
  thegrid: {
    name: "Ada",
    seed:
      "Character ADA: 31-year-old algorithmic trader. Sharp angular face, dark circles under precise eyes. Dark hair tied back tightly, one strand loose. Plain charcoal merino sweater, no jewellery except a thin watch. Bare feet on a cold marble floor. A small burn scar on her left wrist from a server room years ago.",
    envSeed:
      "Setting: penthouse home office, 4 AM. Five ultrawide monitors arranged in a semicircle — price feeds, terminal windows, order books. The city skyline 30 floors below, lights reflected in floor-to-ceiling glass. An empty espresso cup. Several delivery containers from different days stacked by the door. A mechanical keyboard, a high-end headset unplugged. The only sound: air conditioning and the faint tick of the market data refreshing. A cot in the corner that hasn't been folded away in days.",
  },
  thewheel: {
    name: "Nadia",
    seed:
      "Character NADIA: 38-year-old night taxi driver. Dark wavy hair pulled into a practical knot. Worn olive-green bomber jacket over a plain white tee. Dark jeans, comfortable driving shoes. A small evil eye charm on the rearview mirror — hers, not the car's. One hand always loose on the wheel. Reading glasses on the dash, rarely used.",
    envSeed:
      "Setting: inside a taxi cab, city at 2:30 AM. Dashboard lit warm amber, radio on low — something old and jazzy. Rain-streaked windshield with city lights bleeding through in orange and white. The back seat recently vacated — the faint smell of someone else's perfume still in the air. A half-eaten protein bar on the passenger seat. The city outside: slick streets, one late-night café still lit, a drunk couple sharing an umbrella. The meter is off. She's between fares.",
  },
  thedrift: {
    name: "Sora",
    seed:
      "Character SORA: 26-year-old, day 34 of not having a job. Medium-length dark hair, slightly overdue for a cut. Oversized faded university hoodie, grey sweatpants. Thick wool socks. No watch — time has become elastic. A small notebook always nearby, mostly empty. Eyes that look like they've been thinking about the same thing for a long time.",
    envSeed:
      "Setting: a small apartment in the middle of an ordinary Tuesday, 10 AM. Futon couch with a tangle of blankets. A laptop open on the coffee table — a job application half-filled, paused. Phone face-down. A mug of tea gone cold. Outside the window: a grey street, a neighbour's laundry on a line, pigeons. The apartment has the specific silence of someone who hasn't spoken out loud today.",
  },
  thecraft: {
    name: "Hana",
    seed:
      "Character HANA: 28-year-old ceramicist. Short asymmetric black hair, clay dust often on her left cheek. Rough natural linen apron over a dark oversized turtleneck. Hands bare, knuckles slightly cracked from clay work. A small clay-smudged silver ring on right index finger. Old canvas sneakers, paint and clay-stained.",
    envSeed:
      "Setting: small ceramics studio in a Kyoto side-alley, dusk into night. Wooden shelves lined with drying pots and cups in various stages. A single pottery wheel in the center, clay-dusted, still. High arched window showing a narrow cobblestone lane and the warm glow of a red paper lantern outside. One warm incandescent bulb overhead casting amber shadows on everything. A small transistor radio in the corner playing faint jazz. The smell of wet earth and old wood permeates the space.",
  },
  nightshift: {
    name: "Ryo",
    seed:
      "Character RYO: 23-year-old convenience store night worker. Medium-length dark hair loosely tied back, a few strands loose. Light blue konbini uniform polo, slightly oversized. Dark straight-cut jeans. White non-slip sneakers. One wireless earbud always in, one dangling. A small folded paper crane charm on his employee lanyard.",
    envSeed:
      "Setting: 24-hour convenience store, Osaka, 3:30 AM. Fluorescent white light on every surface, harsh and perfectly even. Rows of perfectly aligned onigiri, drinks, instant noodles in refrigerator cases. Glass sliding doors showing a rain-wet empty street outside with orange streetlamp reflections. The gentle repetitive beep of a barcode scanner. A small transistor radio behind the counter, J-pop at low volume. Steam rising from the hot drinks machine in the corner. Complete silence except for the hum of refrigerators and rain outside.",
  },
};

function buildPrompts(universeId, actionDesc, staticDesc, locationOverride = "", narrativeContext = "", timeOfDay = "") {
  const c = CHARACTERS[universeId];
  const env = locationOverride
    ? `anime illustrated setting: ${locationOverride}. Soft cel-shaded lighting, hand-drawn textures.`
    : c.envSeed;

  let contextPrefix = "";
  if (timeOfDay) contextPrefix += `Time: ${timeOfDay}. `;
  if (narrativeContext) contextPrefix += `Mood: ${narrativeContext} `;

  const base =
    "2D lofi anime illustration frame. Studio Ghibli aesthetic. 90s retro cel-shaded animation. " +
    "Hand-drawn line art with ink outlines. Painted anime background. Soft pastel color palette. Moody ambient lighting. " +
    "Classic anime proportions and facial styling. Lo-fi cozy atmosphere. " +
    "NOT photorealistic. NOT realistic skin texture. NOT live action. NOT CGI. NOT 3D render. NOT DSLR photo. Illustrated anime only. " +
    `${env} Illustrated anime character — ${c.seed} ${contextPrefix}`;

  return {
    actionPrompt:
      `${base} ACTION: ${c.name} ${actionDesc} 4-second animated clip. Anime illustration style throughout. No text, no subtitles, no watermarks.`,
    staticPrompt:
      `${base} IDLE LOOP — exact same anime scene and location as above, moment after the action. ${c.name} ${staticDesc} Character is now still. Same lighting, same objects, same environment. Only micro-movements: slow breathing, a single blink, one ambient element shifting. Seamless loop. Anime illustration style. No text, no subtitles, no watermarks.`,
  };
}

function startNode(universeId, title, actionDesc, staticDesc, choices) {
  const { actionPrompt, staticPrompt } = buildPrompts(universeId, actionDesc, staticDesc);
  return {
    universeId,
    title,
    depth: 1,
    timeOfDay: "",
    location: "",
    actionPrompt,
    staticPrompt,
    narrativeContext: "",
    choices: choices.map((c) => ({ ...c, ...SYMBOL_META[c.symbol], nextNode: null })),
  };
}

function secondNode(universeId, title, actionDesc, staticDesc, choices, narrativeContext = "", timeOfDay = "later that night") {
  const { actionPrompt, staticPrompt } = buildPrompts(universeId, actionDesc, staticDesc, "", narrativeContext, timeOfDay);
  return {
    universeId,
    title,
    depth: 2,
    timeOfDay,
    location: "",
    actionPrompt,
    staticPrompt,
    narrativeContext,
    choices: choices.map((c) => ({ ...c, ...SYMBOL_META[c.symbol], nextNode: null })),
  };
}

const SECOND_LAYER_TEMPLATES = {
  "✨": {
    title: "spark in motion",
    action: "leans in with renewed focus, scribbles a concrete plan in quick strokes, then immediately executes the first step.",
    static: "stays still over the plan, breathing steady, eyes locked on the next move as one screen glow pulses softly.",
    choices: [
      { symbol: "💼", name: "anchor", label: "ship a tiny prototype" },
      { symbol: "💬", name: "kinetic", label: "invite a collaborator in" },
    ],
    context: "The idea is no longer abstract; it's becoming a real move in the world.",
  },
  "💼": {
    title: "weight of execution",
    action: "opens the practical checklist and commits to the hardest necessary task first, jaw set with quiet discipline.",
    static: "holds posture upright in deliberate calm, reading the plan line by line while ambient lights hum around them.",
    choices: [
      { symbol: "✨", name: "spark", label: "pivot the core design" },
      { symbol: "☕", name: "warm", label: "pause and think quietly" },
    ],
    context: "Progress is tangible, but every practical decision now carries visible weight.",
  },
  "💬": {
    title: "voice in the silence",
    action: "reaches out and starts a real conversation, listening more than speaking before replying with intent.",
    static: "holds the device close and waits, expression softened, while one notification glow reflects across their face.",
    choices: [
      { symbol: "💼", name: "anchor", label: "schedule focused work block" },
      { symbol: "❤️", name: "signal", label: "say what you feel" },
    ],
    context: "Connection changes the direction of the night more than any solo plan could.",
  },
  "🌸": {
    title: "between memory and now",
    action: "lets attention drift toward a private memory, then returns with one emotional truth they cannot ignore.",
    static: "remains still in a reflective posture, blinking slowly as ambient motion continues behind them.",
    choices: [
      { symbol: "❤️", name: "signal", label: "follow the feeling tonight" },
      { symbol: "💼", name: "anchor", label: "return to practical work" },
    ],
    context: "A quiet emotional current is now part of every decision ahead.",
  },
  "❤️": {
    title: "open signal",
    action: "takes one brave emotional step instead of hiding it, voice unsteady at first, then clear.",
    static: "sits with the emotional aftermath, shoulders relaxed, breathing slow, waiting for what comes next.",
    choices: [
      { symbol: "💬", name: "kinetic", label: "send a vulnerable message" },
      { symbol: "💼", name: "anchor", label: "channel it into work" },
    ],
    context: "Being honest changed the internal weather of the scene.",
  },
  "☕": {
    title: "quiet reset",
    action: "takes a deliberate pause, resets their rhythm, and returns with a calmer, cleaner intention.",
    static: "stays grounded in stillness, eyes clear, one small ambient motion looping in the background.",
    choices: [
      { symbol: "✨", name: "spark", label: "capture a fresh idea" },
      { symbol: "💼", name: "anchor", label: "resume clear priorities" },
    ],
    context: "A short reset prevented collapse and restored clarity.",
  },
  "💤": {
    title: "drift threshold",
    action: "lets fatigue take over for a moment, then surfaces with one vivid thread worth following.",
    static: "rests in a still half-dream state, breathing evenly as environmental motion loops around them.",
    choices: [
      { symbol: "🌸", name: "wander", label: "follow the dream thread" },
      { symbol: "💼", name: "anchor", label: "wake and execute plan" },
    ],
    context: "Rest revealed a subtle direction that force could not.",
  },
};

const STORY_TREE = {
  universes: [
    { id: "monolith", name: "The Monolith", subtitle: "Mira · Solo Dev · 3 AM Tokyo", story: "A developer alone at night cracks the algorithm that will define her startup — and her life.", colors: { bg: "#060916", accent: "#7b2fee", secondary: "#00d4ff" }, soundtrack: "nocturne", startNode: "m_start", particles: "rain" },
    { id: "architect", name: "The Architect", subtitle: "Kenji · Blueprint Studio · Dusk", story: "A designer on the edge of a breakthrough must decide what to build — and who for.", colors: { bg: "#0e0a04", accent: "#d4941a", secondary: "#8b6914" }, soundtrack: "serenity", startNode: "a_start", particles: "dust" },
    { id: "neoncoast", name: "The Neon Coast", subtitle: "Yuna · Overnight Train · Coastal Route", story: "A founder on an overnight train processes the biggest pivot of her startup — and her heart.", colors: { bg: "#030d1a", accent: "#ff2d78", secondary: "#00ffcc" }, soundtrack: "dreamscape", startNode: "n_start", particles: "streaks" },
    { id: "theascent", name: "The Ascent", subtitle: "Kai · Bouldering Gym · 11 PM", story: "A competition climber attempts the same impossible problem for the 40th time — and discovers the problem was never the wall.", colors: { bg: "#050d09", accent: "#39ff82", secondary: "#00c8aa" }, soundtrack: "dreamscape", startNode: "ka_start", particles: "dust" },
    { id: "thegrid", name: "The Grid", subtitle: "Ada · Penthouse Office · 4 AM", story: "An algorithmic trader watches a position unravel at 4am and realises she can no longer tell the algorithm from herself.", colors: { bg: "#030410", accent: "#4361ee", secondary: "#f0c040" }, soundtrack: "nocturne", startNode: "gr_start", particles: "streaks" },
    { id: "thewheel", name: "The Wheel", subtitle: "Nadia · Night Taxi · 2:30 AM", story: "A night taxi driver carries strangers through a city that never fully sleeps, and slowly learns what she is carrying herself.", colors: { bg: "#0c0608", accent: "#ffb347", secondary: "#c97bb0" }, soundtrack: "ethernal", startNode: "wh_start", particles: "rain" },
    { id: "thedrift", name: "The Drift", subtitle: "Sora · Small Apartment · Day 34", story: "A person between chapters of their life discovers that not knowing what comes next is itself a kind of freedom.", colors: { bg: "#0c0b0f", accent: "#b06bff", secondary: "#ff6b9d" }, soundtrack: "dreamscape", startNode: "dr_start", particles: "dust" },
    { id: "thecraft", name: "The Craft", subtitle: "Hana · Ceramics Studio · Kyoto Dusk", story: "A ceramicist alone at dusk asks what it means to make something — and what it's worth.", colors: { bg: "#0d0906", accent: "#c47c2e", secondary: "#8b6335" }, soundtrack: "serenity", startNode: "c_start", particles: "dust" },
    { id: "nightshift", name: "The Night Shift", subtitle: "Ryo · 24H Konbini · 3:30 AM Osaka", story: "A convenience store worker discovers the secret world that exists between 3 and 5 AM.", colors: { bg: "#040a04", accent: "#00e87a", secondary: "#00b4d8" }, soundtrack: "nocturne", startNode: "ns_start", particles: "rain" },
  ],
  nodes: {
    m_start: startNode("monolith", "The Epiphany", "suddenly stops mid-keystroke. Her eyes widen behind her glasses — electric clarity crosses her face. She leans forward and types one single definitive keystroke with full intention.", "sits frozen in deep thought, blinking slowly every 4 seconds. Green terminal text scrolls endlessly reflected in her silver glasses. Steam rises from the dark mug. Rain taps the window rhythmically.", [{ symbol: "✨", name: "spark", label: "build it alone tonight" }, { symbol: "💬", name: "kinetic", label: "message Jin in Seoul" }]),
    a_start: startNode("architect", "The Tangible Concept", "drops his graphite pencil onto the blueprints with a soft clatter, leans fully back in his chair, drags both hands through his tousled hair, and exhales one long slow breath while staring at the ceiling.", "sits motionless, chin resting heavily in one hand, staring down at his complex drawings. Dust motes float lazily through the last sliver of amber window light. The wall clock ticks faintly. His gold watch catches the lamplight.", [{ symbol: "💼", name: "anchor", label: "open the laptop, go digital" }, { symbol: "🌸", name: "mirage", label: "look out at the city" }]),
    n_start: startNode("neoncoast", "The Window Seat", "flutters her eyes open. She reaches up and pulls her white headphones off her ears, letting them rest around her neck, then turns her head fully to face the window — eyes opening wide, reflecting the neon lights blurring past outside.", "sits with her head resting gently against the window glass, eyes open and softly reflective. Neon highway signs — pink, cyan, amber — blur past continuously outside. The train rocks with a subtle rhythmic motion.", [{ symbol: "💤", name: "sleep", label: "close your eyes and drift" }, { symbol: "💼", name: "anchor", label: "open the drawing tablet" }]),
    ka_start: startNode("theascent", "Problem 7B", "wipes chalk from both hands onto his shorts, steps back from the wall, and stares up at the crux hold — the one that's rejected him 39 times. He rolls his neck slowly and chalks up again.", "stands beneath the overhang, arms at his sides, eyes fixed on the wall. Chalk dust drifts through the spotlight. His taped fingers flex slowly. The gym is almost empty now.", [{ symbol: "✨", name: "spark", label: "try the crux again" }, { symbol: "💤", name: "rest", label: "pack up and go home" }]),
    gr_start: startNode("thegrid", "The Alert", "pulls off her headset and sets it down without looking away from the centre screen. A position she's held for six hours is moving in the wrong direction. Her fingers hover over the keyboard but don't touch it.", "sits completely still in front of the five screens, one hand on the desk. The market data refreshes every second. City lights glow cold through the glass behind her. The espresso cup is long empty.", [{ symbol: "💼", name: "anchor", label: "hold the position" }, { symbol: "❤️", name: "signal", label: "call one trusted person" }]),
    wh_start: startNode("thewheel", "Between Fares", "watches her last passenger walk away under the streetlamp, shoulders hunched against the rain. She turns off the metre. Sits back. Puts on a song she hasn't heard in two years.", "sits behind the wheel at the red light, engine idling. Rain moves across the windshield in slow lines. City light — orange and white — bleeds through the glass. One hand rests loose on the wheel.", [{ symbol: "💤", name: "rest", label: "head to depot now" }, { symbol: "💬", name: "kinetic", label: "take one more ride" }]),
    dr_start: startNode("thedrift", "Day 34", "closes the laptop without submitting the application. Sits back. Looks at the ceiling for a long moment. Then picks up the cold mug of tea and drinks it anyway.", "sits on the couch, legs folded, looking at the grey window. The street outside is ordinary and quiet. The half-filled application glows faintly under the closed laptop lid.", [{ symbol: "💼", name: "anchor", label: "finish that application now" }, { symbol: "🌸", name: "wander", label: "go outside and breathe" }]),
    c_start: startNode("thecraft", "The Empty Shelf", "lifts a finished bowl from the shelf with both hands and holds it up to the amber lamplight, turning it slowly — studying it with the quiet intensity of someone deciding its fate.", "stands still at the shelves, hands loosely at her sides, looking at weeks of work lined up in the warm amber light. Dust motes float in the still air. Jazz hisses faintly from the transistor radio.", [{ symbol: "✨", name: "spark", label: "smash it start over" }, { symbol: "💼", name: "anchor", label: "pack it for shipping" }]),
    ns_start: startNode("nightshift", "The Only Customer", "watches through the glass doors as the last customer walks away into the rain. He turns back to the perfectly arranged rows. Reaches out and straightens one onigiri that wasn't crooked.", "leans lightly against the counter, arms loose at his sides, watching the empty rain-wet street through the glass. Refrigerators hum. The scanner sits silent. Fluorescent light on everything.", [{ symbol: "☕", name: "warm", label: "eat from the shelves" }, { symbol: "💬", name: "kinetic", label: "text someone still awake" }]),
  },
};

function attachPredefinedSecondLayer(tree) {
  for (const universe of tree.universes) {
    const startNodeId = universe.startNode;
    const start = tree.nodes[startNodeId];
    if (!start || !Array.isArray(start.choices)) continue;
    start.choices.forEach((choice, idx) => {
      if (choice.nextNode) return;
      const template = SECOND_LAYER_TEMPLATES[choice.symbol] || SECOND_LAYER_TEMPLATES["✨"];
      const nodeId = `${startNodeId}_${idx === 0 ? "a" : "b"}`;
      tree.nodes[nodeId] = secondNode(
        start.universeId,
        template.title,
        template.action,
        template.static,
        template.choices,
        template.context,
        "later that night",
      );
      choice.nextNode = nodeId;
    });
  }
}

attachPredefinedSecondLayer(STORY_TREE);

const STATIONS = [
  { id: "default", name: "Default", url: "https://usa9.fastcast4u.com/proxy/jamz?mp=/1" },
  { id: "dreamscape", name: "Dreamscape", url: "https://live.radiospinner.com/lofi-hip-hop-64" },
  { id: "ethernal", name: "Ethernal", url: "https://lfhh.radioca.st/stream" },
  { id: "nocturne", name: "Nocturne", url: "https://stream-153.zeno.fm/3u1qndyk8rhvv?zs=04YRkRsDTa6g3uNhuKl5-A" },
  { id: "serenity", name: "Serenity", url: "https://boxradio-edge-10.streamafrica.net/lofi" },
];

module.exports = { STORY_TREE, STATIONS, CHARACTERS, SYMBOL_META, buildPrompts };
