/**
 * Entities — Player + NPCs.
 *
 * Player: layered primitives drawn from scratch with walk cycle, idle
 * breathing, turn interpolation, and a soft skewed shadow.
 *
 * NPCs: color-swapped students + teachers with waypoint patrol, idle
 * animations, optional accessories, and small emote bubbles.
 */

import type { Ctx } from "./engine";
import { rand, lerp, easeInOut, clamp } from "./engine";
import { resolveHedgeCollision, PAL, type World } from "./world";

export interface Player {
  x: number; y: number; r: number; speed: number;
  facing: number;      // -1 | 1
  facingLerp: number;  // smoothed
  walk: number;        // walk cycle phase
  moving: boolean;
  pose: "stand" | "kneel" | "dangle" | "drop" | "lie";
  poseT: number;       // 0..1 pose animation progress
  outfit: {
    skin: string;
    hair: string;
    shirt: string;
    pants: string;
    accent: string;
  };
}

export interface Npc {
  x: number; y: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  t: number;
  speed: number;
  pauseT: number;
  paused: boolean;
  color: { shirt: string; pants: string; hair: string };
  bob: number;
  accessory: "none" | "bag" | "book" | "ribbon";
  role: "student" | "teacher";
  emote: string | null;
  emoteT: number;
  facing: number;
  walk: number;
  height: number; // teachers a touch taller
}

export function createPlayer(x: number, y: number): Player {
  return {
    x, y, r: 22, speed: 200,
    facing: 1, facingLerp: 1, walk: 0, moving: false,
    pose: "stand", poseT: 0,
    outfit: {
      skin: "#e6b892",
      hair: "#3a2418",
      shirt: "#6b3fa0",
      pants: "#241040",
      accent: PAL.gold_soft,
    },
  };
}

const NPC_PALETTES = [
  { shirt: "#d9784f", pants: "#3a2418", hair: "#2a1a10" },
  { shirt: "#5c8ac9", pants: "#1f2a3a", hair: "#5a3a20" },
  { shirt: "#7fae6b", pants: "#2a2a1a", hair: "#c9a066" },
  { shirt: "#c9a13f", pants: "#3a2818", hair: "#3a2010" },
  { shirt: "#a06bc9", pants: "#2a1a3a", hair: "#a08060" },
  { shirt: "#c96b8f", pants: "#3a1a2a", hair: "#4a2818" },
  { shirt: "#e6c358", pants: "#3a2818", hair: "#7a5030" },
  { shirt: "#4a8a6a", pants: "#1a2a1a", hair: "#3a2010" },
];
const TEACHER_PALETTES = [
  { shirt: "#241040", pants: "#0f0620", hair: "#e0d5c0" },
  { shirt: "#4a2818", pants: "#241010", hair: "#2a2020" },
];

export function createNpcs(world: World): Npc[] {
  const npcs: Npc[] = [];
  // student waypoint pool — kept clear of hedges
  const spots = [
    { x: 700, y: 1440 }, { x: 1000, y: 1450 }, { x: 1500, y: 1450 }, { x: 1900, y: 1440 },
    { x: 400, y: 1400 }, { x: 2100, y: 1400 },
    { x: 700, y: 400 }, { x: 1900, y: 400 }, { x: 1200, y: 620 },
    { x: 700, y: 1200 }, { x: 1900, y: 1200 },
  ];
  // students — first few are guaranteed near the entrance so the school feels alive immediately.
  const entranceSpots = [
    { x: 1020, y: 1515 }, { x: 1380, y: 1515 }, { x: 880, y: 1465 }, { x: 1520, y: 1465 },
  ];
  for (let i = 0; i < 14; i++) {
    const a = i < entranceSpots.length ? entranceSpots[i] : spots[Math.floor(rand(0, spots.length))];
    const b = i < entranceSpots.length ? spots[i % spots.length] : spots[Math.floor(rand(0, spots.length))];
    const pal = NPC_PALETTES[i % NPC_PALETTES.length];
    const acc: Npc["accessory"] = (["none", "bag", "book", "ribbon"] as const)[i % 4];
    npcs.push({
      x: a.x, y: a.y, from: a, to: b, t: rand(0, 1),
      speed: rand(0.06, 0.14),
      pauseT: 0, paused: false,
      color: pal, bob: rand(0, 10),
      accessory: acc, role: "student",
      emote: null, emoteT: 0,
      facing: 1, walk: rand(0, 10),
      height: 1,
    });
  }
  // teachers watching the gate
  for (let i = 0; i < 3; i++) {
    const pal = TEACHER_PALETTES[i % TEACHER_PALETTES.length];
    const spot = [{ x: 1100, y: 1380 }, { x: 1330, y: 1380 }, { x: 800, y: 1400 }][i];
    npcs.push({
      x: spot.x, y: spot.y, from: spot, to: spot, t: 0,
      speed: 0, pauseT: 0, paused: true,
      color: pal, bob: rand(0, 10),
      accessory: "book", role: "teacher",
      emote: null, emoteT: 0,
      facing: i % 2 ? -1 : 1, walk: 0,
      height: 1.08,
    });
  }
  return npcs;
}

// --- update --------------------------------------------------------------
export function updatePlayer(ctx: Ctx) {
  const p = ctx.player;
  const { input, world, dt } = ctx;
  const moving = Math.abs(input.x) > 0.05 || Math.abs(input.y) > 0.05;

  if (moving) {
    if (p.pose === "lie" || p.pose === "kneel") { p.pose = "stand"; p.poseT = 0; }
    p.x += input.x * p.speed * dt;
    p.y += input.y * p.speed * dt;
    if (ctx.scene === "surface") {
      const collided = resolveHedgeCollision(p.x, p.y, p.r, world.hedges);
      p.x = collided.x; p.y = collided.y;
    } else if (ctx.underground) {
      const u = ctx.underground;
      p.x = clamp(p.x, 60, u.bounds.w - 60);
      p.y = clamp(p.y, u.groundY - 40, u.bounds.h - 60);
    } else if (ctx.garden) {
      const gs = ctx.garden;
      p.x = clamp(p.x, 80, gs.bounds.w - 80);
      p.y = clamp(p.y, gs.groundY - 20, gs.groundY + 200);
    }
    if (input.x < -0.15) p.facing = -1;
    else if (input.x > 0.15) p.facing = 1;
    p.walk += dt * 9;
  } else {
    p.walk = lerp(p.walk, 0, 1 - Math.pow(0.001, dt));
  }
  p.facingLerp = lerp(p.facingLerp, p.facing, 1 - Math.pow(0.0005, dt));
  p.moving = moving;
  if (p.pose === "stand") p.poseT = 0;
}

export function updateNpcs(ctx: Ctx) {
  const dt = ctx.dt;
  for (const n of ctx.npcs) {
    // emote timer
    if (n.emote) {
      n.emoteT -= dt;
      if (n.emoteT <= 0) n.emote = null;
    }
    if (n.role === "teacher") {
      // subtle idle sway — no movement
      n.walk = 0;
      // occasional gesture emote
      if (!n.emote && Math.random() < dt * 0.03) {
        n.emote = Math.random() < 0.5 ? "?" : "…";
        n.emoteT = 2.5;
      }
      continue;
    }
    // students walk between waypoints
    if (n.paused) {
      n.pauseT -= dt;
      if (n.pauseT <= 0) {
        n.paused = false;
        // pick new destination
        n.from = { x: n.x, y: n.y };
        const spots = _cachedSpots ?? (_cachedSpots = getSpots(ctx));
        n.to = spots[Math.floor(rand(0, spots.length))];
        n.t = 0;
      }
    } else {
      n.t += n.speed * dt;
      if (n.t >= 1) {
        n.t = 1;
        n.paused = Math.random() < 0.55;
        n.pauseT = rand(1.2, 3.5);
        n.from = n.to;
      }
      const px = n.x, py = n.y;
      n.x = lerp(n.from.x, n.to.x, easeInOut(n.t));
      n.y = lerp(n.from.y, n.to.y, easeInOut(n.t));
      const dx = n.x - px;
      if (Math.abs(dx) > 0.02) n.facing = dx > 0 ? 1 : -1;
      n.walk += dt * 6;
    }
    // small emote chance while walking
    if (!n.emote && !n.paused && Math.random() < dt * 0.02) {
      n.emote = ["!", "♪", "!"][Math.floor(Math.random() * 3)];
      n.emoteT = 1.8;
    }
  }
}

let _cachedSpots: { x: number; y: number }[] | null = null;
function getSpots(ctx: Ctx) {
  return [
    { x: 700, y: 1440 }, { x: 1000, y: 1450 }, { x: 1500, y: 1450 }, { x: 1900, y: 1440 },
    { x: 400, y: 1400 }, { x: 2100, y: 1400 },
    { x: 700, y: 400 }, { x: 1900, y: 400 }, { x: 1200, y: 620 },
  ];
}

// --- draw ----------------------------------------------------------------
export function drawEntities(ctx: Ctx, g: CanvasRenderingContext2D) {
  // Depth-sort: everything by y so entities layer correctly.
  const all: Array<{ y: number; draw: () => void }> = [];
  if (ctx.scene === "surface") {
    for (const n of ctx.npcs) all.push({ y: n.y, draw: () => drawNpc(ctx, g, n) });
  }
  all.push({ y: ctx.scene === "surface" ? ctx.player.y + 10000 : ctx.player.y, draw: () => drawPlayer(ctx, g) });
  if (ctx.runner?.active && ctx.runner.alpha > 0.001) {
    const r = ctx.runner;
    all.push({ y: r.y + 0.5, draw: () => drawRunner(ctx, g, r) });
  }
  all.sort((a, b) => a.y - b.y);
  for (const it of all) it.draw();
}

function drawRunner(ctx: Ctx, g: CanvasRenderingContext2D, r: NonNullable<Ctx["runner"]>) {
  const t = ctx.time;
  g.save();
  g.globalAlpha = r.alpha;
  const dir = r.vx >= 0 ? 1 : -1;
  const trail = -dir;
  // long motion streaks
  g.strokeStyle = "rgba(200,200,220,0.35)";
  g.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.moveTo(r.x + trail * (40 + i * 22), r.y - 14 + i * 6);
    g.lineTo(r.x + trail * (90 + i * 22), r.y - 14 + i * 6);
    g.stroke();
  }
  // dust cloud trailing
  g.fillStyle = "rgba(200,180,140,0.45)";
  for (let i = 0; i < 6; i++) {
    const a = t * 3 + i;
    g.beginPath();
    g.arc(r.x + trail * (30 + i * 10), r.y + 12 + Math.sin(a) * 2, 5 + i * 0.6, 0, Math.PI * 2);
    g.fill();
  }
  // shadow
  g.fillStyle = "rgba(0,0,0,0.4)";
  g.beginPath(); g.ellipse(r.x + 3, r.y + 14, 14, 5, 0, 0, Math.PI * 2); g.fill();
  // body — sprinting silhouette
  const legPhase = Math.sin(t * 22);
  drawCharacter(g, r.x, r.y - Math.abs(legPhase) * 3, dir, 0, {
    skin: "#e6b892", hair: r.color.hair, shirt: r.color.shirt,
    pants: r.color.pants, accent: PAL.gold_soft,
  }, legPhase * 6, legPhase * 6, "stand", 1);
  g.restore();
}

function drawPlayer(ctx: Ctx, g: CanvasRenderingContext2D) {
  const p = ctx.player;
  const t = ctx.time;
  const breathing = Math.sin(t * 2) * 1.2;
  const walkAmt = clamp(p.walk % (Math.PI * 2) / (Math.PI * 2), 0, 1);
  const legSwing = p.moving ? Math.sin(p.walk) * 4 : 0;
  const armSwing = p.moving ? Math.sin(p.walk) * 3 : Math.sin(t * 2 + 1) * 0.6;
  const bob = p.moving ? Math.abs(Math.sin(p.walk)) * 1.6 : 0;

  // shadow
  if (p.pose !== "dangle" && p.pose !== "drop") {
    g.fillStyle = "rgba(0,0,0,0.4)";
    g.beginPath();
    g.ellipse(p.x + 4, p.y + 21, 20, 7, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(255,217,138,0.95)";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(p.x, p.y - 13, 24, 0, Math.PI * 2);
    g.stroke();
  }

  // kneel / dangle / drop / lie poses
  if (p.pose === "kneel") {
    drawCharacter(g, p.x, p.y + 4, 1, 0, p.outfit, 0, 0, "kneel", PLAYER_DRAW_SCALE);
    return;
  }
  if (p.pose === "lie") {
    drawCharacter(g, p.x, p.y + 6, 1, 0, p.outfit, 0, 0, "lie", PLAYER_DRAW_SCALE);
    return;
  }
  if (p.pose === "dangle") {
    drawDangle(g, p, t);
    return;
  }
  if (p.pose === "drop") {
    drawDrop(g, p);
    return;
  }

  drawCharacter(g, p.x, p.y - bob, p.facingLerp, breathing, {
    skin: p.outfit.skin, hair: p.outfit.hair, shirt: p.outfit.shirt,
    pants: p.outfit.pants, accent: p.outfit.accent,
  }, legSwing, armSwing, "stand", PLAYER_DRAW_SCALE);
}

function drawNpc(ctx: Ctx, g: CanvasRenderingContext2D, n: Npc) {
  const t = ctx.time;
  const walkAmt = n.paused ? 0 : Math.sin(n.walk);
  const legSwing = n.paused ? 0 : walkAmt * 3.2;
  const armSwing = n.paused ? Math.sin(t * 1.8 + n.bob) * 0.5 : walkAmt * 2.4;
  const bob = n.paused ? 0 : Math.abs(walkAmt) * 1.4;
  const breathing = Math.sin(t * 1.8 + n.bob) * 1;

  g.fillStyle = "rgba(0,0,0,0.35)";
  g.beginPath();
  g.ellipse(n.x + 3, n.y + 14, 13 * n.height, 4.5, 0, 0, Math.PI * 2);
  g.fill();

  const acc = n.accessory;
  drawCharacter(g, n.x, n.y - bob, n.facing, breathing, {
    skin: "#e6b892",
    hair: n.color.hair,
    shirt: n.color.shirt,
    pants: n.color.pants,
    accent: PAL.cream,
  }, legSwing, armSwing, "stand", n.height * NPC_DRAW_SCALE);

  // accessory
  if (acc === "bag") {
    g.fillStyle = PAL.wood_dark;
    g.fillRect(n.x - 6 * n.facing, n.y - 6 - bob, 6, 8);
  } else if (acc === "book") {
    g.fillStyle = PAL.terra;
    g.fillRect(n.x + 5 * n.facing - 3, n.y - bob - 2, 6, 4);
  } else if (acc === "ribbon") {
    g.fillStyle = PAL.gold;
    g.beginPath();
    g.arc(n.x - 3 * n.facing, n.y - 28 - bob, 2, 0, Math.PI * 2);
    g.fill();
  }

  // emote bubble
  if (n.emote) {
    g.save();
    const bx = n.x + 10, by = n.y - 42 - bob + Math.sin(t * 4) * 1;
    g.fillStyle = "rgba(253, 239, 216, 0.95)";
    g.strokeStyle = "rgba(36, 16, 64, 0.8)";
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(bx, by, 10, 8, 0, 0, Math.PI * 2);
    g.fill(); g.stroke();
    g.fillStyle = "#241040";
    g.font = "bold 11px 'Iowan Old Style', Palatino, Georgia, serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(n.emote, bx, by + 1);
    g.restore();
  }
}

// --- character rig -------------------------------------------------------
interface Outfit { skin: string; hair: string; shirt: string; pants: string; accent: string; }
const PLAYER_DRAW_SCALE = 2.1;
const NPC_DRAW_SCALE = 1.35;

function drawCharacter(
  g: CanvasRenderingContext2D,
  x: number, y: number,
  facing: number, breathing: number,
  o: Outfit,
  legSwing: number, armSwing: number,
  pose: "stand" | "kneel" | "lie",
  scale: number,
) {
  const fx = Math.sign(facing) || 1;

  if (pose === "lie") {
    // lying on ground, rotated 90deg
    g.save();
    g.translate(x, y);
    g.rotate(-Math.PI / 2 * fx);
    drawCharacter(g, 0, 0, 1, 0, o, 0, 0, "stand", scale);
    g.restore();
    return;
  }

  g.save();
  g.translate(x, y);
  g.scale(scale * fx, scale);

  if (pose === "kneel") {
    // Folded legs (pants + boots peeking)
    g.fillStyle = o.pants;
    g.beginPath(); g.ellipse(0, 8, 11, 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#1a1010";
    g.fillRect(-9, 10, 5, 3);
    g.fillRect(4, 10, 5, 3);
    // Torso — leaning forward, same shape as standing
    g.fillStyle = o.shirt;
    g.beginPath();
    g.moveTo(-7, -2); g.lineTo(7, -2); g.lineTo(6, 6); g.lineTo(-6, 6); g.closePath(); g.fill();
    g.fillStyle = "rgba(0,0,0,0.20)";
    g.beginPath(); g.moveTo(-7, -2); g.lineTo(0, -2); g.lineTo(0, 6); g.lineTo(-6, 6); g.closePath(); g.fill();
    // buttons + belt
    g.fillStyle = o.accent;
    g.fillRect(-0.5, 0, 1, 1); g.fillRect(-0.5, 3, 1, 1);
    g.fillRect(-6, 4, 12, 1.5);
    g.fillStyle = "#3a2010"; g.fillRect(-1, 4, 2, 1.5);
    // arm reaching down toward the ground
    g.strokeStyle = o.skin; g.lineWidth = 3; g.lineCap = "round";
    g.beginPath(); g.moveTo(4, -1); g.quadraticCurveTo(9, 4, 10, 10); g.stroke();
    g.strokeStyle = o.shirt; g.lineWidth = 3;
    g.beginPath(); g.moveTo(4, -1); g.lineTo(7, 3); g.stroke();
    // head — tipped forward slightly
    const hy = -10;
    g.fillStyle = o.skin;
    g.beginPath(); g.arc(0, hy, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(0,0,0,0.12)";
    g.beginPath(); g.arc(-2, hy, 5, Math.PI * 0.4, Math.PI * 1.6); g.fill();
    // hair cap + bangs
    g.fillStyle = o.hair;
    g.beginPath(); g.arc(0, hy - 3, 7.5, Math.PI, Math.PI * 2); g.fill();
    g.fillRect(-6, hy - 4, 4, 3); g.fillRect(2, hy - 4, 4, 3);
    // side strand
    g.beginPath();
    g.moveTo(4, hy); g.quadraticCurveTo(8, hy + 4, 6, hy + 8); g.lineTo(4, hy + 6); g.closePath(); g.fill();
    // eyes downcast — thin slits
    g.fillStyle = "#241040";
    g.fillRect(-3, hy, 2, 1); g.fillRect(2, hy, 2, 1);
    // brows
    g.fillStyle = o.hair;
    g.fillRect(-3, hy - 2, 2, 1); g.fillRect(2, hy - 2, 2, 1);
    // mouth (soft parted)
    g.fillStyle = "rgba(90,40,40,0.7)";
    g.fillRect(-1, hy + 3, 3, 1);
    // cheeks
    g.fillStyle = "rgba(255,150,120,0.5)";
    g.fillRect(-4, hy + 2, 2, 1); g.fillRect(3, hy + 2, 2, 1);
    g.restore();
    return;
  }

  // === standing rig ===
  // legs (with pixel-art highlight stripe + boot toe)
  g.fillStyle = o.pants;
  g.fillRect(-5, 6, 4, 12 - legSwing);
  g.fillRect(1, 6, 4, 12 + legSwing);
  g.fillStyle = "rgba(255,255,255,0.10)";
  g.fillRect(-5, 6, 1, 12 - legSwing);
  g.fillRect(1, 6, 1, 12 + legSwing);
  // shoes with toe cap
  g.fillStyle = "#1a1010";
  g.fillRect(-6, 17 - legSwing, 5, 3);
  g.fillRect(1, 17 + legSwing, 5, 3);
  g.fillStyle = "#3a2418";
  g.fillRect(-2, 17 - legSwing, 1, 3);
  g.fillRect(4, 17 + legSwing, 1, 3);

  // torso (with breathing)
  g.save();
  g.translate(0, breathing * 0.3);
  g.fillStyle = o.shirt;
  g.beginPath();
  g.moveTo(-7, -6);
  g.lineTo(7, -6);
  g.lineTo(6, 8);
  g.lineTo(-6, 8);
  g.closePath(); g.fill();
  // shirt shadow (left side)
  g.fillStyle = "rgba(0,0,0,0.20)";
  g.beginPath();
  g.moveTo(-7, -6); g.lineTo(0, -6); g.lineTo(0, 8); g.lineTo(-6, 8); g.closePath();
  g.fill();
  // shirt highlight (right shoulder)
  g.fillStyle = "rgba(255,255,255,0.14)";
  g.fillRect(3, -6, 4, 2);
  // collar
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.fillRect(-3, -6, 6, 1);
  // buttons
  g.fillStyle = o.accent;
  g.fillRect(-0.5, -3, 1, 1);
  g.fillRect(-0.5, 0, 1, 1);
  g.fillRect(-0.5, 3, 1, 1);
  // accent belt + buckle
  g.fillStyle = o.accent;
  g.fillRect(-6, 6, 12, 1.5);
  g.fillStyle = "#3a2010";
  g.fillRect(-1, 6, 2, 1.5);

  // arms with hand pixels
  g.fillStyle = o.shirt;
  g.save();
  g.translate(-6, -4);
  g.rotate(armSwing * 0.06);
  g.fillRect(-1.5, 0, 3, 9);
  g.fillStyle = o.skin;
  g.fillRect(-1.5, 9, 3, 3);
  g.restore();
  g.fillStyle = o.shirt;
  g.save();
  g.translate(6, -4);
  g.rotate(-armSwing * 0.06);
  g.fillRect(-1.5, 0, 3, 9);
  g.fillStyle = o.skin;
  g.fillRect(-1.5, 9, 3, 3);
  g.restore();

  // head
  const hy = -14 + breathing * 0.3;
  g.fillStyle = o.skin;
  g.beginPath(); g.arc(0, hy, 7, 0, Math.PI * 2); g.fill();
  // face shadow (left)
  g.fillStyle = "rgba(0,0,0,0.12)";
  g.beginPath(); g.arc(-2, hy, 5, Math.PI * 0.4, Math.PI * 1.6); g.fill();
  // ear
  g.fillStyle = o.skin;
  g.fillRect(-8, hy - 1, 2, 3);
  g.fillStyle = "rgba(0,0,0,0.25)";
  g.fillRect(-8, hy + 1, 2, 1);
  // hair cap
  g.fillStyle = o.hair;
  g.beginPath();
  g.arc(0, hy - 3, 7.5, Math.PI, Math.PI * 2);
  g.fill();
  // hair front bangs
  g.fillRect(-6, hy - 4, 4, 3);
  g.fillRect(2, hy - 4, 4, 3);
  // side strand
  g.beginPath();
  g.moveTo(4, hy);
  g.quadraticCurveTo(8, hy + 4, 6, hy + 8);
  g.lineTo(4, hy + 6);
  g.closePath(); g.fill();
  // hair highlight
  g.fillStyle = "rgba(255,255,255,0.14)";
  g.fillRect(-3, hy - 5, 4, 1);
  // eyes — pixel style with white + pupil
  g.fillStyle = "#fdefd8";
  g.fillRect(-3, hy - 1, 2, 2);
  g.fillRect(2, hy - 1, 2, 2);
  g.fillStyle = "#241040";
  g.fillRect(-2, hy, 1, 1);
  g.fillRect(3, hy, 1, 1);
  // brows
  g.fillStyle = o.hair;
  g.fillRect(-3, hy - 3, 2, 1);
  g.fillRect(2, hy - 3, 2, 1);
  // mouth
  g.fillStyle = "rgba(90,40,40,0.7)";
  g.fillRect(-1, hy + 3, 3, 1);
  // cheeks
  g.fillStyle = "rgba(255,150,120,0.45)";
  g.fillRect(-4, hy + 2, 2, 1);
  g.fillRect(3, hy + 2, 2, 1);
  g.restore();

  g.restore();
}

export function setPose(p: Player, pose: Player["pose"]) {
  p.pose = pose;
  p.poseT = 0;
}

// --- fall animation drawing ---------------------------------------------
// The hatch is a hole in the ground; the player grips the wooden rim,
// kicks, then slips into darkness and spirals down to nothing.

function drawHatchPit(g: CanvasRenderingContext2D, x: number, y: number, openT: number) {
  g.save();
  // Broken stone rim — jagged, weathered, WET (this is old carved stone,
  // not a wooden hatch). Dark wet highlights match the "wet stone" dialogue.
  g.fillStyle = "#6b6252";
  g.beginPath(); g.ellipse(x, y + 4, 58, 44, 0, 0, Math.PI * 2); g.fill();
  // jagged inner rim
  g.fillStyle = "#3a3428";
  g.beginPath();
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const rr = 48 + Math.sin(i * 3.1) * 3;
    const px = x + Math.cos(a) * rr;
    const py = y + 4 + Math.sin(a) * (rr * 0.75);
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.closePath(); g.fill();
  // wet stone highlights (specular streaks)
  g.strokeStyle = "rgba(200,220,240,0.55)";
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(x - 44, y - 4); g.quadraticCurveTo(x - 30, y - 14, x - 10, y - 12);
  g.moveTo(x + 12, y - 12); g.quadraticCurveTo(x + 34, y - 10, x + 46, y - 2);
  g.moveTo(x - 38, y + 14); g.lineTo(x - 30, y + 16);
  g.stroke();
  // moss patches
  g.fillStyle = "rgba(74,120,90,0.75)";
  g.beginPath(); g.ellipse(x - 34, y - 10, 10, 3, 0.2, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(x + 40, y + 8, 8, 3, -0.3, 0, Math.PI * 2); g.fill();
  // dark hole
  g.fillStyle = "#0a0510";
  g.beginPath(); g.ellipse(x, y + 4, 46, 34, 0, 0, Math.PI * 2); g.fill();
  const grad = g.createRadialGradient(x, y - 2, 6, x, y + 4, 46);
  grad.addColorStop(0, "rgba(20,10,30,0)");
  grad.addColorStop(0.6, "rgba(0,0,0,0.7)");
  grad.addColorStop(1, "rgba(0,0,0,1)");
  g.fillStyle = grad;
  g.beginPath(); g.ellipse(x, y + 4, 46, 34, 0, 0, Math.PI * 2); g.fill();
  // shattered stone chunk lying beside the hole
  g.save();
  g.translate(x - 60, y + 8);
  g.rotate(-0.4 - openT * 0.1);
  g.fillStyle = "#6b6252";
  g.beginPath();
  g.moveTo(-14, 0); g.lineTo(-8, -8); g.lineTo(6, -6); g.lineTo(12, 2); g.lineTo(4, 8); g.lineTo(-10, 6); g.closePath(); g.fill();
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.beginPath();
  g.moveTo(-14, 0); g.lineTo(-10, 6); g.lineTo(4, 8); g.lineTo(2, 4); g.closePath(); g.fill();
  g.restore();
  g.restore();
}

function drawDangle(g: CanvasRenderingContext2D, p: Player, time: number) {
  // Rim shown BEHIND her — she is INSIDE the pit, gripping the broken edge
  // from below.
  drawHatchPit(g, p.x, p.y - 4, 1);
  const kick = Math.sin(time * 6);
  const struggle = Math.sin(time * 3) * 1.5;
  const slipT = (Math.sin(time * 2.2) + 1) * 0.5;
  const o = p.outfit;
  g.save();
  // She hangs slightly BELOW the rim center. Push everything downward.
  const bodyDropY = 22 + slipT * 2;
  g.translate(p.x, p.y + bodyDropY);
  g.scale(PLAYER_DRAW_SCALE, PLAYER_DRAW_SCALE);

  // Legs hanging into darkness, kicking
  g.save();
  g.globalAlpha = 0.55;
  g.fillStyle = o.pants;
  g.save(); g.translate(-3, 6); g.rotate(kick * 0.4); g.fillRect(-2, 0, 4, 18); g.restore();
  g.save(); g.translate(3, 6); g.rotate(-kick * 0.4); g.fillRect(-2, 0, 4, 18); g.restore();
  // boot silhouettes barely visible
  g.fillStyle = "#1a1010";
  g.save(); g.translate(-3 + Math.sin(kick) * 4, 22 + Math.abs(kick) * 2); g.fillRect(-3, 0, 5, 3); g.restore();
  g.save(); g.translate(3 - Math.sin(kick) * 4, 22 + Math.abs(kick) * 2); g.fillRect(-2, 0, 5, 3); g.restore();
  g.restore();

  // Torso (only upper half peeks above the rim visually — the rim overlaps
  // her waist).
  g.fillStyle = o.shirt;
  g.beginPath();
  g.moveTo(-7, -6 + struggle * 0.2); g.lineTo(7, -6 + struggle * 0.2);
  g.lineTo(6, 8); g.lineTo(-6, 8); g.closePath(); g.fill();
  g.fillStyle = "rgba(0,0,0,0.20)";
  g.beginPath(); g.moveTo(-7, -6); g.lineTo(0, -6); g.lineTo(0, 8); g.lineTo(-6, 8); g.closePath(); g.fill();
  // collar + buttons
  g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(-3, -6, 6, 1);
  g.fillStyle = o.accent;
  g.fillRect(-0.5, -3, 1, 1); g.fillRect(-0.5, 0, 1, 1); g.fillRect(-0.5, 3, 1, 1);
  // belt
  g.fillStyle = o.accent; g.fillRect(-6, 6, 12, 1.5);
  g.fillStyle = "#3a2010"; g.fillRect(-1, 6, 2, 1.5);

  // Head — full detailed style (matches idle sprite)
  const hy = -14 + struggle * 0.3;
  g.fillStyle = o.skin;
  g.beginPath(); g.arc(0, hy, 7, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(0,0,0,0.12)";
  g.beginPath(); g.arc(-2, hy, 5, Math.PI * 0.4, Math.PI * 1.6); g.fill();
  // ear
  g.fillStyle = o.skin; g.fillRect(-8, hy - 1, 2, 3);
  // hair cap + bangs, blown up by falling
  g.fillStyle = o.hair;
  g.beginPath(); g.arc(0, hy - 3, 7.5, Math.PI, Math.PI * 2); g.fill();
  g.fillRect(-6, hy - 5, 4, 3); g.fillRect(2, hy - 5, 4, 3);
  // strand streaming up (wind of the pit)
  g.beginPath();
  g.moveTo(4, hy - 2); g.quadraticCurveTo(10, hy - 8, 6, hy - 12); g.lineTo(4, hy - 8); g.closePath(); g.fill();
  g.beginPath();
  g.moveTo(-4, hy - 2); g.quadraticCurveTo(-10, hy - 6, -8, hy - 10); g.lineTo(-4, hy - 8); g.closePath(); g.fill();
  // hair highlight
  g.fillStyle = "rgba(255,255,255,0.14)"; g.fillRect(-3, hy - 5, 4, 1);
  // eyes — wide with fear
  g.fillStyle = "#fdefd8";
  g.fillRect(-3, hy - 1, 3, 3); g.fillRect(2, hy - 1, 3, 3);
  g.fillStyle = "#241040";
  g.fillRect(-2, hy, 1, 2); g.fillRect(3, hy, 1, 2);
  // brows raised
  g.fillStyle = o.hair;
  g.fillRect(-4, hy - 3, 2, 1); g.fillRect(2, hy - 3, 2, 1);
  // open mouth (grunt / gasp)
  g.fillStyle = "#3a1020";
  g.beginPath(); g.ellipse(0.5, hy + 4, 1.6, 1.4, 0, 0, Math.PI * 2); g.fill();
  // cheeks flushed
  g.fillStyle = "rgba(255,120,110,0.6)";
  g.fillRect(-4, hy + 2, 2, 1); g.fillRect(3, hy + 2, 2, 1);

  // arms stretched UP to the broken stone rim
  const rimY = -26 + slipT * 1.2;
  const shoulderL = { x: -6, y: -4 };
  const shoulderR = { x: 6, y: -4 };
  const gripL = { x: -14, y: rimY };
  const gripR = { x: 14, y: rimY };
  g.strokeStyle = o.skin;
  g.lineWidth = 3.2;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(shoulderL.x, shoulderL.y); g.lineTo(gripL.x, gripL.y);
  g.moveTo(shoulderR.x, shoulderR.y); g.lineTo(gripR.x, gripR.y);
  g.stroke();
  // sleeves
  g.strokeStyle = o.shirt;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(shoulderL.x, shoulderL.y); g.lineTo(shoulderL.x - 3, shoulderL.y - 6);
  g.moveTo(shoulderR.x, shoulderR.y); g.lineTo(shoulderR.x + 3, shoulderR.y - 6);
  g.stroke();
  // hands / knuckles on the rim
  g.fillStyle = o.skin;
  g.beginPath(); g.arc(gripL.x, gripL.y, 2.4, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(gripR.x, gripR.y, 2.4, 0, Math.PI * 2); g.fill();

  // dripping water where her hands grip the wet stone
  g.fillStyle = "rgba(180,220,240,0.7)";
  for (let i = 0; i < 3; i++) {
    const dp = ((time * 0.8 + i * 0.4) % 1);
    const dropY = gripL.y + 6 + dp * 18;
    const a = 1 - dp;
    g.globalAlpha = a * 0.9;
    g.beginPath(); g.ellipse(gripL.x - 1, dropY, 0.9, 1.8, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(gripR.x + 1, dropY - 4, 0.9, 1.8, 0, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  // small stone-slip particles at grip (fingers slipping)
  g.fillStyle = "rgba(120,110,100,0.6)";
  for (let i = 0; i < 2; i++) {
    const a = time * 3 + i;
    g.beginPath();
    g.arc(gripL.x + Math.sin(a) * 1.5, gripL.y + 1, 0.8, 0, Math.PI * 2);
    g.arc(gripR.x + Math.cos(a) * 1.5, gripR.y + 1, 0.8, 0, Math.PI * 2);
    g.fill();
  }

  g.restore();
}

function drawDrop(g: CanvasRenderingContext2D, p: Player) {
  const t = clamp(p.poseT / 1.4, 0, 1);
  // pit gets darker
  drawHatchPit(g, p.x, p.y, 1);
  g.save();
  g.globalAlpha = t;
  g.fillStyle = "#000";
  g.beginPath(); g.ellipse(p.x, p.y + 4, 46, 34, 0, 0, Math.PI * 2); g.fill();
  g.restore();

  // motion trail behind falling figure
  const dropY = t * 12;
  for (let i = 5; i >= 0; i--) {
    const tt = clamp(t - i * 0.06, 0, 1);
    if (tt <= 0) continue;
    const s = lerp(0.85, 0.05, tt);
    const y = p.y + tt * 12;
    g.save();
    g.globalAlpha = (1 - tt) * 0.25;
    g.translate(p.x, y);
    g.rotate(tt * Math.PI * 1.3);
    g.scale(s, s);
    drawCharacter(g, 0, 0, 1, 0, p.outfit, 0, 0, "stand", PLAYER_DRAW_SCALE);
    g.restore();
  }

  // main figure — shrinking, tumbling
  const scale = lerp(0.85, 0.04, t) * PLAYER_DRAW_SCALE;
  g.save();
  g.globalAlpha = 1 - t * 0.5;
  g.translate(p.x, p.y + dropY);
  g.rotate(t * Math.PI * 1.6);
  g.scale(scale, scale);
  drawCharacter(g, 0, 0, 1, 0, p.outfit, 4, 6, "stand", 1);
  g.restore();

  // vignette closing in around the pit
  g.save();
  const vg = g.createRadialGradient(p.x, p.y + 4, 5, p.x, p.y + 4, 60 + t * 40);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, `rgba(0,0,0,${0.4 + t * 0.5})`);
  g.fillStyle = vg;
  g.beginPath(); g.arc(p.x, p.y + 4, 120, 0, Math.PI * 2); g.fill();
  g.restore();
}
