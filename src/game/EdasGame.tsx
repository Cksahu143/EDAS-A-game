import { useEffect, useRef, useState } from "react";
import { startEdas } from "./engine";
import prologue1 from "@/assets/prologue-1.png";
import prologue2 from "@/assets/prologue-2.png";
import prologue3 from "@/assets/prologue-3.png";
import prologue4 from "@/assets/prologue-4.png";
import prologue5 from "@/assets/prologue-5.png";

interface Slide { img: string; lines: string[] }
const SLIDES: Slide[] = [
  { img: prologue1, lines: ["Long ago, atop a quiet hill,", "there stood a school older than the town itself."] },
  { img: prologue2, lines: ["Every hundred years, when the banners rise,", "the Great Competition returns."] },
  { img: prologue3, lines: ["Champions from every class arrive with trophies,", "with books, with promises they cannot keep."] },
  { img: prologue4, lines: ["But beneath the grass, older than the school,", "something has been waiting."] },
  { img: prologue5, lines: ["Today, one student walks the path", "that no one was meant to find."] },
];

/**
 * EDAS — Phase 1
 * Fullscreen canvas game. All rendering happens on the canvas; the DOM
 * overlay only carries the title card, subtitles, letterbox bars, the
 * interact prompt, and the touch joystick — everything a browser is
 * genuinely better at than a canvas.
 */
export function EdasGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const uiRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [prologueIdx, setPrologueIdx] = useState(0);
  const [prologueDone, setPrologueDone] = useState(false);
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    if (!canvasRef.current || !uiRef.current) return;
    const stop = startEdas(canvasRef.current, uiRef.current);
    setReady(true);
    return stop;
  }, []);

  // Typewriter effect for each slide's text.
  useEffect(() => {
    if (prologueDone) return;
    setTyped(0);
    const total = SLIDES[prologueIdx].lines.join("\n").length;
    const id = window.setInterval(() => {
      setTyped((t) => {
        if (t >= total) { window.clearInterval(id); return t; }
        return t + 1;
      });
    }, 32);
    return () => window.clearInterval(id);
  }, [prologueIdx, prologueDone]);

  // Auto-advance: once the line has fully typed out, wait ~3 caret blinks
  // (the caret animation is 1s per cycle) then move to the next slide.
  useEffect(() => {
    if (prologueDone) return;
    const total = SLIDES[prologueIdx].lines.join("\n").length;
    if (typed < total) return;
    const id = window.setTimeout(() => {
      if (prologueIdx < SLIDES.length - 1) setPrologueIdx((i) => i + 1);
      else setPrologueDone(true);
    }, 3000);
    return () => window.clearTimeout(id);
  }, [typed, prologueIdx, prologueDone]);

  const advance = () => {
    const full = SLIDES[prologueIdx].lines.join("\n").length;
    if (typed < full) { setTyped(full); return; }
    if (prologueIdx < SLIDES.length - 1) {
      setPrologueIdx(prologueIdx + 1);
    } else {
      setPrologueDone(true);
    }
  };

  const skipPrologue = () => setPrologueDone(true);

  const currentText = SLIDES[prologueIdx].lines.join("\n").slice(0, typed);

  return (
    <div className="edas-root">
      <canvas ref={canvasRef} className="edas-canvas" />
      {!prologueDone && (
        <div className="edas-prologue" onClick={advance} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") advance(); }} tabIndex={0}>
          <div className="edas-prologue-frame">
            <img key={prologueIdx} src={SLIDES[prologueIdx].img} alt="" className="edas-prologue-img" width={1024} height={640} />
            <div className="edas-prologue-text">{currentText}<span className="edas-prologue-caret">▍</span></div>
          </div>
          <button className="edas-prologue-skip" onClick={(e) => { e.stopPropagation(); skipPrologue(); }}>Skip ▶</button>
          <div className="edas-prologue-hint">Click / Space to continue &nbsp;·&nbsp; {prologueIdx + 1} / {SLIDES.length}</div>
        </div>
      )}
      <div ref={uiRef} className="edas-ui" data-ready={ready ? "1" : "0"}>
        {/* Letterbox bars */}
        <div className="edas-letterbox edas-letterbox-top" data-el="lb-top" />
        <div className="edas-letterbox edas-letterbox-bottom" data-el="lb-bottom" />

        {/* Title card */}
        <div className="edas-title" data-el="title">
          <div className="edas-title-word">EDAS</div>
          <div className="edas-title-sub">A hand-painted story</div>
          <div className="edas-title-prompt">Tap or press space to begin</div>
        </div>

        {/* Subtitle line */}
        <div className="edas-subtitle" data-el="subtitle" />

        {/* Interact prompt */}
        <div className="edas-prompt" data-el="prompt">
          <span className="edas-prompt-key">E</span>
          <span>Investigate</span>
        </div>

        {/* Touch joystick (mobile) */}
        <div className="edas-joystick" data-el="joy">
          <div className="edas-joystick-knob" data-el="joy-knob" />
        </div>
        <button className="edas-interact-btn" data-el="interact" aria-label="Interact">
          E
        </button>
      </div>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
.edas-root{position:fixed;inset:0;width:100vw;height:100vh;overflow:hidden;background:#000;color:#fdefd8;font-family:'Iowan Old Style','Palatino Linotype',Palatino,Georgia,'Times New Roman',serif;-webkit-user-select:none;user-select:none;touch-action:none;}
.edas-canvas{display:block;width:100%;height:100%;}
.edas-ui{position:absolute;inset:0;pointer-events:none;z-index:5;}

.edas-prologue{position:absolute;inset:0;z-index:50;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6vh 4vw;pointer-events:auto;cursor:pointer;font-family:'Courier New','Determination',ui-monospace,monospace;color:#fff;animation:edas-prologueFadeIn 1.2s ease;}
@keyframes edas-prologueFadeIn{from{opacity:0}to{opacity:1}}
.edas-prologue-frame{max-width:min(720px,92vw);width:100%;display:flex;flex-direction:column;align-items:center;gap:1.8rem;}
.edas-prologue-img{width:100%;max-width:640px;height:auto;image-rendering:auto;border:2px solid rgba(255,255,255,.08);box-shadow:0 0 0 8px #000, 0 0 60px rgba(0,0,0,.9), inset 0 0 60px rgba(0,0,0,.55);filter:contrast(1.05) saturate(.92) brightness(.95);animation:edas-slideIn 1s ease;}
@keyframes edas-slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.edas-prologue-text{white-space:pre-wrap;text-align:center;font-size:clamp(1.05rem,2.1vw,1.5rem);line-height:1.55;letter-spacing:.04em;min-height:3.5em;color:#fff;font-weight:400;text-shadow:0 0 2px rgba(255,255,255,.35);}
.edas-prologue-caret{display:inline-block;margin-left:.15em;color:#fff;animation:edas-caret 1s steps(1) infinite;}
@keyframes edas-caret{50%{opacity:0}}
.edas-prologue-skip{position:absolute;top:3vh;right:3vw;background:transparent;border:1px solid rgba(255,255,255,.35);color:rgba(255,255,255,.7);padding:.4em 1em;border-radius:4px;font-family:inherit;font-size:.85rem;letter-spacing:.15em;text-transform:uppercase;cursor:pointer;pointer-events:auto;}
.edas-prologue-skip:hover{color:#fff;border-color:#fff;}
.edas-prologue-hint{position:absolute;bottom:3vh;left:50%;transform:translateX(-50%);font-size:.75rem;letter-spacing:.25em;text-transform:uppercase;opacity:.4;animation:edas-pulse 2.4s ease-in-out infinite;}

.edas-letterbox{position:absolute;left:0;width:100%;height:0;background:#000;transition:height 1.1s cubic-bezier(.65,0,.35,1);z-index:6;}
.edas-letterbox-top{top:0;}
.edas-letterbox-bottom{bottom:0;}
.edas-letterbox[data-active="1"]{height:9vh;}

.edas-title{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:radial-gradient(ellipse at center,rgba(20,10,30,.55) 0%,rgba(5,2,10,.96) 78%);opacity:1;transition:opacity 1.6s ease;pointer-events:auto;cursor:pointer;z-index:20;}
.edas-title[data-hidden="1"]{opacity:0;pointer-events:none;}
.edas-title-word{font-size:clamp(3.2rem,10vw,7.5rem);letter-spacing:.22em;font-weight:400;color:#ffd98a;text-shadow:0 0 28px rgba(242,180,65,.55),0 0 70px rgba(107,63,160,.4);animation:edas-titleGlow 4.5s ease-in-out infinite;padding-left:.22em;}
@keyframes edas-titleGlow{0%,100%{text-shadow:0 0 28px rgba(242,180,65,.5),0 0 70px rgba(107,63,160,.35);}50%{text-shadow:0 0 44px rgba(242,180,65,.85),0 0 100px rgba(107,63,160,.6);}}
.edas-title-sub{margin-top:.9em;font-style:italic;font-size:clamp(.95rem,2vw,1.25rem);letter-spacing:.14em;color:#cbb8e6;opacity:.85;}
.edas-title-prompt{margin-top:3.2em;font-family:system-ui,-apple-system,sans-serif;font-size:.8rem;letter-spacing:.32em;text-transform:uppercase;color:#fdefd8;opacity:.55;animation:edas-pulse 2.4s ease-in-out infinite;}
@keyframes edas-pulse{0%,100%{opacity:.3;}50%{opacity:.8;}}

.edas-subtitle{position:absolute;left:50%;bottom:14vh;transform:translateX(-50%);max-width:min(720px,86vw);text-align:center;font-size:clamp(1rem,1.8vw,1.25rem);line-height:1.5;color:#fdefd8;opacity:0;transition:opacity .5s ease;text-shadow:0 2px 20px rgba(0,0,0,.9),0 0 4px rgba(0,0,0,.7);letter-spacing:.02em;z-index:7;pointer-events:none;}
.edas-subtitle[data-ambient="1"]{font-style:italic;color:#e7d5b4;opacity:.75;}
.edas-subtitle[data-visible="1"]{opacity:1;}
.edas-subtitle[data-ambient="1"][data-visible="1"]{opacity:.85;}

.edas-prompt{position:absolute;left:50%;top:calc(50% + 60px);transform:translateX(-50%);display:flex;align-items:center;gap:.6em;padding:.55em 1.05em;background:rgba(10,6,18,.72);border:1px solid rgba(255,217,138,.45);border-radius:999px;color:#ffd98a;font-family:system-ui,-apple-system,sans-serif;font-size:.85rem;letter-spacing:.14em;text-transform:uppercase;opacity:0;transition:opacity .35s ease,transform .35s ease;pointer-events:none;z-index:8;}
.edas-prompt[data-visible="1"]{opacity:1;transform:translateX(-50%) translateY(-4px);}
.edas-prompt-key{display:inline-flex;align-items:center;justify-content:center;width:1.6em;height:1.6em;border-radius:.35em;background:#ffd98a;color:#241040;font-weight:700;font-size:.75rem;}

.edas-joystick{position:absolute;left:6vw;bottom:6vh;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle at 35% 30%,rgba(255,217,138,.18),rgba(10,6,18,.55) 70%);border:1px solid rgba(255,217,138,.35);opacity:0;transition:opacity .3s ease;pointer-events:auto;touch-action:none;z-index:9;}
.edas-joystick[data-visible="1"]{opacity:1;}
.edas-joystick-knob{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#ffd98a,#c9a13f);box-shadow:0 4px 18px rgba(0,0,0,.5);}
.edas-interact-btn{position:absolute;right:6vw;bottom:8vh;width:78px;height:78px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffd98a,#c9552c);color:#241040;border:none;font-family:'Iowan Old Style',Palatino,Georgia,serif;font-weight:700;font-size:1.75rem;box-shadow:0 6px 22px rgba(0,0,0,.5),inset 0 -4px 10px rgba(0,0,0,.25);opacity:0;transition:opacity .3s ease,transform .12s ease;pointer-events:auto;z-index:9;cursor:pointer;}
.edas-interact-btn[data-visible="1"]{opacity:1;}
.edas-interact-btn:active{transform:scale(.94);}

@media (hover:hover) and (pointer:fine){
  .edas-joystick,.edas-interact-btn{display:none;}
}
`;
