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

export const HH_W = 1000;
export const HH_H = 700;

const HPAL = {
  wall: "#241a2e",
  wall_hi: "#3a2c48",
  floor: "#1a1220",
  floor_hi: "#2c2036",
  lantern_glow: "#ffcf8a",
  door_stone: "#5a5062",
};

export interface HearthDoor {
  x: number; y: number;
  label: string;
  target: "garden" | "primer";
}

export interface HearthState {
  bounds: { w: number; h: number };
  groundY: number;
  playerStart: { x: number; y: number };
  lantern: { x: number; y: number };
  doors: HearthDoor[];
  motes: { x: number; y: number; s: number; ph: number }[];
}

export function buildHearth(): HearthState {
  const groundY = HH_H - 180;
  const lantern = { x: HH_W / 2, y: groundY - 220 };
  const doors: HearthDoor[] = [
    { x: HH_W - 120, y: groundY - 40, label: "Garden of Forgotten Numbers", target: "garden" },
    { x: 120, y: groundY - 40, label: "The Sunken Primer", target: "primer" },
  ];
  const motes: HearthState["motes"] = [];
  for (let i = 0; i < 16; i++) {
    motes.push({ x: rand(100, HH_W - 100), y: rand(groundY - 260, groundY), s: rand(0.8, 1.8), ph: rand(0, 7) });
  }
  return {
    bounds: { w: HH_W, h: HH_H },
    groundY,
    playerStart: { x: HH_W / 2, y: groundY - 10 },
    lantern,
    doors,
    motes,
  };
}

export function updateHearth(ctx: Ctx) {
  const hs = ctx.hearth; if (!hs) return;
  const dt = ctx.dt;
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

    // dust motes
    for (const m of hs.motes) {
      const a = 0.35 + Math.sin(t * 2 + m.ph) * 0.25;
      g.fillStyle = `rgba(255,225,180,${a})`;
      g.fillRect(m.x, m.y, m.s, m.s);
    }
    return;
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
