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

## Not yet implemented (still just the bible)

Everything else: CoCo as an actual companion character (currently she's
a simple firefly light, not the 8-stage Title system from the companion
Character Design Bible), the other 7 ensemble cast members, Fen Solenne,
the Archivist fight, Time Weave and other named abilities, the six full
regions, Memory Echoes, the save/lantern system, endings, and the hidden
attentiveness tracker.

## Suggested next slice

Given the gap in scope, the next-highest-value additions (in rough
priority order, each independently shippable):
1. **CoCo as a real companion** — give her a simple sprite (reusing the
   existing `drawCharacter` rig with her palette from the Character
   Design Bible) and have her walk beside the player in Hearth Hollow +
   Primer, with a couple of personality-driven idle lines.
2. **One more ensemble character** — Nib or Half-Page are the cheapest to
   build (bible describes simple, contained quests for both).
3. **A lantern save point** in Hearth Hollow — even a fake/local one
   (localStorage-free, since artifacts can't use browser storage; a
   simple in-memory "last visited" state) sells the hub-world feeling.
4. **A Memory Echo or two** tied to Bram specifically, per bible §10.
