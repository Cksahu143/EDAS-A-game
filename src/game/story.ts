/**
 * Story sequencer — title → intro → explore → kneel → collision → fall.
 *
 * Phase 1 stops at fade-to-black after the fall. No underground.
 */

import type { Ctx } from "./engine";
import { lerp, enterUnderground } from "./engine";
import { startFall } from "./fall";

export interface StoryController {
  fade: number;                          // 0 clear, 1 black
  flash: number;                         // 0 clear, 1 pure white (impact)
  setPrompt(visible: boolean): void;
  requestSkipIntro(): void;
  playKneelAndFall(ctx: Ctx): Promise<void>;
  // driven by engine
}

// Internal handles kept in the closure returned from createStoryController.
export function createStoryController(ui: HTMLElement): StoryController {
  const lbTop = ui.querySelector<HTMLElement>('[data-el="lb-top"]');
  const lbBot = ui.querySelector<HTMLElement>('[data-el="lb-bottom"]');
  const subtitle = ui.querySelector<HTMLElement>('[data-el="subtitle"]');
  const prompt = ui.querySelector<HTMLElement>('[data-el="prompt"]');

  let skipResolve: (() => void) | null = null;

  const state = {
    fade: 0,
    flash: 0,
    subtitleTimer: 0,
  };

  const letterbox = (on: boolean) => {
    lbTop?.setAttribute("data-active", on ? "1" : "0");
    lbBot?.setAttribute("data-active", on ? "1" : "0");
  };

  const say = async (text: string, duration = 2200, ambient = false) => {
    if (!subtitle) return;
    subtitle.textContent = text;
    subtitle.setAttribute("data-visible", "1");
    subtitle.setAttribute("data-ambient", ambient ? "1" : "0");
    await sleep(duration);
    subtitle.setAttribute("data-visible", "0");
    await sleep(400);
  };

  const setPrompt = (visible: boolean) => {
    prompt?.setAttribute("data-visible", visible ? "1" : "0");
  };

  const requestSkipIntro = () => {
    if (skipResolve) { skipResolve(); skipResolve = null; }
  };

  // Skippable "wait": resolves at duration OR when skip is pressed.
  const skippable = (duration: number) =>
    new Promise<void>(resolve => {
      let done = false;
      const to = window.setTimeout(() => { if (!done) { done = true; resolve(); skipResolve = null; } }, duration);
      skipResolve = () => { if (done) return; done = true; window.clearTimeout(to); resolve(); };
    });

  const controller: StoryController = {
    get fade() { return state.fade; },
    get flash() { return state.flash; },
    setPrompt,
    requestSkipIntro,
    playKneelAndFall,
  };

  // Expose `say` for external systems (garden puzzle etc.)
  (controller as unknown as { _say: typeof say })._say = say;

  // Async fade helper used by sequences
  async function fadeTo(target: number, ms: number) {
    const start = state.fade;
    const t0 = performance.now();
    return new Promise<void>(resolve => {
      const step = () => {
        const p = Math.min(1, (performance.now() - t0) / ms);
        state.fade = lerp(start, target, p);
        if (p < 1) requestAnimationFrame(step);
        else resolve();
      };
      step();
    });
  }

  async function flashTo(target: number, ms: number) {
    const start = state.flash;
    const t0 = performance.now();
    return new Promise<void>(resolve => {
      const step = () => {
        const p = Math.min(1, (performance.now() - t0) / ms);
        state.flash = lerp(start, target, p);
        if (p < 1) requestAnimationFrame(step);
        else resolve();
      };
      step();
    });
  }

  // Smoothly slide a value on the ctx (used to auto-walk player to kneelSpot).
  async function tween(getSet: (t: number) => void, ms: number) {
    const t0 = performance.now();
    return new Promise<void>(resolve => {
      const step = () => {
        const p = Math.min(1, (performance.now() - t0) / ms);
        const e = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p; // easeInOut
        getSet(e);
        if (p < 1) requestAnimationFrame(step);
        else resolve();
      };
      step();
    });
  }

  async function playKneelAndFall(ctx: Ctx) {
    // ============================================================
    // PHASE 2 — THE DISCOVERY
    // ============================================================
    letterbox(true);
    ctx.camera.manual = true;
    ctx.camera.targetZoom = 1.35;
    ctx.input.x = 0; ctx.input.y = 0;

    // Suspense beats — no UI prompts, just atmosphere
    await say("The wind changes.", 900, true);
    await say("The birds go quiet.", 900, true);

    // Camera drifts to the strange patch of grass; player walks to it
    const p = ctx.player;
    const target = ctx.world.kneelSpot;
    const sx = p.x, sy = p.y;
    ctx.camera.targetX = target.x;
    ctx.camera.targetY = target.y - 30;
    ctx.camera.targetZoom = 1.55;
    p.facing = target.x < sx ? -1 : 1;
    await tween((e) => {
      p.x = sx + (target.x - sx) * e;
      p.y = sy + (target.y - sy) * e;
      p.walk += 0.35;
      p.moving = true;
    }, 1200);
    p.moving = false;

    await say("Something is here.", 900, true);

    // Kneel — no button prompt, it just happens
    p.pose = "kneel"; p.poseT = 0;
    ctx.camera.targetZoom = 1.85;
    await sleep(300);
    await say("She reaches toward the grass.", 900);

    // Reveal — the grass parts and the hatch appears
    ctx.world.hatch.revealed = true;
    await sleep(200);
    await say("Stone. Older than the school.", 900);
    await say("Carvings she can't read.", 900);

    // Foreshadowing
    await say("A flower wilts, just there.", 800, true);
    await sleep(200);
    await say("The wind stops.", 800, true);

    // ============================================================
    // PHASE 3 — THE COLLISION
    // ============================================================
    // Just as her hand almost touches the iron ring…
    ctx.camera.targetZoom = 2.1;
    await say("Her fingers almost touch the iron ring —", 800);

    // Distant whistle → shout
    await say("— a whistle, somewhere far —", 650);
    await say("— LOOK OUT! —", 650);

    // Runner sprints in from the right, past the hedges
    // Runner comes from the LEFT (open corridor between top outer hedge and
    // the maze) since the hatch now sits in the far right corner.
    ctx.runner = {
      active: true,
      x: target.x - 520,
      y: target.y - 6,
      vx: 820,
      alpha: 1,
      color: { shirt: "#c96b8f", pants: "#241040", hair: "#3a2010" },
    };
    ctx.camera.targetZoom = 1.35;
    ctx.camera.targetX = target.x - 60;
    ctx.camera.shake = 0.3;
    await sleep(500);

    // IMPACT — brief slow-motion (achieved by pausing narrative), white flash, big shake
    ctx.camera.shake = 3.4;
    await flashTo(1, 80);
    // knock runner past — she continues rightward and off-screen
    ctx.runner.x = target.x + 20;
    ctx.runner.vx = 260;
    await flashTo(0.15, 260);
    await sleep(180);
    await flashTo(0, 500);
    ctx.camera.shake = 1.2;

    // The ground gives way instantly — she's thrown onto the broken rim
    p.pose = "dangle"; p.poseT = 0;
    ctx.camera.shake = 2.6;
    ctx.camera.targetZoom = 2.1;
    if (ctx.runner) ctx.runner.alpha = 0;
    await say("The stone splits open beneath her.", 1600);
    await say("She catches the broken edge.", 1500);
    ctx.camera.shake = 1.4;
    await say("Her fingers slip on the wet stone.", 1800);
    ctx.camera.shake = 1.8;
    await sleep(300);

    // Fingers give way — the drop
    p.pose = "drop"; p.poseT = 0;
    ctx.camera.shake = 2.0;
    await sleep(700);

    ctx.fall = startFall();
    ctx.state = "falling";
    ctx.camera.shake = 0;
    letterbox(true);

    await say("Silence.", 2000, true);
    await sleep(1400);
    await say("Falling.", 1800, true);
    await sleep(1600);
    await say("Papers. Books. A broken clock, drifting.", 2800, true);
    await sleep(1600);
    await say("Old faces she has never seen.", 2400, true);

    // as the fall winds down, everything goes to black
    await fadeTo(1, 2000);
    // ensure fall render stops after fade
    ctx.fall = undefined;
    ctx.runner = undefined;

    // ============================================================
    // BLACK — SOUND OF BREATHING
    // ============================================================
    await sleep(1400);
    await say("…", 1400, true);
    await sleep(600);
    await say("(a slow breath)", 1800, true);
    await sleep(500);
    await say("(water, somewhere, dripping)", 2200, true);
    await sleep(1200);
    await say("What… is this place?", 3600);

    // ============================================================
    // PHASE 4 — THE UNDERGROUND
    // Transition into the chamber below. Fade back in on the player
    // lying beneath a shaft of light.
    // ============================================================
    enterUnderground(ctx);
    ctx.state = "explore";
    letterbox(false);
    await fadeTo(0, 1800);
    ctx.camera.manual = false;
    ctx.camera.targetZoom = 0.9;
  }

  // undergroundAmbient removed — Phase 3 ends at black.

  // The intro cinematic (called by engine as runStory)
  (controller as StoryController & { _intro?: (ctx: Ctx) => Promise<void> })._intro = async (ctx: Ctx) => {
    letterbox(true);
    ctx.camera.manual = true;
    // Frame the player from the start — slow push-in on her as she stands at the gate.
    const ps = ctx.world.playerStart;
    ctx.camera.x = ps.x;
    ctx.camera.y = ps.y - 20;
    ctx.camera.targetX = ps.x;
    ctx.camera.targetY = ps.y - 10;
    ctx.camera.zoom = 1.1;
    ctx.camera.targetZoom = 0.9;

    await Promise.race([
      (async () => {
        await say("The morning of the great competition.", 2600);
        await say("The banners are already up.", 2400);
        await say("Somewhere in the maze, something is waiting.", 2800);
      })(),
      skippable(9000),
    ]);

    // hand off control
    letterbox(false);
    ctx.camera.manual = false;
    ctx.camera.targetZoom = 0.85;
    ctx.state = "explore";

    // ambient loop
    ambientLoop(ctx).catch(err => console.error(err));
  };

  async function ambientLoop(ctx: Ctx) {
    const lines = [
      "Birds chirping…",
      "Students cheering in the distance.",
      "Wind rustles through the hedges.",
      "Banners flutter overhead.",
      "Footsteps on the stone path.",
      "A butterfly circles nearby.",
    ];
    while (ctx.state === "explore") {
      await sleep(12000 + Math.random() * 6000);
      if (ctx.state !== "explore") break;
      const line = lines[Math.floor(Math.random() * lines.length)];
      await say(line, 2000, true);
    }
  }

  return controller;
}

function sleep(ms: number) { return new Promise<void>(res => setTimeout(res, ms)); }

/**
 * Kick off the intro cinematic. Called from engine.beginGame().
 */
export async function runStory(ctx: Ctx) {
  const c = ctx.story as StoryController & { _intro?: (ctx: Ctx) => Promise<void> };
  if (c._intro) await c._intro(ctx);
}
