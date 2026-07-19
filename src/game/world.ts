/**
 * World — sky, ground, grass, hedges, trees, school entrance, hatch.
 */

import type { Ctx } from "./engine";
import { rand, smoothNoise, lerp, clamp } from "./engine";

export const WORLD_W = 2400;
export const WORLD_H = 1600;

export const PAL = {
  sky_top: "#3f6fa8",
  sky_mid: "#8fb6cf",
  sky_low: "#e9d3a0",
  sun: "#ffeeb0",
  hedge_shadow: "#122a1c",
  hedge_base: "#1f3a2a",
  hedge_mid: "#2e4b3f",
  hedge_light: "#4a7a5c",
  hedge_hi: "#7fae6b",
  grass_a: "#3f6b3a",
  grass_b: "#5a8b45",
  grass_c: "#7fae4f",
  grass_d: "#a9c458",
  grass_dry: "#c9b25a",
  dirt: "#7a5535",
  dirt_dark: "#4a3222",
  stone: "#c9c1a9",
  stone_dark: "#8b8570",
  wood: "#7a4a2a",
  wood_dark: "#4a2818",
  gold: "#f2b441",
  gold_soft: "#ffd98a",
  purple: "#6b3fa0",
  terra: "#c9552c",
  cream: "#fdefd8",
};

export interface HedgeRect { x: number; y: number; w: number; h: number; seed: number; }
export interface Tree { x: number; y: number; scale: number; seed: number; }
export interface Bush { x: number; y: number; r: number; seed: number; }
export interface Flower { x: number; y: number; c: string; s: number; seed: number; }
export interface Rock { x: number; y: number; r: number; }
export interface Cloud { x: number; y: number; s: number; speed: number; }
export interface Banner { x: number; y: number; c: string; phase: number; }
export interface LampPost { x: number; y: number; }
export interface Bench { x: number; y: number; }
export interface Sign { x: number; y: number; text: string; }
export interface Hatch { x: number; y: number; r: number; found: boolean; revealed: boolean; }

export interface World {
  hedges: HedgeRect[];
  trees: Tree[];
  bushes: Bush[];
  flowers: Flower[];
  rocks: Rock[];
  clouds: Cloud[];
  banners: Banner[];
  lamps: LampPost[];
  benches: Bench[];
  signs: Sign[];
  hatch: Hatch;
  playerStart: { x: number; y: number };
  kneelSpot: { x: number; y: number };
  bounds: { w: number; h: number };
  sprites: WorldSprites;
  grassBlades: GrassBlade[];
}

interface WorldSprites {
  hedgeClumps: HTMLCanvasElement[];
  bushSprites: HTMLCanvasElement[];
  treeSprites: HTMLCanvasElement[];
  flowerSprites: HTMLCanvasElement[];
  stoneSprite: HTMLCanvasElement;
  towerSprite: HTMLCanvasElement;
  bannerSprites: HTMLCanvasElement[];
  benchSprite: HTMLCanvasElement;
  lampSprite: HTMLCanvasElement;
  signSprite: HTMLCanvasElement;
  hatchSprite: HTMLCanvasElement;
}

interface GrassBlade {
  x: number; y: number;
  h: number; w: number;
  bend: number;
  color: string;
  phase: number;
}

export function buildWorld(): World {
  const bounds = { w: WORLD_W, h: WORLD_H };

  const hedges: HedgeRect[] = [
    { x: 200, y: 260, w: 2000, h: 55, seed: 1 },
    { x: 200, y: 1290, w: 800, h: 55, seed: 2 },
    { x: 1400, y: 1290, w: 800, h: 55, seed: 3 },
    { x: 200, y: 260, w: 55, h: 1085, seed: 4 },
    { x: 2145, y: 260, w: 55, h: 1085, seed: 5 },

    { x: 600, y: 500, w: 1000, h: 50, seed: 6 },
    { x: 600, y: 500, w: 50, h: 250, seed: 7 },
    { x: 1550, y: 500, w: 50, h: 400, seed: 8 },
    { x: 800, y: 750, w: 800, h: 50, seed: 9 },
    { x: 800, y: 750, w: 50, h: 250, seed: 10 },
    { x: 1000, y: 950, w: 600, h: 50, seed: 11 },
    { x: 400, y: 1000, w: 200, h: 50, seed: 12 },
    { x: 400, y: 1000, w: 50, h: 200, seed: 13 },
    { x: 1800, y: 900, w: 50, h: 300, seed: 14 },
  ];

  const trees: Tree[] = [];
  for (let i = 0; i < 8; i++) {
    trees.push({ x: 180 + i * 260 + rand(-18, 18), y: 230 + rand(-20, 20), scale: rand(0.55, 0.75), seed: i });
  }
  trees.push({ x: 170, y: 1420, scale: 0.62, seed: 100 });
  trees.push({ x: 2230, y: 1420, scale: 0.62, seed: 101 });

  const bushes: Bush[] = [];
  const fixedBushes = [
    { x: 360, y: 1370 }, { x: 620, y: 1390 }, { x: 1780, y: 1390 }, { x: 2040, y: 1370 },
    { x: 380, y: 720 }, { x: 2020, y: 720 }, { x: 560, y: 1080 }, { x: 1840, y: 1080 },
    { x: 700, y: 420 }, { x: 1700, y: 420 }, { x: 300, y: 520 }, { x: 2100, y: 520 },
  ];
  for (let i = 0; i < fixedBushes.length; i++) {
    bushes.push({ ...fixedBushes[i], r: 22 + (i % 3) * 6, seed: i });
  }
  for (let i = 0; i < 8; i++) {
    bushes.push({ x: rand(280, 2120), y: rand(220, 260), r: rand(18, 34), seed: 200 + i });
  }

  const flowers: Flower[] = [];
  const flowerCols = [PAL.gold, PAL.terra, "#e0619a", "#9a7bf0", "#f8e6a3", "#f2b441"];
  for (let i = 0; i < 60; i++) {
    flowers.push({
      x: rand(280, 2120), y: rand(360, 1240),
      c: flowerCols[Math.floor(rand(0, flowerCols.length))],
      s: rand(3, 6),
      seed: i,
    });
  }
  const hatch: Hatch = { x: 1980, y: 400, r: 60, found: false, revealed: false };
  const gx0 = 1200, gy0 = 1450;
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    const px = lerp(gx0, hatch.x, t) + Math.sin(t * 3) * 60 * (1 - t);
    const py = lerp(gy0, hatch.y, t) + Math.cos(t * 2.4) * 40 * (1 - t) - t * 60;
    flowers.push({
      x: px + rand(-8, 8), y: py + rand(-6, 6),
      c: t > 0.6 ? PAL.gold_soft : (Math.random() < 0.5 ? PAL.gold : "#f8e6a3"),
      s: rand(4, 6),
      seed: 500 + i,
    });
  }

  const rocks: Rock[] = [];
  for (let i = 0; i < 28; i++) {
    rocks.push({ x: rand(240, 2160), y: rand(320, 1280), r: rand(2, 5) });
  }

  const clouds: Cloud[] = [];
  for (let i = 0; i < 4; i++) {
    clouds.push({ x: rand(0, WORLD_W), y: rand(40, 300), s: rand(0.7, 1.4), speed: rand(6, 16) });
  }

  const banners: Banner[] = [
    { x: 760, y: 1310, c: PAL.terra, phase: 0 },
    { x: 930, y: 1305, c: PAL.gold, phase: 1.4 },
    { x: 1470, y: 1305, c: PAL.purple, phase: 2.1 },
    { x: 1640, y: 1310, c: "#3f6fa8", phase: 3.2 },
  ];

  const lamps: LampPost[] = [
    { x: 900, y: 1370 },
    { x: 1500, y: 1370 },
    { x: 400, y: 1370 },
    { x: 2000, y: 1370 },
  ];

  const benches: Bench[] = [
    { x: 600, y: 1430 },
    { x: 1800, y: 1430 },
  ];

  const signs: Sign[] = [
    { x: 1200, y: 1290, text: "The Great Competition" },
  ];

  const playerStart = { x: 1200, y: 1540 };
  const kneelSpot = { x: hatch.x, y: hatch.y };

  const grassBlades: GrassBlade[] = [];
  const grassCount = 450;
  const grassCols = [PAL.grass_a, PAL.grass_b, PAL.grass_c, PAL.grass_d, PAL.grass_dry];
  for (let i = 0; i < grassCount; i++) {
    const x = rand(220, WORLD_W - 220);
    const y = rand(310, WORLD_H - 220);
    if (isInsideHedge(x, y, hedges)) { i--; continue; }
    grassBlades.push({
      x, y,
      h: rand(8, 20),
      w: rand(1.6, 2.8),
      bend: rand(-0.3, 0.3),
      color: grassCols[Math.floor(rand(0, grassCols.length))],
      phase: rand(0, Math.PI * 2),
    });
  }

  const sprites = buildSprites();

  return {
    hedges, trees, bushes, flowers, rocks, clouds,
    banners, lamps, benches, signs, hatch,
    playerStart, kneelSpot, bounds, sprites, grassBlades,
  };
}

function isInsideHedge(x: number, y: number, hedges: HedgeRect[]): boolean {
  for (const h of hedges) {
    if (x > h.x - 6 && x < h.x + h.w + 6 && y > h.y - 6 && y < h.y + h.h + 6) return true;
  }
  return false;
}

export function resolveHedgeCollision(px: number, py: number, r: number, hedges: HedgeRect[]) {
  let x = px, y = py;
  for (const h of hedges) {
    const cx = clamp(x, h.x, h.x + h.w);
    const cy = clamp(y, h.y, h.y + h.h);
    const dx = x - cx, dy = y - cy;
    const d = Math.hypot(dx, dy);
    if (d < r && d > 0.0001) {
      const push = r - d;
      x += (dx / d) * push;
      y += (dy / d) * push;
    } else if (d === 0) {
      x += r;
    }
  }
  x = clamp(x, 240, WORLD_W - 240);
  y = clamp(y, 300, WORLD_H - 200);
  return { x, y };
}

export function updateWorld(ctx: Ctx) {
  const w = ctx.world;
  const dt = ctx.dt;
  for (const c of w.clouds) {
    c.x += c.speed * dt;
    if (c.x > WORLD_W + 300) c.x = -300;
  }
}

export type Layer = "sky" | "ground" | "midground" | "foreground";

export function drawWorld(ctx: Ctx, g: CanvasRenderingContext2D, layer: Layer) {
  if (layer === "sky") drawSky(ctx, g);
  else if (layer === "ground") { drawGround(ctx, g); drawFlowersAndRocks(ctx, g); drawHatch(ctx, g); drawGrass(ctx, g); drawStonePath(ctx, g); }
  else if (layer === "midground") { drawTrees(ctx, g); drawHedges(ctx, g); drawBushes(ctx, g); drawBenches(ctx, g); }
  else if (layer === "foreground") { drawEntrance(ctx, g); }
}

function drawSky(ctx: Ctx, g: CanvasRenderingContext2D) {
  const { w, h, camera } = ctx;
  const parY = (camera.y / WORLD_H) * 40 - 20;
  const grad = g.createLinearGradient(0, parY, 0, h + parY);
  grad.addColorStop(0, "#2f5486");
  grad.addColorStop(0.4, PAL.sky_mid);
  grad.addColorStop(0.85, PAL.sky_low);
  grad.addColorStop(1, "#f6dfaa");
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);

  g.fillStyle = "rgba(60, 90, 78, 0.55)";
  g.beginPath();
  g.moveTo(0, h * 0.62);
  for (let x = 0; x <= w; x += 40) {
    const n = smoothNoise((x - camera.x * 0.05) * 0.008, ctx.time * 0.02);
    const y = h * 0.62 - n * 60;
    g.lineTo(x, y);
  }
  g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();

  g.fillStyle = "rgba(46, 75, 63, 0.75)";
  g.beginPath();
  g.moveTo(0, h * 0.7);
  for (let x = 0; x <= w; x += 40) {
    const n = smoothNoise((x + camera.x * 0.02) * 0.006 + 10, 0);
    const y = h * 0.7 - n * 45;
    g.lineTo(x, y);
  }
  g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();

  drawClouds(ctx, g);
}

function drawClouds(ctx: Ctx, g: CanvasRenderingContext2D) {
  const { w, h, time } = ctx;
  const parallax = ctx.camera.x * 0.05;
  for (let i = 0; i < 6; i++) {
    const baseX = ((i * 380 + time * 8 - parallax) % (w + 400) + (w + 400)) % (w + 400) - 200;
    const cy = 50 + (i * 34) % 180;
    g.save();
    g.fillStyle = "rgba(255,255,255,0.65)";
    for (let j = 0; j < 5; j++) {
      g.beginPath();
      g.ellipse(baseX + j * 34, cy + Math.sin(j) * 6, 46 - j * 3, 22 - j * 1.5, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
}

function drawGround(ctx: Ctx, g: CanvasRenderingContext2D) {
  const w = ctx.world;
  const gx = -3000, gy = 200;
  const gw = WORLD_W + 6000, gh = 8000;
  const grad = g.createLinearGradient(0, gy, 0, gy + WORLD_H);
  grad.addColorStop(0, "#4a6e3f");
  grad.addColorStop(0.5, "#5a8447");
  grad.addColorStop(1, "#6b9a4c");
  g.fillStyle = grad;
  g.fillRect(gx, gy, gw, gh);

  for (let i = 0; i < 8; i++) {
    const seed = i * 17.31;
    const px = 300 + smoothNoise(seed, 1) * (WORLD_W - 600);
    const py = 320 + smoothNoise(seed, 2) * (WORLD_H - 500);
    const r = 40 + smoothNoise(seed, 3) * 80;
    g.fillStyle = "rgba(122, 85, 53, 0.32)";
    g.beginPath();
    g.ellipse(px, py, r, r * 0.45, 0, 0, Math.PI * 2);
    g.fill();
  }
}

function drawFlowersAndRocks(ctx: Ctx, g: CanvasRenderingContext2D) {
  const w = ctx.world;
  for (const r of w.rocks) {
    g.fillStyle = "rgba(80,72,60,0.7)";
    g.beginPath();
    g.ellipse(r.x, r.y, r.r, r.r * 0.55, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(200,190,168,0.6)";
    g.beginPath();
    g.ellipse(r.x - r.r * 0.3, r.y - r.r * 0.15, r.r * 0.5, r.r * 0.3, 0, 0, Math.PI * 2);
    g.fill();
  }
  for (const f of w.flowers) {
    g.strokeStyle = "rgba(50,80,40,0.7)";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(f.x, f.y + f.s);
    g.quadraticCurveTo(f.x + Math.sin(f.seed) * 2, f.y + f.s * 0.5, f.x, f.y);
    g.stroke();
    g.fillStyle = f.c;
    g.fillRect(f.x - f.s * 0.5, f.y - f.s * 0.5, f.s, f.s);
    g.fillStyle = PAL.gold_soft;
    g.fillRect(f.x, f.y, 1.5, 1.5);
  }
}

function drawGrass(ctx: Ctx, g: CanvasRenderingContext2D) {
  const w = ctx.world;
  const { camera, time } = ctx;
  const halfW = ctx.w / (2 * camera.zoom) + 120;
  const halfH = ctx.h / (2 * camera.zoom) + 120;
  const minX = camera.x - halfW, maxX = camera.x + halfW;
  const minY = camera.y - halfH, maxY = camera.y + halfH;

  for (const b of w.grassBlades) {
    if (b.x < minX || b.x > maxX || b.y < minY || b.y > maxY) continue;
    const wind = Math.sin(time * 1.6 + b.phase + b.x * 0.01) * 0.35 + b.bend;
    g.strokeStyle = b.color;
    g.lineWidth = b.w;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(b.x, b.y);
    const tipX = b.x + wind * b.h;
    const tipY = b.y - b.h;
    const midX = b.x + wind * b.h * 0.4;
    const midY = b.y - b.h * 0.55;
    g.quadraticCurveTo(midX, midY, tipX, tipY);
    g.stroke();
  }
}

function drawStonePath(ctx: Ctx, g: CanvasRenderingContext2D) {
  const stones = ctx.world.sprites.stoneSprite;
  const points = [
    { x: 1200, y: 1450 }, { x: 1200, y: 1380 }, { x: 1210, y: 1320 },
    { x: 1180, y: 1260 }, { x: 1150, y: 1200 }, { x: 1100, y: 1150 },
    { x: 1050, y: 1100 }, { x: 1030, y: 1050 }, { x: 1020, y: 1000 },
    { x: 1020, y: 950 }, { x: 1050, y: 900 }, { x: 1100, y: 860 },
    { x: 1170, y: 830 }, { x: 1250, y: 810 }, { x: 1340, y: 800 },
  ];
  for (const p of points) {
    g.drawImage(stones, p.x - stones.width / 2, p.y - stones.height / 2);
  }
}

function drawHatch(ctx: Ctx, g: CanvasRenderingContext2D) {
  const h = ctx.world.hatch;
  const d = Math.hypot(ctx.player.x - h.x, ctx.player.y - h.y);
  const near = d < 240;
  const time = ctx.time;
  const pulse = 0.75 + Math.sin(time * 2.2) * 0.25;
  if (!h.found) {
    const pillarH = 620;
    const pillar = g.createLinearGradient(h.x, h.y - pillarH, h.x, h.y);
    pillar.addColorStop(0, "rgba(255, 220, 150, 0)");
    pillar.addColorStop(0.6, `rgba(255, 220, 150, ${0.18 * pulse})`);
    pillar.addColorStop(1, `rgba(255, 200, 120, ${0.42 * pulse})`);
    g.fillStyle = pillar;
    g.beginPath();
    g.moveTo(h.x - 10, h.y);
    g.lineTo(h.x + 10, h.y);
    g.lineTo(h.x + 40, h.y - pillarH);
    g.lineTo(h.x - 40, h.y - pillarH);
    g.closePath();
    g.fill();
    const r = 130 + pulse * 20;
    const glow = g.createRadialGradient(h.x, h.y, 0, h.x, h.y, r);
    glow.addColorStop(0, `rgba(255, 217, 138, ${0.55 * pulse})`);
    glow.addColorStop(1, "rgba(255,217,138,0)");
    g.fillStyle = glow;
    g.fillRect(h.x - r, h.y - r, r * 2, r * 2);
    for (let i = 0; i < 6; i++) {
      const ph = (time * 0.6 + i * 0.31) % 1;
      const sy = h.y - ph * pillarH;
      const sx = h.x + Math.sin(time * 1.4 + i) * 14 * ph;
      const a = (1 - ph) * 0.9;
      g.fillStyle = `rgba(255, 235, 170, ${a})`;
      g.fillRect(sx, sy, 2, 2);
    }
  }
  if (near) {
    const t = 1 - clamp(d / 240, 0, 1);
    const r = 90 + t * 30;
    const glow = g.createRadialGradient(h.x, h.y, 0, h.x, h.y, r);
    glow.addColorStop(0, `rgba(255, 217, 138, ${0.35 * t})`);
    glow.addColorStop(1, "rgba(255,217,138,0)");
    g.fillStyle = glow;
    g.fillRect(h.x - r, h.y - r, r * 2, r * 2);
  }
  g.drawImage(ctx.world.sprites.hatchSprite,
    h.x - ctx.world.sprites.hatchSprite.width / 2,
    h.y - ctx.world.sprites.hatchSprite.height / 2);
}

function drawHedges(ctx: Ctx, g: CanvasRenderingContext2D) {
  const w = ctx.world;
  const clumps = w.sprites.hedgeClumps;
  const t = ctx.frame % 2 === 0 ? ctx.time : Math.floor(ctx.time * 4) / 4;
  for (const h of w.hedges) {
    g.fillStyle = "rgba(0,0,0,0.28)";
    g.beginPath();
    g.ellipse(h.x + h.w / 2, h.y + h.h + 4, h.w / 2 + 8, 10, 0, 0, Math.PI * 2);
    g.fill();

    const step = 32;
    const nx = Math.max(1, Math.ceil(h.w / step));
    const ny = Math.max(1, Math.ceil(h.h / step));
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const seed = (h.seed * 31 + ix * 7 + iy * 13);
        const cx = h.x + (ix + 0.5) * (h.w / nx);
        const cy = h.y + (iy + 0.5) * (h.h / ny);
        const sway = Math.sin(t * 1.4 + seed * 0.5) * 2.4;
        const variant = clumps[seed % clumps.length];
        g.drawImage(variant, cx - variant.width / 2 + sway, cy - variant.height / 2);
      }
    }
  }
}

function drawBushes(ctx: Ctx, g: CanvasRenderingContext2D) {
  const w = ctx.world;
  const bs = w.sprites.bushSprites;
  const t = ctx.time;
  for (const b of w.bushes) {
    const sway = Math.sin(t * 1.3 + b.seed * 0.6) * 1.6;
    const sp = bs[b.seed % bs.length];
    const scale = (b.r * 2) / sp.width;
    g.save();
    g.translate(b.x + sway, b.y);
    g.scale(scale, scale);
    g.drawImage(sp, -sp.width / 2, -sp.height / 2);
    g.restore();
  }
}

function drawTrees(ctx: Ctx, g: CanvasRenderingContext2D) {
  const w = ctx.world;
  const ts = w.sprites.treeSprites;
  const t = ctx.time;
  const sorted = [...w.trees].sort((a, b) => a.y - b.y);
  for (const tr of sorted) {
    const sp = ts[tr.seed % ts.length];
    const sway = Math.sin(t * 1.1 + tr.seed) * 3;
    g.save();
    g.translate(tr.x + sway, tr.y);
    g.scale(tr.scale, tr.scale);
    g.fillStyle = "rgba(0,0,0,0.35)";
    g.beginPath();
    g.ellipse(0, 8, sp.width * 0.28, 10, 0, 0, Math.PI * 2);
    g.fill();
    g.drawImage(sp, -sp.width / 2, -sp.height + 18);
    g.restore();
  }
}

function drawEntrance(ctx: Ctx, g: CanvasRenderingContext2D) {
  const w = ctx.world;
  const tower = w.sprites.towerSprite;
  const t = ctx.time;

  g.fillStyle = PAL.stone_dark;
  g.fillRect(300, 1330, 620, 30);
  g.fillRect(1480, 1330, 620, 30);
  g.fillStyle = "rgba(255,240,200,0.15)";
  g.fillRect(300, 1330, 620, 6);
  g.fillRect(1480, 1330, 620, 6);

  g.drawImage(tower, 760 - tower.width, 1360 - tower.height);
  g.drawImage(tower, 1640, 1360 - tower.height);

  for (const b of w.banners) drawBanner(g, b, t);

  const signSp = w.sprites.signSprite;
  for (const s of w.signs) {
    g.drawImage(signSp, s.x - signSp.width / 2, s.y - signSp.height);
  }

  const lamp = w.sprites.lampSprite;
  for (const L of w.lamps) {
    g.drawImage(lamp, L.x - lamp.width / 2, L.y - lamp.height);
    const hg = g.createRadialGradient(L.x, L.y - 40, 0, L.x, L.y - 40, 60);
    hg.addColorStop(0, "rgba(255, 214, 140, 0.55)");
    hg.addColorStop(1, "rgba(255, 214, 140, 0)");
    g.fillStyle = hg;
    g.fillRect(L.x - 60, L.y - 100, 120, 120);
  }
}

function drawBenches(ctx: Ctx, g: CanvasRenderingContext2D) {
  const bench = ctx.world.sprites.benchSprite;
  for (const b of ctx.world.benches) {
    g.drawImage(bench, b.x - bench.width / 2, b.y - bench.height);
  }
}

function drawBanner(g: CanvasRenderingContext2D, b: Banner, t: number) {
  const pole = 90;
  const w = 34, h = 68;
  g.fillStyle = PAL.wood_dark;
  g.fillRect(b.x - 2, b.y - pole, 4, pole);
  g.fillStyle = PAL.gold;
  g.beginPath(); g.arc(b.x, b.y - pole, 5, 0, Math.PI * 2); g.fill();
  g.save();
  const wave = (i: number) => Math.sin(t * 3 + b.phase + i * 0.4) * 3;
  g.beginPath();
  const top = b.y - pole + 6;
  g.moveTo(b.x - w / 2 + wave(0), top);
  for (let i = 1; i <= 5; i++) {
    g.lineTo(b.x - w / 2 + (w * i) / 5 + wave(i), top);
  }
  for (let i = 5; i >= 0; i--) {
    g.lineTo(b.x - w / 2 + (w * i) / 5 + wave(i + 6) * 0.8, top + h);
  }
  g.closePath();
  const grad = g.createLinearGradient(b.x, top, b.x, top + h);
  grad.addColorStop(0, b.c);
  grad.addColorStop(1, shade(b.c, -30));
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = PAL.gold_soft;
  g.lineWidth = 1.5;
  g.stroke();
  g.restore();
}

function shade(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const r = clamp(parseInt(h.slice(0, 2), 16) + amt, 0, 255);
  const gg = clamp(parseInt(h.slice(2, 4), 16) + amt, 0, 255);
  const b = clamp(parseInt(h.slice(4, 6), 16) + amt, 0, 255);
  return `rgb(${r},${gg},${b})`;
}

function buildSprites(): WorldSprites {
  return {
    hedgeClumps: [0, 1, 2, 3].map(i => makeHedgeClump(i)),
    bushSprites: [0, 1, 2].map(i => makeBush(i)),
    treeSprites: [0, 1, 2].map(i => makeTree(i)),
    flowerSprites: [],
    stoneSprite: makeStone(),
    towerSprite: makeTower(),
    bannerSprites: [],
    benchSprite: makeBench(),
    lampSprite: makeLamp(),
    signSprite: makeSign(),
    hatchSprite: makeHatch(),
  };
}

function cvs(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")!];
}

function makeHedgeClump(seed: number): HTMLCanvasElement {
  const [c, g] = cvs(80, 72);
  const cx = 40, cy = 40;
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.beginPath(); g.ellipse(cx, cy + 24, 30, 8, 0, 0, Math.PI * 2); g.fill();
  const grad = g.createRadialGradient(cx - 6, cy - 6, 4, cx, cy, 34);
  grad.addColorStop(0, PAL.hedge_light);
  grad.addColorStop(0.55, PAL.hedge_mid);
  grad.addColorStop(1, PAL.hedge_base);
  g.fillStyle = grad;
  g.beginPath(); g.arc(cx, cy, 30, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2 + seed * 0.7;
    const r = 12 + (i % 4) * 5;
    const lx = cx + Math.cos(a) * r;
    const ly = cy + Math.sin(a) * r * 0.85;
    g.fillStyle = i % 3 === 0 ? PAL.hedge_hi : PAL.hedge_light;
    g.beginPath();
    g.ellipse(lx, ly, 4, 3, a, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = "rgba(180,220,150,0.35)";
  g.beginPath(); g.ellipse(cx - 4, cy - 10, 14, 6, 0, 0, Math.PI * 2); g.fill();
  if (seed % 2 === 0) {
    g.fillStyle = PAL.gold_soft;
    g.beginPath(); g.arc(cx + 8, cy + 6, 1.6, 0, Math.PI * 2); g.fill();
  }
  return c;
}

function makeBush(seed: number): HTMLCanvasElement {
  const [c, g] = cvs(80, 60);
  const cx = 40, cy = 34;
  g.fillStyle = "rgba(0,0,0,0.3)";
  g.beginPath(); g.ellipse(cx, cy + 16, 30, 6, 0, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const dx = Math.cos(a) * 12, dy = Math.sin(a) * 8;
    const grad = g.createRadialGradient(cx + dx - 4, cy + dy - 4, 2, cx + dx, cy + dy, 18);
    grad.addColorStop(0, seed === 0 ? PAL.hedge_hi : "#6b9a4c");
    grad.addColorStop(1, PAL.hedge_base);
    g.fillStyle = grad;
    g.beginPath(); g.arc(cx + dx, cy + dy, 16, 0, Math.PI * 2); g.fill();
  }
  if (seed === 2) {
    for (let i = 0; i < 5; i++) {
      g.fillStyle = "#c74a4a";
      g.beginPath(); g.arc(cx + (i - 2) * 5, cy - 5 + (i % 2) * 3, 1.6, 0, Math.PI * 2); g.fill();
    }
  }
  return c;
}

function makeTree(seed: number): HTMLCanvasElement {
  const [c, g] = cvs(96, 128);
  const cx = 48;
  g.fillStyle = PAL.wood_dark;
  g.fillRect(cx - 6, 78, 12, 50);
  g.fillStyle = PAL.wood;
  g.fillRect(cx - 4, 78, 4, 50);
  const layers = [
    { y: 10, w: 34, h: 34, c: PAL.hedge_light },
    { y: 30, w: 52, h: 38, c: PAL.hedge_mid },
    { y: 54, w: 66, h: 42, c: PAL.hedge_base },
  ];
  for (const layer of layers) {
    g.fillStyle = layer.c;
    g.beginPath();
    g.moveTo(cx, layer.y);
    g.lineTo(cx - layer.w / 2, layer.y + layer.h);
    g.lineTo(cx + layer.w / 2, layer.y + layer.h);
    g.closePath();
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.12)";
    g.fillRect(cx - layer.w / 5, layer.y + layer.h * 0.52, Math.max(5, layer.w / 4), 3);
  }
  g.fillStyle = PAL.hedge_hi;
  g.fillRect(cx - 2, 16 + (seed % 3), 4, 4);
  return c;
}

function makeStone(): HTMLCanvasElement {
  const [c, g] = cvs(46, 32);
  const grad = g.createRadialGradient(20, 12, 4, 23, 16, 22);
  grad.addColorStop(0, PAL.stone);
  grad.addColorStop(1, PAL.stone_dark);
  g.fillStyle = grad;
  g.beginPath(); g.ellipse(23, 16, 20, 12, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(255,255,255,0.25)";
  g.beginPath(); g.ellipse(18, 12, 8, 3, -0.3, 0, Math.PI * 2); g.fill();
  return c;
}

function makeTower(): HTMLCanvasElement {
  const [c, g] = cvs(120, 200);
  g.fillStyle = "rgba(0,0,0,0.4)";
  g.beginPath(); g.ellipse(60, 195, 55, 8, 0, 0, Math.PI * 2); g.fill();
  const grad = g.createLinearGradient(0, 0, 120, 0);
  grad.addColorStop(0, PAL.stone_dark);
  grad.addColorStop(0.5, PAL.stone);
  grad.addColorStop(1, PAL.stone_dark);
  g.fillStyle = grad;
  g.fillRect(15, 40, 90, 155);
  g.fillStyle = PAL.terra;
  g.beginPath();
  g.moveTo(60, 0);
  g.lineTo(115, 50);
  g.lineTo(5, 50);
  g.closePath();
  g.fill();
  g.fillStyle = "rgba(0,0,0,0.25)";
  g.beginPath();
  g.moveTo(60, 0); g.lineTo(115, 50); g.lineTo(60, 50); g.closePath();
  g.fill();
  g.strokeStyle = "rgba(0,0,0,0.2)";
  g.lineWidth = 1;
  for (let y = 60; y < 190; y += 24) {
    g.beginPath(); g.moveTo(15, y); g.lineTo(105, y); g.stroke();
  }
  for (let x = 30; x < 100; x += 24) {
    for (let y = 60; y < 190; y += 24) {
      g.beginPath(); g.moveTo(x + (y / 24) % 2 * 12, y); g.lineTo(x + (y / 24) % 2 * 12, y + 24); g.stroke();
    }
  }
  g.fillStyle = "#241040";
  g.fillRect(50, 90, 20, 30);
  g.fillStyle = PAL.gold_soft;
  g.fillRect(52, 92, 16, 6);
  return c;
}

function makeBench(): HTMLCanvasElement {
  const [c, g] = cvs(90, 40);
  g.fillStyle = "rgba(0,0,0,0.3)";
  g.beginPath(); g.ellipse(45, 38, 40, 4, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = PAL.wood;
  g.fillRect(10, 18, 70, 8);
  g.fillStyle = PAL.wood_dark;
  g.fillRect(15, 26, 6, 12);
  g.fillRect(69, 26, 6, 12);
  g.fillStyle = "rgba(255,255,255,0.15)";
  g.fillRect(10, 18, 70, 2);
  return c;
}

function makeLamp(): HTMLCanvasElement {
  const [c, g] = cvs(30, 100);
  g.fillStyle = "rgba(0,0,0,0.3)";
  g.beginPath(); g.ellipse(15, 98, 10, 3, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#2a2018";
  g.fillRect(13, 20, 4, 78);
  g.fillStyle = "#3a2c20";
  g.beginPath();
  g.moveTo(5, 20); g.lineTo(25, 20); g.lineTo(20, 5); g.lineTo(10, 5); g.closePath();
  g.fill();
  const grad = g.createRadialGradient(15, 14, 1, 15, 14, 10);
  grad.addColorStop(0, "#fff2c0");
  grad.addColorStop(1, "#d99a3a");
  g.fillStyle = grad;
  g.fillRect(8, 8, 14, 12);
  return c;
}

function makeSign(): HTMLCanvasElement {
  const [c, g] = cvs(120, 80);
  g.fillStyle = "rgba(0,0,0,0.3)";
  g.beginPath(); g.ellipse(60, 78, 30, 3, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = PAL.wood_dark;
  g.fillRect(20, 40, 5, 40);
  g.fillRect(95, 40, 5, 40);
  const grad = g.createLinearGradient(0, 20, 0, 60);
  grad.addColorStop(0, PAL.wood);
  grad.addColorStop(1, PAL.wood_dark);
  g.fillStyle = grad;
  g.fillRect(10, 20, 100, 34);
  g.strokeStyle = "rgba(0,0,0,0.4)";
  g.strokeRect(10, 20, 100, 34);
  g.fillStyle = PAL.cream;
  g.font = "italic 11px 'Iowan Old Style', Palatino, Georgia, serif";
  g.textAlign = "center";
  g.fillText("EDAS Academy", 60, 38);
  g.fillStyle = PAL.gold_soft;
  g.fillText("The Great Competition", 60, 50);
  return c;
}

function makeHatch(): HTMLCanvasElement {
  const [c, g] = cvs(80, 60);
  g.fillStyle = "rgba(0,0,0,0.55)";
  g.beginPath(); g.ellipse(40, 40, 30, 12, 0, 0, Math.PI * 2); g.fill();
  const grad = g.createRadialGradient(40, 28, 4, 40, 30, 30);
  grad.addColorStop(0, PAL.wood);
  grad.addColorStop(1, PAL.wood_dark);
  g.fillStyle = grad;
  g.beginPath(); g.ellipse(40, 30, 28, 10, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(0,0,0,0.55)";
  g.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    g.beginPath(); g.moveTo(40 + i * 8, 22); g.lineTo(40 + i * 8, 40); g.stroke();
  }
  g.strokeStyle = "#1a1a1a";
  g.lineWidth = 2;
  g.beginPath(); g.arc(40, 28, 5, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = "rgba(255,217,138,0.7)";
  g.lineWidth = 0.8;
  g.beginPath(); g.moveTo(28, 30); g.lineTo(52, 30); g.stroke();
  return c;
}
