const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { STORY_TREE, STATIONS, CHARACTERS, SYMBOL_META, buildPrompts } = require("./story-data.cjs");

const PORT = process.env.PORT || 3001;
const SAVE_DIR = process.env.VERCEL ? "/tmp/lofi-cache" : path.join(process.cwd(), "server", "cache");
const VIDEO_CACHE_FILE = path.join(SAVE_DIR, "video_cache.json");
const NODE_CACHE_FILE = path.join(SAVE_DIR, "generated_nodes.json");
const NODE_STATUS_FILE = path.join(SAVE_DIR, "node_status.json");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

if (!global.__LOFI_STATE__) {
  fs.mkdirSync(SAVE_DIR, { recursive: true });
  global.__LOFI_STATE__ = {
    videoCache: loadJson(VIDEO_CACHE_FILE, {}),
    generatedNodes: loadJson(NODE_CACHE_FILE, {}),
    nodeGenCache: loadJson(NODE_STATUS_FILE, {}),
    videoPending: new Map(),
    nodePending: new Map(),
    prewarmPending: new Map(),
  };
  Object.assign(STORY_TREE.nodes, global.__LOFI_STATE__.generatedNodes);
}

const state = global.__LOFI_STATE__;
const ALLOWED_SYMBOLS = ["✨", "💼", "💬", "🌸", "❤️", "☕", "💤"];

const GPT_SYSTEM = `You are an infinite life simulation writer for a lofi anime story game.
Rules:
- Keep strict continuity from previous context.
- Keep output anime-only (never photoreal/live-action/camera realism).
- Keep choices short (3-5 words), meaningful, and different.
- staticDescription must be same exact location and moment after action.
Output ONLY JSON:
{
  "title": "...",
  "timeOfDay": "...",
  "location": "...",
  "narrativeContext": "...",
  "actionDescription": "...",
  "staticDescription": "...",
  "choices": [{"symbol":"✨","label":"..."},{"symbol":"💼","label":"..."}]
}`;

const BANNED_REALISM = [
  "photorealistic",
  "photo-realistic",
  "realistic skin",
  "real person",
  "live action",
  "live-action",
  "dslr",
  "8k photo",
  "hyperreal",
  "hyper-real",
  "cgi",
  "3d render",
  "documentary",
];

const VONDY_API_URL = "https://api.apivondy.com/api/open/video/generate";
const VONDY_MAX_RETRIES = 5;
const VONDY_RETRY_DELAY_MS = 2000;
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Safari/605.1.15",
];

app.get("/api/story-tree", (_req, res) => res.json(STORY_TREE));
app.get("/api/stations", (_req, res) => res.json(STATIONS));

app.post("/api/prewarm-predefined", async (req, res) => {
  const universeId = String(req.body?.universeId || "");
  const wait = Boolean(req.body?.wait);
  const timeoutMs = Number(req.body?.timeoutMs || 20000);
  const key = universeId || "__all__";

  let promise = state.prewarmPending.get(key);
  if (!promise) {
    promise = runPrewarmPredefined(universeId).finally(() => {
      state.prewarmPending.delete(key);
    });
    state.prewarmPending.set(key, promise);
  }

  if (!wait) {
    return res.json({ status: "warming", scope: key });
  }

  const result = await Promise.race([
    promise,
    sleep(timeoutMs).then(() => ({ status: "warming", scope: key })),
  ]);
  return res.json(result);
});

app.get("/api/video", async (req, res) => {
  const nodeId = String(req.query.nodeId || "");
  const type = String(req.query.type || "");
  const prompt = String(req.query.prompt || "");
  const result = await handleVideoRequest(nodeId, type, prompt);
  return res.json(result);
});

app.post("/api/video", async (req, res) => {
  const nodeId = String(req.body?.nodeId || "");
  const type = String(req.body?.type || "");
  const prompt = String(req.body?.prompt || "");
  const result = await handleVideoRequest(nodeId, type, prompt);
  return res.json(result);
});

app.post("/api/prefetch", async (req, res) => {
  const pairs = Array.isArray(req.body?.pairs) ? req.body.pairs : [];
  const kicked = [];
  for (const p of pairs) {
    const node = STORY_TREE.nodes[p.nodeId];
    if (!node || !["action", "static"].includes(p.type)) continue;
    const key = `${p.nodeId}_${p.type}`;
    const e = state.videoCache[key];
    if (e?.status === "ready" || e?.status === "generating") continue;
    const prompt = p.type === "action" ? node.actionPrompt : node.staticPrompt;
    await startVideoGeneration(key, prompt);
    kicked.push(key);
  }
  res.json({ kicked });
});

app.post("/api/generate-node", async (req, res) => {
  const { universeId, parentNodeId, choiceIndex, choiceLabel, choiceSymbol, storyPath = [] } = req.body || {};
  if (!CHARACTERS[universeId]) return res.status(400).json({ error: "unknown universe" });
  const idx = Number(choiceIndex ?? 0);
  const cacheKey = `${parentNodeId}_choice${idx}`;
  const existing = state.nodeGenCache[cacheKey];

  if (existing?.status === "ready") {
    patchParent(parentNodeId, idx, existing.nodeId);
    return res.json(existing);
  }

  if (state.nodePending.has(cacheKey)) {
    const v = await state.nodePending.get(cacheKey);
    return res.json(v);
  }

  const promise = generateNode(universeId, parentNodeId, idx, String(choiceLabel || ""), String(choiceSymbol || "✨"), storyPath);
  state.nodePending.set(cacheKey, promise);
  const result = await promise;
  state.nodePending.delete(cacheKey);
  return res.json(result);
});

app.get("/api/node-status", async (req, res) => {
  const parentNodeId = String(req.query.parentNodeId || "");
  const choiceIndex = Number(req.query.choiceIndex || 0);
  const cacheKey = `${parentNodeId}_choice${choiceIndex}`;
  const entry = state.nodeGenCache[cacheKey] || { status: "not_started" };
  if (entry.status === "ready") patchParent(parentNodeId, choiceIndex, entry.nodeId);
  res.json(entry);
});

app.get("/api/cache-status", (_req, res) => {
  res.json({
    videos: Object.fromEntries(Object.entries(state.videoCache).map(([k, v]) => [k, v.status])),
    nodes: Object.fromEntries(Object.entries(state.nodeGenCache).map(([k, v]) => [k, { status: v.status, title: v.node?.title || "" }])),
  });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[lofi-node] running on :${PORT}`);
  });
}

module.exports = app;

async function handleVideoRequest(nodeId, type, promptInput = "") {
  if (!nodeId || !["action", "static"].includes(type)) {
    return { status: "failed", url: null, error: "bad_request" };
  }

  let prompt = promptInput || "";
  if (!prompt) {
    const node = STORY_TREE.nodes[nodeId];
    if (node) prompt = type === "action" ? node.actionPrompt : node.staticPrompt;
  }

  if (!prompt) {
    return { status: "failed", url: null, error: "prompt_not_found" };
  }

  const cacheKey = `${nodeId}_${type}`;
  return ensureVideoReady(cacheKey, prompt, 56000);
}

async function runPrewarmPredefined(universeId = "") {
  const targets = [];
  const universes = universeId
    ? STORY_TREE.universes.filter((u) => u.id === universeId)
    : STORY_TREE.universes;

  for (const u of universes) {
    const startId = u.startNode;
    const startNode = STORY_TREE.nodes[startId];
    if (!startNode) continue;

    const nodeIds = [startId];
    for (const choice of startNode.choices || []) {
      if (choice.nextNode) nodeIds.push(choice.nextNode);
    }

    for (const nodeId of nodeIds) {
      const node = STORY_TREE.nodes[nodeId];
      if (!node) continue;
      targets.push({ nodeId, type: "action", prompt: node.actionPrompt });
      targets.push({ nodeId, type: "static", prompt: node.staticPrompt });
    }
  }

  const prepared = await mapLimit(targets, 2, async (t) => {
    const r = await ensureVideoReady(`${t.nodeId}_${t.type}`, t.prompt, 60000);
    return r.status === "ready" && !!r.url;
  });

  const readyCount = prepared.filter(Boolean).length;
  return {
    status: readyCount === targets.length ? "ready" : "partial",
    scope: universeId || "__all__",
    total: targets.length,
    ready: readyCount,
  };
}

async function generateNode(universeId, parentNodeId, idx, choiceLabel, choiceSymbol, storyPath) {
  const cacheKey = `${parentNodeId}_choice${idx}`;
  state.nodeGenCache[cacheKey] = { status: "generating" };
  saveNodeState();
  try {
    const result = await generateNodeSync(universeId, storyPath, choiceLabel, choiceSymbol);
    if (!result) {
      state.nodeGenCache[cacheKey] = { status: "failed" };
      saveNodeState();
      return { status: "failed" };
    }
    const { nodeId, node } = result;
    STORY_TREE.nodes[nodeId] = node;
    state.generatedNodes[nodeId] = node;
    state.nodeGenCache[cacheKey] = { status: "ready", nodeId, node };
    patchParent(parentNodeId, idx, nodeId);
    saveNodeState();

    await startVideoGeneration(`${nodeId}_action`, node.actionPrompt);
    await startVideoGeneration(`${nodeId}_static`, node.staticPrompt);
    return state.nodeGenCache[cacheKey];
  } catch (_err) {
    state.nodeGenCache[cacheKey] = { status: "failed" };
    saveNodeState();
    return { status: "failed" };
  }
}

async function startVideoGeneration(cacheKey, prompt) {
  const existing = state.videoCache[cacheKey];
  if (existing?.status === "ready" || existing?.status === "generating") return;
  state.videoCache[cacheKey] = { status: "generating", url: null };
  saveVideoState();
  ensureVideoReady(cacheKey, prompt, 60000).catch(() => {
    state.videoCache[cacheKey] = { status: "failed", url: null };
    saveVideoState();
  });
}

async function ensureVideoReady(cacheKey, prompt, maxWaitMs = 56000) {
  const existing = state.videoCache[cacheKey];
  if (existing?.status === "ready" && existing?.url) return existing;

  if (state.videoPending.has(cacheKey)) {
    return state.videoPending.get(cacheKey);
  }

  const pendingPromise = (async () => {
    state.videoCache[cacheKey] = { status: "generating", url: null };
    saveVideoState();
    const url = await generateVondyVideoWithRotation(prompt, maxWaitMs);
    if (url) state.videoCache[cacheKey] = { status: "ready", url };
    else state.videoCache[cacheKey] = { status: "failed", url: null };
    saveVideoState();
    return state.videoCache[cacheKey];
  })();

  state.videoPending.set(cacheKey, pendingPromise);
  try {
    return await pendingPromise;
  } finally {
    state.videoPending.delete(cacheKey);
  }
}

async function generateVondyVideoWithRotation(prompt, maxWaitMs = 56000) {
  const deadline = Date.now() + maxWaitMs;
  for (let attempt = 1; attempt <= VONDY_MAX_RETRIES; attempt += 1) {
    if (Date.now() >= deadline) break;
    const ua = pickUserAgent();
    const xDeviceId = randomDeviceId();
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": ua,
      "sec-ch-ua": secChUaFromUa(ua),
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": platformFromUa(ua),
      "x-vondy-tier": "lite",
      "x-device-id": xDeviceId,
      Referer: "https://vondy.com/",
      Origin: "https://vondy.com/",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
    };
    const payload = {
      prompt,
      duration: "5",
      aspectRatio: "16:9",
      resolution: "720p",
      cameraFixed: false,
    };

    try {
      const r = await fetch(VONDY_API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      let body = {};
      try {
        body = await r.json();
      } catch {
        body = {};
      }

      const url = extractVideoUrl(body);
      if (r.ok && url) return url;

      const limited = r.status === 429 || String(body?.message || body?.error || "").toLowerCase().includes("limit");
      if (limited && Date.now() < deadline) {
        await sleep(VONDY_RETRY_DELAY_MS * attempt);
        continue;
      }
    } catch {
      // network/transient error, rotate session and retry
    }

    if (attempt < VONDY_MAX_RETRIES && Date.now() < deadline) {
      await sleep(VONDY_RETRY_DELAY_MS * attempt);
    }
  }
  return null;
}

async function generateNodeSync(universeId, storyPath, choiceLabel, choiceSymbol) {
  const char = CHARACTERS[universeId];
  const depth = Array.isArray(storyPath) ? storyPath.length + 1 : 1;
  const summary = (Array.isArray(storyPath) ? storyPath : [])
    .slice(-12)
    .map((s, i) => `Scene ${i + 1}: ${s.title || ""} @ ${s.timeOfDay || ""} in ${s.location || ""}. Chose "${s.choiceMade || ""}". Context: ${s.narrativeContext || ""}`)
    .join("\n");
  const last = (Array.isArray(storyPath) && storyPath.length) ? storyPath[storyPath.length - 1] : {};
  const locations = (Array.isArray(storyPath) ? storyPath : []).map((s) => s.location).filter(Boolean).join("; ") || "none";
  const usedChoices = (Array.isArray(storyPath) ? storyPath : []).map((s) => s.choiceMade).filter(Boolean).slice(-15).join("; ") || "none";

  const userPrompt = `CHARACTER: ${char.name}\n${char.seed}\nHOME WORLD: ${char.envSeed}\nDEPTH: ${depth}\nPATH:\n${summary || "story begins now"}\nPREVIOUS CONTEXT: ${last.narrativeContext || "none"}\nPREVIOUS LOCATION: ${last.location || "none"}\nPREVIOUS TIME: ${last.timeOfDay || "none"}\nLOCATIONS USED (avoid repeat): ${locations}\nCHOICES USED (avoid repeat): ${usedChoices}\nPLAYER JUST CHOSE: "${choiceLabel}" (${choiceSymbol})\nContinue coherently in anime lofi tone.`;

  const raw = await callGpt([
    { role: "system", content: GPT_SYSTEM },
    { role: "user", content: userPrompt },
  ]);
  if (!raw) return null;
  const jsonMatch = String(raw).match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  let data = null;
  try {
    data = JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }

  const location = sanitizeAnime(String(data.location || ""));
  const timeOfDay = sanitizeAnime(String(data.timeOfDay || ""));
  const narrativeContext = sanitizeAnime(String(data.narrativeContext || ""));
  const actionDescription = sanitizeAnime(String(data.actionDescription || "breathes and thinks in silence."));
  const staticDescription = sanitizeAnime(String(data.staticDescription || "sits still and waits."));

  const prompts = buildPrompts(universeId, actionDescription, staticDescription, location, narrativeContext, timeOfDay);
  const rawChoices = Array.isArray(data.choices) ? data.choices.slice(0, 2) : [];
  if (rawChoices.length < 2) return null;

  const used = new Set();
  const choices = rawChoices.map((c) => {
    let sym = ALLOWED_SYMBOLS.find((s) => String(c.symbol || "").includes(s)) || "✨";
    if (used.has(sym)) sym = ALLOWED_SYMBOLS.find((s) => !used.has(s)) || "💬";
    used.add(sym);
    const meta = SYMBOL_META[sym];
    const label = String(c.label || "continue").trim().toLowerCase().slice(0, 35);
    return { symbol: sym, name: label, label, color: meta.color, rgb: meta.rgb, nextNode: null };
  });

  const nodeId = `gen_${universeId}_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
  return {
    nodeId,
    node: {
      universeId,
      title: String(data.title || "a quiet turn"),
      timeOfDay,
      location,
      depth,
      actionPrompt: prompts.actionPrompt,
      staticPrompt: prompts.staticPrompt,
      narrativeContext,
      choices,
      generated: true,
    },
  };
}

async function callGpt(messages) {
  const url = "https://chat.good.hidns.vip/api/openai/v1/chat/completions";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "User-Agent": "Mozilla/5.0",
          accept: "application/json",
          "content-type": "application/json",
          origin: "https://chat.good.hidns.vip",
          referer: "https://chat.good.hidns.vip/",
        },
        body: JSON.stringify({
          messages,
          model: "openai/gpt-oss-120b",
          stream: false,
        }),
      });
      if (r.status === 200) {
        const j = await r.json();
        return j?.choices?.[0]?.message?.content || null;
      }
      if (r.status !== 504) return null;
      await sleep((2 ** attempt) * 1000 + Math.round(Math.random() * 500));
    } catch {
      await sleep((2 ** attempt) * 1000);
    }
  }
  return null;
}

function sanitizeAnime(value) {
  let out = value || "";
  for (const term of BANNED_REALISM) {
    out = out.replace(new RegExp(term, "ig"), "illustrated anime");
  }
  return out.trim();
}

function patchParent(parentNodeId, idx, nodeId) {
  const parent = STORY_TREE.nodes[parentNodeId];
  if (parent && Array.isArray(parent.choices) && parent.choices[idx]) parent.choices[idx].nextNode = nodeId;
}

function pickUserAgent() {
  const i = Math.floor(Math.random() * USER_AGENTS.length);
  return USER_AGENTS[i];
}

function secChUaFromUa(ua) {
  if (ua.includes("Firefox")) return '"Firefox";v="135", "Not.A/Brand";v="8"';
  if (ua.includes("Safari") && !ua.includes("Chrome")) return '"Safari";v="18", "Not.A/Brand";v="8"';
  const m = ua.match(/Chrome\/(\d+)/);
  const v = m?.[1] || "147";
  return `"Google Chrome";v="${v}", "Not.A/Brand";v="8", "Chromium";v="${v}"`;
}

function platformFromUa(ua) {
  if (ua.includes("Windows")) return '"Windows"';
  if (ua.includes("Mac")) return '"macOS"';
  if (ua.includes("Linux")) return '"Linux"';
  return '"Unknown"';
}

function randomDeviceId() {
  const p1 = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const p2 = crypto.randomUUID().replace(/-/g, "").slice(0, 14);
  const p3 = Date.now().toString(16);
  const p4 = Math.floor(Math.random() * 0xffffffff).toString(16);
  return `${p1}-${p2}-${p3}-${p4}`;
}

function extractVideoUrl(responseData) {
  if (!responseData || typeof responseData !== "object") return null;
  const candidates = [
    responseData.url,
    responseData.resultUrl,
    responseData.videoUrl,
    responseData.video_url,
    responseData?.data?.url,
    responseData?.result?.url,
    responseData?.result?.videoUrl,
    responseData?.result?.video_url,
  ];
  for (const v of candidates) {
    if (typeof v === "string" && v.startsWith("http")) return v;
  }
  for (const value of Object.values(responseData)) {
    if (typeof value === "string" && value.startsWith("http") && value.includes(".mp4")) return value;
  }
  return null;
}

function loadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveJson(filePath, data) {
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, filePath);
}

function saveVideoState() {
  saveJson(VIDEO_CACHE_FILE, state.videoCache);
}

function saveNodeState() {
  saveJson(NODE_CACHE_FILE, state.generatedNodes);
  saveJson(NODE_STATUS_FILE, state.nodeGenCache);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const n = Math.max(1, limit);
  const runners = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (true) {
      const i = cursor;
      cursor += 1;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}
