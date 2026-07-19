/**
 * FX — particles + lighting + post-processing.
 *
 * Particles: butterflies, birds, pollen, leaves, fireflies, dust.
 * Lighting: soft ambient warm sheen (no directional sun — was bugged).
 * Post: vignette + gentle film grain.
 */

import type { Ctx } from "./engine";
import { rand, clamp, lerp } from "./engine";
import { WORLD_W, WORLD_H, PAL, type World } from "./world";

export type ParticleKind = "butterfly" | "bird" | "pollen" | "leaf" | "firefly" | "dust";

interface Particle {
  kind: ParticleKind;
  x: number; y: number;
  vx: number; vy: number;
  ph: number;
  s: number;
  color: string;
  rot: number; vr: number;
  target?: { x: number; y: number }; // for butterflies orbiting hatch
  life?: number;
}

export interface FxState {
  particles: Particle[];
  nextBird: number;
}

export function createFxState(world: World): FxState {
  const particles: Particle[] = [];

  // scatter butterflies throughout, extras near hatch
  for (let i = 0; i < 6; i++) {
    particles.push(makeButterfly(rand(300, WORLD_W - 300), rand(400, WORLD_H - 300)));
  }
  for (let i = 0; i < 3; i++) {
    particles.push(makeButterfly(world.hatch.x + rand(-80, 80), world.hatch.y + rand(-80, 80), world.hatch));
  }
  // pollen motes
  for (let i = 0; i < 18; i++) {
    particles.push({
      kind: "pollen", x: rand(200, WORLD_W - 200), y: rand(300, WORLD_H - 200),
      vx: rand(-3, 3), vy: rand(-8, -2), ph: rand(0, 7),
      s: rand(1, 2.4), color: PAL.gold_soft, rot: 0, vr: 0,
    });
  }
  // drifting leaves
  for (let i = 0; i < 8; i++) {
    particles.push({
      kind: "leaf", x: rand(200, WORLD_W - 200), y: rand(-100, 300),
      vx: rand(-16, -4), vy: rand(30, 55), ph: rand(0, 7),
      s: rand(5, 9), color: Math.random() < 0.5 ? PAL.terra : "#d9a13f",
      rot: rand(0, 7), vr: rand(-1.5, 1.5),
    });
  }
  // fireflies for morning haze (dim during day)
  for (let i = 0; i < 6; i++) {
    particles.push({
      kind: "firefly", x: rand(300, WORLD_W - 300), y: rand(400, WORLD_H - 300),
      vx: rand(-8, 8), vy: rand(-8, 8), ph: rand(0, 7),
      s: rand(1.6, 2.8), color: PAL.gold_soft, rot: 0, vr: 0,
    });
  }
  // (sunlight dust removed — sun was bugged)

  return { particles, nextBird: rand(6, 14) };
}

function makeButterfly(x: number, y: number, target?: { x: number; y: number }): Particle {
  const cols = ["#ffd98a", "#e0619a", "#9a7bf0", "#f2b441", "#8fb6cf"];
  return {
    kind: "butterfly", x, y,
    vx: 0, vy: 0, ph: rand(0, 7),
    s: rand(3.5, 5.5), color: cols[Math.floor(rand(0, cols.length))],
    rot: 0, vr: 0,
    target,
  };
}

function makeBird(): Particle {
  return {
    kind: "bird",
    x: -50, y: rand(60, 260),
    vx: rand(80, 140), vy: 0,
    ph: 0, s: rand(0.7, 1.1),
    color: "#241040", rot: 0, vr: 0,
    life: 20,
  };
}

// --- update --------------------------------------------------------------
export function updateFx(ctx: Ctx) {
  const fx = ctx.fx;
  const dt = ctx.dt;
  const t = ctx.time;

  // spawn birds occasionally
  fx.nextBird -= dt;
  if (fx.nextBird <= 0) {
    fx.particles.push(makeBird());
    fx.nextBird = rand(10, 24);
  }

  for (let i = fx.particles.length - 1; i >= 0; i--) {
    const p = fx.particles[i];
    p.ph += dt;
    switch (p.kind) {
      case "butterfly": {
        if (p.target) {
          const dx = p.target.x - p.x, dy = p.target.y - p.y;
          const d = Math.hypot(dx, dy) || 1;
          const orbit = Math.sin(t * 0.8 + p.ph) * 60;
          const desiredX = p.target.x + Math.cos(t + p.ph) * (80 + orbit * 0.3);
          const desiredY = p.target.y + Math.sin(t * 0.9 + p.ph) * (60 + orbit * 0.2);
          p.x = lerp(p.x, desiredX, 0.02);
          p.y = lerp(p.y, desiredY, 0.02);
        } else {
          // figure-8 wander
          p.x += Math.sin(t * 1.4 + p.ph) * 22 * dt + Math.cos(p.ph * 0.4) * 6 * dt;
          p.y += Math.cos(t * 1.7 + p.ph) * 18 * dt - 4 * dt;
          if (p.y < 200) p.y = WORLD_H - 300;
          if (p.x < 200) p.x = WORLD_W - 200;
          if (p.x > WORLD_W - 200) p.x = 200;
        }
        break;
      }
      case "bird": {
        p.x += p.vx * dt;
        p.y += Math.sin(t * 3 + p.x * 0.005) * 10 * dt;
        if (p.life !== undefined) { p.life -= dt; if (p.x > WORLD_W + 100 || p.life <= 0) fx.particles.splice(i, 1); }
        break;
      }
      case "pollen": {
        p.x += (p.vx + Math.sin(t * 1.4 + p.ph) * 6) * dt;
        p.y += p.vy * dt;
        if (p.y < 200) { p.y = WORLD_H - 200; p.x = rand(200, WORLD_W - 200); }
        break;
      }
      case "leaf": {
        p.rot += p.vr * dt;
        p.x += (p.vx + Math.sin(p.rot) * 18) * dt;
        p.y += p.vy * dt;
        if (p.y > WORLD_H + 40) { p.y = -30; p.x = rand(200, WORLD_W - 200); }
        break;
      }
      case "firefly": {
        p.x += Math.sin(p.ph * 1.3) * 14 * dt;
        p.y += Math.cos(p.ph * 1.1) * 14 * dt;
        break;
      }
      case "dust": {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y < 100) { p.y = WORLD_H - 100; p.x = rand(200, WORLD_W - 200); }
        break;
      }
    }
  }

  // extra golden pollen concentration near hatch
  const h = ctx.world.hatch;
  const d = Math.hypot(ctx.player.x - h.x, ctx.player.y - h.y);
  if (d < 300 && Math.random() < dt * 2) {
    fx.particles.push({
      kind: "pollen",
      x: h.x + rand(-40, 40),
      y: h.y + rand(-40, 40),
      vx: rand(-6, 6), vy: rand(-14, -4),
      ph: rand(0, 7), s: rand(1.2, 2.6),
      color: PAL.gold_soft, rot: 0, vr: 0,
    });
  }
  // cap particle count
  if (fx.particles.length > 80) fx.particles.splice(0, fx.particles.length - 80);
}

// --- draw ----------------------------------------------------------------
export function drawSkyFx(ctx: Ctx, g: CanvasRenderingContext2D) {
  // Sun removed — was bugged. Just birds now.
  const { w } = ctx;
  for (const p of ctx.fx.particles) {
    if (p.kind !== "bird") continue;
    const scr = worldToScreen(ctx, p.x, p.y);
    if (scr.x < -60 || scr.x > w + 60) continue;
    drawBirdSprite(g, scr.x, scr.y, ctx.time + p.ph, p.s);
  }
}

function worldToScreen(ctx: Ctx, wx: number, wy: number) {
  const { camera, w, h } = ctx;
  return {
    x: (wx - camera.x) * camera.zoom + w / 2,
    y: (wy - camera.y) * camera.zoom + h / 2 + camera.bob,
  };
}

function drawBirdSprite(g: CanvasRenderingContext2D, x: number, y: number, t: number, s: number) {
  const flap = Math.sin(t * 8) * 0.6;
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.strokeStyle = "rgba(30,20,40,0.85)";
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(-12, 0);
  g.quadraticCurveTo(-6, -6 - flap * 4, 0, 0);
  g.quadraticCurveTo(6, -6 - flap * 4, 12, 0);
  g.stroke();
  g.restore();
}

export function drawGroundFx(ctx: Ctx, g: CanvasRenderingContext2D) {
  // Leaves and dust that live at ground plane (below entities).
  for (const p of ctx.fx.particles) {
    if (p.kind === "leaf") drawLeaf(g, p);
    else if (p.kind === "dust") drawDust(g, p);
  }
}

export function drawAirFx(ctx: Ctx, g: CanvasRenderingContext2D) {
  // Butterflies, pollen, fireflies — above entities.
  const t = ctx.time;
  for (const p of ctx.fx.particles) {
    if (p.kind === "butterfly") drawButterfly(g, p, t);
    else if (p.kind === "pollen") drawPollen(g, p, t);
    else if (p.kind === "firefly") drawFirefly(g, p, t);
  }
}

function drawLeaf(g: CanvasRenderingContext2D, p: Particle) {
  g.save();
  g.translate(p.x, p.y);
  g.rotate(p.rot);
  g.fillStyle = p.color;
  g.beginPath();
  g.ellipse(0, 0, p.s, p.s * 0.45, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(0,0,0,0.3)";
  g.lineWidth = 0.5;
  g.beginPath(); g.moveTo(-p.s, 0); g.lineTo(p.s, 0); g.stroke();
  g.restore();
}

function drawDust(g: CanvasRenderingContext2D, p: Particle) {
  g.fillStyle = p.color;
  g.beginPath();
  g.arc(p.x, p.y, p.s, 0, Math.PI * 2);
  g.fill();
}

function drawButterfly(g: CanvasRenderingContext2D, p: Particle, t: number) {
  const flap = Math.sin(t * 12 + p.ph) * 0.7 + 0.3;
  g.save();
  g.translate(p.x, p.y);
  const ws = p.s * (0.5 + flap * 0.5);
  const hs = p.s * 0.9;
  // wing shadow
  g.fillStyle = "rgba(0,0,0,0.15)";
  g.beginPath(); g.ellipse(-ws, 0, ws, hs, 0.3, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(ws, 0, ws, hs, -0.3, 0, Math.PI * 2); g.fill();
  // wings
  g.fillStyle = p.color;
  g.beginPath(); g.ellipse(-ws * 0.9, 0, ws, hs, 0.3, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(ws * 0.9, 0, ws, hs, -0.3, 0, Math.PI * 2); g.fill();
  // body
  g.fillStyle = "#2a1a30";
  g.beginPath(); g.ellipse(0, 0, 0.9, p.s * 0.5, 0, 0, Math.PI * 2); g.fill();
  g.restore();
}

function drawPollen(g: CanvasRenderingContext2D, p: Particle, t: number) {
  const a = 0.5 + Math.sin(t * 2 + p.ph) * 0.35;
  g.save();
  g.globalAlpha = a;
  const grad = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 3);
  grad.addColorStop(0, p.color);
  grad.addColorStop(1, "rgba(255,217,138,0)");
  g.fillStyle = grad;
  g.beginPath(); g.arc(p.x, p.y, p.s * 3, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 1;
  g.restore();
}

function drawFirefly(g: CanvasRenderingContext2D, p: Particle, t: number) {
  const glow = 0.4 + Math.sin(t * 3 + p.ph) * 0.35;
  const grad = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 5);
  grad.addColorStop(0, `rgba(255, 230, 160, ${0.7 * glow})`);
  grad.addColorStop(1, "rgba(255, 230, 160, 0)");
  g.fillStyle = grad;
  g.fillRect(p.x - p.s * 5, p.y - p.s * 5, p.s * 10, p.s * 10);
  g.fillStyle = `rgba(255,255,220,${glow})`;
  g.beginPath(); g.arc(p.x, p.y, p.s * 0.6, 0, Math.PI * 2); g.fill();
}

// --- lighting overlay ----------------------------------------------------
export function drawLightingOverlay(ctx: Ctx, g: CanvasRenderingContext2D) {
  const { w, h } = ctx;
  // Soft ambient sheen — non-directional, no sun artifact.
  const amb = g.createLinearGradient(0, 0, 0, h);
  amb.addColorStop(0, "rgba(255, 226, 176, 0.07)");
  amb.addColorStop(1, "rgba(40, 30, 70, 0.10)");
  g.fillStyle = amb;
  g.fillRect(0, 0, w, h);

  // Suspense — as the player nears the strange patch the world dims
  // and cools, warm sunlight drains from the edges.
  const s = ctx.suspense ?? 0;
  if (s > 0.02) {
    g.fillStyle = `rgba(20, 14, 34, ${0.35 * s})`;
    g.fillRect(0, 0, w, h);
    // radial "clarity" hole around the player so the center still reads
    const cx = w / 2, cy = h / 2 + ctx.camera.bob;
    const r = Math.max(w, h) * 0.5;
    const vg = g.createRadialGradient(cx, cy, r * 0.25, cx, cy, r);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, `rgba(0, 0, 10, ${0.55 * s})`);
    g.fillStyle = vg;
    g.fillRect(0, 0, w, h);
  }
}

// --- post fx -------------------------------------------------------------
export function drawPostFX(ctx: Ctx, g: CanvasRenderingContext2D) {
  const { w, h } = ctx;

  // vignette
  const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(10,4,20,0.55)");
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);

}

// unused re-export to keep type import stable
export type { World };
export { clamp };
