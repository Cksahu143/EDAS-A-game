# EDAS — Fixes + Dialogue System + First Puzzle

## Part 1 — Fixes (quick, do first)

**Hatch too close to spawn**
- In `src/game/world.ts`, move `kneelSpot` and the hatch beacon far from `playerStart` — push it deep into the far corner of the maze so the player has to actually walk and explore. Update the runner's spawn offset in `story.ts` accordingly.

**Old sprites reappearing in kneel/dangle**
- In `src/game/entities.ts`, the `kneel`, `dangle`, and `drop` pose renderers still use the legacy simple sprite. Rewrite each pose using the same detailed sprite features (eyes, cheeks, hair, collar, buttons, belt, etc.) already used for `idle`/`walk`, just posed differently.
- Dangle pose: draw her clearly *below* the hatch rim — arms up gripping the broken stone edge, body hanging in the pit, legs kicking. Not lying on grass, not holding grass. Add water droplets / wet-stone highlights on the rim so it matches the "wet stone" dialogue.
- Drop pose: same detailed sprite scaling/spiraling into darkness.

## Part 2 — Dialogue System (foundation before puzzle)

New module `src/game/dialogue.ts` — reusable, data-driven.

**DialogueBox** (React overlay component `src/game/DialogueBox.tsx`):
- Rounded box, semi-transparent dark bg (`rgba(10,6,18,0.92)`), gold border matching EDAS palette (`#ffd98a`), soft shadow, fade+slide in/out
- Portrait area (left): non-pixelated high-quality character portrait, subtle breathing (scale 1↔1.02), occasional blink, expression swap (happy/surprised/thinking/sad/excited)
- Name plate above box in elegant serif
- Typewriter text with punctuation pauses (`,` 120ms, `.` 260ms, `?` 200ms, `!` 220ms)
- Hold to fast-forward, tap/space to advance, auto-advance option
- Per-character voice: short WebAudio blip synthesized (different waveform/frequency per character) played every ~2 letters — no asset files needed
- Mobile responsive (bottom sheet on narrow viewports)

**Character registry** (`src/game/characters.ts`):
```ts
{ id, name, portraitUrl, voice: {wave, freq, pitchJitter}, expressions: {happy, sad, ...} }
```
Registered: CoCo, Archivist, OldTeacher, MemoryEcho, NPCChild, GateWhisper.

**Dialogue script format** (data-driven):
```ts
type DialogueLine = { speaker: string; text: string; emotion?: Emotion; pause?: number; shake?: number; onShow?: () => void }
```
`runDialogue(lines: DialogueLine[])` returns a Promise, integrates with existing story controller.

**Memory Fragment variant**: same component, different theme — glowing gold frame, floating particles behind portrait, echo shadow on text, slower typewriter, dream-blur.

**Refactor** `src/game/story.ts` — replace the current `say()` subtitle calls in Phase 2/3 with the new dialogue system where a speaker is involved; keep ambient one-liners as subtitles.

## Part 3 — First Puzzle: Garden of Forgotten Numbers

New scene, unlocked after the Phase 4 underground intro. Player walks through a door in the chamber → arrives at the Garden.

**New files**
- `src/game/puzzles/puzzleManager.ts` — generic puzzle registry, completion events, save flag on ctx
- `src/game/puzzles/gardenOfNumbers.ts` — the puzzle scene (world, entities, logic)
- `src/game/entities/flower.ts` — Flower entity (float, glow, follow player when picked)
- `src/game/entities/gate.ts` — Gate entity with 10 empty circles

**Scene**
- Hand-painted look: soft green grass gradient, ancient winding stone path, warm sunbeams, animated leaves, floating gold particles, butterflies (existing fx), gentle wind sway on flowers
- Ten glowing flowers scattered along the path, each a distinct color, softly pulsing
- Stone gate at the end with 10 empty carved circles arranged in an arch

**Interaction**
- Walk near flower → auto-prompt disappears (proximity based like hatch)
- Press interact → flower lifts, follows player with a soft bobbing trail
- Walk to gate → drop zone highlights → interact places flower into next empty circle
- Each placement: soft chime (WebAudio bell), gold sparkle burst, tiny flower "laugh" wobble, circle lights up
- Drop flower elsewhere → floats gently back to its origin (no fail state)
- No counter shown. No question prompt. Child naturally counts 1..10.

**Entry moment**
- MemoryEcho dialogue (memory variant): *"Someone once cared for every flower here…"*
- Gate whisper (subtitle, ambient): *"Help me remember how many flowers belong here."*

**Completion**
- All 10 placed → gate glows, all flowers bloom brighter, birds sing (fx cue), warm light wash, gate opens, gold pollen fills air
- MemoryEcho (memory variant): *"The garden remembers."*
- Memory Fragment cinematic: glowing frame, silent animated vision — silhouettes of children planting flowers together, laughter particles rising, fade out
- Fragment stored on ctx (`ctx.fragments.push('garden')`) for future features

**Hidden discoveries** (optional, no gating)
- Log by the path — interact to sit briefly (small emote)
- Butterfly cluster — walking through scatters them with sparkle
- Ladybug trail leading to an extra sparkling flower
- Tiny stone carving — interact shows short memory blip

## Technical Details

- Puzzle Manager pattern: `registerPuzzle({id, load(ctx), unload(ctx), isSolved})`. `ctx.currentPuzzle` tracks active one.
- Flower entity: `{ x, y, color, hue, phase, held: boolean, homeX, homeY, placedAt?: number }`
- Gate entity: `{ x, y, slots: Array<{ filled: boolean, flowerColor?: string }> }`
- All new modules follow existing engine tick/render contract in `engine.ts` — no changes to core loop needed beyond scene switching.
- Rendering stays inside the low-res pixel buffer for perf; portraits render in a separate high-DPI DOM layer (they are not pixel art).
- Add scene state to `ctx.state`: `"garden"` in addition to `explore`/`falling`.

## ASCII sketch of the Garden

```text
       .-''-.   .-''-.
      (butterflies)         [Stone Gate]
   *   .   *                 ( ) ( ) ( )
  🌸    🌸       🌸           ( ) ( ) ( )
    ~~stone path~~~~~~~~~~~~~ ( )   ( )
  🌸   🌸    🌸    🌸  🌸  🌸    ( )
       (log)             (ladybug trail →)
```

## Order of implementation

1. Fixes (world hatch position, entity pose sprites) — small, immediate
2. Dialogue system + character registry + memory variant
3. Refactor existing story to use it where appropriate
4. Puzzle Manager + Garden scene + Flower/Gate entities
5. Memory Fragment cinematic
6. Test end-to-end (Playwright): prologue → intro → hatch → fall → underground → garden → solve → fragment

Sound good? Once you approve I'll build all of this in one continuous pass.
