/**
 * The Sunken Primer — Bram's home region.
 *
 * Bram is a run-on sentence given a friendly, breathless voice, unable to
 * stop talking until the player finds his missing period. He rambles
 * constantly (one long unpunctuated line that keeps extending itself);
 * finding the glowing period object and bringing it to him gives him,
 * at last, a full stop — a small, satisfying piece of wordplay-as-character
 * from the EDAS design bible (§6.1).
 */

import type { Ctx } from "./engine";
import { rand, lerp, dist } from "./engine";

export const SP_W = 1400;
export const SP_H = 800;

const SPAL = {
  wall: "#1c2436",
  page: "#e8ddbe",
  page_dark: "#c9bb90",
  ink: "#2a2418",
  gold: "#ffd98a",
};

const BRAM_RAMBLE =
  "hello hello I've been meaning to say something for absolutely ages now but I just cannot seem to find the right moment to stop and honestly I'm not even sure what stopping would feel like at this point because I've simply been going and going and going and";

export interface BramState {
  x: number; y: number;
  from: number; to: number;
  t: number;
  facing: number;
  walk: number;
  paused: boolean;
  pauseT: number;
  hasPeriod: boolean;
  justFinished: boolean;
  finishedT: number;
}

export interface PeriodItem {
  x: number; y: number;
  collected: boolean;
  ph: number;
}

export interface PrimerState {
  bounds: { w: number; h: number };
  groundY: number;
  playerStart: { x: number; y: number };
  bram: BramState;
  period: PeriodItem;
  pageDrifts: { x: number; y: number; r: number; ph: number }[];
  returnPoint: { x: number; y: number };
  halfPageSpot: { x: number; y: number; found: boolean };
}

export function buildPrimer(): PrimerState {
  const groundY = SP_H - 240;
  const bram: BramState = {
    x: SP_W / 2 + 120, y: groundY - 10,
    from: SP_W / 2 - 40, to: SP_W / 2 + 260,
    t: 0.4, facing: 1, walk: 0,
    paused: true, pauseT: 1,
    hasPeriod: false, justFinished: false, finishedT: 0,
  };
  const period: PeriodItem = {
    x: 220, y: groundY - 8,
    collected: false,
    ph: 0,
  };
  const pageDrifts: PrimerState["pageDrifts"] = [];
  for (let i = 0; i < 10; i++) {
    pageDrifts.push({ x: rand(100, SP_W - 100), y: rand(80, groundY - 60), r: rand(10, 20), ph: rand(0, 7) });
  }
  return {
    bounds: { w: SP_W, h: SP_H },
    groundY,
    playerStart: { x: 140, y: groundY - 10 },
    bram,
    period,
    pageDrifts,
    returnPoint: { x: 80, y: groundY - 10 },
    // Tucked in the far corner, past Bram — deliberately easy to miss,
    // per the design bible's "hidden, environmentally-clued" note.
    halfPageSpot: { x: SP_W - 120, y: groundY + 4, found: false },
  };
}

export function updatePrimer(ctx: Ctx) {
  const ps = ctx.primer; if (!ps) return;
  const dt = ctx.dt, t = ctx.time;
  const b = ps.bram;

  if (!b.hasPeriod) {
    if (b.paused) {
      b.pauseT -= dt;
      if (b.pauseT <= 0) {
        b.paused = false; b.t = 0;
        const tmp = b.from; b.from = b.to; b.to = tmp;
        b.facing = b.to > b.from ? 1 : -1;
      }
    } else {
      b.t += dt * 0.25;
      if (b.t >= 1) { b.t = 1; b.paused = true; b.pauseT = rand(1, 2); }
      b.x = lerp(b.from, b.to, b.t);
      b.walk += dt * 5;
    }
  }

  for (const pg of ps.pageDrifts) pg.ph += dt;
  ps.period.ph += dt;

  if (!ps.period.collected && !b.hasPeriod) {
    if (dist(ctx.player.x, ctx.player.y, ps.period.x, ps.period.y) < 40) {
      ps.period.collected = true;
      void sayLine(ctx, "A tiny, heavy, round little thing. A period.", 2600, true);
    }
  }

  if (ctx.input.interactEdge && ctx.state === "explore" && ps.period.collected && !b.hasPeriod) {
    if (dist(ctx.player.x, ctx.player.y, b.x, b.y) < 90) {
      b.hasPeriod = true;
      b.justFinished = true;
      b.finishedT = 2.5;
      b.paused = true; b.pauseT = 999999;
      void sayLine(ctx, "Bram: ...oh. Oh! I— I have a period now. I can stop. I can just... stop.", 4600);
    }
  }
  if (b.justFinished) {
    b.finishedT -= dt;
    if (b.finishedT <= 0) b.justFinished = false;
  }

  // Half-Page — found by walking near, no keypress, no fanfare. Once
  // found it becomes a permanent Ctx-level companion (see engine.ts)
  // that quietly follows the player everywhere from here on.
  if (!ps.halfPageSpot.found && dist(ctx.player.x, ctx.player.y, ps.halfPageSpot.x, ps.halfPageSpot.y) < 40) {
    ps.halfPageSpot.found = true;
    if (ctx.halfPage) {
      ctx.halfPage.active = true;
      ctx.halfPage.x = ps.halfPageSpot.x;
      ctx.halfPage.y = ps.halfPageSpot.y;
    }
    void sayLine(ctx, "Something small and quiet decides to follow you.", 3200, true);
  }
}

async function sayLine(ctx: Ctx, text: string, dur: number, ambient = false) {
  const say = (ctx.story as unknown as { _say?: (t: string, d?: number, a?: boolean) => Promise<void> })._say;
  if (say) await say(text, dur, ambient);
}

export function drawPrimer(ctx: Ctx, g: CanvasRenderingContext2D, layer: "sky" | "ground" | "midground" | "foreground") {
  const ps = ctx.primer; if (!ps) return;
  const t = ctx.time;

  if (layer === "sky") {
    const { w, h } = ctx;
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#232c42");
    grad.addColorStop(1, "#141a28");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    return;
  }

  if (layer === "ground") {
    g.fillStyle = SPAL.wall;
    g.fillRect(-200, 0, ps.bounds.w + 400, ps.groundY + 60);
    g.fillStyle = SPAL.page;
    g.fillRect(-200, ps.groundY, ps.bounds.w + 400, 300);
    g.fillStyle = SPAL.page_dark;
    for (let i = 0; i < 12; i++) {
      g.fillRect(-100 + i * 130, ps.groundY, 100, 4);
    }
    return;
  }

  if (layer === "midground") {
    for (const pg of ps.pageDrifts) {
      const sway = Math.sin(t * 0.7 + pg.ph) * 10;
      g.save();
      g.translate(pg.x + sway, pg.y);
      g.rotate(Math.sin(t * 0.5 + pg.ph) * 0.15);
      g.fillStyle = "rgba(232,221,190,0.55)";
      g.fillRect(-pg.r, -pg.r * 0.7, pg.r * 2, pg.r * 1.4);
      g.strokeStyle = "rgba(42,36,24,0.3)";
      g.lineWidth = 0.6;
      g.strokeRect(-pg.r, -pg.r * 0.7, pg.r * 2, pg.r * 1.4);
      g.restore();
    }

    if (!ps.period.collected) {
      const pulse = 0.7 + Math.sin(ps.period.ph * 3) * 0.3;
      const grad = g.createRadialGradient(ps.period.x, ps.period.y, 0, ps.period.x, ps.period.y, 20);
      grad.addColorStop(0, `rgba(255,217,138,${0.7 * pulse})`);
      grad.addColorStop(1, "rgba(255,217,138,0)");
      g.fillStyle = grad;
      g.fillRect(ps.period.x - 20, ps.period.y - 20, 40, 40);
      g.fillStyle = SPAL.ink;
      g.beginPath(); g.arc(ps.period.x, ps.period.y, 4.5 * pulse, 0, Math.PI * 2); g.fill();
    }

    drawBram(ctx, g, ps.bram, t);

    // Half-Page's hiding spot — a small worn paper corner peeking out,
    // easy to miss (intentionally no glow/sparkle, unlike the period)
    if (!ps.halfPageSpot.found) {
      const hs = ps.halfPageSpot;
      g.save();
      g.translate(hs.x, hs.y);
      g.rotate(-0.3);
      g.fillStyle = "#e8dcc0";
      g.beginPath();
      g.moveTo(0, 0); g.lineTo(8, -2); g.lineTo(9, 4); g.lineTo(1, 6);
      g.closePath(); g.fill();
      g.strokeStyle = "rgba(120,100,70,0.3)"; g.lineWidth = 0.5;
      g.stroke();
      g.restore();
    }
    return;
  }
}

function drawBram(ctx: Ctx, g: CanvasRenderingContext2D, b: BramState, t: number) {
  const fx = b.facing >= 0 ? 1 : -1;
  const bob = b.paused ? Math.sin(t * 2) * 1.2 : Math.abs(Math.sin(b.walk)) * 2;

  g.fillStyle = "rgba(0,0,0,0.35)";
  g.beginPath(); g.ellipse(b.x, b.y + 20, 30, 6, 0, 0, Math.PI * 2); g.fill();

  g.save();
  g.translate(b.x, b.y - bob);
  g.scale(fx, 1);

  const wobble = b.paused ? 0 : Math.sin(t * 4) * 4;
  // contact shadow along the ribbon's path — this is what was missing;
  // without it the ribbon reads as a floating line rather than a body
  // resting on the ground.
  g.strokeStyle = "rgba(0,0,0,0.25)";
  g.lineWidth = 12;
  g.beginPath();
  g.moveTo(-70, 16 + wobble * 0.4);
  g.quadraticCurveTo(-30, 8 + wobble, 10, 14);
  g.quadraticCurveTo(30, 22, 40, 12);
  g.stroke();
  g.strokeStyle = "#3a5a8a";
  g.lineWidth = 10;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(-70, 6 + wobble * 0.4);
  g.quadraticCurveTo(-30, -10 + wobble, 10, 4);
  g.quadraticCurveTo(30, 14, 40, 2);
  g.stroke();
  g.strokeStyle = "#5a82c9";
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(-70, 6 + wobble * 0.4);
  g.quadraticCurveTo(-30, -10 + wobble, 10, 4);
  g.quadraticCurveTo(30, 14, 40, 2);
  g.stroke();
  // a bright top-edge highlight so the ribbon reads as rounded/tubular
  // rather than a flat stroke
  g.strokeStyle = "rgba(255,255,255,0.25)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-68, 3 + wobble * 0.4);
  g.quadraticCurveTo(-30, -13 + wobble, 8, 1);
  g.stroke();

  const hx = 42, hy = 2;
  g.fillStyle = "#5a82c9";
  g.beginPath(); g.arc(hx, hy, 13, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#fdefd8";
  const blink = Math.sin(t * 1.4) > 0.95 ? 0.2 : 1;
  g.fillRect(hx - 5, hy - 3, 3, 3 * blink);
  g.fillRect(hx + 2, hy - 3, 3, 3 * blink);
  g.fillStyle = "#1a2438";
  g.fillRect(hx - 4, hy - 2, 1.4, 1.4 * blink);
  g.fillRect(hx + 3, hy - 2, 1.4, 1.4 * blink);
  if (b.hasPeriod) {
    g.strokeStyle = "#1a2438"; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(hx - 3, hy + 5); g.lineTo(hx + 3, hy + 5); g.stroke();
    g.fillStyle = "#ffd98a";
    g.beginPath(); g.arc(hx, hy + 12, 3, 0, Math.PI * 2); g.fill();
  } else {
    const mouthOpen = 1.5 + Math.abs(Math.sin(t * 10)) * 2.5;
    g.fillStyle = "#1a2438";
    g.beginPath(); g.ellipse(hx, hy + 5, 3, mouthOpen, 0, 0, Math.PI * 2); g.fill();
  }
  g.restore();

  if (!b.hasPeriod) {
    g.save();
    g.globalAlpha = 0.85;
    g.fillStyle = "rgba(20,14,30,0.7)";
    g.strokeStyle = "rgba(255,217,138,0.5)";
    const bw = 150;
    g.beginPath();
    g.ellipse(b.x, b.y - 46, bw / 2, 13, 0, 0, Math.PI * 2);
    g.fill(); g.stroke();
    g.fillStyle = "#ffe9c0";
    g.font = "7px 'Iowan Old Style', Palatino, Georgia, serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    const scrollOffset = Math.floor(t * 6) % BRAM_RAMBLE.length;
    const visible = (BRAM_RAMBLE + " " + BRAM_RAMBLE).slice(scrollOffset, scrollOffset + 26);
    g.fillText(visible, b.x, b.y - 46);
    g.restore();
  } else if (b.justFinished) {
    g.save();
    g.fillStyle = "rgba(20,14,30,0.75)";
    g.strokeStyle = "rgba(255,217,138,0.6)";
    const bw = 96;
    g.beginPath();
    g.ellipse(b.x, b.y - 46, bw / 2, 13, 0, 0, Math.PI * 2);
    g.fill(); g.stroke();
    g.fillStyle = "#ffe9c0";
    g.font = "8px 'Iowan Old Style', Palatino, Georgia, serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("Oh. I can stop.", b.x, b.y - 46);
    g.restore();
  }
}

export function drawPrimerOverlay(ctx: Ctx, g: CanvasRenderingContext2D) {
  const ps = ctx.primer; if (!ps) return;
  const { w, h } = ctx;
  const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(8,10,20,0.55)");
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);

  const p = ctx.player;
  let hint = "";
  if (ps.period.collected && !ps.bram.hasPeriod && dist(p.x, p.y, ps.bram.x, ps.bram.y) < 90) {
    hint = "E · Give period";
  } else if (dist(p.x, p.y, ps.returnPoint.x, ps.returnPoint.y) < 70) {
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
