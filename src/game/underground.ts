/**
 * Phase 2 — Underground.
 *
 * A quiet subterranean chamber the player falls into after the hatch gives way.
 * Slow, luminous, tactile. Roots overhead, glowing mushrooms and crystals,
 * a single warm shaft of daylight lancing down from the hatch far above.
 *
 * A small firefly-being named CoCo drifts nearby — the player's first
 * companion. She keeps a respectful distance and hovers where the player
 * looks, softly lighting the moss and stone.
 *
 * Rendered as a whole separate scene: engine branches on ctx.scene.
 */

import type { Ctx } from "./engine";
import { rand, lerp, smoothNoise } from "./engine";

export const UG_W = 2600;
export const UG_H = 1800;

const UPAL = {
  void: "#07050c",
  rock_deep: "#120e1c",
  rock_mid: "#1c1830",
  rock_hi: "#2d2748",
  moss: "#1f3a2a",
  moss_hi: "#4a7a5c",
  crystal_a: "#6ab6ff",
  crystal_b: "#b48cff",
  mushroom: "#ffb45c",
  mushroom_soft: "#ffd98a",
  root: "#3a2010",
  root_hi: "#7a4a2a",
  shaft: "#ffe7a8",
  coco_core: "#fff2c8",
  coco_glow: "#ffb45c",
  clock_dark: "#1a1424",
  clock_face: "#c9b25a",
};

interface Rock { x: number; y: number; r: number; seed: number; }
interface Root { x: number; sway: number; len: number; thick: number; seed: number; }
interface Crystal { x: number; y: number; s: number; hue: string; ph: number; }
interface Mushroom { x: number; y: number; s: number; ph: number; }
interface MossPatch { x: number; y: number; r: number; }
interface Pebble { x: number; y: number; r: number; c: string; }

export interface CoCo {
  x: number; y: number;
  vx: number; vy: number;
  ph: number;
  metPlayer: boolean;
}

// Sprocket — Fen Sollene's first successful creation, slowly decaying.
// Reuses the same character rig as NPCs/player (drawCharacter) but with a
// distinct outfit palette and a per-frame decay flicker (alpha jitter +
// pixel glitch offset). Idle: gentle body bob. Walk: paces between two
// waypoints. Talk: emote bubble. Decay idle: flicker/glitch overlay.
export interface Sprocket {
  x: number; y: number;
  from: number; to: number;
  t: number;
  facing: number;
  walk: number;
  paused: boolean;
  pauseT: number;
  talk: boolean;
  talkT: number;
  decayPh: number;
}

export interface UndergroundState {
  shaftX: number;         // where the daylight lands (also where player wakes)
  shaftY: number;
  groundY: number;        // top of playable ground
  bgRocks: Rock[];
  fgRocks: Rock[];
  roots: Root[];
  crystals: Crystal[];
  mushrooms: Mushroom[];
  moss: MossPatch[];
  pebbles: Pebble[];
  clock: { x: number; y: number };
  coco: CoCo;
  sprocket: Sprocket;
  bounds: { w: number; h: number };
  playerStart: { x: number; y: number };
  // parallax dust motes drifting through the shaft
  motes: { x: number; y: number; s: number; ph: number }[];
}

export function buildUnderground(): UndergroundState {
  const groundY = UG_H - 320;
  const shaftX = UG_W / 2;
  const shaftY = 40; // ceiling

  const bgRocks: Rock[] = [];
  for (let i = 0; i < 10; i++) {
    bgRocks.push({ x: rand(60, UG_W - 60), y: rand(groundY - 40, UG_H - 40), r: rand(50, 140), seed: Math.random() * 1000 });
  }
  const fgRocks: Rock[] = [];
  for (let i = 0; i < 6; i++) {
    fgRocks.push({ x: rand(-40, UG_W + 40), y: rand(groundY + 20, UG_H - 20), r: rand(30, 70), seed: Math.random() * 1000 });
  }

  const roots: Root[] = [];
  for (let i = 0; i < 12; i++) {
    roots.push({
      x: rand(40, UG_W - 40),
      sway: rand(0, 7),
      len: rand(180, 460),
      thick: rand(3, 8),
      seed: Math.random() * 1000,
    });
  }

  const crystals: Crystal[] = [];
  for (let i = 0; i < 8; i++) {
    crystals.push({
      x: rand(80, UG_W - 80),
      y: rand(groundY - 20, groundY + 60),
      s: rand(12, 26),
      hue: Math.random() < 0.6 ? UPAL.crystal_a : UPAL.crystal_b,
      ph: rand(0, 7),
    });
  }

  const mushrooms: Mushroom[] = [];
  for (let i = 0; i < 10; i++) {
    mushrooms.push({
      x: rand(80, UG_W - 80),
      y: groundY + rand(-6, 40),
      s: rand(8, 18),
      ph: rand(0, 7),
    });
  }

  const moss: MossPatch[] = [];
  for (let i = 0; i < 12; i++) {
    moss.push({ x: rand(0, UG_W), y: groundY + rand(-10, 30), r: rand(30, 90) });
  }

  const pebbles: Pebble[] = [];
  for (let i = 0; i < 24; i++) {
    pebbles.push({
      x: rand(0, UG_W),
      y: groundY + rand(0, 260),
      r: rand(1.4, 3.4),
      c: Math.random() < 0.5 ? UPAL.rock_hi : UPAL.rock_mid,
    });
  }

  const motes: { x: number; y: number; s: number; ph: number }[] = [];
  for (let i = 0; i < 14; i++) {
    motes.push({ x: shaftX + rand(-90, 90), y: rand(60, groundY), s: rand(0.8, 1.8), ph: rand(0, 7) });
  }

  const coco: CoCo = {
    x: shaftX + 140,
    y: groundY - 70,
    vx: 0, vy: 0, ph: 0,
    metPlayer: false,
  };

  // Sprocket paces between two points near the shaft — close enough to be
  // noticed on arrival, but not blocking the portal.
  const sprocket: Sprocket = {
    x: shaftX - 220,
    y: groundY - 20,
    from: shaftX - 280,
    to: shaftX - 140,
    t: 0,
    facing: 1,
    walk: 0,
    paused: true,
    pauseT: 1.5,
    talk: false,
    talkT: 0,
    decayPh: 0,
  };

  return {
    shaftX, shaftY, groundY,
    bgRocks, fgRocks, roots, crystals, mushrooms, moss, pebbles,
    clock: { x: shaftX + 480, y: groundY - 40 },
    coco,
    sprocket,
    bounds: { w: UG_W, h: UG_H },
    playerStart: { x: shaftX, y: groundY - 20 },
    motes,
  };
}

// --- update --------------------------------------------------------------
export function updateUnderground(ctx: Ctx) {
  const u = ctx.underground; if (!u) return;
  const dt = ctx.dt, t = ctx.time;

  // CoCo — drifts toward a point offset from the player, with float bob
  const p = ctx.player;
  const targetX = p.x + p.facingLerp * 90;
  const targetY = p.y - 90 + Math.sin(t * 1.3) * 6;
  u.coco.x = lerp(u.coco.x, targetX, 1 - Math.pow(0.001, dt * 0.7));
  u.coco.y = lerp(u.coco.y, targetY, 1 - Math.pow(0.001, dt * 0.7));
  u.coco.ph += dt;

  for (const m of u.motes) {
    m.y -= dt * 8;
    if (m.y < 40) { m.y = u.groundY - 20; m.x = u.shaftX + rand(-90, 90); }
  }

  // Sprocket update — pace + talk when player is close.
  const s = u.sprocket;
  s.decayPh += dt;
  if (s.paused) {
    s.pauseT -= dt;
    if (s.pauseT <= 0) {
      s.paused = false;
      s.t = 0;
      // swap direction
      const tmp = s.from; s.from = s.to; s.to = tmp;
      s.facing = s.to > s.from ? 1 : -1;
    }
  } else {
    s.t += dt * 0.35;
    if (s.t >= 1) {
      s.t = 1;
      s.paused = true;
      s.pauseT = rand(1.5, 3);
    }
    s.x = lerp(s.from, s.to, s.t);
    s.walk += dt * 5;
  }
  // Talk when player nearby
  const dp = Math.hypot(p.x - s.x, p.y - s.y);
  if (dp < 120) {
    s.talk = true; s.talkT = 1.2;
    s.facing = p.x > s.x ? 1 : -1;
  } else if (s.talkT > 0) {
    s.talkT -= dt;
    if (s.talkT <= 0) s.talk = false;
  }
}

// --- draw ----------------------------------------------------------------
export function drawUnderground(ctx: Ctx, g: CanvasRenderingContext2D, layer: "sky" | "ground" | "midground" | "foreground") {
  const u = ctx.underground; if (!u) return;
  const t = ctx.time;

  if (layer === "sky") {
    // Screen-space cave vignette — dark void that darkens toward edges.
    const { w, h } = ctx;
    g.fillStyle = UPAL.void;
    g.fillRect(0, 0, w, h);
    return;
  }

  if (layer === "ground") {
    // Ceiling + walls (world-space).
    // Ceiling stalactite silhouette
    g.fillStyle = UPAL.rock_deep;
    g.fillRect(0, 0, UG_W, 120);
    g.fillStyle = UPAL.rock_mid;
    g.beginPath();
    g.moveTo(0, 0);
    for (let x = 0; x <= UG_W; x += 40) {
      const yy = 80 + smoothNoise(x * 0.01, 0) * 60;
      g.lineTo(x, yy);
    }
    g.lineTo(UG_W, 0);
    g.closePath();
    g.fill();

    // Background silhouette rocks
    for (const r of u.bgRocks) {
      g.fillStyle = UPAL.rock_mid;
      g.beginPath();
      g.ellipse(r.x, r.y, r.r, r.r * 0.7, 0, 0, Math.PI * 2);
      g.fill();
    }

    // Warm shaft of daylight from ceiling — the only sun in the world
    const shaftGrad = g.createLinearGradient(u.shaftX, u.shaftY, u.shaftX, u.groundY + 60);
    shaftGrad.addColorStop(0, "rgba(255,230,170,0.35)");
    shaftGrad.addColorStop(0.6, "rgba(255,220,160,0.14)");
    shaftGrad.addColorStop(1, "rgba(255,210,140,0)");
    g.fillStyle = shaftGrad;
    g.beginPath();
    g.moveTo(u.shaftX - 60, u.shaftY);
    g.lineTo(u.shaftX + 60, u.shaftY);
    g.lineTo(u.shaftX + 140, u.groundY + 60);
    g.lineTo(u.shaftX - 140, u.groundY + 60);
    g.closePath();
    g.fill();

    // Warm disc where the shaft touches the ground
    g.fillStyle = "rgba(255,220,150,0.18)";
    g.beginPath();
    g.ellipse(u.shaftX, u.groundY + 6, 180, 42, 0, 0, Math.PI * 2);
    g.fill();

    // Ground band
    g.fillStyle = UPAL.rock_deep;
    g.fillRect(0, u.groundY, UG_W, UG_H - u.groundY);
    // ground top ridge
    g.fillStyle = UPAL.rock_mid;
    g.beginPath();
    g.moveTo(0, u.groundY);
    for (let x = 0; x <= UG_W; x += 32) {
      const yy = u.groundY + smoothNoise(x * 0.02, 3) * 14 - 4;
      g.lineTo(x, yy);
    }
    g.lineTo(UG_W, u.groundY + 60);
    g.lineTo(0, u.groundY + 60);
    g.closePath();
    g.fill();

    // moss patches
    for (const m of u.moss) {
      g.fillStyle = UPAL.moss;
      g.beginPath(); g.ellipse(m.x, m.y, m.r, m.r * 0.35, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = UPAL.moss_hi;
      g.globalAlpha = 0.5;
      g.beginPath(); g.ellipse(m.x, m.y - 2, m.r * 0.7, m.r * 0.22, 0, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1;
    }

    // pebbles
    for (const pe of u.pebbles) {
      g.fillStyle = pe.c;
      g.beginPath(); g.arc(pe.x, pe.y, pe.r, 0, Math.PI * 2); g.fill();
    }
    return;
  }

  if (layer === "midground") {
    // hanging roots
    for (const r of u.roots) {
      const sway = Math.sin(t * 0.6 + r.sway) * 6;
      g.strokeStyle = UPAL.root;
      g.lineWidth = r.thick;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(r.x, 0);
      g.quadraticCurveTo(r.x + sway, r.len * 0.5, r.x + sway * 0.6, r.len);
      g.stroke();
      // highlight
      g.strokeStyle = UPAL.root_hi;
      g.lineWidth = Math.max(1, r.thick - 3);
      g.beginPath();
      g.moveTo(r.x - 1, 0);
      g.quadraticCurveTo(r.x + sway - 1, r.len * 0.5, r.x + sway * 0.6 - 1, r.len);
      g.stroke();
    }

    // The broken clock — a landmark
    drawBrokenClock(g, u.clock.x, u.clock.y, t);

    // crystals (behind mushrooms)
    for (const c of u.crystals) {
      const glow = 0.5 + Math.sin(t * 1.2 + c.ph) * 0.3;
      g.fillStyle = hexA(c.hue, 0.18 * glow);
      g.fillRect(c.x - c.s * 2, c.y - c.s * 2, c.s * 4, c.s * 4);
      // crystal shard
      g.save();
      g.translate(c.x, c.y);
      g.fillStyle = c.hue;
      g.beginPath();
      g.moveTo(0, -c.s);
      g.lineTo(c.s * 0.5, c.s * 0.3);
      g.lineTo(0, c.s);
      g.lineTo(-c.s * 0.5, c.s * 0.3);
      g.closePath();
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.4)";
      g.beginPath();
      g.moveTo(-c.s * 0.2, -c.s * 0.6);
      g.lineTo(0, c.s * 0.2);
      g.lineTo(-c.s * 0.35, c.s * 0.1);
      g.closePath();
      g.fill();
      g.restore();
    }

    // mushrooms
    for (const m of u.mushrooms) {
      const glow = 0.6 + Math.sin(t * 1.5 + m.ph) * 0.35;
      g.fillStyle = `rgba(255,180,92,${0.16 * glow})`;
      g.fillRect(m.x - m.s * 2, m.y - m.s * 2.5, m.s * 4, m.s * 4);
      // stem
      g.fillStyle = UPAL.mushroom_soft;
      g.fillRect(m.x - m.s * 0.18, m.y - m.s * 0.6, m.s * 0.36, m.s * 0.7);
      // cap
      g.fillStyle = UPAL.mushroom;
      g.beginPath();
      g.ellipse(m.x, m.y - m.s * 0.7, m.s * 0.7, m.s * 0.42, 0, Math.PI, Math.PI * 2);
      g.fill();
      // highlight
      g.fillStyle = "rgba(255,240,200,0.6)";
      g.beginPath();
      g.ellipse(m.x - m.s * 0.2, m.y - m.s * 0.85, m.s * 0.25, m.s * 0.12, 0, 0, Math.PI * 2);
      g.fill();
    }

    // dust motes falling through shaft
    for (const mo of u.motes) {
      const a = 0.4 + Math.sin(t * 2 + mo.ph) * 0.3;
      g.fillStyle = `rgba(255,235,180,${a})`;
      g.fillRect(mo.x, mo.y, Math.max(1, mo.s), Math.max(1, mo.s));
    }
    return;
  }

  if (layer === "foreground") {
    // Foreground silhouette rocks in front of player
    for (const r of u.fgRocks) {
      g.fillStyle = UPAL.rock_deep;
      g.beginPath();
      g.ellipse(r.x, r.y, r.r, r.r * 0.55, 0, 0, Math.PI * 2);
      g.fill();
    }

    // CoCo — a small firefly companion with warm halo
    drawCoCo(g, u.coco.x, u.coco.y, t);

    // Sprocket — Fen Sollene's decaying creation, pacing near the shaft
    drawSprocket(g, u.sprocket, t);

    // Portal doorway on the right — leads to the Garden of Forgotten Numbers
    drawPortal(g, u.bounds.w - 100, u.groundY - 20, t);
  }
}

// Sprocket's little rig — small, boxy, held together by visible seams.
// He decays: every few seconds a patch of him glitches (offset RGB-split
// rectangles + a flicker in alpha) as if his form is losing cohesion.
const SPROCKET_LINES = [
  "...still here...",
  "pieces keep... slipping...",
  "do you remember me?",
  "Fen said I'd last longer...",
  "the light helps. a little.",
];
let _sprocketLineIdx = 0;
let _sprocketLine = SPROCKET_LINES[0];
let _sprocketLastTalk = false;

function drawSprocket(g: CanvasRenderingContext2D, s: Sprocket, t: number) {
  const fx = s.facing >= 0 ? 1 : -1;
  const bobY = s.paused ? Math.sin(t * 2.2) * 1.4 : Math.abs(Math.sin(s.walk)) * 1.6;
  const legSwing = s.paused ? 0 : Math.sin(s.walk) * 3;

  // decay glitch — occasional glitch burst, otherwise mostly stable
  const glitchWave = Math.sin(s.decayPh * 0.7) * 0.5 + 0.5;
  const glitching = glitchWave > 0.86;
  const flicker = glitching ? 0.55 + Math.sin(s.decayPh * 40) * 0.25 : 1;
  const jitterX = glitching ? (Math.sin(s.decayPh * 53) * 2.2) : 0;

  g.save();
  g.globalAlpha = flicker;

  // shadow
  g.fillStyle = "rgba(0,0,0,0.4)";
  g.beginPath(); g.ellipse(s.x + 2, s.y + 13, 12, 4.5, 0, 0, Math.PI * 2); g.fill();

  g.translate(s.x + jitterX, s.y - bobY);
  g.scale(1.3 * fx, 1.3);

  // legs — thin, mechanical-looking
  g.fillStyle = "#3a3448";
  g.fillRect(-4, 6, 3, 10 - legSwing);
  g.fillRect(1, 6, 3, 10 + legSwing);
  g.fillStyle = "#1a1622";
  g.fillRect(-5, 15 - legSwing, 4, 2.5);
  g.fillRect(1, 15 + legSwing, 4, 2.5);

  // body — patchwork box, visible stitched seams
  g.fillStyle = "#565070";
  g.fillRect(-7, -8, 14, 14);
  g.fillStyle = "rgba(0,0,0,0.25)";
  g.fillRect(-7, -8, 7, 14);
  g.strokeStyle = "#2a2438";
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(-7, -2); g.lineTo(7, -2);
  g.moveTo(-2, -8); g.lineTo(-2, 6);
  g.stroke();
  // a small glowing core (like a heart/battery) visible through a seam gap
  const coreGlow = 0.5 + Math.sin(t * 2.4) * 0.3;
  g.fillStyle = `rgba(255,180,120,${coreGlow})`;
  g.beginPath(); g.arc(2, -1, 2.2, 0, Math.PI * 2); g.fill();

  // decay patches — small missing/glitched rectangles that drift over time
  if (glitching) {
    g.fillStyle = "rgba(120,220,255,0.55)";
    g.fillRect(-6 + Math.sin(s.decayPh * 11) * 3, -6, 4, 3);
    g.fillStyle = "rgba(255,90,140,0.45)";
    g.fillRect(2, 2 + Math.cos(s.decayPh * 9) * 2, 4, 3);
  }

  // head — small, round, single glowing eye-slit
  const hy = -14;
  g.fillStyle = "#4a4460";
  g.beginPath(); g.arc(0, hy, 6, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(0,0,0,0.2)";
  g.beginPath(); g.arc(-2, hy, 4, Math.PI * 0.4, Math.PI * 1.6); g.fill();
  // eye-slit — glowing, blinks slowly
  const blink = Math.sin(t * 0.9) > 0.96 ? 0.15 : 1;
  g.fillStyle = `rgba(180,235,255,${0.9 * blink})`;
  g.fillRect(-3, hy - 1, 6, 1.6 * blink + 0.2);
  // small antenna
  g.strokeStyle = "#2a2438"; g.lineWidth = 1;
  g.beginPath(); g.moveTo(0, hy - 6); g.lineTo(0, hy - 10); g.stroke();
  g.fillStyle = `rgba(255,200,140,${coreGlow})`;
  g.beginPath(); g.arc(0, hy - 10, 1.4, 0, Math.PI * 2); g.fill();

  g.restore();

  // talk bubble
  if (s.talk) {
    if (!_sprocketLastTalk) {
      _sprocketLine = SPROCKET_LINES[_sprocketLineIdx % SPROCKET_LINES.length];
      _sprocketLineIdx++;
    }
    _sprocketLastTalk = true;
    g.save();
    const bw = Math.max(56, _sprocketLine.length * 4.6);
    const bx = s.x, by = s.y - 46 - bobY;
    g.fillStyle = "rgba(20,14,30,0.82)";
    g.strokeStyle = "rgba(150,220,255,0.6)";
    g.lineWidth = 1;
    g.beginPath();
    const rx = bw / 2, ry = 9;
    g.ellipse(bx, by, rx, ry, 0, 0, Math.PI * 2);
    g.fill(); g.stroke();
    g.fillStyle = "#cdeeff";
    g.font = "8px 'Iowan Old Style', Palatino, Georgia, serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(_sprocketLine, bx, by + 1);
    g.restore();
  } else {
    _sprocketLastTalk = false;
  }
}

function drawPortal(g: CanvasRenderingContext2D, x: number, y: number, t: number) {
  // Carved stone arch with a warm memory-glow inside
  const pulse = 0.65 + Math.sin(t * 1.5) * 0.2;
  g.save();
  // stone frame
  g.fillStyle = "#4a4635";
  g.beginPath();
  g.moveTo(x - 50, y + 10);
  g.lineTo(x - 50, y - 90);
  g.quadraticCurveTo(x, y - 140, x + 50, y - 90);
  g.lineTo(x + 50, y + 10);
  g.closePath(); g.fill();
  g.fillStyle = "#6b6252";
  g.beginPath();
  g.moveTo(x - 42, y + 8);
  g.lineTo(x - 42, y - 88);
  g.quadraticCurveTo(x, y - 132, x + 42, y - 88);
  g.lineTo(x + 42, y + 8);
  g.closePath(); g.fill();
  // inner glow
  const grad = g.createRadialGradient(x, y - 40, 4, x, y - 40, 60);
  grad.addColorStop(0, `rgba(255,220,150,${0.8 * pulse})`);
  grad.addColorStop(1, "rgba(255,180,90,0)");
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(x - 36, y + 4);
  g.lineTo(x - 36, y - 84);
  g.quadraticCurveTo(x, y - 124, x + 36, y - 84);
  g.lineTo(x + 36, y + 4);
  g.closePath(); g.fill();
  // dark void inner
  g.fillStyle = `rgba(20,10,30,${0.5 - pulse * 0.3})`;
  g.beginPath();
  g.moveTo(x - 30, y);
  g.lineTo(x - 30, y - 80);
  g.quadraticCurveTo(x, y - 118, x + 30, y - 80);
  g.lineTo(x + 30, y);
  g.closePath(); g.fill();
  // floating gold particles
  g.fillStyle = "rgba(255,235,170,0.9)";
  for (let i = 0; i < 5; i++) {
    const ph = (t * 0.4 + i * 0.19) % 1;
    const py = y - ph * 80;
    const px = x + Math.sin(t + i) * 12;
    g.globalAlpha = (1 - ph) * 0.9;
    g.fillRect(px, py, 2, 2);
  }
  g.globalAlpha = 1;
  // Rune above the arch
  g.fillStyle = `rgba(255,235,170,${0.6 + pulse * 0.3})`;
  g.font = "bold 18px 'Iowan Old Style', Palatino, Georgia, serif";
  g.textAlign = "center";
  g.fillText("✿", x, y - 100);
  g.restore();
}

function drawBrokenClock(g: CanvasRenderingContext2D, x: number, y: number, t: number) {
  g.save();
  g.translate(x, y);
  // shadow / recess
  g.fillStyle = "rgba(0,0,0,0.55)";
  g.beginPath(); g.ellipse(0, 60, 70, 12, 0, 0, Math.PI * 2); g.fill();
  // clock body — leaning, half-buried
  g.rotate(-0.22);
  g.fillStyle = UPAL.clock_dark;
  g.beginPath(); g.arc(0, 0, 58, 0, Math.PI * 2); g.fill();
  g.fillStyle = UPAL.clock_face;
  g.beginPath(); g.arc(0, 0, 50, 0, Math.PI * 2); g.fill();
  g.strokeStyle = UPAL.clock_dark;
  g.lineWidth = 3;
  g.beginPath(); g.arc(0, 0, 50, 0, Math.PI * 2); g.stroke();
  // hour markers
  g.strokeStyle = UPAL.clock_dark;
  g.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.beginPath();
    g.moveTo(Math.cos(a) * 42, Math.sin(a) * 42);
    g.lineTo(Math.cos(a) * 48, Math.sin(a) * 48);
    g.stroke();
  }
  // cracked glass — jagged fissure
  g.strokeStyle = "rgba(20,10,30,0.9)";
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(-40, -20); g.lineTo(-10, -6); g.lineTo(6, -22); g.lineTo(30, 4); g.lineTo(12, 24); g.lineTo(-18, 18); g.lineTo(-30, 32);
  g.stroke();
  // hands — frozen at ~3:47, subtly ticking
  const twitch = Math.sin(t * 6) * 0.02;
  g.strokeStyle = UPAL.clock_dark;
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(-Math.PI / 2 + 1.9 + twitch) * 28, Math.sin(-Math.PI / 2 + 1.9 + twitch) * 28); g.stroke();
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(-Math.PI / 2 + 2.9) * 42, Math.sin(-Math.PI / 2 + 2.9) * 42); g.stroke();
  g.fillStyle = UPAL.clock_dark;
  g.beginPath(); g.arc(0, 0, 3, 0, Math.PI * 2); g.fill();
  g.restore();
}

// CoCo — Novice stage, per the Character Design Bible: small, rounded,
// unadorned silhouette; twin-tails read as two small triangles; no cape
// volume; palette is pale dusty pink / cream / soft white with NO gold
// yet (gold is earned at later Titles, starting at Explorer). Hair is
// always golden blonde regardless of stage — that never changes.
// She still carries a soft ambient glow (companion-in-the-dark reads
// better lit), but it's a cool, ungilded white-cream, not gold, to
// respect "no gold yet."
const COCO_HAIR = "#f0d27a";
const COCO_BLOUSE = "#fbeee0";
const COCO_ACCENT = "#f0a8bb"; // dusty pink

function drawCoCo(g: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const pulse = 0.7 + Math.sin(t * 3) * 0.25;
  const bob = Math.sin(t * 1.6) * 2;

  // soft ambient glow — white/cream, not gold (Novice hasn't earned gold yet)
  g.fillStyle = `rgba(255,248,235,${0.14 * pulse})`;
  g.beginPath(); g.arc(x, y - bob, 22, 0, Math.PI * 2); g.fill();

  g.save();
  g.translate(x, y - bob);
  g.scale(0.62, 0.62); // small, chibi-proportioned — Novice is the smallest stage

  // shadow
  g.fillStyle = "rgba(0,0,0,0.25)";
  g.beginPath(); g.ellipse(0, 20, 10, 3, 0, 0, Math.PI * 2); g.fill();

  // legs — small, simple, unadorned (silhouette rule: no ornamentation yet)
  g.fillStyle = COCO_ACCENT;
  g.fillRect(-3.5, 8, 3, 10);
  g.fillRect(0.5, 8, 3, 10);
  g.fillStyle = "#3a2a30";
  g.fillRect(-4, 17, 4, 2.4); g.fillRect(0, 17, 4, 2.4);

  // simple blouse/dress — small A-line, no cape, no gold trim
  g.fillStyle = COCO_BLOUSE;
  g.beginPath();
  g.moveTo(-6, 9); g.quadraticCurveTo(-7, -2, -4.5, -7);
  g.quadraticCurveTo(0, -8.5, 4.5, -7);
  g.quadraticCurveTo(7, -2, 6, 9);
  g.quadraticCurveTo(0, 11, -6, 9);
  g.closePath(); g.fill();
  // a single small dusty-pink collar accent — the only trim she has
  g.fillStyle = COCO_ACCENT;
  g.beginPath(); g.ellipse(0, -6.5, 3, 1.3, 0, 0, Math.PI * 2); g.fill();

  // arms
  g.strokeStyle = COCO_BLOUSE; g.lineWidth = 3; g.lineCap = "round";
  const armSwing = Math.sin(t * 2) * 2;
  g.beginPath(); g.moveTo(-5.5, -4); g.lineTo(-8, 3 + armSwing); g.stroke();
  g.beginPath(); g.moveTo(5.5, -4); g.lineTo(8, 3 - armSwing); g.stroke();

  // head
  const hy = -13;
  const hgrad = g.createRadialGradient(-2, hy - 2, 1, 0, hy, 7);
  hgrad.addColorStop(0, "#ffe6cf");
  hgrad.addColorStop(1, "#f0c9a8");
  g.fillStyle = hgrad;
  g.beginPath(); g.ellipse(0, hy, 6.6, 7, 0, 0, Math.PI * 2); g.fill();

  // twin-tails — two small triangles, per the silhouette-beat spec exactly
  g.fillStyle = COCO_HAIR;
  g.beginPath(); g.moveTo(-6.5, hy - 2); g.lineTo(-12, hy + 2); g.lineTo(-6, hy + 5); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(6.5, hy - 2); g.lineTo(12, hy + 2); g.lineTo(6, hy + 5); g.closePath(); g.fill();
  // hair cap + fringe
  g.beginPath();
  g.moveTo(-6.8, hy);
  g.quadraticCurveTo(-7.6, hy - 7.5, 0, hy - 8.2);
  g.quadraticCurveTo(7.6, hy - 7.5, 6.8, hy);
  g.quadraticCurveTo(0, hy - 4, -6.8, hy);
  g.closePath(); g.fill();
  g.strokeStyle = "rgba(255,255,255,0.3)"; g.lineWidth = 0.8;
  g.beginPath(); g.moveTo(-2.5, hy - 6.6); g.quadraticCurveTo(0, hy - 7.2, 2.5, hy - 6.6); g.stroke();

  // face — large simple eyes (bible: brows do the emotional work, mouth stays simple)
  const blink = Math.sin(t * 1.1) > 0.96 ? 0.15 : 1;
  g.fillStyle = "#3a2440";
  g.beginPath(); g.ellipse(-2.4, hy + 0.5, 1.3, 1.5 * blink, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(2.4, hy + 0.5, 1.3, 1.5 * blink, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(255,255,255,0.9)";
  g.beginPath(); g.arc(-2.7, hy, 0.4, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(2.1, hy, 0.4, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(90,50,55,0.6)"; g.lineWidth = 0.8;
  g.beginPath(); g.moveTo(-1, hy + 3.4); g.quadraticCurveTo(0, hy + 3.9, 1, hy + 3.4); g.stroke();
  g.fillStyle = "rgba(255,150,150,0.3)";
  g.beginPath(); g.ellipse(-4, hy + 2, 1.2, 0.8, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(4, hy + 2, 1.2, 0.8, 0, 0, Math.PI * 2); g.fill();

  g.restore();

  // a few drifting motes around her — reads as "still a little magic"
  // without granting her any gold yet
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.5 + i * 0.33) % 1;
    const a = i * 2.1 + t * 0.4;
    const mx = x + Math.cos(a) * (14 + ph * 6);
    const my = y - bob + Math.sin(a) * (10 + ph * 4) - ph * 6;
    g.fillStyle = `rgba(255,250,240,${(1 - ph) * 0.6})`;
    g.beginPath(); g.arc(mx, my, 1, 0, Math.PI * 2); g.fill();
  }
}

function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// --- lighting overlay for underground -----------------------------------
export function drawUndergroundOverlay(ctx: Ctx, g: CanvasRenderingContext2D) {
  const { w, h } = ctx;
  // Heavy blue-black vignette — cave should feel enclosing.
  const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.15, w / 2, h / 2, Math.max(w, h) * 0.7);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(6,4,14,0.85)");
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
  // Prompt near portal
  const u = ctx.underground;
  if (u) {
    const px = ctx.player.x, py = ctx.player.y;
    const portalX = u.bounds.w - 100, portalY = u.groundY - 20;
    if (Math.hypot(px - portalX, py - portalY) < 120 && ctx.state === "explore") {
      g.save();
      g.fillStyle = "rgba(10,6,18,0.72)";
      g.strokeStyle = "rgba(255,217,138,0.7)";
      g.lineWidth = 1;
      const tw = 68;
      g.fillRect(w / 2 - tw / 2, h - 60, tw, 20);
      g.strokeRect(w / 2 - tw / 2, h - 60, tw, 20);
      g.fillStyle = "#ffd98a";
      g.font = "9px 'Iowan Old Style', Palatino, Georgia, serif";
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText("E · Enter", w / 2, h - 50);
      g.restore();
    }
  }
}
