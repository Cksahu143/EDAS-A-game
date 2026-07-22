/**
 * Shared engine for the six smaller regions (Count's Hollow, Grammarwood,
 * The Cistern, Hall of Ever-After, Gallery of Unfinished Things, Archive
 * Spire). Rather than writing six nearly-identical scene files, every
 * region is a config object (palette, decor glyphs, characters) run
 * through one generic build/update/draw pipeline — the same pattern as
 * Hearth Hollow / Sunken Primer but parameterized instead of duplicated.
 *
 * This trades bespoke per-character art for genuine region-to-region
 * variety (palette, decor, cast) at a fraction of the cost of six fully
 * bespoke scenes. Characters are simple, distinguishable silhouettes
 * (see drawCreature) rather than full rigs like Bram/Old Wick — a
 * deliberate scope trade so all six regions could ship in one pass.
 */

import type { Ctx } from "./engine";
import { rand, lerp, dist, clamp } from "./engine";

export type CreatureKind =
  | "letter_serif" | "letter_sans" | "frog" | "digit" | "papers" | "eye" | "notes";

export interface RegionCharacterConfig {
  id: string;
  name: string;
  kind: CreatureKind;
  color: string;
  x: number; y: number;
  paceRange: number; // 0 = stationary
  lines: string[];
}

export interface RegionConfig {
  id: string;
  title: string;
  width: number;
  height: number;
  groundY: number;
  skyTop: string; skyBottom: string;
  groundTop: string; groundBottom: string;
  accent: string;
  glyphs: string[]; // floating thematic decor, e.g. ["7","3","÷"]
  bgShape: "arches" | "shelves" | "pillars" | "frames" | "pipes" | "trees";
  characters: RegionCharacterConfig[];
  introLine: string;
}

interface RegionCharacter {
  cfg: RegionCharacterConfig;
  x: number; y: number;
  from: number; to: number; t: number;
  paused: boolean; pauseT: number;
  facing: number; walk: number;
  talk: boolean; talkT: number; lineIdx: number;
}

interface GlyphMote { x: number; y: number; s: number; ph: number; ch: string; }

export interface RegionState {
  config: RegionConfig;
  characters: RegionCharacter[];
  motes: GlyphMote[];
  playerStart: { x: number; y: number };
  returnPoint: { x: number; y: number };
  introShown: boolean;
}

export function buildRegion(config: RegionConfig): RegionState {
  const characters: RegionCharacter[] = config.characters.map(cfg => ({
    cfg,
    x: cfg.x, y: cfg.y,
    from: cfg.x - cfg.paceRange, to: cfg.x + cfg.paceRange, t: rand(0, 1),
    paused: true, pauseT: rand(0.5, 2),
    facing: 1, walk: 0,
    talk: false, talkT: 0, lineIdx: 0,
  }));
  const motes: GlyphMote[] = [];
  for (let i = 0; i < 14; i++) {
    motes.push({
      x: rand(80, config.width - 80),
      y: rand(80, config.groundY - 40),
      s: rand(10, 16),
      ph: rand(0, 7),
      ch: config.glyphs[Math.floor(rand(0, config.glyphs.length))],
    });
  }
  return {
    config,
    characters,
    motes,
    playerStart: { x: 120, y: config.groundY - 10 },
    returnPoint: { x: 70, y: config.groundY - 10 },
    introShown: false,
  };
}

export function updateRegion(ctx: Ctx) {
  const rs = ctx.region; if (!rs) return;
  const dt = ctx.dt, t = ctx.time;
  const p = ctx.player;

  for (const m of rs.motes) {
    m.y -= dt * 5;
    m.ph += dt;
    if (m.y < 60) { m.y = rs.config.groundY - 20; m.x = rand(80, rs.config.width - 80); }
  }

  for (const c of rs.characters) {
    if (c.cfg.paceRange > 0) {
      if (c.paused) {
        c.pauseT -= dt;
        if (c.pauseT <= 0) {
          c.paused = false; c.t = 0;
          const tmp = c.from; c.from = c.to; c.to = tmp;
          c.facing = c.to > c.from ? 1 : -1;
        }
      } else {
        c.t += dt * 0.22;
        if (c.t >= 1) { c.t = 1; c.paused = true; c.pauseT = rand(1, 2.5); }
        c.x = lerp(c.from, c.to, c.t);
        c.walk += dt * 5;
      }
    }
    const dNear = dist(p.x, p.y, c.x, c.y);
    if (dNear < 95) {
      if (!c.talk) c.lineIdx = (c.lineIdx + 1) % c.cfg.lines.length;
      c.talk = true; c.talkT = 1.3;
      c.facing = p.x > c.x ? 1 : -1;
    } else if (c.talkT > 0) {
      c.talkT -= dt;
      if (c.talkT <= 0) c.talk = false;
    }
  }

  if (!rs.introShown) {
    rs.introShown = true;
    const say = (ctx.story as unknown as { _say?: (t: string, d?: number, a?: boolean) => Promise<void> })._say;
    if (say) void say(rs.config.introLine, 3200, true);
  }
}

export function drawRegion(ctx: Ctx, g: CanvasRenderingContext2D, layer: "sky" | "ground" | "midground" | "foreground") {
  const rs = ctx.region; if (!rs) return;
  const cfg = rs.config;
  const t = ctx.time;

  if (layer === "sky") {
    const { w, h } = ctx;
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, cfg.skyTop);
    grad.addColorStop(1, cfg.skyBottom);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    return;
  }

  if (layer === "ground") {
    g.fillStyle = cfg.groundTop;
    g.fillRect(-200, 0, cfg.width + 400, cfg.groundY + 60);
    const gg = g.createLinearGradient(0, cfg.groundY, 0, cfg.groundY + 300);
    gg.addColorStop(0, cfg.groundTop);
    gg.addColorStop(1, cfg.groundBottom);
    g.fillStyle = gg;
    g.fillRect(-200, cfg.groundY, cfg.width + 400, 300);
    g.fillStyle = "rgba(0,0,0,0.12)";
    for (let i = 0; i < 10; i++) {
      g.beginPath();
      g.ellipse(60 + i * (cfg.width / 10), cfg.groundY + 20, 50, 8, 0, 0, Math.PI * 2);
      g.fill();
    }
    return;
  }

  if (layer === "midground") {
    drawBgShape(g, cfg, t);
    // floating thematic glyphs
    for (const m of rs.motes) {
      const a = 0.35 + Math.sin(t * 1.5 + m.ph) * 0.2;
      g.save();
      g.globalAlpha = a;
      g.fillStyle = cfg.accent;
      g.font = `${m.s}px 'Iowan Old Style', Palatino, Georgia, serif`;
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(m.ch, m.x, m.y);
      g.restore();
    }
    for (const c of rs.characters) drawCharacterCreature(g, c, t);
    return;
  }
}

// Background architectural silhouettes — cheap (a handful of shapes,
// no sprite cache needed) but the single biggest lever for making each
// region feel distinct rather than "same room, different color."
function drawBgShape(g: CanvasRenderingContext2D, cfg: RegionConfig, t: number) {
  const w = cfg.width, gy = cfg.groundY;
  g.save();
  g.globalAlpha = 0.5;
  g.fillStyle = cfg.accent;
  switch (cfg.bgShape) {
    case "arches": {
      // Count's Hollow — stone arches marching into the distance
      for (let i = 0; i < 5; i++) {
        const x = 80 + i * (w / 5);
        g.beginPath();
        g.moveTo(x, gy - 10);
        g.quadraticCurveTo(x + 30, gy - 140, x + 60, gy - 10);
        g.lineTo(x + 45, gy - 10);
        g.quadraticCurveTo(x + 30, gy - 110, x + 15, gy - 10);
        g.closePath(); g.fill();
      }
      break;
    }
    case "shelves": {
      // Archive Spire — tall bookshelves receding into darkness
      for (let i = 0; i < 6; i++) {
        const x = 60 + i * (w / 6);
        g.fillRect(x, gy - 220, 14, 220);
        for (let s = 0; s < 5; s++) {
          g.fillStyle = "rgba(0,0,0,0.3)";
          g.fillRect(x + 2, gy - 200 + s * 38, 10, 4);
          g.fillStyle = cfg.accent;
        }
      }
      break;
    }
    case "pillars": {
      // Grammarwood — thick mossy tree pillars
      for (let i = 0; i < 6; i++) {
        const x = 60 + i * (w / 6) + Math.sin(i) * 20;
        g.beginPath();
        g.ellipse(x, gy - 100, 16, 110, 0, 0, Math.PI * 2);
        g.fill();
      }
      break;
    }
    case "frames": {
      // Gallery of Unfinished Things — empty picture frames on the wall
      for (let i = 0; i < 5; i++) {
        const x = 100 + i * (w / 5);
        g.strokeStyle = cfg.accent; g.lineWidth = 5;
        g.strokeRect(x, gy - 220, 70, 90);
      }
      break;
    }
    case "pipes": {
      // The Cistern — dripping stone pipes/stalactites from the ceiling
      for (let i = 0; i < 8; i++) {
        const x = 40 + i * (w / 8);
        const len = 60 + (i % 3) * 30;
        g.beginPath();
        g.moveTo(x, 0); g.lineTo(x + 14, 0); g.lineTo(x + 7, len);
        g.closePath(); g.fill();
      }
      break;
    }
    case "trees": {
      // fallback / Hall of Ever-After — tall thin ghostly columns
      for (let i = 0; i < 7; i++) {
        const x = 50 + i * (w / 7);
        g.fillRect(x, gy - 240, 8, 240);
      }
      break;
    }
  }
  g.restore();
}

export function drawRegionOverlay(ctx: Ctx, g: CanvasRenderingContext2D) {
  const rs = ctx.region; if (!rs) return;
  const { w, h } = ctx;
  const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(10,8,16,0.5)");
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);

  const p = ctx.player;
  let hint = "";
  if (dist(p.x, p.y, rs.returnPoint.x, rs.returnPoint.y) < 70) {
    hint = "E · Return to Hearth Hollow";
  }
  if (hint) {
    g.save();
    g.fillStyle = "rgba(10,6,18,0.72)";
    g.strokeStyle = "rgba(255,217,138,0.7)";
    g.lineWidth = 1;
    const tw = Math.max(70, hint.length * 5.4);
    g.fillRect(w / 2 - tw / 2, h - 60, tw, 20);
    g.strokeRect(w / 2 - tw / 2, h - 60, tw, 20);
    g.fillStyle = "#ffd98a";
    g.font = "9px 'Iowan Old Style', Palatino, Georgia, serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(hint, w / 2, h - 50);
    g.restore();
  }
}

// --- generic creature rig -------------------------------------------------
function drawCharacterCreature(g: CanvasRenderingContext2D, c: RegionCharacter, t: number) {
  const bob = c.paused ? Math.sin(t * 1.8 + c.x) * 1.4 : Math.abs(Math.sin(c.walk)) * 2;
  g.fillStyle = "rgba(0,0,0,0.3)";
  g.beginPath(); g.ellipse(c.x, c.y + 16, 14, 4, 0, 0, Math.PI * 2); g.fill();

  g.save();
  g.translate(c.x, c.y - bob);
  g.scale(c.facing, 1);
  drawCreature(g, c.cfg.kind, c.cfg.color, t);
  g.restore();

  if (c.talk) {
    const line = c.cfg.lines[c.lineIdx];
    const bw = Math.max(64, line.length * 3.6);
    const bx = c.x, by = c.y - 48 - bob;
    g.save();
    g.fillStyle = "rgba(16,12,20,0.82)";
    g.strokeStyle = `${c.cfg.color}99`;
    g.lineWidth = 1;
    g.beginPath(); g.ellipse(bx, by, bw / 2, 11, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = "#f5ecd8";
    g.font = "7.5px 'Iowan Old Style', Palatino, Georgia, serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(line, bx, by + 1);
    // small name tag under the bubble
    g.fillStyle = c.cfg.color;
    g.font = "6px 'Iowan Old Style', Palatino, Georgia, serif";
    g.fillText(c.cfg.name, bx, by + 13);
    g.restore();
  }
}

function shadeGradC(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = Math.max(0, Math.min(255, parseInt(h.slice(0, 2), 16) + amt));
  const g2 = Math.max(0, Math.min(255, parseInt(h.slice(2, 4), 16) + amt));
  const b = Math.max(0, Math.min(255, parseInt(h.slice(4, 6), 16) + amt));
  return `rgb(${r},${g2},${b})`;
}

function drawCreature(g: CanvasRenderingContext2D, kind: CreatureKind, color: string, t: number) {
  switch (kind) {
    case "letter_serif": {
      // bold "A" body with little legs/feet underneath — reads as a
      // character standing, not a floating glyph symbol
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.beginPath(); g.ellipse(0, 15, 9, 2.4, 0, 0, Math.PI * 2); g.fill();
      // tiny legs
      g.strokeStyle = shadeGradC(color, -30); g.lineWidth = 2.6; g.lineCap = "round";
      g.beginPath(); g.moveTo(-4, 10); g.lineTo(-5, 14); g.stroke();
      g.beginPath(); g.moveTo(4, 10); g.lineTo(5, 14); g.stroke();
      // bold "A" torso/body
      g.strokeStyle = color; g.lineWidth = 6; g.lineCap = "round"; g.lineJoin = "round";
      g.beginPath();
      g.moveTo(-8, 10); g.lineTo(0, -12); g.lineTo(8, 10);
      g.moveTo(-4, 2); g.lineTo(4, 2);
      g.stroke();
      g.fillStyle = color;
      g.fillRect(-10, 9, 5, 2); g.fillRect(5, 9, 5, 2); // serif feet
      drawFace(g, 0, -2, color, t, "worried");
      break;
    }
    case "letter_sans": {
      // rounded, loose sans "a" blob body, sitting low with stub feet
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.beginPath(); g.ellipse(0, 13, 9, 2.4, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = shadeGradC(color, -25);
      g.beginPath(); g.ellipse(-4, 10, 2.4, 1.6, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(4, 10, 2.4, 1.6, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = color;
      g.beginPath(); g.ellipse(0, 2, 9, 10, 0.15, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(255,255,255,0.9)";
      g.beginPath(); g.ellipse(3, 3, 3, 4, 0.15, 0, Math.PI * 2); g.fill();
      drawFace(g, -2, 0, color, t, "playful");
      break;
    }
    case "frog": {
      // squat rounded frog, sitting — embarrassed posture (low, hunched)
      g.fillStyle = color;
      g.beginPath(); g.ellipse(0, 4, 11, 8, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(-5, -4, 4.2, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(5, -4, 4.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#1a1a1a";
      g.beginPath(); g.arc(-5, -4, 1.6, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(5, -4, 1.6, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "rgba(0,0,0,0.4)"; g.lineWidth = 1;
      g.beginPath(); g.moveTo(-3, 6); g.quadraticCurveTo(0, 8, 3, 6); g.stroke();
      break;
    }
    case "digit": {
      // small round "3"-shaped worried digit, with tiny feet
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.beginPath(); g.ellipse(0, 13, 7, 2, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = shadeGradC(color, -25);
      g.beginPath(); g.ellipse(-3, 10, 2, 1.4, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(3, 10, 2, 1.4, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = color;
      g.beginPath(); g.ellipse(0, 0, 8, 10, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(-3, -6); g.quadraticCurveTo(4, -6, 3, -1); g.quadraticCurveTo(6, 4, -3, 6); g.stroke();
      drawFace(g, 0, -1, color, t, "worried");
      break;
    }
    case "papers": {
      // stack of hall-pass papers, propped with a tiny visible base so it
      // reads as sitting on the ground rather than floating
      g.fillStyle = "rgba(0,0,0,0.2)";
      g.beginPath(); g.ellipse(0, 11, 10, 2.4, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#e8dcc0";
      for (let i = 0; i < 3; i++) {
        g.save(); g.rotate((i - 1) * 0.06);
        g.fillRect(-9, -2 + i * 3, 18, 10);
        g.strokeStyle = "rgba(120,100,70,0.3)"; g.lineWidth = 0.5;
        g.strokeRect(-9, -2 + i * 3, 18, 10);
        g.restore();
      }
      drawFace(g, 0, -6, color, t, "tired");
      break;
    }
    case "eye": {
      // ornate framed eye, mounted crooked
      g.save(); g.rotate(-0.12);
      g.fillStyle = "#8a6b3a";
      g.beginPath(); g.ellipse(0, 0, 15, 11, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#f5ecd8";
      g.beginPath(); g.ellipse(0, 0, 11, 7.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = color;
      const blink = Math.sin(t * 1.3) > 0.95 ? 0.15 : 1;
      g.beginPath(); g.ellipse(0, 0, 4.5, 4.5 * blink, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#1a1a1a";
      g.beginPath(); g.arc(0, 0, 2 * blink, 0, Math.PI * 2); g.fill();
      g.restore();
      break;
    }
    case "notes": {
      // small floating scrap with cursive squiggle "writing"
      g.save(); g.rotate(Math.sin(t * 1.1) * 0.12);
      g.fillStyle = "#f2e6c8";
      g.beginPath(); g.moveTo(-7, -6); g.lineTo(7, -8); g.lineTo(8, 7); g.lineTo(-6, 8); g.closePath(); g.fill();
      g.strokeStyle = color; g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(-4, -3); g.quadraticCurveTo(-1, -5, 2, -3); g.quadraticCurveTo(4, -1, 1, 1);
      g.moveTo(-4, 2); g.quadraticCurveTo(0, 0, 4, 3);
      g.stroke();
      g.restore();
      break;
    }
  }
}

// Small shared expressive face used by several creature kinds — brows do
// the emotional work (per the CoCo bible's own note on facial economy).
function drawFace(g: CanvasRenderingContext2D, x: number, y: number, color: string, t: number, mood: "worried" | "playful" | "tired") {
  g.fillStyle = "#1a1a1a";
  g.beginPath(); g.arc(x - 2.4, y, 1, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(x + 2.4, y, 1, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#1a1a1a"; g.lineWidth = 0.8;
  if (mood === "worried") {
    g.beginPath(); g.moveTo(x - 3.2, y - 2.2); g.lineTo(x - 1.4, y - 1.4); g.stroke();
    g.beginPath(); g.moveTo(x + 1.4, y - 1.4); g.lineTo(x + 3.2, y - 2.2); g.stroke();
  } else if (mood === "playful") {
    g.beginPath(); g.arc(x, y + 2.4, 1.6, 0, Math.PI); g.stroke();
  } else {
    g.beginPath(); g.moveTo(x - 3, y - 1.6); g.lineTo(x - 1, y - 1.6); g.stroke();
    g.beginPath(); g.moveTo(x + 1, y - 1.6); g.lineTo(x + 3, y - 1.6); g.stroke();
  }
}
