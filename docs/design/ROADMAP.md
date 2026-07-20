# EDAS — Implementation Roadmap vs. the Design Bible

The design bible (`EDAS_Game_Design_Bible.md`) describes a full 6-region
story RPG with an 8-character ensemble cast, boss fights, a hidden
attentiveness system, and multiple endings. The current codebase is a
small hand-rolled canvas engine with three playable scenes. This doc is
an honest map between the two, so future work builds toward the bible
incrementally instead of pretending the whole thing exists already.

## Implemented so far

- **Hearth Hollow** (`hearth.ts`) — the hub area described in the bible's
  "small world, deep world" pillar. Currently connects to Garden and
  Primer; built to have more doors added later (one per region).
- **The Sunken Primer** (`primer.ts`) — Bram, the run-on-sentence NPC
  from bible §6.1, with his "find the missing period" quest fully
  playable (pick up the glowing period, bring it to him, he gets a full
  stop and his rambling text-ribbon stops).
- **Garden of Forgotten Numbers** — pre-existing, unchanged.
- **Camera fix** — a real bug: async cutscene sequences (`playKneelAndFall`,
  the intro, the garden-solve sequence) could leave `camera.manual` stuck
  `true` forever if interrupted, which reads as "the camera stopped
  following me." All three now guarantee a reset via `try/finally`. Also
  removed a hard zoom-snap on entering the Garden that caused a visible
  jump-cut.

## Sprite rebuild progress (in response to "rebuild all the sprites")

- **Character rig** (player/NPCs/runner): rebuilt with gradient-shaded
  capsule limbs and a bezier torso/head silhouette instead of flat
  rectangles.
- **Trees**: rebuilt as a layered round painterly canopy instead of flat
  triangular pine shapes.
- **CoCo**: was a generic firefly blob that didn't match her actual design
  bible at all. Rebuilt as her canon **Novice** stage — small, rounded,
  twin-tails, golden-blonde hair, pale dusty-pink/cream/white, no gold
  trim yet (gold is earned starting at Explorer per the bible). Her
  8-stage growth system itself is not implemented — she's permanently
  Novice for now.
- **The hatch**: fixed a real continuity bug — it rendered as a wooden
  hatch with plank lines, but the story explicitly calls it ancient
  stone ("Stone. Older than the school," "wet stone" in the dangle
  sequence). Rebuilt as a mossy, carved stone slab with a wet-stone
  specular highlight and a faint golden crack of light, consistent with
  the broken-rim design already used in `entities.ts`'s dangle pose.
- **Tower/bench/lamp/sign props**: rebuilt from flat rectangles into
  curved silhouettes with gradient shading (turret now has a slight
  cylindrical bulge and an arched glowing window instead of a plain
  box; lamp has a rounded hexagonal housing; sign/bench use wood-grain
  gradients and rounded corners).

### Still using placeholder/older-style sprites
Hedges and bushes (already blob/gradient-based, left alone — lower
priority than the hard rebuilds above), the Garden's flowers/gate
(already gradient/glow-based, also lower priority), Sprocket, Bram, and
all Hearth/Primer scene dressing plus underground rocks/mushrooms/
crystals.

Everything else: CoCo's full 8-stage Title progression (she's fixed at
Novice for now), the other 7 ensemble cast members, Fen Solenne, the
Archivist fight, Time Weave and other named abilities, the six full
regions, Memory Echoes, the save/lantern system, endings, and the hidden
attentiveness tracker.

## Suggested next slice

Given the gap in scope, the next-highest-value additions (in rough
priority order, each independently shippable):
1. **CoCo's first Title change (Novice → Explorer)** tied to a story
   beat — this is where gold trim first appears per the bible, a good
   test of whether the stage-swap system is worth building generally.
2. **One more ensemble character** — Nib or Half-Page are the cheapest to
   build (bible describes simple, contained quests for both).
3. **A lantern save point** in Hearth Hollow — even a fake/local one
   (localStorage-free, since artifacts can't use browser storage; a
   simple in-memory "last visited" state) sells the hub-world feeling.
4. **A Memory Echo or two** tied to Bram specifically, per bible §10.
