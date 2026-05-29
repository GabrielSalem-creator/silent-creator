"""
Silent Creator — backend
- Fixed starting nodes + infinite dynamic story via GPT
- Same session for video generate + poll (requests.Session)
- Disk-backed caches for videos and generated nodes
"""

import asyncio
import json
import logging
import random
import re
import time
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse

from story_data import CHARACTERS, STATIONS, STORY_TREE, SYMBOL_META, build_prompts

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

app = FastAPI(title="Silent Creator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

VIDEO_CACHE_FILE  = Path(__file__).parent / "video_cache.json"
NODES_CACHE_FILE  = Path(__file__).parent / "generated_nodes.json"
executor = ThreadPoolExecutor(max_workers=12)

# Thread locks for cache writes
_video_lock = threading.Lock()
_nodes_lock = threading.Lock()

# Deferred save: only write to disk every 30s, not on every operation
_video_dirty = False
_nodes_dirty = False
_last_video_save = 0.0
_last_nodes_save = 0.0
SAVE_INTERVAL = 30  # seconds


# ── Persistence helpers ───────────────────────────────────────────────────────

def _load_json(path: Path, default):
    if path.exists():
        try: return json.loads(path.read_text())
        except: pass
    return default

def _save_json(path: Path, data):
    # Write atomically via temp file to avoid corruption
    tmp = path.with_suffix(".tmp")
    try:
        tmp.write_text(json.dumps(data))
        tmp.replace(path)
    except Exception as e:
        log.warning("save %s failed: %s", path, e)
        try: tmp.unlink(missing_ok=True)
        except: pass

def _maybe_save_video():
    global _video_dirty, _last_video_save
    now = time.time()
    if _video_dirty and (now - _last_video_save) >= SAVE_INTERVAL:
        _save_json(VIDEO_CACHE_FILE, video_cache)
        _video_dirty = False
        _last_video_save = now

def _maybe_save_nodes():
    global _nodes_dirty, _last_nodes_save
    now = time.time()
    if _nodes_dirty and (now - _last_nodes_save) >= SAVE_INTERVAL:
        _save_json(NODES_CACHE_FILE, _gen_nodes)
        _nodes_dirty = False
        _last_nodes_save = now

def _force_save_video():
    global _video_dirty, _last_video_save
    _save_json(VIDEO_CACHE_FILE, video_cache)
    _video_dirty = False
    _last_video_save = time.time()

def _force_save_nodes():
    global _nodes_dirty, _last_nodes_save
    _save_json(NODES_CACHE_FILE, _gen_nodes)
    _nodes_dirty = False
    _last_nodes_save = time.time()


video_cache: dict = _load_json(VIDEO_CACHE_FILE, {})
# Reset stale generating entries on startup
with _video_lock:
    for v in video_cache.values():
        if isinstance(v, dict) and v.get("status") == "generating":
            v["status"] = "pending"

# Merge persisted generated nodes into the live story tree
_gen_nodes: dict = _load_json(NODES_CACHE_FILE, {})
STORY_TREE["nodes"].update(_gen_nodes)
log.info("Loaded %d video cache entries, %d generated nodes", len(video_cache), len(_gen_nodes))

# Cache the index.html in memory — avoid disk read on every request
_html_cache: str = ""


# ── Video generation (sync, thread pool) ──────────────────────────────────────

def _run_generation(cache_key: str, prompt: str):
    session = requests.Session()
    session.headers.update({
        "accept": "*/*",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,fr;q=0.7",
        "content-type": "application/json",
        "sec-ch-ua": '"Chromium";v="116", "Not)A;Brand";v="24", "Google Chrome";v="116"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-device-id": str(uuid.uuid4()),
        "referer": "https://www.nanobananavideo.io/en/generation/text-to-video?resolution=480P&aspectRatio=16%3A9&duration=3s&model=Free+Mode",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
    })
    try:
        r = session.post(
            "https://www.nanobananavideo.io/api/generate-video",
            json={"action": "generate", "prompt": prompt, "size": "16:9", "withAudio": False},
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        task_id = data.get("taskId") or data.get("task_id") or data.get("id")
        if not task_id:
            raise ValueError(f"no taskId in response: {data}")
        with _video_lock:
            video_cache[cache_key]["taskId"] = task_id
    except Exception as e:
        log.error("[video %s] generate failed: %s", cache_key, e)
        with _video_lock:
            video_cache[cache_key] = {"status": "failed", "url": None}
            global _video_dirty; _video_dirty = True
        _force_save_video()
        return

    poll = {"action": "check_status", "taskId": task_id, "prompt": "", "size": "16:9", "withAudio": False}
    for i in range(90):
        time.sleep(5)
        try:
            j = session.post("https://www.nanobananavideo.io/api/generate-video", json=poll, timeout=30).json()
            log.info("[video %s] poll %d: %s", cache_key, i+1, j.get("status"))
            if j.get("status") == "completed":
                url = j.get("video_url") or j.get("videoUrl") or (j.get("result") or {}).get("video_url")
                if url:
                    with _video_lock:
                        video_cache[cache_key] = {"status": "ready", "url": url}
                        _video_dirty = True
                    _force_save_video()
                    log.info("[video %s] ready: %s", cache_key, url[:60])
                    return
                break
            if j.get("status") in ("failed", "error"):
                break
        except Exception as e:
            log.warning("[video %s] poll error: %s", cache_key, e)

    with _video_lock:
        video_cache[cache_key] = {"status": "failed", "url": None}
        _video_dirty = True
    _force_save_video()

def _kick_video(cache_key: str, prompt: str):
    with _video_lock:
        entry = video_cache.get(cache_key)
        if entry and entry.get("status") in ("ready", "generating"):
            return
        video_cache[cache_key] = {"status": "generating", "url": None}
    executor.submit(_run_generation, cache_key, prompt)


# ── GPT story generation (sync, thread pool) ──────────────────────────────────

ALLOWED_SYMBOLS = {"✨", "💼", "💬", "🌸", "❤️", "☕", "💤"}

PRODUCTION_BRIEF = """\
LOFI PRODUCTION BRIEF:
- Infinite life story paced like episodes.
- Every node has two videos: ACTION (4s once) then STATIC (same exact scene, waiting loop).
- Keep emotional continuity and meaningful choices.
- Keep visual symbolism and anime lo-fi mood in every frame.
"""

GPT_SYSTEM = """\
You are an INFINITE LIFE SIMULATION ENGINE. You generate real, specific, human moments in a person's life — not story scenes, not summaries. One cinematic instant. The kind you remember.

═══ ANIME VISUAL LOCK — non-negotiable ═══
This world is ALWAYS stylized 2D lo-fi anime.
Never drift into live action, photography, realistic skin, CGI, or documentary tone.
The scene must feel like a hand-drawn anime frame at all times.

═══ COHERENCE MANDATE — most important rule ═══

Every scene must CONTINUE from the previous one. Specifically:
• Reference at least ONE concrete detail from the previous scene's narrativeContext (a sensation, object, person, or unresolved tension)
• Time must advance logically — if the last scene was 3:47 AM, this scene is NOT 11 AM (unless a sleep/time-skip is explicitly the narrative event)
• The character's emotional state EVOLVES from the last narrativeContext — it doesn't reset
• If a person was introduced in a previous scene, they can reappear, be referenced, or be heard from

═══ IRON LAWS ═══

1. LOCATION — never repeat a location from the "Locations visited" list. Move the character: different room, outside, a street, a shop, a transit stop, a rooftop, nature, somewhere they've never been in this story.

2. CHOICES — never copy choices from "Choices offered". Labels must be 3-5 words, lowercase, specific to THIS character and THIS moment. No filler: not "keep going", "take a break", "think about it". Every word must earn its place.
   GOOD: "submit the build anyway", "call the one person who'd understand", "leave the crux for tomorrow"
   BAD: "work harder", "rest a bit", "send a message"

3. EMOTIONAL DIRECTION — the two choices must pull the character in genuinely different directions of life. One can be courageous and one avoidant. One can be about work and one about love. One can be internal, one external. They must feel different.

4. STATIC = SAME MOMENT — the staticDescription is NOT a different scene. It is the SAME location, SAME moment, AFTER the action has just completed. The character has stopped moving and is now still — waiting, breathing, processing. Same lighting. Same objects. Same emotional weather. Just stillness now.

5. PERSONA-SPECIFIC EVENTS — use events from this character's actual world:
   • Competitive climber: the project you've tried 40 times, chalk-dusted hands shaking, a hold that gave way, the competitor who just sent your route, an overuse injury that's been ignored, a sponsor call, the qualifier cutoff, the approach hike in rain
   • Algorithmic trader/quant: a position going wrong at 4am, the algorithm misfired, a phone call from the prime broker, a windfall that feels meaningless, a regulation change overnight, the analyst who got it right when you didn't
   • Night taxi driver: the fare who cried in the back, the object left behind, the route you know better than your own apartment, the empty hours between 3 and 4am, the regular who hasn't called, the dispatcher's voice on the radio
   • Person between things (quit their job, between lives): day 20, day 34 of this — the application you can't finish, the savings number getting smaller, the friend who doesn't understand, the unexpected moment of clarity in an ordinary place, the one thing you do that makes time disappear
   • Solo developer/founder: specific bug at 4am, hackathon with 6 hours left, the demo that crashed, the investor who ghosted, running out of runway, the first real user, the moment of questioning what you're building and why
   • Ceramicist/maker: a glaze that cracked in the kiln, the gallery that rejected the proposal, a stranger who wants to commission something personal, hands that ache from the wheel, the piece that finally works, the question of whether to go bigger or stay small
   • Night convenience store worker: the 3:45am silence between customers, the one light that flickers, the regular who stopped coming, the thing someone left behind, the walk home when the city just starts waking up, a moment of being truly alone but not lonely
   • Architect/designer: the client who changed everything, the sketch that finally breaks through, a building they love being demolished, the first time someone uses something they designed, a competition result, a mentor's critical note

6. PERSONA ENCOUNTERS — occasionally (depth 3+), introduce a specific named person the protagonist encounters: a stranger, a neighbor, a passenger, someone who asks a question that changes something. Give them a profession and one specific detail. One choice may involve following or staying with this person.

7. STYLE WORDING — actionDescription and staticDescription should describe movement/stillness only.
   Do not add camera jargon that implies real-life filming, and do not add any photoreal keywords.

═══ OUTPUT FORMAT ═══

Return ONLY this JSON. Nothing outside it:
{
  "title": "2-4 word poetic title",
  "timeOfDay": "clock time or period, e.g. '3:47 AM', 'just before dawn', 'midday heat'",
  "location": "specific new location — e.g. 'the building's emergency stairwell, cold concrete, one flickering strip light'",
  "narrativeContext": "2 sentences: what the character feels + what just happened or what's present. Specific and sensory.",
  "actionDescription": "4-second action — verb first, cinematic. Exactly what happens physically.",
  "staticDescription": "Same scene, after the action. Character is now still. Same location, same lighting, same objects. Describe: how they hold their body, their breath, their eyes, one ambient element still moving.",
  "choices": [
    { "symbol": "one of: ✨ 💼 💬 🌸 ❤️ ☕ 💤", "label": "3-5 word lowercase phrase" },
    { "symbol": "different symbol", "label": "3-5 word lowercase phrase, different dimension" }
  ]
}"""

_ANIME_BANNED = (
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
)


def _sanitize_anime_text(value: str) -> str:
    if not isinstance(value, str):
        return ""
    out = value
    for token in _ANIME_BANNED:
        out = re.sub(token, "illustrated anime", out, flags=re.IGNORECASE)
    return out.strip()


def _call_gpt(messages: list) -> dict | None:
    url = "https://chat.good.hidns.vip/api/openai/v1/chat/completions"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "accept": "application/json",
        "content-type": "application/json",
        "origin": "https://chat.good.hidns.vip",
        "referer": "https://chat.good.hidns.vip/",
    }
    payload = {"messages": messages, "model": "openai/gpt-oss-120b", "stream": False}
    for attempt in range(5):
        try:
            r = requests.post(url, headers=headers, json=payload, timeout=45)
            if r.status_code == 200:
                return r.json()["choices"][0]["message"]["content"]
            if r.status_code == 504:
                time.sleep(2 ** attempt + random.uniform(0, 1))
            else:
                log.error("GPT http %d: %s", r.status_code, r.text[:200])
                break
        except requests.exceptions.Timeout:
            time.sleep(2 ** attempt)
        except Exception as e:
            log.error("GPT error: %s", e)
            break
    return None


def _format_path(story_path: list) -> str:
    if not story_path:
        return "This is the very beginning of the story."
    lines = []
    for i, step in enumerate(story_path):
        parts = [f"  Scene {i+1}: \"{step.get('title','')}\""]
        if step.get("timeOfDay"):
            parts[0] += f" ({step['timeOfDay']})"
        if step.get("location"):
            lines.append(parts[0])
            lines.append(f"    location: {step['location']}")
        else:
            lines.append(parts[0])
        if step.get("choiceMade"):
            lines.append(f"    → chose: \"{step['choiceMade']}\" ({step.get('symbol','')})")
        if step.get("narrativeContext"):
            lines.append(f"    context: {step['narrativeContext']}")
    return "\n".join(lines)


def _extract_world_state(story_path: list) -> dict:
    locations = []
    used_choices = []
    for step in story_path:
        loc = step.get("location", "").strip()
        if loc and loc not in locations:
            locations.append(loc)
        choice = step.get("choiceMade", "").strip()
        if choice:
            used_choices.append(choice)
    return {"locations_visited": locations, "used_choices": used_choices}


def _generate_node_sync(universe_id: str, story_path: list, choice_label: str, choice_symbol: str) -> dict | None:
    c = CHARACTERS[universe_id]
    universe_data = next((u for u in STORY_TREE["universes"] if u["id"] == universe_id), {})
    depth = len(story_path) + 1
    path_text = _format_path(story_path)
    world = _extract_world_state(story_path)

    depth_note = (
        "(early — just beginning)" if depth <= 2 else
        "(building — hours have passed, deeper in their world)" if depth <= 5 else
        "(mid-story — days may have passed, significant things changed)" if depth <= 9 else
        "(deep — the character has lived a lot since we first met them)"
    )

    turning_point = ""
    if depth in (4, 7, 10, 13):
        turning_point = (
            f"\n\n⚡ TURNING POINT — depth {depth}: Something must happen that permanently changes "
            "this character's situation or perspective. An unexpected opportunity, a loss, a revelation, "
            "a person who changes everything. This scene must matter more than the others."
        )

    locations_str = "; ".join(world["locations_visited"]) if world["locations_visited"] else "none yet — start in home environment"
    choices_str = "; ".join(world["used_choices"][-12:]) if world["used_choices"] else "none yet"

    # Extract last scene's context for explicit continuity reference
    last = story_path[-1] if story_path else {}
    last_context = last.get("narrativeContext", "")
    last_location = last.get("location", "")
    last_time = last.get("timeOfDay", "")

    continuity_block = ""
    if last_context:
        continuity_block = f"""
PREVIOUS SCENE CONTEXT (continue from this — reference at least one concrete detail):
  Location: {last_location or 'home base'}
  Time: {last_time or 'unknown'}
  State: {last_context}
"""

    user_msg = f"""CHARACTER: {c['name']}
{c['seed']}

HOME WORLD: {c['env_seed']}

UNIVERSE: {universe_data.get('name', '')} — {universe_data.get('story', '')}

STORY DEPTH: {depth} {depth_note}

STORY PATH SO FAR:
{path_text}
{continuity_block}
WORLD TRACKING:
• Locations already visited (NEVER repeat): {locations_str}
• Choices already offered (NEVER copy): {choices_str}
{turning_point}

THE PLAYER JUST CHOSE: "{choice_label}" ({choice_symbol})

{PRODUCTION_BRIEF}

Generate the next scene. It must continue directly from the previous scene's context above. Reference something specific from it. Then take the story somewhere new."""

    raw = _call_gpt([
        {"role": "system", "content": GPT_SYSTEM},
        {"role": "user",   "content": user_msg},
    ])
    if not raw:
        return None

    raw = raw.strip()
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if not match:
        log.error("GPT returned no JSON: %s", raw[:300])
        return None

    try:
        data = json.loads(match.group())
    except json.JSONDecodeError as e:
        log.error("GPT JSON parse error: %s | raw: %s", e, raw[:300])
        return None

    # Use new `location` field (fallback to old `locationNote`)
    location = _sanitize_anime_text((data.get("location") or data.get("locationNote") or "").strip())
    env_override = location if location and location.lower() not in ("same", "same as before", "") else None

    action_desc = _sanitize_anime_text(data.get("actionDescription", "breathes slowly, staring forward."))
    static_desc = _sanitize_anime_text(data.get("staticDescription", "sits still, ambient environment looping gently."))
    narrative_context = _sanitize_anime_text(data.get("narrativeContext", ""))
    time_of_day = _sanitize_anime_text(data.get("timeOfDay", ""))

    action_prompt, static_prompt = build_prompts(
        universe_id,
        action_desc,
        static_desc,
        location_override=env_override,
        narrative_context=narrative_context,
        time_of_day=time_of_day,
    )

    choices_raw = data.get("choices", [])
    if len(choices_raw) < 2:
        return None

    choices = []
    used_syms = set()
    for ch in choices_raw[:2]:
        raw_sym = ch.get("symbol", "✨").strip()
        # Extract valid emoji from GPT output
        sym = next((s for s in ALLOWED_SYMBOLS if s in raw_sym), None) or "✨"
        # Ensure uniqueness between the two choices
        if sym in used_syms:
            sym = next((s for s in ALLOWED_SYMBOLS if s not in used_syms), sym)
        used_syms.add(sym)
        meta = SYMBOL_META.get(sym, {"color": "#ffffff", "rgb": "255,255,255"})
        choices.append({
            "symbol": sym,
            "name": ch.get("label", "continue")[:35],
            "label": ch.get("label", "continue")[:35],
            "color": meta["color"],
            "rgb": meta["rgb"],
            "nextNode": None,
        })

    node_id = f"gen_{universe_id}_{uuid.uuid4().hex[:10]}"
    node = {
        "universeId": universe_id,
        "title": data.get("title", "A Moment"),
        "timeOfDay": time_of_day,
        "location": location,
        "depth": depth,
        "actionPrompt": action_prompt,
        "staticPrompt": static_prompt,
        "narrativeContext": narrative_context,
        "choices": choices,
        "generated": True,
    }
    return node_id, node


# Cache: parent_node_id + choice_index → {status, nodeId, node}
node_gen_cache: dict = {}

def _node_cache_key(parent_node_id: str, choice_index: int) -> str:
    return f"{parent_node_id}_choice{choice_index}"

def _run_node_generation(cache_key: str, universe_id: str, story_path: list,
                          choice_label: str, choice_symbol: str):
    result = _generate_node_sync(universe_id, story_path, choice_label, choice_symbol)
    if not result:
        with _nodes_lock:
            node_gen_cache[cache_key] = {"status": "failed"}
        return

    node_id, node = result
    with _nodes_lock:
        STORY_TREE["nodes"][node_id] = node
        _gen_nodes[node_id] = node
        global _nodes_dirty; _nodes_dirty = True
    _force_save_nodes()

    with _nodes_lock:
        node_gen_cache[cache_key] = {"status": "ready", "nodeId": node_id, "node": node}
    log.info("Generated node %s: %s", node_id, node["title"])

    # Immediately kick video generation for this new node
    _kick_video(f"{node_id}_action", node["actionPrompt"])
    _kick_video(f"{node_id}_static", node["staticPrompt"])


# ── API routes ────────────────────────────────────────────────────────────────

@app.get("/api/story-tree")
def get_story_tree():
    return STORY_TREE

@app.get("/api/stations")
def get_stations():
    return STATIONS

@app.get("/api/video")
def get_video(nodeId: str, type: str):
    if type not in ("action", "static"):
        return JSONResponse({"error": "type must be action or static"}, 400)
    node = STORY_TREE["nodes"].get(nodeId)
    if not node:
        return JSONResponse({"error": "node not found"}, 404)

    cache_key = f"{nodeId}_{type}"
    entry = video_cache.get(cache_key)
    if entry and entry.get("status") == "ready" and entry.get("url"):
        return entry
    if entry and entry.get("status") == "generating":
        return entry

    prompt = node["actionPrompt"] if type == "action" else node["staticPrompt"]
    _kick_video(cache_key, prompt)
    return video_cache[cache_key]

@app.post("/api/prefetch")
async def prefetch(request: Request):
    body = await request.json()
    kicked = []
    for p in body.get("pairs", []):
        node_id, vtype = p.get("nodeId"), p.get("type")
        if not node_id or vtype not in ("action", "static"):
            continue
        node = STORY_TREE["nodes"].get(node_id)
        if not node:
            continue
        cache_key = f"{node_id}_{vtype}"
        entry = video_cache.get(cache_key)
        if entry and entry.get("status") in ("ready", "generating"):
            continue
        _kick_video(cache_key, node["actionPrompt"] if vtype == "action" else node["staticPrompt"])
        kicked.append(cache_key)
    return {"kicked": kicked}

@app.post("/api/generate-node")
async def generate_node(request: Request):
    """
    Pre-generate a story node for a specific choice.
    Called during the 20s wait so the node + videos are ready before user clicks.
    """
    body = await request.json()
    universe_id   = body.get("universeId")
    parent_node_id = body.get("parentNodeId")
    choice_index  = int(body.get("choiceIndex", 0))
    choice_label  = body.get("choiceLabel", "")
    choice_symbol = body.get("choiceSymbol", "✨")
    story_path    = body.get("storyPath", [])

    if universe_id not in CHARACTERS:
        raise HTTPException(400, "unknown universe")

    cache_key = _node_cache_key(parent_node_id, choice_index)
    entry = node_gen_cache.get(cache_key)

    if entry and entry.get("status") == "ready":
        # Also patch the parent node's choice.nextNode if not already set
        parent = STORY_TREE["nodes"].get(parent_node_id)
        if parent and choice_index < len(parent["choices"]):
            parent["choices"][choice_index]["nextNode"] = entry["nodeId"]
        return entry

    if entry and entry.get("status") == "generating":
        return {"status": "generating"}

    # Kick generation
    node_gen_cache[cache_key] = {"status": "generating"}
    executor.submit(
        _run_node_generation,
        cache_key, universe_id, story_path, choice_label, choice_symbol
    )
    return {"status": "generating"}

@app.get("/api/node-status")
def node_status(parentNodeId: str, choiceIndex: int):
    cache_key = _node_cache_key(parentNodeId, choiceIndex)
    entry = node_gen_cache.get(cache_key, {"status": "not_started"})

    if entry.get("status") == "ready":
        # Patch parent node
        parent = STORY_TREE["nodes"].get(parentNodeId)
        if parent and choiceIndex < len(parent["choices"]):
            parent["choices"][choiceIndex]["nextNode"] = entry["nodeId"]

    return entry

@app.get("/api/cache-status")
def cache_status():
    return {
        "videos": {k: v.get("status") for k, v in video_cache.items()},
        "nodes": {k: {"status": v.get("status"), "title": (v.get("node") or {}).get("title")}
                  for k, v in node_gen_cache.items()},
    }

@app.get("/")
def serve():
    global _html_cache
    if not _html_cache:
        _html_cache = (Path(__file__).parent / "index.html").read_text()
    return HTMLResponse(_html_cache)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003, log_level="info")
