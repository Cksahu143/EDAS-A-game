/**
 * EDAS engine — Phase 1
 * =====================
 * Single-canvas 2D engine tuned for a hand-painted, cinematic feel.
 *
 *   engine.ts   — main loop, input, camera, tween/easing, noise, shared state
 *   world.ts    — sky, ground, grass, hedges, trees, school entrance, hatch
 *   entities.ts — player + NPCs
 *   fx.ts       — particles, lighting, post-processing
 *   story.ts    — sequences, subtitles, letterbox
 *
 * Everything shares one `Ctx` object so systems stay decoupled and testable.
 */

import { buildWorld, drawWorld, updateWorld, type World } from "./world";
import { createPlayer, createNpcs, updatePlayer, updateNpcs, drawEntities, type Player, type Npc } from "./entities";
import { updateFx, drawSkyFx, drawGroundFx, drawAirFx, drawLightingOverlay, drawPostFX, createFxState, type FxState } from "./fx";
import { runStory, type StoryController, createStoryController } from "./story";
import { buildUnderground, drawUnderground, drawUndergroundOverlay, updateUnderground, type UndergroundState } from "./underground";
import { startFall, updateFall, drawFall, type FallState } from "./fall";
import { buildGarden, drawGarden, drawGardenOverlay, updateGarden, type GardenState } from "./garden";
import { buildHearth, drawHearth, drawHearthOverlay, updateHearth, type HearthState } from "./hearth";
import { buildPrimer, drawPrimer, drawPrimerOverlay, updatePrimer, type PrimerState } from "./primer";

// ---------- utilities ---------------------------------------------------
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const dist = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const smoothDamp = (curr: number, target: number, dt: number, halfLife: number) =>
  lerp(curr, target, 1 - Math.pow(0.5, dt / halfLife));

// Deterministic hash-noise: cheap "perlin-ish" scalar field used for wind,
// grass sway, cloud shadows. Not real perlin, but visually coherent and
// stable across frames.
export function noise2(x: number, y: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}
export function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = noise2(ix, iy);
  const b = noise2(ix + 1, iy);
  const c = noise2(ix, iy + 1);
  const d = noise2(ix + 1, iy + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

// ---------- input --------------------------------------------------------
export interface InputState {
  x: number; y: number;
  interact: boolean;
  interactEdge: boolean; // one-shot press
  keys: Set<string>;
  kbActive?: boolean;
}

// ---------- camera -------------------------------------------------------
export interface Camera {
  x: number; y: number;
  targetX: number; targetY: number;
  zoom: number; targetZoom: number;
  shake: number;
  bob: number; // walk bob offset applied at render
  followHalfLife: number;
  // manual override during cutscenes
  manual: boolean;
}

// ---------- context ------------------------------------------------------
export interface Ctx {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  ui: HTMLElement;
  w: number; h: number; dpr: number;
  time: number;         // seconds since start
  dt: number;           // last frame delta
  input: InputState;
  camera: Camera;
  world: World;
  player: Player;
  npcs: Npc[];
  fx: FxState;
  story: StoryController;
  state: GameState;
  offscreen: OffscreenBuffers;
  scene: "surface" | "underground" | "garden" | "hearth" | "primer";
  underground?: UndergroundState;
  garden?: GardenState;
  hearth?: HearthState;
  primer?: PrimerState;
  fall?: FallState;
  runner?: RunnerState;
  suspense: number;
  frame: number;
  fragments?: string[];
  // Half-Page — a small silent companion found in the Sunken Primer.
  // Lives at the Ctx level (not scene-local) because per the design
  // bible it follows the player across every scene once found.
  halfPage?: { x: number; y: number; active: boolean; ph: number };
}

export type GameState =
  | "boot"
  | "intro"
  | "explore"
  | "cutscene"
  | "falling"
  | "ended"; // fade-to-black after fall (Phase 1 stops here)

export interface RunnerState {
  active: boolean;
  x: number; y: number;
  vx: number;
  alpha: number;
  color: { shirt: string; pants: string; hair: string };
}

/**
 * Transition into the Phase 2 underground scene.
 * Rebuilds world state, warps the player under the shaft of light,
 * and clears any hatch/collision context. Called by the story sequencer
 * after the fall fades to black.
 */
export function enterUnderground(ctx: Ctx) {
  const u = buildUnderground();
  ctx.underground = u;
  ctx.scene = "underground";
  ctx.player.x = u.playerStart.x;
  ctx.player.y = u.playerStart.y;
  ctx.player.pose = "lie";
  ctx.player.poseT = 0;
  ctx.player.facing = 1;
  ctx.player.facingLerp = 1;
  ctx.camera.manual = true;
  ctx.camera.x = u.playerStart.x;
  ctx.camera.y = u.playerStart.y - 30;
  ctx.camera.targetX = u.playerStart.x;
  ctx.camera.targetY = u.playerStart.y - 30;
  ctx.camera.zoom = 1.5;
  ctx.camera.targetZoom = 1.0;
  ctx.camera.shake = 0;
}

/**
 * Transition into the Garden of Forgotten Numbers puzzle scene.
 */
export function enterGarden(ctx: Ctx) {
  const gs = buildGarden();
  ctx.garden = gs;
  ctx.scene = "garden";
  ctx.player.x = gs.playerStart.x;
  ctx.player.y = gs.playerStart.y;
  ctx.player.pose = "stand";
  ctx.player.poseT = 0;
  ctx.player.facing = 1;
  ctx.player.facingLerp = 1;
  ctx.camera.manual = false;
  ctx.camera.x = gs.playerStart.x;
  ctx.camera.y = gs.playerStart.y;
  ctx.camera.targetX = gs.playerStart.x;
  ctx.camera.targetY = gs.playerStart.y;
  // NOTE: previously this also force-set ctx.camera.zoom directly, which
  // caused a visible jump-cut in zoom the instant the portal was used
  // (the fix for the reported "camera is bugged" issue). Position must
  // still snap since the world coordinates are unrelated between scenes,
  // but zoom should always ease via targetZoom so it's never a hard pop.
  ctx.camera.targetZoom = 0.95;
  ctx.camera.shake = 0;
}

/**
 * Transition into Hearth Hollow, the hub connecting regions.
 */
export function enterHearth(ctx: Ctx) {
  const hs = buildHearth();
  ctx.hearth = hs;
  ctx.scene = "hearth";
  ctx.player.x = hs.playerStart.x;
  ctx.player.y = hs.playerStart.y;
  ctx.player.pose = "stand";
  ctx.player.poseT = 0;
  ctx.player.facing = 1;
  ctx.player.facingLerp = 1;
  ctx.camera.manual = false;
  ctx.camera.x = hs.playerStart.x;
  ctx.camera.y = hs.playerStart.y;
  ctx.camera.targetX = hs.playerStart.x;
  ctx.camera.targetY = hs.playerStart.y;
  ctx.camera.targetZoom = 1.0;
  ctx.camera.shake = 0;
}

/**
 * Transition into the Sunken Primer, Bram's region.
 */
export function enterPrimer(ctx: Ctx) {
  const ps = buildPrimer();
  ctx.primer = ps;
  ctx.scene = "primer";
  ctx.player.x = ps.playerStart.x;
  ctx.player.y = ps.playerStart.y;
  ctx.player.pose = "stand";
  ctx.player.poseT = 0;
  ctx.player.facing = 1;
  ctx.player.facingLerp = 1;
  ctx.camera.manual = false;
  ctx.camera.x = ps.playerStart.x;
  ctx.camera.y = ps.playerStart.y;
  ctx.camera.targetX = ps.playerStart.x;
  ctx.camera.targetY = ps.playerStart.y;
  ctx.camera.targetZoom = 0.95;
  ctx.camera.shake = 0;
}

interface OffscreenBuffers {
  scene: HTMLCanvasElement;
  sceneCtx: CanvasRenderingContext2D;
  bloom: HTMLCanvasElement;
  bloomCtx: CanvasRenderingContext2D;
}

// ---------- entry --------------------------------------------------------
export function startEdas(canvas: HTMLCanvasElement, ui: HTMLElement): () => void {
  const ctx2d = canvas.getContext("2d", { alpha: false });
  if (!ctx2d) throw new Error("2D canvas not supported");

  const world = buildWorld();
  const player = createPlayer(world.playerStart.x, world.playerStart.y);
  const npcs = createNpcs(world);
  const fx = createFxState(world);
  const story = createStoryController(ui);

  const camera: Camera = {
    x: player.x, y: player.y - 40,
    targetX: player.x, targetY: player.y,
    zoom: 1.0, targetZoom: 0.85,
    shake: 0, bob: 0,
    followHalfLife: 0.32,
    manual: false,
  };

  const input: InputState = {
    x: 0, y: 0, interact: false, interactEdge: false,
    keys: new Set(),
  };

  const scene = document.createElement("canvas");
  const bloom = document.createElement("canvas");
  const offscreen: OffscreenBuffers = {
    scene, sceneCtx: scene.getContext("2d")!,
    bloom, bloomCtx: bloom.getContext("2d")!,
  };

  const ctx: Ctx = {
    canvas, ctx: ctx2d, ui,
    w: 0, h: 0, dpr: 1,
    time: 0, dt: 0,
    input, camera, world, player, npcs, fx, story,
    state: "boot",
    offscreen,
    scene: "surface",
    underground: undefined,
    fall: undefined,
    runner: undefined,
    suspense: 0,
    frame: 0,
    halfPage: { x: 0, y: 0, active: false, ph: 0 },
  };

  // ---- resize ---------------------------------------------------------
  const resize = () => {
    // Undertale-style pixel rendering: draw at a low internal resolution
    // then nearest-neighbor upscale via CSS. Every backing surface uses the
    // same low-res dimensions so the pipeline never touches full-res pixels.
    // Big performance win + chunky Toby-Fox pixels for free.
    const w = window.innerWidth, h = window.innerHeight;
    const PIXEL = 2; // scale factor — bigger = chunkier + faster
    const iw = Math.max(320, Math.floor(w / PIXEL));
    const ih = Math.max(240, Math.floor(h / PIXEL));
    ctx.w = iw; ctx.h = ih; ctx.dpr = 1;
    canvas.width = iw;
    canvas.height = ih;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.style.imageRendering = "pixelated";
    ctx2d.setTransform(1, 0, 0, 1, 0, 0);
    ctx2d.imageSmoothingEnabled = false;

    scene.width = iw;
    scene.height = ih;
    scene.style.imageRendering = "pixelated";
    offscreen.sceneCtx.setTransform(1, 0, 0, 1, 0, 0);
    offscreen.sceneCtx.imageSmoothingEnabled = false;
    bloom.width = Math.max(80, Math.floor(iw * 0.5));
    bloom.height = Math.max(45, Math.floor(ih * 0.5));
  };
  resize();
  window.addEventListener("resize", resize);

  // ---- input ----------------------------------------------------------
  const keyDown = (e: KeyboardEvent) => {
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
    input.keys.add(e.key.toLowerCase());
    if (e.key === "e" || e.key === "E") { input.interact = true; input.interactEdge = true; }
    if (ctx.state === "boot" && (e.key === " " || e.key === "Enter")) beginGame();
    if (ctx.state === "intro" && (e.key === " " || e.key === "Enter")) story.requestSkipIntro();
  };
  const keyUp = (e: KeyboardEvent) => {
    input.keys.delete(e.key.toLowerCase());
    if (e.key === "e" || e.key === "E") input.interact = false;
  };
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);

  // Title / interact clicks
  const titleEl = ui.querySelector<HTMLElement>('[data-el="title"]');
  const interactBtn = ui.querySelector<HTMLElement>('[data-el="interact"]');
  const onTitle = () => { if (ctx.state === "boot") beginGame(); else if (ctx.state === "intro") story.requestSkipIntro(); };
  titleEl?.addEventListener("pointerdown", onTitle);
  const onInteract = () => { input.interact = true; input.interactEdge = true; setTimeout(() => (input.interact = false), 120); };
  interactBtn?.addEventListener("pointerdown", onInteract);

  // Touch joystick
  const joy = ui.querySelector<HTMLElement>('[data-el="joy"]');
  const knob = ui.querySelector<HTMLElement>('[data-el="joy-knob"]');
  let joyId: number | null = null;
  let joyCx = 0, joyCy = 0;
  const joyRadius = 44;
  const isTouchDevice = matchMedia("(hover: none) and (pointer: coarse)").matches;
  if (isTouchDevice) {
    joy?.setAttribute("data-visible", "1");
    interactBtn?.setAttribute("data-visible", "1");
  }
  const joyStart = (e: PointerEvent) => {
    if (joyId !== null || !joy) return;
    const r = joy.getBoundingClientRect();
    joyCx = r.left + r.width / 2; joyCy = r.top + r.height / 2;
    joyId = e.pointerId;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    joyMove(e);
  };
  const joyMove = (e: PointerEvent) => {
    if (joyId !== e.pointerId) return;
    const dx = e.clientX - joyCx, dy = e.clientY - joyCy;
    const d = Math.hypot(dx, dy);
    const clampD = Math.min(d, joyRadius);
    const nx = d > 0 ? dx / d : 0, ny = d > 0 ? dy / d : 0;
    input.x = (nx * clampD) / joyRadius;
    input.y = (ny * clampD) / joyRadius;
    if (knob) knob.style.transform = `translate(${nx * clampD}px, ${ny * clampD}px)`;
  };
  const joyEnd = (e: PointerEvent) => {
    if (joyId !== e.pointerId) return;
    joyId = null;
    input.x = 0; input.y = 0;
    if (knob) knob.style.transform = "";
  };
  joy?.addEventListener("pointerdown", joyStart);
  joy?.addEventListener("pointermove", joyMove);
  joy?.addEventListener("pointerup", joyEnd);
  joy?.addEventListener("pointercancel", joyEnd);

  const beginGame = () => {
    if (ctx.state !== "boot") return;
    titleEl?.setAttribute("data-hidden", "1");
    ctx.state = "intro";
    runStory(ctx).catch((err: unknown) => console.error(err));
  };

  // ---- main loop ------------------------------------------------------
  let last = performance.now();
  let raf = 0;
  const targetFrameMs = 1000 / 30;
  const loop = (now: number) => {
    if (now - last < targetFrameMs) {
      raf = requestAnimationFrame(loop);
      return;
    }
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    ctx.dt = dt;
    ctx.time += dt;
    ctx.frame += 1;

    pollKeys(input);
    update(ctx);
    render(ctx);

    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    window.removeEventListener("keydown", keyDown);
    window.removeEventListener("keyup", keyUp);
    titleEl?.removeEventListener("pointerdown", onTitle);
    interactBtn?.removeEventListener("pointerdown", onInteract);
    joy?.removeEventListener("pointerdown", joyStart);
    joy?.removeEventListener("pointermove", joyMove);
    joy?.removeEventListener("pointerup", joyEnd);
    joy?.removeEventListener("pointercancel", joyEnd);
  };
}

function pollKeys(input: InputState) {
  const k = input.keys;
  let x = 0, y = 0;
  if (k.has("arrowleft") || k.has("a")) x -= 1;
  if (k.has("arrowright") || k.has("d")) x += 1;
  if (k.has("arrowup") || k.has("w")) y -= 1;
  if (k.has("arrowdown") || k.has("s")) y += 1;
  if (x || y) {
    const m = Math.hypot(x, y) || 1;
    input.x = x / m;
    input.y = y / m;
    input.kbActive = true;
  } else if (input.kbActive) {
    // Keyboard was driving; user released — zero it. The joystick handlers
    // will overwrite this on the next pointermove if they're active.
    input.x = 0;
    input.y = 0;
    input.kbActive = false;
  }
}

// ---------- update -------------------------------------------------------
function update(ctx: Ctx) {
  const { camera, dt } = ctx;

  if (ctx.scene === "surface") {
    updateWorld(ctx);
    updateFx(ctx);
  } else if (ctx.scene === "underground") {
    updateUnderground(ctx);
  } else if (ctx.scene === "garden") {
    updateGarden(ctx);
  } else if (ctx.scene === "hearth") {
    updateHearth(ctx);
  } else if (ctx.scene === "primer") {
    updatePrimer(ctx);
  }

  // fall sequence owns update while falling
  if (ctx.state === "falling" && ctx.fall) {
    updateFall(ctx, ctx.fall);
  }

  // runner cinematic movement (position advanced by story via vx)
  if (ctx.runner?.active) {
    ctx.runner.x += ctx.runner.vx * dt;
  }

  if (ctx.state === "explore") {
    updatePlayer(ctx);
    if (ctx.scene === "surface") {
      updateNpcs(ctx);
      const h = ctx.world.hatch;
      const d = dist(ctx.player.x, ctx.player.y, h.x, h.y);
      // suspense curve — 0 far away, 1 right on top of the patch
      const s = clamp(1 - (d - 130) / 320, 0, 1);
      ctx.suspense = lerp(ctx.suspense, s, 1 - Math.pow(0.001, dt));
      ctx.story.setPrompt(false);
      // AUTO-trigger — no key press. The moment happens to her.
      if (!h.found && d < 185) {
        h.found = true;
        ctx.state = "cutscene";
        ctx.story.playKneelAndFall(ctx).catch((err: unknown) => console.error(err));
      }
    } else if (ctx.scene === "underground") {
      // Interact with the doorway/portal into Hearth Hollow (the hub)
      const u = ctx.underground;
      if (u) {
        const px = ctx.player.x, py = ctx.player.y;
        const portalX = u.bounds.w - 100;
        const portalY = u.groundY - 20;
        if (Math.hypot(px - portalX, py - portalY) < 90 && ctx.input.interactEdge) {
          enterHearth(ctx);
        }
      }
    } else if (ctx.scene === "hearth") {
      const hs = ctx.hearth;
      if (hs && ctx.input.interactEdge) {
        for (const d of hs.doors) {
          if (dist(ctx.player.x, ctx.player.y, d.x, d.y) < 90) {
            if (d.target === "garden") enterGarden(ctx);
            else enterPrimer(ctx);
            break;
          }
        }
      }
    } else if (ctx.scene === "garden") {
      const gs = ctx.garden;
      if (gs && ctx.input.interactEdge && dist(ctx.player.x, ctx.player.y, gs.playerStart.x, gs.playerStart.y) < 70) {
        enterHearth(ctx);
      }
    } else if (ctx.scene === "primer") {
      const ps = ctx.primer;
      if (ps && ctx.input.interactEdge && dist(ctx.player.x, ctx.player.y, ps.returnPoint.x, ps.returnPoint.y) < 70) {
        enterHearth(ctx);
      }
    }
    ctx.input.interactEdge = false;
  } else if (ctx.state === "cutscene" || ctx.state === "intro") {
    if (ctx.scene === "surface") updateNpcs(ctx);
    // player + camera driven by story
    ctx.player.poseT += dt;
  } else if (ctx.state === "falling") {
    ctx.player.poseT += dt;
  }

  // Camera follow (unless manual/cinematic)
  if (!camera.manual && (ctx.state === "explore" || ctx.state === "cutscene")) {
    camera.targetX = ctx.player.x;
    camera.targetY = ctx.player.y;
  }
  camera.x = smoothDamp(camera.x, camera.targetX, dt, camera.followHalfLife);
  camera.y = smoothDamp(camera.y, camera.targetY, dt, camera.followHalfLife);
  camera.zoom = smoothDamp(camera.zoom, camera.targetZoom, dt, 0.4);
  camera.shake *= Math.pow(0.001, dt);
  if (camera.shake < 0.02) camera.shake = 0;

  // Half-Page follows at a gentle lag, trailing behind the player's facing
  // direction — no pathing, no collision, just a quiet presence.
  if (ctx.halfPage?.active) {
    const hp = ctx.halfPage;
    hp.ph += dt;
    const targetX = ctx.player.x - ctx.player.facingLerp * 26;
    const targetY = ctx.player.y - 6 + Math.sin(hp.ph * 1.4) * 3;
    hp.x = lerp(hp.x, targetX, 1 - Math.pow(0.0008, dt));
    hp.y = lerp(hp.y, targetY, 1 - Math.pow(0.0008, dt));
  }

  // Walk bob
  const moving = Math.abs(ctx.input.x) > 0.05 || Math.abs(ctx.input.y) > 0.05;
  const targetBob = moving && ctx.state === "explore" ? Math.sin(ctx.time * 8) * 1.2 : 0;
  camera.bob = lerp(camera.bob, targetBob, 1 - Math.pow(0.001, dt));
}

// ---------- render -------------------------------------------------------
function render(ctx: Ctx) {
  const { ctx: g, w, h, camera, offscreen } = ctx;
  const sceneG = offscreen.sceneCtx;

  // Falling — full-screen dedicated pass. No world, no NPCs, no post FX.
  if (ctx.state === "falling" && ctx.fall) {
    g.setTransform(ctx.dpr, 0, 0, ctx.dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    drawFall(ctx, g, ctx.fall);
    if (ctx.story.flash > 0.001) {
      g.fillStyle = `rgba(255,255,255,${ctx.story.flash})`;
      g.fillRect(0, 0, w, h);
    }
    if (ctx.story.fade > 0.001) {
      g.fillStyle = `rgba(0,0,0,${ctx.story.fade})`;
      g.fillRect(0, 0, w, h);
    }
    return;
  }

  // clear scene buffer
  sceneG.setTransform(ctx.dpr, 0, 0, ctx.dpr, 0, 0);
  sceneG.clearRect(0, 0, w, h);

  // shake offsets
  const sx = camera.shake ? (Math.random() - 0.5) * camera.shake * 8 : 0;
  const sy = camera.shake ? (Math.random() - 0.5) * camera.shake * 8 : 0;

  // === sky layer (screen space, with subtle parallax) ===
  if (ctx.scene === "surface") {
    drawWorld(ctx, sceneG, "sky");
    drawSkyFx(ctx, sceneG);
  } else if (ctx.scene === "underground") {
    drawUnderground(ctx, sceneG, "sky");
  } else if (ctx.scene === "garden") {
    drawGarden(ctx, sceneG, "sky");
  } else if (ctx.scene === "hearth") {
    drawHearth(ctx, sceneG, "sky");
  } else {
    drawPrimer(ctx, sceneG, "sky");
  }

  // === world layer (camera space) ===
  sceneG.save();
  sceneG.translate(w / 2 + sx, h / 2 + sy + camera.bob);
  sceneG.scale(camera.zoom, camera.zoom);
  sceneG.translate(-camera.x, -camera.y);

  if (ctx.scene === "surface") {
    drawWorld(ctx, sceneG, "ground");
    drawGroundFx(ctx, sceneG);
    drawWorld(ctx, sceneG, "midground");
    drawWorld(ctx, sceneG, "foreground");
    drawEntities(ctx, sceneG);
    drawAirFx(ctx, sceneG);
  } else if (ctx.scene === "underground") {
    drawUnderground(ctx, sceneG, "ground");
    drawUnderground(ctx, sceneG, "midground");
    drawEntities(ctx, sceneG);
    drawUnderground(ctx, sceneG, "foreground");
  } else if (ctx.scene === "garden") {
    drawGarden(ctx, sceneG, "ground");
    drawGarden(ctx, sceneG, "midground");
    drawEntities(ctx, sceneG);
    drawGarden(ctx, sceneG, "foreground");
  } else if (ctx.scene === "hearth") {
    drawHearth(ctx, sceneG, "ground");
    drawHearth(ctx, sceneG, "midground");
    drawEntities(ctx, sceneG);
  } else {
    drawPrimer(ctx, sceneG, "ground");
    drawPrimer(ctx, sceneG, "midground");
    drawEntities(ctx, sceneG);
  }

  sceneG.restore();

  // === lighting overlay (screen space) ===
  if (ctx.scene === "surface") drawLightingOverlay(ctx, sceneG);
  else if (ctx.scene === "underground") drawUndergroundOverlay(ctx, sceneG);
  else if (ctx.scene === "garden") drawGardenOverlay(ctx, sceneG);
  else if (ctx.scene === "hearth") drawHearthOverlay(ctx, sceneG);
  else drawPrimerOverlay(ctx, sceneG);

  // === post FX to main canvas ===
  g.clearRect(0, 0, w, h);
  g.drawImage(offscreen.scene, 0, 0, w, h);
  drawPostFX(ctx, g);

  // white flash (impact)
  if (ctx.story.flash > 0.001) {
    g.fillStyle = `rgba(255,255,255,${ctx.story.flash})`;
    g.fillRect(0, 0, w, h);
  }

  // story fade
  const fade = ctx.story.fade;
  if (fade > 0.001) {
    g.fillStyle = `rgba(0,0,0,${fade})`;
    g.fillRect(0, 0, w, h);
  }
}
