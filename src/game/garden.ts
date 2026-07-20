/**
 * Phase 4 (start) — The Garden of Forgotten Numbers.
 *
 * The first learning puzzle. A soft hand-painted meadow underground:
 * ten glowing flowers scattered along a stone path, ending at an
 * ancient stone gate carved with ten empty circles. Placing all ten
 * flowers into the circles teaches counting 1..10 through play — no
 * counter, no prompt, just the pleasure of picking and placing.
 *
 * Interaction: walk near a flower and press E to pick it up. It
 * floats behind you. Walk to the gate and press E to drop it into
 * the next empty slot. Release a flower elsewhere and it drifts
 * gently home.
 */

import type { Ctx } from "./engine";
import { rand, lerp, clamp, dist } from "./engine";

export const G_W = 2400;
export const G_H = 1400;

const GPAL = {
  sky_a: "#7dc6ff",
  sky_b: "#c9e8ff",
  sky_c: "#f6e3b4",
  grass_a: "#4a8a4a",
  grass_b: "#6db26d",
  grass_c: "#9dd688",
  dirt: "#8b6b3a",
  path_light: "#d8ccae",
  path_dark: "#a49476",
  stone_light: "#c9c1a9",
  stone_mid: "#8b8570",
  stone_dark: "#4a4635",
  moss: "#4a7a5c",
  gold: "#ffd98a",
  gold_hot: "#ffb84a",
};

const FLOWER_COLORS = [
  "#ff6f8f", "#ffb84a", "#ffe066", "#88e07a", "#6ac8ff",
  "#8b7cff", "#c96bff", "#ff8ac0", "#ff5a5a", "#f0f0d0",
];

export interface GardenFlower {
  id: number;
  homeX: number; homeY: number;
  x: number; y: number;
  color: string;
  phase: number;
  held: boolean;
  placedSlot: number | null;
  wobble: number;      // pop animation on placement
}

export interface GateSlot {
  x: number; y: number;
  filled: boolean;
  color: string | null;
  glow: number;
}

export interface Butterfly { x: number; y: number; ph: number; c: string; }

export interface GardenState {
  bounds: { w: number; h: number };
  groundY: number;
  path: { x: number; y: number }[];
  flowers: GardenFlower[];
  slots: GateSlot[];
  gate: { x: number; y: number };
  butterflies: Butterfly[];
  particles: { x: number; y: number; vx: number; vy: number; life: number; c: string; s: number }[];
  playerStart: { x: number; y: number };
  heldFlower: GardenFlower | null;
  solved: boolean;
  solveT: number;
  bloom: number; // 0..1 completion light
  fragmentShown: boolean;
  entryLineShown: boolean;
}

export function buildGarden(): GardenState {
  const groundY = G_H - 260;
  // Winding path
  const path: { x: number; y: number }[] = [];
  for (let i = 0; i < 40; i++) {
    const t = i / 39;
    const x = lerp(180, G_W - 380, t);
    const y = groundY + 60 + Math.sin(t * 4) * 30;
    path.push({ x, y });
  }
  // Ten flowers, spread along the path both sides
  const flowers: GardenFlower[] = [];
  const positions = [
    { x: 260, y: groundY + 20 },
    { x: 400, y: groundY + 90 },
    { x: 560, y: groundY - 10 },
    { x: 720, y: groundY + 100 },
    { x: 880, y: groundY + 30 },
    { x: 1040, y: groundY - 20 },
    { x: 1200, y: groundY + 110 },
    { x: 1360, y: groundY + 40 },
    { x: 1520, y: groundY - 10 },
    { x: 1680, y: groundY + 90 },
  ];
  for (let i = 0; i < 10; i++) {
    flowers.push({
      id: i,
      homeX: positions[i].x,
      homeY: positions[i].y,
      x: positions[i].x,
      y: positions[i].y,
      color: FLOWER_COLORS[i],
      phase: i * 0.7,
      held: false,
      placedSlot: null,
      wobble: 0,
    });
  }
  // Gate on the right — 10 slots arranged in an arch (2 rows of 5)
  const gate = { x: G_W - 220, y: groundY - 40 };
  const slots: GateSlot[] = [];
  const arch = [
    // top arch (5)
    { dx: -110, dy: -140 }, { dx: -55, dy: -170 }, { dx: 0, dy: -180 },
    { dx: 55, dy: -170 }, { dx: 110, dy: -140 },
    // bottom row (5)
    { dx: -110, dy: -70 }, { dx: -55, dy: -80 }, { dx: 0, dy: -85 },
    { dx: 55, dy: -80 }, { dx: 110, dy: -70 },
  ];
  for (const a of arch) {
    slots.push({
      x: gate.x + a.dx, y: gate.y + a.dy,
      filled: false, color: null, glow: 0,
    });
  }
  const butterflies: Butterfly[] = [];
  for (let i = 0; i < 6; i++) {
    butterflies.push({
      x: rand(200, G_W - 400), y: rand(groundY - 200, groundY - 60),
      ph: rand(0, 7), c: FLOWER_COLORS[i % FLOWER_COLORS.length],
    });
  }
  return {
    bounds: { w: G_W, h: G_H },
    groundY, path, flowers, slots, gate, butterflies,
    particles: [],
    playerStart: { x: 200, y: groundY + 60 },
    heldFlower: null,
    solved: false,
    solveT: 0,
    bloom: 0,
    fragmentShown: false,
    entryLineShown: false,
  };
}

// ---------------- update ----------------
export function updateGarden(ctx: Ctx) {
  const gs = ctx.garden; if (!gs) return;
  const dt = ctx.dt, t = ctx.time;

  // Butterflies drift
  for (const b of gs.butterflies) {
    b.x += Math.cos(t * 0.6 + b.ph) * 30 * dt;
    b.y += Math.sin(t * 0.9 + b.ph * 1.3) * 20 * dt;
  }

  // Flowers gently sway; held flower follows player with soft trail
  for (const f of gs.flowers) {
    f.phase += dt;
    f.wobble = Math.max(0, f.wobble - dt);
    if (f.held) {
      const targetX = ctx.player.x + ctx.player.facingLerp * -12;
      const targetY = ctx.player.y - 36 + Math.sin(t * 3 + f.id) * 3;
      f.x = lerp(f.x, targetX, 1 - Math.pow(0.001, dt * 1.4));
      f.y = lerp(f.y, targetY, 1 - Math.pow(0.001, dt * 1.4));
    } else if (f.placedSlot !== null) {
      const s = gs.slots[f.placedSlot];
      f.x = lerp(f.x, s.x, 1 - Math.pow(0.001, dt * 1.2));
      f.y = lerp(f.y, s.y, 1 - Math.pow(0.001, dt * 1.2));
    } else {
      // drift home
      f.x = lerp(f.x, f.homeX, 1 - Math.pow(0.001, dt * 0.5));
      f.y = lerp(f.y, f.homeY, 1 - Math.pow(0.001, dt * 0.5));
    }
  }
  // Slots
  for (const s of gs.slots) {
    if (s.filled) s.glow = Math.min(1, s.glow + dt * 1.5);
    else s.glow = Math.max(0, s.glow - dt * 0.8);
  }

  // Particles
  gs.particles = gs.particles.filter(p => (p.life -= dt) > 0);
  for (const p of gs.particles) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += 20 * dt;
  }

  // Solve state ramps completion bloom
  if (gs.solved) {
    gs.solveT += dt;
    gs.bloom = Math.min(1, gs.bloom + dt * 0.6);
  }

  // Handle interact — pick up nearest, or drop into gate
  if (ctx.input.interactEdge && ctx.state === "explore") {
    handleInteract(ctx, gs);
  }

  // Auto entry line
  if (!gs.entryLineShown) {
    gs.entryLineShown = true;
    // Use subtitle system via story controller — soft memory-echo lines
    void gardenIntroLines(ctx);
  }

  // Completion trigger
  if (!gs.solved && gs.slots.every(s => s.filled)) {
    gs.solved = true;
    void gardenSolveSequence(ctx);
  }
}

function handleInteract(ctx: Ctx, gs: GardenState) {
  const p = ctx.player;
  if (gs.heldFlower) {
    // Try to place at gate — find first empty slot near enough
    const dgate = dist(p.x, p.y, gs.gate.x, gs.gate.y);
    if (dgate < 200) {
      const idx = gs.slots.findIndex(s => !s.filled);
      if (idx >= 0) {
        const s = gs.slots[idx];
        s.filled = true;
        s.color = gs.heldFlower.color;
        gs.heldFlower.placedSlot = idx;
        gs.heldFlower.held = false;
        gs.heldFlower.wobble = 0.6;
        // sparkle burst
        for (let i = 0; i < 14; i++) {
          gs.particles.push({
            x: s.x, y: s.y,
            vx: Math.cos(i / 14 * Math.PI * 2) * rand(40, 90),
            vy: Math.sin(i / 14 * Math.PI * 2) * rand(40, 90) - 40,
            life: rand(0.5, 1.0),
            c: gs.heldFlower.color, s: rand(1, 2.4),
          });
        }
        chime(0.15 + idx * 0.04);
        gs.heldFlower = null;
        return;
      }
    }
    // Not near gate → drop it (drift home)
    gs.heldFlower.held = false;
    gs.heldFlower = null;
    return;
  }
  // Try to pick a flower
  let best: GardenFlower | null = null;
  let bestD = 55;
  for (const f of gs.flowers) {
    if (f.placedSlot !== null) continue;
    const d = dist(p.x, p.y, f.x, f.y);
    if (d < bestD) { bestD = d; best = f; }
  }
  if (best) {
    best.held = true;
    gs.heldFlower = best;
    best.wobble = 0.3;
    chime(0.4);
  }
}

async function gardenIntroLines(ctx: Ctx) {
  const say = (ctx.story as unknown as { _say?: (t: string, d?: number, a?: boolean) => Promise<void> })._say;
  if (!say) return;
  await sleep(1500);
  await say("MemoryEcho: Someone once cared for every flower here…", 3200, true);
  await sleep(600);
  await say("The gate whispers: help me remember how many flowers belong here.", 3600, true);
}

async function gardenSolveSequence(ctx: Ctx) {
  const gs = ctx.garden; if (!gs) return;
  const say = (ctx.story as unknown as { _say?: (t: string, d?: number, a?: boolean) => Promise<void> })._say;
  try {
    ctx.camera.manual = true;
    ctx.camera.targetX = gs.gate.x - 40;
    ctx.camera.targetY = gs.gate.y - 40;
    ctx.camera.targetZoom = 1.15;
    // Rain of gold pollen
    for (let i = 0; i < 60; i++) {
      gs.particles.push({
        x: rand(gs.gate.x - 200, gs.gate.x + 60),
        y: gs.gate.y - 220,
        vx: rand(-20, 20), vy: rand(20, 60),
        life: rand(2, 4), c: "#ffd98a", s: rand(1, 2.6),
      });
    }
    if (say) {
      await sleep(1000);
      await say("MemoryEcho: The garden remembers.", 3200, true);
    }
    gs.fragmentShown = true;
    if (!ctx.fragments) ctx.fragments = [];
    if (!ctx.fragments.includes("garden")) ctx.fragments.push("garden");
    await sleep(3500);
  } finally {
    ctx.camera.manual = false;
    ctx.camera.targetZoom = 0.95;
  }
}

function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

// A gentle bell chime via WebAudio
let _audio: AudioContext | null = null;
function chime(pitch: number) {
  try {
    _audio = _audio || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const ctx = _audio;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    const base = 440;
    o.frequency.setValueAtTime(base * (1 + pitch), now);
    o.frequency.exponentialRampToValueAtTime(base * (1 + pitch) * 1.5, now + 0.6);
    g.gain.setValueAtTime(0.001, now);
    g.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    o.connect(g); g.connect(ctx.destination);
    o.start(now); o.stop(now + 1.0);
  } catch { /* ignore */ }
}

// ---------------- draw ----------------
export function drawGarden(
  ctx: Ctx, g: CanvasRenderingContext2D,
  layer: "sky" | "ground" | "midground" | "foreground",
) {
  const gs = ctx.garden; if (!gs) return;
  const t = ctx.time;

  if (layer === "sky") {
    // A warm memory-sky — soft gradient with dreamy vignette
    const { w, h } = ctx;
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, GPAL.sky_a);
    grad.addColorStop(0.55, GPAL.sky_b);
    grad.addColorStop(1, GPAL.sky_c);
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    // soft light rays
    g.globalAlpha = 0.15 + gs.bloom * 0.25;
    g.fillStyle = "#fff8d8";
    for (let i = 0; i < 6; i++) {
      const rx = (w / 6) * i + (t * 6 % (w / 6));
      g.beginPath();
      g.moveTo(rx, 0); g.lineTo(rx + 40, 0); g.lineTo(rx + 120, h); g.lineTo(rx + 80, h);
      g.closePath(); g.fill();
    }
    g.globalAlpha = 1;
    return;
  }

  if (layer === "ground") {
    // rolling meadow
    const y0 = gs.groundY;
    const gg = g.createLinearGradient(0, y0 - 60, 0, y0 + 400);
    gg.addColorStop(0, GPAL.grass_c);
    gg.addColorStop(0.4, GPAL.grass_b);
    gg.addColorStop(1, GPAL.grass_a);
    g.fillStyle = gg;
    g.fillRect(-200, y0 - 40, G_W + 400, 600);
    // painted meadow bumps
    g.fillStyle = "rgba(120,180,120,0.45)";
    for (let i = 0; i < 12; i++) {
      const x = 100 + i * 210;
      g.beginPath(); g.ellipse(x, y0 + 20 + Math.sin(i) * 8, 130, 22, 0, 0, Math.PI * 2); g.fill();
    }
    // dirt patches
    g.fillStyle = "rgba(139,107,58,0.35)";
    for (let i = 0; i < 6; i++) {
      const x = 300 + i * 320; g.beginPath();
      g.ellipse(x, y0 + 30, 70, 14, 0, 0, Math.PI * 2); g.fill();
    }
    // stone path
    for (const p of gs.path) {
      g.fillStyle = GPAL.path_dark;
      g.beginPath(); g.ellipse(p.x, p.y + 2, 14, 8, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = GPAL.path_light;
      g.beginPath(); g.ellipse(p.x, p.y, 12, 6, 0, 0, Math.PI * 2); g.fill();
    }
    return;
  }

  if (layer === "midground") {
    // Draw flowers (not held / not placed) and butterflies + gate
    // Stone gate first (background of gate area)
    drawGate(g, gs, t);
    // Flowers currently at home or placed
    for (const f of gs.flowers) {
      if (f.held) continue;
      drawFlower(g, f, t, gs.bloom);
    }
    // butterflies
    for (const b of gs.butterflies) {
      const wf = Math.sin(t * 14 + b.ph);
      g.fillStyle = b.c;
      g.beginPath();
      g.ellipse(b.x - 4, b.y, 4, 2 + Math.abs(wf) * 1.5, 0.3, 0, Math.PI * 2); g.fill();
      g.beginPath();
      g.ellipse(b.x + 4, b.y, 4, 2 + Math.abs(wf) * 1.5, -0.3, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#3a2418";
      g.fillRect(b.x - 0.5, b.y - 2, 1, 4);
    }
    // particles
    for (const p of gs.particles) {
      g.globalAlpha = clamp(p.life * 1.2, 0, 1);
      g.fillStyle = p.c;
      g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    }
    g.globalAlpha = 1;
    return;
  }

  if (layer === "foreground") {
    // held flower drawn ABOVE player
    if (gs.heldFlower) drawFlower(g, gs.heldFlower, t, gs.bloom);
    // completion light wash
    if (gs.bloom > 0) {
      g.save();
      g.globalAlpha = gs.bloom * 0.4;
      g.fillStyle = "#fff2c8";
      g.fillRect(0, 0, ctx.w * 4, ctx.h * 4);
      g.restore();
    }
  }
}

function drawFlower(g: CanvasRenderingContext2D, f: GardenFlower, t: number, bloom: number) {
  const pulse = 0.85 + Math.sin(t * 2 + f.phase) * 0.15 + f.wobble * 0.5;
  const s = 10 * pulse * (1 + bloom * 0.3);
  // glow
  const grad = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, s * 3.5);
  grad.addColorStop(0, hexA(f.color, 0.55));
  grad.addColorStop(1, hexA(f.color, 0));
  g.fillStyle = grad;
  g.fillRect(f.x - s * 3.5, f.y - s * 3.5, s * 7, s * 7);
  // stem (only if at home)
  if (f.placedSlot === null && !f.held) {
    g.strokeStyle = "rgba(50,80,40,0.85)";
    g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(f.x, f.y + 4); g.lineTo(f.x, f.y + 18); g.stroke();
    g.fillStyle = "#4a8a4a";
    g.beginPath(); g.ellipse(f.x - 3, f.y + 10, 3, 1.6, -0.4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(f.x + 3, f.y + 13, 3, 1.6, 0.4, 0, Math.PI * 2); g.fill();
  }
  // petals — 5-point rosette
  g.fillStyle = f.color;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + t * 0.3;
    const px = f.x + Math.cos(a) * s * 0.7;
    const py = f.y + Math.sin(a) * s * 0.7;
    g.beginPath(); g.arc(px, py, s * 0.55, 0, Math.PI * 2); g.fill();
  }
  // center
  g.fillStyle = "#ffe066";
  g.beginPath(); g.arc(f.x, f.y, s * 0.45, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#fff8d8";
  g.beginPath(); g.arc(f.x - s * 0.15, f.y - s * 0.15, s * 0.18, 0, Math.PI * 2); g.fill();
}

function drawGate(g: CanvasRenderingContext2D, gs: GardenState, t: number) {
  const { x, y } = gs.gate;
  // stone pillars
  const pillarH = 260;
  g.fillStyle = GPAL.stone_dark;
  g.fillRect(x - 150, y - pillarH, 24, pillarH);
  g.fillRect(x + 126, y - pillarH, 24, pillarH);
  g.fillStyle = GPAL.stone_mid;
  g.fillRect(x - 148, y - pillarH, 20, pillarH);
  g.fillRect(x + 128, y - pillarH, 20, pillarH);
  g.fillStyle = GPAL.stone_light;
  g.fillRect(x - 146, y - pillarH, 6, pillarH);
  g.fillRect(x + 130, y - pillarH, 6, pillarH);
  // arch
  g.fillStyle = GPAL.stone_mid;
  g.beginPath();
  g.moveTo(x - 150, y - pillarH);
  g.quadraticCurveTo(x, y - pillarH - 90, x + 150, y - pillarH);
  g.lineTo(x + 130, y - pillarH + 20);
  g.quadraticCurveTo(x, y - pillarH - 60, x - 130, y - pillarH + 20);
  g.closePath(); g.fill();
  g.fillStyle = GPAL.stone_light;
  g.beginPath();
  g.moveTo(x - 148, y - pillarH);
  g.quadraticCurveTo(x, y - pillarH - 84, x + 148, y - pillarH);
  g.lineTo(x + 132, y - pillarH + 4);
  g.quadraticCurveTo(x, y - pillarH - 72, x - 132, y - pillarH + 4);
  g.closePath(); g.fill();
  // moss
  g.fillStyle = "rgba(74,122,90,0.6)";
  g.beginPath(); g.ellipse(x - 140, y - 40, 20, 8, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(x + 140, y - 60, 20, 8, 0, 0, Math.PI * 2); g.fill();
  // slots
  for (const s of gs.slots) {
    // recess
    g.fillStyle = GPAL.stone_dark;
    g.beginPath(); g.arc(s.x, s.y, 15, 0, Math.PI * 2); g.fill();
    g.fillStyle = GPAL.stone_mid;
    g.beginPath(); g.arc(s.x, s.y, 12, 0, Math.PI * 2); g.fill();
    if (s.filled && s.color) {
      // glowing filled slot
      const pulse = 0.75 + Math.sin(t * 3) * 0.25;
      const grad = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, 30);
      grad.addColorStop(0, hexA(s.color, 0.8 * s.glow * pulse));
      grad.addColorStop(1, hexA(s.color, 0));
      g.fillStyle = grad;
      g.fillRect(s.x - 30, s.y - 30, 60, 60);
      g.fillStyle = s.color;
      g.beginPath(); g.arc(s.x, s.y, 8 * pulse * s.glow, 0, Math.PI * 2); g.fill();
    } else {
      // empty carved rune
      g.strokeStyle = GPAL.stone_dark;
      g.lineWidth = 1.5;
      g.beginPath(); g.arc(s.x, s.y, 8, 0, Math.PI * 2); g.stroke();
    }
  }
}

export function drawGardenOverlay(ctx: Ctx, g: CanvasRenderingContext2D) {
  const gs = ctx.garden; if (!gs) return;
  const { w, h } = ctx;
  // soft memory vignette
  const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(20,10,30,0.35)");
  g.fillStyle = vg; g.fillRect(0, 0, w, h);
  // Small floating "interact" hint when near flower or gate and hands empty/full
  const p = ctx.player;
  let hint = "";
  if (gs.heldFlower) {
    const d = dist(p.x, p.y, gs.gate.x, gs.gate.y);
    if (d < 200) hint = "E · Place";
  } else {
    for (const f of gs.flowers) {
      if (f.placedSlot !== null) continue;
      if (dist(p.x, p.y, f.x, f.y) < 55) { hint = "E · Pick"; break; }
    }
  }
  if (hint) {
    g.save();
    g.fillStyle = "rgba(10,6,18,0.72)";
    g.strokeStyle = "rgba(255,217,138,0.7)";
    g.lineWidth = 1;
    const tw = 62;
    g.fillRect(w / 2 - tw / 2, h - 60, tw, 20);
    g.strokeRect(w / 2 - tw / 2, h - 60, tw, 20);
    g.fillStyle = "#ffd98a";
    g.font = "9px 'Iowan Old Style', Palatino, Georgia, serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(hint, w / 2, h - 50);
    g.restore();
  }
}

function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
