/**
 * Hearth Hollow — the hub area between regions.
 *
 * A small, warm underground chamber lit by a single suspended lantern.
 * Two carved doorways lead onward: one east to the Garden of Forgotten
 * Numbers, one west to the Sunken Primer (Bram's home). This is the
 * first piece of the "small world, deep world" hub structure from the
 * EDAS design bible — cheap to build, and the natural place to keep
 * adding future regions/characters without touching existing scenes.
 */

import type { Ctx } from "./engine";
import { rand, lerp, dist } from "./engine";

export const HH_W = 2600;
export const HH_H = 700;

const HPAL = {
  wall: "#241a2e",
  wall_hi: "#3a2c48",
  floor: "#1a1220",
  floor_hi: "#2c2036",
  lantern_glow: "#ffcf8a",
  door_stone: "#5a5062",
};

// Old Wick — the hub's gruff, warm lantern-keeper (bible §6.4). Full
// favor-fetching questline (restoring his ability to light his own
// lanterns) is future scope — this is his presence and personality
// established first, per the roadmap's "smallest shippable slice" habit.
const WICK_LINES = [
  "Wick: Mind the flame. It's older than it looks.",
  "Wick: Doors don't open themselves. Go on, then.",
  "Wick: I used to light every lantern in this place myself.",
  "Wick: Can't quite remember how, some days. Don't tell CoCo.",
  "Wick: You've got that look. Go find what you're looking for.",
];

export interface HearthDoor {
  x: number; y: number;
  label: string;
  target: string; // "garden" | "primer" | a REGION_CONFIGS key
}

export interface OldWick {
  x: number; y: number;
  facing: number;
  talk: boolean; talkT: number;
  lineIdx: number;
  ph: number;
}

export interface HearthState {
  bounds: { w: number; h: number };
  groundY: number;
  playerStart: { x: number; y: number };
  lantern: { x: number; y: number };
  doors: HearthDoor[];
  motes: { x: number; y: number; s: number; ph: number }[];
  oldWick: OldWick;
}

export function buildHearth(): HearthState {
  const groundY = HH_H - 180;
  const lantern = { x: HH_W / 2, y: groundY - 220 };
  const oldWick: OldWick = {
    x: HH_W / 2 - 40, y: groundY - 10,
    facing: 1, talk: false, talkT: 0, lineIdx: 0, ph: 0,
  };
  // 8 doors spread evenly across the widened hub, lantern at the center.
  const doors: HearthDoor[] = [
    { x: 160, y: groundY - 40, label: "The Sunken Primer", target: "primer" },
    { x: 480, y: groundY - 40, label: "Count's Hollow", target: "counts_hollow" },
    { x: 800, y: groundY - 40, label: "Grammarwood", target: "grammarwood" },
    { x: 1120, y: groundY - 40, label: "The Cistern", target: "cistern" },
    { x: 1480, y: groundY - 40, label: "Garden of Forgotten Numbers", target: "garden" },
    { x: 1800, y: groundY - 40, label: "Hall of Ever-After", target: "hall_of_everafter" },
    { x: 2120, y: groundY - 40, label: "Gallery of Unfinished Things", target: "gallery" },
    { x: 2440, y: groundY - 40, label: "Archive Spire", target: "archive_spire" },
  ];
  const motes: HearthState["motes"] = [];
  for (let i = 0; i < 30; i++) {
    motes.push({ x: rand(100, HH_W - 100), y: rand(groundY - 260, groundY), s: rand(0.8, 1.8), ph: rand(0, 7) });
  }
  return {
    bounds: { w: HH_W, h: HH_H },
    groundY,
    playerStart: { x: HH_W / 2, y: groundY - 10 },
    lantern,
    doors,
    motes,
    oldWick,
  };
}

export function updateHearth(ctx: Ctx) {
  const hs = ctx.hearth; if (!hs) return;
  const dt = ctx.dt;
  const w = hs.oldWick;
  w.ph += dt;
  const dNear = dist(ctx.player.x, ctx.player.y, w.x, w.y);
  if (dNear < 100) {
    if (!w.talk) w.lineIdx = (w.lineIdx + 1) % WICK_LINES.length;
    w.talk = true; w.talkT = 1.2;
    w.facing = ctx.player.x > w.x ? 1 : -1;
  } else if (w.talkT > 0) {
    w.talkT -= dt;
    if (w.talkT <= 0) w.talk = false;
  }
  for (const m of hs.motes) {
    m.y -= dt * 6;
    if (m.y < hs.groundY - 280) { m.y = hs.groundY; m.x = rand(100, hs.bounds.w - 100); }
  }
  // Door transitions are handled centrally in engine.ts's update loop
  // (keeps this file free of a circular import back to engine.ts).
}

export function drawHearth(ctx: Ctx, g: CanvasRenderingContext2D, layer: "sky" | "ground" | "midground" | "foreground") {
  const hs = ctx.hearth; if (!hs) return;
  const t = ctx.time;

  if (layer === "sky") {
    const { w, h } = ctx;
    g.fillStyle = HPAL.wall;
    g.fillRect(0, 0, w, h);
    return;
  }

  if (layer === "ground") {
    g.fillStyle = HPAL.wall;
    g.fillRect(-200, 0, hs.bounds.w + 400, hs.groundY + 40);
    g.fillStyle = HPAL.wall_hi;
    for (let i = 0; i < 8; i++) {
      g.fillRect(80 + i * 130, 40, 3, hs.groundY - 60);
    }
    g.fillStyle = HPAL.floor;
    g.fillRect(-200, hs.groundY, hs.bounds.w + 400, 400);
    g.fillStyle = HPAL.floor_hi;
    for (let i = 0; i < 10; i++) {
      g.beginPath();
      g.ellipse(60 + i * 100, hs.groundY + 20 + (i % 2) * 10, 40, 8, 0, 0, Math.PI * 2);
      g.fill();
    }
    return;
  }

  if (layer === "midground") {
    // Lantern glow
    const pulse = 0.8 + Math.sin(t * 1.6) * 0.2;
    const grad = g.createRadialGradient(hs.lantern.x, hs.lantern.y, 0, hs.lantern.x, hs.lantern.y, 260);
    grad.addColorStop(0, `rgba(255,207,138,${0.35 * pulse})`);
    grad.addColorStop(1, "rgba(255,207,138,0)");
    g.fillStyle = grad;
    g.fillRect(hs.lantern.x - 260, hs.lantern.y - 260, 520, 520);
    // chain
    g.strokeStyle = "#5a5040"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(hs.lantern.x, 20); g.lineTo(hs.lantern.x, hs.lantern.y - 18); g.stroke();
    // lantern body
    g.fillStyle = "#3a2c1a";
    g.fillRect(hs.lantern.x - 14, hs.lantern.y - 18, 28, 34);
    g.fillStyle = `rgba(255,220,150,${pulse})`;
    g.fillRect(hs.lantern.x - 9, hs.lantern.y - 12, 18, 22);

    // doorways
    for (const d of hs.doors) drawDoor(g, d, t);

    // Old Wick
    drawOldWick(g, hs.oldWick, t);

    // dust motes
    for (const m of hs.motes) {
      const a = 0.35 + Math.sin(t * 2 + m.ph) * 0.25;
      g.fillStyle = `rgba(255,225,180,${a})`;
      g.fillRect(m.x, m.y, m.s, m.s);
    }
    return;
  }
}

function drawOldWick(g: CanvasRenderingContext2D, w: OldWick, t: number) {
  const fx = w.facing;
  const bob = Math.sin(w.ph * 1.2) * 1;
  g.save();
  g.translate(w.x, w.y - bob);
  g.scale(1.15 * fx, 1.15);

  // shadow
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.beginPath(); g.ellipse(0, 20, 13, 4, 0, 0, Math.PI * 2); g.fill();

  // stocky legs
  g.fillStyle = "#3a3226";
  g.fillRect(-6, 6, 5, 13);
  g.fillRect(1, 6, 5, 13);
  g.fillStyle = "#161310";
  g.fillRect(-7, 18, 6, 3); g.fillRect(0, 18, 6, 3);

  // heavy coat — wide, rounded silhouette (he's stocky, warm, worn-in)
  const cgrad = g.createLinearGradient(-10, -10, 10, 12);
  cgrad.addColorStop(0, "#5a4230");
  cgrad.addColorStop(1, "#2e2016");
  g.fillStyle = cgrad;
  g.beginPath();
  g.moveTo(-10, 10); g.quadraticCurveTo(-11, -6, -6, -10);
  g.quadraticCurveTo(0, -12, 6, -10);
  g.quadraticCurveTo(11, -6, 10, 10);
  g.quadraticCurveTo(0, 13, -10, 10);
  g.closePath(); g.fill();
  // coat buttons
  g.fillStyle = "#c9a13f";
  for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(0, -4 + i * 4, 0.9, 0, Math.PI * 2); g.fill(); }

  // lantern staff — his signature prop, per the bible
  g.strokeStyle = "#241a10"; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(11, -20); g.lineTo(9, 12); g.stroke();
  const glow = 0.6 + Math.sin(t * 2.2) * 0.3;
  g.fillStyle = `rgba(255,210,140,${glow})`;
  g.beginPath(); g.arc(11, -22, 3.4, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#241a10";
  g.beginPath(); g.arc(11, -22, 3.4, 0, Math.PI * 2); g.stroke();

  // head — weathered, a heavy brow, small round glasses
  const hy = -18;
  g.fillStyle = "#d9b48c";
  g.beginPath(); g.ellipse(0, hy, 6.6, 6.8, 0, 0, Math.PI * 2); g.fill();
  // grey hair + bushy brows
  g.fillStyle = "#c9c2b0";
  g.beginPath(); g.arc(0, hy - 3, 6.8, Math.PI * 0.95, Math.PI * 2.05); g.fill();
  g.fillStyle = "#a89f8a";
  g.fillRect(-4.5, hy - 2.4, 3, 1.1); g.fillRect(1.5, hy - 2.4, 3, 1.1);
  // small round glasses
  g.strokeStyle = "#241a10"; g.lineWidth = 0.8;
  g.beginPath(); g.arc(-2.2, hy + 0.3, 1.6, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(2.4, hy + 0.3, 1.6, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(-0.6, hy + 0.3); g.lineTo(0.8, hy + 0.3); g.stroke();
  g.fillStyle = "rgba(200,220,255,0.35)";
  g.beginPath(); g.arc(-2.2, hy + 0.3, 1.3, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(2.4, hy + 0.3, 1.3, 0, Math.PI * 2); g.fill();
  // grey beard
  g.fillStyle = "#c9c2b0";
  g.beginPath();
  g.moveTo(-4, hy + 2); g.quadraticCurveTo(0, hy + 8, 4, hy + 2);
  g.quadraticCurveTo(0, hy + 4, -4, hy + 2);
  g.closePath(); g.fill();
  g.restore();

  // talk bubble
  if (w.talk) {
    g.save();
    const line = WICK_LINES[w.lineIdx];
    const bw = Math.max(60, line.length * 3.4);
    const bx = w.x, by = w.y - 48 - bob;
    g.fillStyle = "rgba(20,14,10,0.82)";
    g.strokeStyle = "rgba(255,217,138,0.55)";
    g.lineWidth = 1;
    g.beginPath(); g.ellipse(bx, by, bw / 2, 10, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = "#ffe9c0";
    g.font = "7.5px 'Iowan Old Style', Palatino, Georgia, serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(line, bx, by + 1);
    g.restore();
  }
}

function drawDoor(g: CanvasRenderingContext2D, d: HearthDoor, t: number) {
  const pulse = 0.6 + Math.sin(t * 1.3 + d.x) * 0.2;
  g.save();
  g.fillStyle = HPAL.door_stone;
  g.fillRect(d.x - 46, d.y - 140, 92, 140);
  const grad = g.createRadialGradient(d.x, d.y - 60, 4, d.x, d.y - 60, 70);
  grad.addColorStop(0, `rgba(180,220,255,${0.5 * pulse})`);
  grad.addColorStop(1, "rgba(180,220,255,0)");
  g.fillStyle = grad;
  g.fillRect(d.x - 70, d.y - 130, 140, 130);
  g.fillStyle = `rgba(20,14,30,${0.7})`;
  g.fillRect(d.x - 30, d.y - 120, 60, 120);
  g.fillStyle = `rgba(255,230,190,${0.6 + pulse * 0.3})`;
  g.font = "10px 'Iowan Old Style', Palatino, Georgia, serif";
  g.textAlign = "center";
  g.fillText(d.label, d.x, d.y - 150);
  g.restore();
}

export function drawHearthOverlay(ctx: Ctx, g: CanvasRenderingContext2D) {
  const hs = ctx.hearth; if (!hs) return;
  const { w, h } = ctx;
  const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(5,3,10,0.6)");
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);

  for (const d of hs.doors) {
    if (dist(ctx.player.x, ctx.player.y, d.x, d.y) < 90 && ctx.state === "explore") {
      g.save();
      g.fillStyle = "rgba(10,6,18,0.72)";
      g.strokeStyle = "rgba(255,217,138,0.7)";
      g.lineWidth = 1;
      const tw = 70;
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
