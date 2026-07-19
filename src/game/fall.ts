/**
 * Phase 3 fall sequence — cinematic vertical descent into darkness.
 *
 * Rendered as a full-screen overlay when ctx.state === "falling".
 * Owns: floating debris (stones, roots, papers, books, desks),
 * upward-drifting golden pollen, brief memory-vision flashes,
 * and a shrinking shaft of daylight above.
 */

import type { Ctx } from "./engine";
import { rand, clamp, lerp } from "./engine";

export type DebrisKind = "stone" | "root" | "paper" | "book" | "desk" | "dust";
export type VisionKind =
  | "children" | "classroom" | "library" | "teacher"
  | "tree" | "clock" | "hands" | "notebook";

export interface FallDebris {
  x: number; y: number;
  vx: number; vy: number;
  rot: number; vr: number;
  kind: DebrisKind;
  s: number;
  color: string;
}

export interface Vision {
  t: number;    // trigger time (s)
  dur: number;  // duration (s)
  kind: VisionKind;
}

export interface FallState {
  t: number;
  duration: number;
  debris: FallDebris[];
  visions: Vision[];
  activeVision: Vision | null;
  lightSize: number;
  done: boolean;
}

export function startFall(): FallState {
  const debris: FallDebris[] = [];
  for (let i = 0; i < 38; i++) debris.push(makeDebris(rand(-800, 1600)));
  const visions: Vision[] = [];
  const kinds: VisionKind[] = [
    "children","classroom","library","teacher",
    "clock","hands","notebook","tree",
  ];
  let t = 1.4;
  let i = 0;
  while (t < 7.2) {
    visions.push({ t, dur: rand(0.20, 0.38), kind: kinds[i % kinds.length] });
    t += rand(0.55, 1.0);
    i++;
  }
  return { t: 0, duration: 8.6, debris, visions, activeVision: null, lightSize: 1, done: false };
}

function makeDebris(startY: number): FallDebris {
  const kinds: DebrisKind[] = ["stone","root","paper","book","desk","dust","dust","paper"];
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  const heavy = kind === "stone" || kind === "book" || kind === "desk";
  return {
    x: rand(-520, 520),
    y: startY,
    vx: rand(-24, 24),
    vy: heavy ? rand(-80, -30) : rand(-160, -60),
    rot: rand(0, Math.PI * 2),
    vr: rand(-1.8, 1.8),
    kind,
    s: rand(0.55, 1.35),
    color:
      kind === "dust" ? "#ffd98a" :
      kind === "paper" ? "#efe4c8" :
      kind === "book" ? "#8a4a2a" :
      kind === "desk" ? "#6a3f22" :
      kind === "root" ? "#4a2a10" : "#8a8070",
  };
}

export function updateFall(ctx: Ctx, fall: FallState) {
  const dt = ctx.dt;
  fall.t += dt;
  for (const d of fall.debris) {
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.rot += d.vr * dt;
    if (d.y < -900) {
      const nd = makeDebris(1000 + rand(0, 400));
      Object.assign(d, nd);
    }
  }
  fall.activeVision = null;
  for (const v of fall.visions) {
    if (fall.t >= v.t && fall.t < v.t + v.dur) { fall.activeVision = v; break; }
  }
  const shrink = clamp((fall.t - 5.6) / 2.4, 0, 1);
  fall.lightSize = 1 - shrink;
  if (fall.t >= fall.duration) fall.done = true;
}

export function drawFall(ctx: Ctx, g: CanvasRenderingContext2D, fall: FallState) {
  const { w, h } = ctx;

  // pitch dark base
  g.fillStyle = "#040208";
  g.fillRect(0, 0, w, h);

  // shaft of light from above — the hatch, shrinking away
  const cx = w / 2;
  if (fall.lightSize > 0.02) {
    const ls = fall.lightSize;
    const shaftR = 40 + ls * (Math.max(w, h) * 0.55);
    const shaft = g.createRadialGradient(cx, -60, 0, cx, -60, shaftR);
    shaft.addColorStop(0, `rgba(255,225,160,${0.55 * ls})`);
    shaft.addColorStop(0.35, `rgba(255,195,120,${0.22 * ls})`);
    shaft.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = shaft;
    g.fillRect(0, 0, w, h);
    // hatch opening — a bright ellipse near top that shrinks
    const hR = 18 + 90 * ls;
    g.fillStyle = `rgba(255,235,180,${0.9 * ls})`;
    g.beginPath();
    g.ellipse(cx, 30 + (1 - ls) * 20, hR, hR * 0.42, 0, 0, Math.PI * 2);
    g.fill();
    // ragged broken edges around the hole
    g.strokeStyle = `rgba(60,30,10,${0.7 * ls})`;
    g.lineWidth = 3;
    g.beginPath();
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const rr = hR * (0.95 + Math.sin(i * 3.3) * 0.18);
      const x = cx + Math.cos(a) * rr;
      const y = 30 + Math.sin(a) * rr * 0.42;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }

  // debris — screen space, drift upward past the falling player
  g.save();
  g.translate(cx, h * 0.55);
  for (const d of fall.debris) {
    g.save();
    g.translate(d.x, d.y);
    g.rotate(d.rot);
    g.scale(d.s, d.s);
    drawDebrisSprite(g, d);
    g.restore();
  }
  g.restore();

  // player silhouette in center — shrinking, tumbling slowly
  const pt = clamp(fall.t / fall.duration, 0, 1);
  const scale = lerp(1.15, 0.12, pt);
  const swayX = Math.sin(fall.t * 0.9) * 24;
  const swayY = Math.sin(fall.t * 1.4) * 12;
  g.save();
  g.translate(cx + swayX, h * 0.52 + swayY);
  g.rotate(fall.t * 0.7);
  g.scale(scale, scale);
  // silhouette lit softly from above
  g.fillStyle = "#1a0f2a";
  g.beginPath();
  g.arc(0, -18, 8, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(-8, -10); g.lineTo(8, -10); g.lineTo(7, 12); g.lineTo(-7, 12); g.closePath(); g.fill();
  // outstretched arms
  g.strokeStyle = "#1a0f2a";
  g.lineWidth = 4; g.lineCap = "round";
  g.beginPath();
  g.moveTo(-6, -6); g.lineTo(-22, -18);
  g.moveTo(6, -6); g.lineTo(22, -18);
  g.stroke();
  // legs trailing
  g.beginPath();
  g.moveTo(-4, 12); g.lineTo(-8, 30);
  g.moveTo(4, 12); g.lineTo(8, 30);
  g.stroke();
  // subtle rim light
  g.strokeStyle = "rgba(255,220,150,0.35)";
  g.lineWidth = 1.2;
  g.beginPath(); g.arc(0, -18, 8, 0, Math.PI * 2); g.stroke();
  g.restore();

  // memory vision flash
  if (fall.activeVision) {
    const v = fall.activeVision;
    const p = (fall.t - v.t) / v.dur;
    const a = Math.sin(p * Math.PI) * 0.6;
    drawVision(g, w, h, v.kind, a);
  }

  // deepening vignette
  const vg = g.createRadialGradient(cx, h / 2, Math.min(w, h) * 0.2, cx, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, `rgba(0,0,0,${0.55 + (1 - fall.lightSize) * 0.4})`);
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
}

function drawDebrisSprite(g: CanvasRenderingContext2D, d: FallDebris) {
  g.fillStyle = d.color;
  switch (d.kind) {
    case "stone": {
      g.beginPath(); g.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(255,255,255,0.18)";
      g.beginPath(); g.ellipse(-3, -2, 5, 2, 0, 0, Math.PI * 2); g.fill();
      break;
    }
    case "root": {
      g.strokeStyle = d.color; g.lineWidth = 2.2; g.lineCap = "round";
      g.beginPath();
      g.moveTo(-16, 4);
      g.bezierCurveTo(-6, -6, 4, 8, 16, -2);
      g.stroke();
      g.beginPath(); g.moveTo(-2, 0); g.lineTo(-8, 8); g.stroke();
      break;
    }
    case "paper": {
      g.globalAlpha = 0.92;
      g.fillRect(-8, -11, 16, 22);
      g.strokeStyle = "rgba(120,100,70,0.7)"; g.lineWidth = 0.6;
      for (let i = -7; i <= 7; i += 3) {
        g.beginPath(); g.moveTo(-6, i); g.lineTo(6, i); g.stroke();
      }
      g.globalAlpha = 1;
      break;
    }
    case "book": {
      g.fillRect(-10, -7, 20, 14);
      g.fillStyle = "#efe4c8";
      g.fillRect(-9, -6, 3, 12);
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.fillRect(-10, -7, 20, 1.5);
      break;
    }
    case "desk": {
      g.fillRect(-18, -5, 36, 5);
      g.fillRect(-16, 0, 3, 12);
      g.fillRect(13, 0, 3, 12);
      g.fillStyle = "rgba(255,255,255,0.12)";
      g.fillRect(-18, -5, 36, 1.2);
      break;
    }
    case "dust": {
      g.globalAlpha = 0.55;
      g.fillRect(-2, -2, 4, 4);
      g.globalAlpha = 1;
      break;
    }
  }
}

function drawVision(g: CanvasRenderingContext2D, w: number, h: number, kind: VisionKind, alpha: number) {
  const cx = w / 2, cy = h / 2;
  g.save();
  g.globalAlpha = alpha;
  // sepia backdrop
  const bg = g.createRadialGradient(cx, cy, 20, cx, cy, Math.max(w, h) * 0.55);
  bg.addColorStop(0, "rgba(255,220,170,0.5)");
  bg.addColorStop(1, "rgba(50,30,20,0)");
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = "screen";
  const stroke = "rgba(255,235,190,0.85)";
  const fill = "rgba(255,235,190,0.55)";
  g.strokeStyle = stroke; g.fillStyle = fill; g.lineWidth = 2;

  switch (kind) {
    case "children": {
      for (let i = -1; i <= 1; i++) {
        const x = cx + i * 46;
        g.beginPath(); g.arc(x, cy - 6, 13, 0, Math.PI * 2); g.fill();
        g.fillRect(x - 11, cy + 6, 22, 34);
      }
      break;
    }
    case "classroom": {
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 5; c++)
          g.strokeRect(cx - 150 + c * 60, cy - 40 + r * 34, 44, 20);
      break;
    }
    case "library": {
      for (let i = 0; i < 9; i++)
        g.strokeRect(cx - 180 + i * 40, cy - 70, 32, 140);
      break;
    }
    case "teacher": {
      g.beginPath(); g.arc(cx, cy - 40, 18, 0, Math.PI * 2); g.fill();
      g.beginPath();
      g.moveTo(cx - 30, cy - 18); g.lineTo(cx + 30, cy - 18);
      g.lineTo(cx + 22, cy + 60); g.lineTo(cx - 22, cy + 60); g.closePath();
      g.fill();
      break;
    }
    case "tree": {
      g.beginPath(); g.arc(cx, cy - 26, 90, 0, Math.PI * 2); g.fill();
      g.fillRect(cx - 10, cy + 40, 20, 90);
      break;
    }
    case "clock": {
      g.beginPath(); g.arc(cx, cy, 80, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * 70, cy + Math.sin(a) * 70);
        g.lineTo(cx + Math.cos(a) * 78, cy + Math.sin(a) * 78);
        g.stroke();
      }
      // broken hands
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 44, cy - 24); g.stroke();
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx - 14, cy + 54); g.stroke();
      // crack
      g.strokeStyle = "rgba(30,10,20,0.6)"; g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(cx - 60, cy - 40);
      g.lineTo(cx - 20, cy - 10);
      g.lineTo(cx + 10, cy + 20);
      g.lineTo(cx + 60, cy + 40);
      g.stroke();
      break;
    }
    case "hands": {
      for (let i = 0; i < 4; i++) {
        const ox = (i - 1.5) * 80;
        g.beginPath();
        g.moveTo(cx + ox, cy + 100);
        g.lineTo(cx + ox - 16, cy - 30);
        g.lineTo(cx + ox + 16, cy - 30);
        g.closePath(); g.fill();
        for (let j = -1; j <= 1; j++) {
          g.fillRect(cx + ox + j * 6 - 2, cy - 60, 4, 30);
        }
      }
      break;
    }
    case "notebook": {
      g.strokeRect(cx - 70, cy - 46, 140, 92);
      for (let i = 0; i < 7; i++) {
        g.beginPath();
        g.moveTo(cx - 60, cy - 34 + i * 12);
        g.lineTo(cx + 60, cy - 34 + i * 12);
        g.stroke();
      }
      g.beginPath(); g.moveTo(cx, cy - 46); g.lineTo(cx, cy + 46); g.stroke();
      break;
    }
  }
  g.restore();
}
