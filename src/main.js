// ── State ────────────────────────────────────────────────────────────────────
const S = {
  tree: null,
  stations: [],
  universe: null,
  nodeId: null,
  stationIdx: 0,
  musicPlaying: false,
  prefetching: new Set(),
  storyPath: [],   // [{nodeId, title, choiceMade, symbol, narrativeContext, location, timeOfDay}]
  worldState: { locationsVisited: [], usedChoices: [] },
};

const LOADING_MSGS = [
  'composing the moment',
  'painting the silence',
  'generating the scene',
  'rendering the night',
  'building the universe',
  'crafting the light',
  'weaving the story',
];

// ── DOM refs ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const screens = {
  intro: $('intro'),
  select: $('universe-select'),
  game: $('game'),
  loading: $('loading'),
};
const videoAction = $('video-action');
const videoStatic = $('video-static');
const choices = $('choices');
const sceneCanvas = $('scene-canvas');
const sceneCtx = sceneCanvas.getContext('2d');
const VIDEO_URL_CACHE_KEY = 'lofi_video_urls_v1';
const LOCAL_VIDEO_CACHE = loadLocalVideoCache();

// ── Screen transitions ───────────────────────────────────────────────────────
function show(name) {
  Object.entries(screens).forEach(([k, el]) => {
    el.classList.toggle('hidden', k !== name);
  });
}

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  addPreconnectHints();
  [S.tree, S.stations] = await Promise.all([
    fetch('/api/story-tree').then(r => r.json()),
    fetch('/api/stations').then(r => r.json()),
  ]);

  initIntroCanvas();
  initCardParticles();
  initMusic();
  show('intro');

  // Any click/key goes to universe select
  document.addEventListener('click', onIntroClick, {once: true});
  document.addEventListener('keydown', onIntroClick, {once: true});
}

function onIntroClick() {
  screens.intro.style.opacity = '0';
  setTimeout(() => show('select'), 800);
}

// ── Intro canvas stars ───────────────────────────────────────────────────────
function initIntroCanvas() {
  const canvas = $('intro-canvas');
  const ctx = canvas.getContext('2d');
  let stars = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    stars = Array.from({length: 120}, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.2,
      a: Math.random(),
      da: (Math.random() - .5) * .005,
    }));
  }
  resize();
  window.addEventListener('resize', resize);

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      s.a = Math.max(0, Math.min(1, s.a + s.da));
      if (s.a <= 0 || s.a >= 1) s.da *= -1;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

// ── Card particles ───────────────────────────────────────────────────────────
function initCardParticles() {
  animateCardParticles('p-monolith',   'rain',    '#7b2fee');
  animateCardParticles('p-architect',  'dust',    '#d4941a');
  animateCardParticles('p-neoncoast',  'streaks', '#ff2d78');
  animateCardParticles('p-thecraft',   'dust',    '#c47c2e');
  animateCardParticles('p-nightshift', 'rain',    '#00e87a');
  animateCardParticles('p-theascent',  'dust',    '#39ff82');
  animateCardParticles('p-thegrid',    'streaks', '#4361ee');
  animateCardParticles('p-thewheel',   'rain',    '#ffb347');
  animateCardParticles('p-thedrift',   'dust',    '#b06bff');
}

function animateCardParticles(containerId, type, color) {
  const el = $(containerId);
  if (!el) return;
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  el.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let particles = [];

  function resize() {
    canvas.width = el.offsetWidth || 300;
    canvas.height = el.offsetHeight || 400;
    particles = [];
    for (let i = 0; i < 30; i++) {
      particles.push(makeParticle(type, canvas.width, canvas.height, color, true));
    }
  }

  function makeParticle(type, w, h, color, random) {
    if (type === 'rain') return {
      x: Math.random() * w, y: random ? Math.random() * h : -5,
      vy: 1.5 + Math.random() * 2, vx: -0.3,
      len: 8 + Math.random() * 14, alpha: .15 + Math.random() * .25
    };
    if (type === 'dust') return {
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - .5) * .3, vy: -.2 - Math.random() * .3,
      r: .5 + Math.random() * 1.5, alpha: .1 + Math.random() * .3, life: 1
    };
    // streaks
    return {
      x: random ? Math.random() * w : w + 10, y: Math.random() * h,
      vx: -(3 + Math.random() * 5), len: 20 + Math.random() * 60,
      alpha: .15 + Math.random() * .3
    };
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, i) => {
      if (type === 'rain') {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * p.len / p.vy, p.y + p.len);
        ctx.strokeStyle = `rgba(180,180,255,${p.alpha})`;
        ctx.lineWidth = .5;
        ctx.stroke();
        p.x += p.vx; p.y += p.vy;
        if (p.y > canvas.height) particles[i] = makeParticle(type, canvas.width, canvas.height, color, false);
      } else if (type === 'dust') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(212,148,26,${p.alpha * p.life})`;
        ctx.fill();
        p.x += p.vx; p.y += p.vy; p.life -= .004;
        if (p.life <= 0) particles[i] = makeParticle(type, canvas.width, canvas.height, color, true);
      } else {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.len, p.y);
        ctx.strokeStyle = `rgba(255,45,120,${p.alpha})`;
        ctx.lineWidth = .8;
        ctx.stroke();
        p.x += p.vx;
        if (p.x + p.len < 0) particles[i] = makeParticle(type, canvas.width, canvas.height, color, false);
      }
    });
    requestAnimationFrame(draw);
  }

  setTimeout(() => { resize(); draw(); }, 100);
}

// ── Universe cards click ─────────────────────────────────────────────────────
document.querySelectorAll('.ucard').forEach(card => {
  card.addEventListener('click', () => {
    S.storyPath = [];
    S.worldState = { locationsVisited: [], usedChoices: [] };
    startUniverse(card.dataset.id);
  });
});

// ── Back button ──────────────────────────────────────────────────────────────
$('back-btn').addEventListener('click', () => {
  choices.classList.remove('visible');
  videoAction.pause(); videoStatic.pause();
  show('select');
});

// ── Scene canvas (CSS fallback) ──────────────────────────────────────────────
let sceneAnim = null;
function startSceneCanvas(universeId) {
  if (sceneAnim) cancelAnimationFrame(sceneAnim);
  sceneCanvas.width = window.innerWidth;
  sceneCanvas.height = window.innerHeight;

  const themes = {
    monolith:   { bg: ['#060916','#0d1b3e'], accent: [123,47,238],  secondary: [0,212,255],   particle: 'rain' },
    architect:  { bg: ['#0e0a04','#2a1f0d'], accent: [212,148,26],  secondary: [139,105,20],  particle: 'dust' },
    neoncoast:  { bg: ['#030d1a','#0a1428'], accent: [255,45,120],   secondary: [0,255,204],   particle: 'streaks' },
    thecraft:   { bg: ['#0d0906','#1f1309'], accent: [196,124,46],   secondary: [139,99,53],   particle: 'dust' },
    nightshift: { bg: ['#040a04','#0a1a0a'], accent: [0,232,122],    secondary: [0,180,216],   particle: 'rain' },
    theascent:  { bg: ['#050d09','#0a1f12'], accent: [57,255,130],   secondary: [0,200,170],   particle: 'dust' },
    thegrid:    { bg: ['#030410','#08093e'], accent: [67,97,238],    secondary: [240,192,64],  particle: 'streaks' },
    thewheel:   { bg: ['#0c0608','#1a0e10'], accent: [255,179,71],   secondary: [201,123,176], particle: 'rain' },
    thedrift:   { bg: ['#0c0b0f','#18122a'], accent: [176,107,255],  secondary: [255,107,157], particle: 'dust' },
  };
  const theme = themes[universeId] || themes.monolith;
  const ptype = theme.particle;
  const pcount = ptype === 'rain' ? 60 : ptype === 'dust' ? 40 : 30;

  const pts = Array.from({length: pcount}, () => {
    if (ptype === 'rain') return {
      x: Math.random() * sceneCanvas.width, y: Math.random() * sceneCanvas.height,
      vy: 2 + Math.random() * 3, vx: -.5,
      len: 10 + Math.random() * 20, a: .05 + Math.random() * .15
    };
    if (ptype === 'dust') return {
      x: Math.random() * sceneCanvas.width, y: Math.random() * sceneCanvas.height,
      vx: (Math.random()-.5)*.2, vy: -.15 - Math.random()*.2,
      r: .8 + Math.random()*2, a: .05 + Math.random()*.2
    };
    return {
      x: Math.random() * sceneCanvas.width, y: Math.random() * sceneCanvas.height,
      vx: -(1 + Math.random() * 3), len: 30 + Math.random() * 80, a: .05 + Math.random() * .2
    };
  });

  function draw() {
    const grd = sceneCtx.createLinearGradient(0, 0, sceneCanvas.width, sceneCanvas.height);
    grd.addColorStop(0, theme.bg[0]);
    grd.addColorStop(1, theme.bg[1]);
    sceneCtx.fillStyle = grd;
    sceneCtx.fillRect(0, 0, sceneCanvas.width, sceneCanvas.height);

    const rg = sceneCtx.createRadialGradient(
      sceneCanvas.width*.5, sceneCanvas.height*.7,
      0, sceneCanvas.width*.5, sceneCanvas.height*.7, sceneCanvas.width*.6
    );
    rg.addColorStop(0, `rgba(${theme.accent.join(',')},0.06)`);
    rg.addColorStop(1, 'transparent');
    sceneCtx.fillStyle = rg;
    sceneCtx.fillRect(0, 0, sceneCanvas.width, sceneCanvas.height);

    pts.forEach((p, i) => {
      if (ptype === 'rain') {
        sceneCtx.beginPath();
        sceneCtx.moveTo(p.x, p.y);
        sceneCtx.lineTo(p.x + p.vx * 6, p.y + p.len);
        sceneCtx.strokeStyle = `rgba(${theme.secondary.join(',')},${p.a})`;
        sceneCtx.lineWidth = .6;
        sceneCtx.stroke();
        p.x += p.vx; p.y += p.vy;
        if (p.y > sceneCanvas.height) { p.y = -20; p.x = Math.random() * sceneCanvas.width; }
      } else if (ptype === 'dust') {
        sceneCtx.beginPath();
        sceneCtx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        sceneCtx.fillStyle = `rgba(${theme.accent.join(',')},${p.a})`;
        sceneCtx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.y < -10) { p.y = sceneCanvas.height + 10; p.x = Math.random() * sceneCanvas.width; }
      } else {
        sceneCtx.beginPath();
        sceneCtx.moveTo(p.x, p.y);
        sceneCtx.lineTo(p.x + p.len, p.y);
        sceneCtx.strokeStyle = `rgba(${theme.accent.join(',')},${p.a})`;
        sceneCtx.lineWidth = 1;
        sceneCtx.stroke();
        p.x += p.vx;
        if (p.x + p.len < 0) { p.x = sceneCanvas.width + 10; p.y = Math.random() * sceneCanvas.height; }
      }
    });

    sceneAnim = requestAnimationFrame(draw);
  }
  draw();
}

// ── Music player ─────────────────────────────────────────────────────────────
const audio = $('music-audio');
const volSlider = $('vol');
const playBtn = $('play-btn');
const dot = $('music-dot');
const nameEl = $('music-name');

function initMusic() {
  audio.volume = parseFloat(volSlider.value);
  volSlider.addEventListener('input', () => { audio.volume = parseFloat(volSlider.value); });
  $('prev-btn').addEventListener('click', () => changeStation(-1));
  $('next-btn').addEventListener('click', () => changeStation(1));
  playBtn.addEventListener('click', toggleMusic);
  audio.addEventListener('error', () => changeStation(1));
}

function startMusicForUniverse(universeId) {
  const universe = S.tree.universes.find(u => u.id === universeId);
  const preferred = universe ? universe.soundtrack : null;
  const idx = preferred ? S.stations.findIndex(s => s.id === preferred) : 0;
  S.stationIdx = idx >= 0 ? idx : 0;
  playStation();
}

function playStation() {
  const st = S.stations[S.stationIdx];
  if (!st) return;
  audio.src = st.url;
  audio.play().then(() => {
    S.musicPlaying = true;
    playBtn.textContent = '⏸';
    dot.classList.remove('muted');
    nameEl.textContent = st.name;
  }).catch(() => {
    nameEl.textContent = st.name + ' (buffering)';
  });
}

function toggleMusic() {
  if (S.musicPlaying) {
    audio.pause(); S.musicPlaying = false;
    playBtn.textContent = '▶'; dot.classList.add('muted');
  } else {
    audio.play().then(() => {
      S.musicPlaying = true;
      playBtn.textContent = '⏸'; dot.classList.remove('muted');
    }).catch(() => playStation());
  }
}

function changeStation(dir) {
  S.stationIdx = (S.stationIdx + dir + S.stations.length) % S.stations.length;
  playStation();
}

// ── Game flow ────────────────────────────────────────────────────────────────
async function startUniverse(universeId) {
  const universe = S.tree.universes.find(u => u.id === universeId);
  if (!universe) return;

  S.universe = universe;
  startSceneCanvas(universeId);
  startMusicForUniverse(universeId);

  $('universe-label').textContent = universe.name.toUpperCase();
  show('game');
  await loadNode(universe.startNode);
}

async function loadNode(nodeId) {
  S.nodeId = nodeId;
  const node = S.tree.nodes[nodeId];
  if (!node) return;

  $('node-label').textContent = node.title?.toUpperCase() || '';
  $('time-display').textContent = node.timeOfDay || '';
  updateDepthDots(node.depth);
  choices.classList.remove('visible');

  // Quick check: are both videos already cached and ready?
  const cachedAction = getLocalVideoUrl(nodeId, 'action');
  const cachedStatic = getLocalVideoUrl(nodeId, 'static');
  const [qa, qs] = await Promise.all([
    cachedAction ? Promise.resolve({ status: 'ready', url: cachedAction }) : fetch(`/api/video?nodeId=${nodeId}&type=action`).then(r=>r.json()).catch(()=>({})),
    cachedStatic ? Promise.resolve({ status: 'ready', url: cachedStatic }) : fetch(`/api/video?nodeId=${nodeId}&type=static`).then(r=>r.json()).catch(()=>({})),
  ]);
  const alreadyReady = !!(qa.status === 'ready' && qa.url && qs.status === 'ready' && qs.url);

  if (!alreadyReady) showLoading(true);

  const [actionUrl, staticUrl] = await Promise.all([
    alreadyReady ? Promise.resolve(qa.url) : waitForVideo(nodeId, 'action'),
    alreadyReady ? Promise.resolve(qs.url) : waitForVideo(nodeId, 'static'),
    generateNextNodes(nodeId, node),
  ]);

  if (!alreadyReady) showLoading(false);

  await playActionThenStatic(actionUrl, staticUrl, node);
}

async function waitForVideo(nodeId, type) {
  const local = getLocalVideoUrl(nodeId, type);
  if (local) return local;
  // Kick + poll. Backend handles dedup — safe to call repeatedly.
  for (let i = 0; i < 120; i++) {
    const r = await fetch(`/api/video?nodeId=${nodeId}&type=${type}`).then(r => r.json());
    if (r.status === 'ready' && r.url) {
      setLocalVideoUrl(nodeId, type, r.url);
      return r.url;
    }
    if (r.status === 'failed') return null;
    // still generating — wait then retry
    await sleep(3000);
    updateLoadingMsg();
  }
  return null;
}

async function playActionThenStatic(actionUrl, staticUrl, node) {
  // If no video, just go straight to static scene + choices
  if (!actionUrl && !staticUrl) {
    showChoices(node.choices);
    return;
  }

  // Action video
  if (actionUrl) {
    setLocalVideoUrl(S.nodeId, 'action', actionUrl);
    videoAction.src = actionUrl;
    videoAction.preload = 'auto';
    await waitCanPlay(videoAction, 2500);
    videoAction.style.opacity = '1';
    videoStatic.style.opacity = '0';
    try {
      await videoAction.play();
      await new Promise(res => {
        videoAction.onended = res;
        setTimeout(res, 6000); // safety timeout 6s
      });
    } catch(e) {}
  }

  // Static video
  if (staticUrl) {
    setLocalVideoUrl(S.nodeId, 'static', staticUrl);
    videoStatic.src = staticUrl;
    videoStatic.loop = true;
    videoStatic.preload = 'auto';
    await waitCanPlay(videoStatic, 2500);
    try {
      await videoStatic.play();
      videoStatic.style.opacity = '1';
      videoAction.style.opacity = '0';
    } catch(e) {}
  }

  // Poll until child nodes are generating (max 12s), then show choices
  // Much less laggy than a fixed 20s sleep
  const waitStart = Date.now();
  const childIds = node.choices.map(c => c.nextNode).filter(Boolean);
  while (Date.now() - waitStart < 12000) {
    await sleep(1000);
    if (childIds.length > 0) break;
    if (node.choices.every(c => c.nextNode)) break;
  }
  showChoices(node.choices);
}

function showChoices(chArr) {
  const [a, b] = chArr;
  const choiceA = $('choice-a'), choiceB = $('choice-b');

  $('sym-a').textContent = a.symbol;
  $('sym-b').textContent = b.symbol;
  $('label-a').textContent = a.label || '';
  $('label-b').textContent = b.label || '';

  // Glow: rounded rectangle glow matching the card shape
  $('glow-a').style.cssText =
    `background:radial-gradient(ellipse at center, rgba(${a.rgb},.25) 0%, transparent 70%);`;
  $('glow-b').style.cssText =
    `background:radial-gradient(ellipse at center, rgba(${b.rgb},.25) 0%, transparent 70%);`;

  choiceA.style.boxShadow = `0 8px 32px rgba(${a.rgb},.25), 0 0 0 1px rgba(${a.rgb},.2)`;
  choiceB.style.boxShadow = `0 8px 32px rgba(${b.rgb},.25), 0 0 0 1px rgba(${b.rgb},.2)`;
  choiceA.style.borderColor = `rgba(${a.rgb},.25)`;
  choiceB.style.borderColor = `rgba(${b.rgb},.25)`;

  choiceA.onclick = () => onChoose(a);
  choiceB.onclick = () => onChoose(b);
  choiceA.onkeydown = e => e.key === 'Enter' && onChoose(a);
  choiceB.onkeydown = e => e.key === 'Enter' && onChoose(b);

  choices.classList.add('visible');
  kickPrefetch(chArr.map(c => c.nextNode).filter(Boolean));
}

function onChoose(choice) {
  choices.classList.remove('visible');
  videoAction.pause(); videoAction.src = '';
  videoStatic.pause(); videoStatic.src = '';
  videoAction.style.opacity = '0';
  videoStatic.style.opacity = '0';

  const currentNode = S.tree.nodes[S.nodeId];
  const loc = currentNode?.location || '';

  // Track world state
  if (loc && !S.worldState.locationsVisited.includes(loc)) {
    S.worldState.locationsVisited.push(loc);
  }
  if (choice.label) S.worldState.usedChoices.push(choice.label);

  S.storyPath.push({
    nodeId: S.nodeId,
    title: currentNode?.title || '',
    choiceMade: choice.label,
    symbol: choice.symbol,
    narrativeContext: currentNode?.narrativeContext || '',
    location: loc,
    timeOfDay: currentNode?.timeOfDay || '',
  });

  loadNode(choice.nextNode);
}

// ── Dynamic node generation ───────────────────────────────────────────────────

async function generateNextNodes(nodeId, node) {
  await Promise.all(node.choices.map((choice, idx) => {
    if (choice.nextNode) return Promise.resolve();
    return generateOneNode(nodeId, idx, choice, S.storyPath);
  }));
}

async function generateOneNode(parentNodeId, choiceIndex, choice, storyPath) {
  const first = await fetch('/api/generate-node', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      universeId: S.universe.id,
      parentNodeId,
      choiceIndex,
      choiceLabel: choice.label,
      choiceSymbol: choice.symbol,
      storyPath,
    }),
  }).then(r => r.json()).catch(() => ({}));

  if (first.status === 'ready' && first.nodeId) {
    choice.nextNode = first.nodeId;
    S.tree.nodes[first.nodeId] = first.node;
    kickChildren(first.nodeId, first.node, storyPath);
    return;
  }

  for (let i = 0; i < 25; i++) {
    await sleep(3000);
    updateLoadingMsg();
    const r = await fetch(
      `/api/node-status?parentNodeId=${parentNodeId}&choiceIndex=${choiceIndex}`
    ).then(r => r.json()).catch(() => ({}));

    if (r.status === 'ready' && r.nodeId) {
      choice.nextNode = r.nodeId;
      S.tree.nodes[r.nodeId] = r.node;

      // ── GRANDCHILD PRE-GENERATION ──────────────────────────────
      // Immediately kick generation of this node's children (speculatively),
      // so by the time the user watches this scene and picks, grandchildren are ready.
      const speculativePath = [
        ...storyPath,
        {
          nodeId: parentNodeId,
          title: S.tree.nodes[parentNodeId]?.title || '',
          choiceMade: choice.label,
          symbol: choice.symbol,
          narrativeContext: S.tree.nodes[parentNodeId]?.narrativeContext || '',
          location: S.tree.nodes[parentNodeId]?.location || '',
          timeOfDay: S.tree.nodes[parentNodeId]?.timeOfDay || '',
        }
      ];
      kickChildren(r.nodeId, r.node, speculativePath);
      return;
    }
    if (r.status === 'failed') return;
  }
}

// Fire-and-forget: kick backend generation for all children of a node.
// Called as soon as the parent node is generated — gives maximum head start.
function kickChildren(nodeId, node, storyPath) {
  (node.choices || []).forEach((choice, idx) => {
    if (choice.nextNode) return; // already generated, skip
    fetch('/api/generate-node', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        universeId: S.universe.id,
        parentNodeId: nodeId,
        choiceIndex: idx,
        choiceLabel: choice.label,
        choiceSymbol: choice.symbol,
        storyPath,
      })
    }).catch(() => {});
  });
}

function kickPrefetch(nodeIds) {
  const pairs = [];
  for (const nodeId of nodeIds) {
    if (!nodeId || !S.tree.nodes[nodeId]) continue;
    for (const type of ['action', 'static']) {
      const key = `${nodeId}_${type}`;
      if (!S.prefetching.has(key)) {
        S.prefetching.add(key);
        pairs.push({nodeId, type});
      }
    }
  }
  if (!pairs.length) return;
  fetch('/api/prefetch', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({pairs})
  }).catch(() => {});
}

// ── Loading screen ───────────────────────────────────────────────────────────
let loadingMsgIdx = 0;
let loadingInterval = null;

function showLoading(show) {
  const el = screens.loading;
  const orb = $('loading-orb');
  if (show) {
    el.classList.remove('hidden');
    el.style.opacity = '1';
    el.style.pointerEvents = 'auto';
    // Color orb from current universe
    if (S.universe) {
      const c = S.universe.colors;
      orb.style.background = `radial-gradient(circle, ${c.accent} 0%, ${c.secondary}66 60%, transparent 100%)`;
      orb.style.boxShadow = `0 0 40px ${c.accent}66, 0 0 80px ${c.accent}22`;
    }
    loadingInterval = setInterval(updateLoadingMsg, 3000);
    updateLoadingMsg();
  } else {
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    setTimeout(() => el.classList.add('hidden'), 600);
    if (loadingInterval) clearInterval(loadingInterval);
  }
}

function updateLoadingMsg() {
  loadingMsgIdx = (loadingMsgIdx + 1) % LOADING_MSGS.length;
  $('loading-msg').textContent = LOADING_MSGS[loadingMsgIdx];
}

// ── Depth dots (dynamic) ─────────────────────────────────────────────────────
function updateDepthDots(depth) {
  const container = $('depth-dots');
  const total = Math.max(depth + 2, 5);
  if (container.children.length !== total) {
    container.innerHTML = '';
    for (let d = 1; d <= total; d++) {
      const dot = document.createElement('div');
      dot.className = 'depth-dot';
      dot.dataset.depth = d;
      container.appendChild(dot);
    }
  }
  container.querySelectorAll('.depth-dot').forEach(dot => {
    const d = parseInt(dot.dataset.depth);
    dot.classList.remove('active', 'visited');
    if (d < depth) dot.classList.add('visited');
    if (d === depth) dot.classList.add('active');
  });
}

// ── Utils ────────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function waitCanPlay(video, timeoutMs = 2000) {
  return new Promise((resolve) => {
    if (video.readyState >= 2) return resolve();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      video.removeEventListener('canplay', finish);
      resolve();
    };
    video.addEventListener('canplay', finish);
    setTimeout(finish, timeoutMs);
  });
}

function loadLocalVideoCache() {
  try {
    return JSON.parse(localStorage.getItem(VIDEO_URL_CACHE_KEY) || '{}');
  } catch (_) {
    return {};
  }
}

function saveLocalVideoCache() {
  try {
    localStorage.setItem(VIDEO_URL_CACHE_KEY, JSON.stringify(LOCAL_VIDEO_CACHE));
  } catch (_) {}
}

function getLocalVideoUrl(nodeId, type) {
  return LOCAL_VIDEO_CACHE?.[nodeId]?.[type] || '';
}

function setLocalVideoUrl(nodeId, type, url) {
  if (!url) return;
  if (!LOCAL_VIDEO_CACHE[nodeId]) LOCAL_VIDEO_CACHE[nodeId] = {};
  if (LOCAL_VIDEO_CACHE[nodeId][type] === url) return;
  LOCAL_VIDEO_CACHE[nodeId][type] = url;
  saveLocalVideoCache();
}

function addPreconnectHints() {
  const hints = [
    'https://vm.runware.ai',
    'https://www.nanobananavideo.io',
    'https://stream-153.zeno.fm',
    'https://live.radiospinner.com',
  ];
  hints.forEach((href) => {
    const l = document.createElement('link');
    l.rel = 'preconnect';
    l.href = href;
    l.crossOrigin = 'anonymous';
    document.head.appendChild(l);
  });
}

window.addEventListener('resize', () => {
  sceneCanvas.width = window.innerWidth;
  sceneCanvas.height = window.innerHeight;
});

// ── Boot ─────────────────────────────────────────────────────────────────────
init().catch(console.error);
