/**
 * Region config data — one entry per region, run through the shared
 * engine in regions.ts. See docs/design/EDAS_Game_Design_Bible.md §6-7
 * for the full character write-ups these are drawn from.
 */
import type { RegionConfig } from "./regions";

export const REGION_CONFIGS: Record<string, RegionConfig> = {
  counts_hollow: {
    id: "counts_hollow",
    title: "Count's Hollow",
    width: 1300, height: 760,
    groundY: 520,
    skyTop: "#3a2c1a", skyBottom: "#1c140c",
    groundTop: "#4a3218", groundBottom: "#2a1c0e",
    accent: "#e8c07a",
    glyphs: ["7", "3", "÷", "9", "+", "1/2"],
    introLine: "Somewhere nearby, a very old argument about a slice of pie is still going.",
    characters: [
      {
        id: "nib", name: "Nib", kind: "letter_serif", color: "#e8a94a",
        x: 620, y: 500, paceRange: 90,
        lines: [
          "Nib: It was never really about the pie slice, you know.",
          "Nib: One-half. It should have just been one-half.",
          "Nib: ...I suppose it doesn't matter anymore, does it.",
          "Nib: Thank you for sitting with me a moment.",
        ],
      },
      {
        id: "carry", name: "Carry", kind: "digit", color: "#c98a5a",
        x: 820, y: 500, paceRange: 40,
        lines: [
          "Carry: Don't forget me at the end of the problem. Please.",
          "Carry: Being carried isn't the same as being a burden. ...Right?",
          "Carry: I just ride along. I don't mean to get in the way.",
        ],
      },
    ],
  },

  grammarwood: {
    id: "grammarwood",
    title: "Grammarwood",
    width: 1300, height: 760,
    groundY: 520,
    skyTop: "#1a3226", skyBottom: "#0e1c16",
    groundTop: "#234a34", groundBottom: "#122a1e",
    accent: "#8fd6a8",
    glyphs: ["A", "&", "?", "!", "B", "Q"],
    introLine: "Two voices argue somewhere in the trees — inseparable, and never quite agreeing.",
    characters: [
      {
        id: "serif", name: "Serif", kind: "letter_serif", color: "#e8d9a0",
        x: 600, y: 500, paceRange: 60,
        lines: [
          "Serif: One simply must stand up straight. It's only proper.",
          "Serif: Sans, you cannot just lounge through an entire sentence.",
          "Serif: I have feet for a reason.",
        ],
      },
      {
        id: "sans", name: "Sans", kind: "letter_sans", color: "#9fd6c4",
        x: 740, y: 505, paceRange: 70,
        lines: [
          "Sans: Feet? Buddy, I don't even have corners.",
          "Sans: Relax. Nobody's grading your posture.",
          "Sans: C'mon, squeeze through here — it's way more fun.",
        ],
      },
    ],
  },

  cistern: {
    id: "cistern",
    title: "The Cistern",
    width: 1200, height: 760,
    groundY: 520,
    skyTop: "#16283a", skyBottom: "#0a141e",
    groundTop: "#1e3a4e", groundBottom: "#0e1c28",
    accent: "#7ec9e8",
    glyphs: ["~", "○", "◦", "≈"],
    introLine: "Water drips somewhere in the dark, waiting on a password no one remembers.",
    characters: [
      {
        id: "plinth", name: "Plinth", kind: "frog", color: "#5a9a8a",
        x: 650, y: 500, paceRange: 0,
        lines: [
          "Plinth: I— I used to know the rhyme. I really did.",
          "Plinth: Don't look at me like that. It's embarrassing enough.",
          "Plinth: 'Plinth.' They named a frog 'Plinth.' Really.",
          "Plinth: Give me a moment. It's... on the tip of my tongue.",
        ],
      },
    ],
  },

  hall_of_everafter: {
    id: "hall_of_everafter",
    title: "Hall of Ever-After",
    width: 1300, height: 760,
    groundY: 520,
    skyTop: "#241a30", skyBottom: "#120c1a",
    groundTop: "#3a2840", groundBottom: "#1a1220",
    accent: "#c9a0e0",
    glyphs: ["✦", "◇", "…"],
    introLine: "The same five minutes, over and over — somewhere down the hall, someone is still waiting for class to start.",
    characters: [
      {
        id: "understudy", name: "The Understudy", kind: "notes", color: "#d8b8e8",
        x: 600, y: 500, paceRange: 30,
        lines: [
          "The Understudy: Places, everyone. It's almost time.",
          "The Understudy: I've done this scene so many times I could do it asleep.",
          "The Understudy: Do you ever feel like you're waiting for something that already happened?",
        ],
      },
      {
        id: "substitute", name: "The Substitute", kind: "papers", color: "#b89ac9",
        x: 820, y: 500, paceRange: 50,
        lines: [
          "The Substitute: Settle down, settle down — attendance first.",
          "The Substitute: I'm only filling in. Someone's coming back for this class. Any day now.",
          "The Substitute: ...it's alright if I stop, isn't it. Just for today.",
        ],
      },
    ],
  },

  gallery: {
    id: "gallery",
    title: "Gallery of Unfinished Things",
    width: 1300, height: 760,
    groundY: 520,
    skyTop: "#2c2418", skyBottom: "#16120c",
    groundTop: "#3a3020", groundBottom: "#1c180e",
    accent: "#e8c878",
    glyphs: ["◻", "◽", "▭"],
    introLine: "Half-finished paintings line the walls, watching you walk in.",
    characters: [
      {
        id: "milo", name: "Milo", kind: "letter_sans", color: "#c97a5a",
        x: 620, y: 500, paceRange: 80,
        lines: [
          "Milo: Bet I finish before you figure out this room. Bet you.",
          "Milo: I'm missing an arm. Don't make it weird.",
          "Milo: She always said she'd finish first. Hah. Still waiting.",
        ],
      },
      {
        id: "critic", name: "The Critic", kind: "eye", color: "#e0a840",
        x: 850, y: 480, paceRange: 0,
        lines: [
          "The Critic: Mm. Amateur hour, as usual.",
          "The Critic: ...though I'll admit, you're looking closer than most.",
          "The Critic: Fine. Fine! It's not bad. There, are you happy.",
        ],
      },
    ],
  },

  archive_spire: {
    id: "archive_spire",
    title: "Archive Spire",
    width: 1300, height: 820,
    groundY: 560,
    skyTop: "#0e0a20", skyBottom: "#050310",
    groundTop: "#1a1430", groundBottom: "#0a081a",
    accent: "#a898ff",
    glyphs: ["*", "✧", "·"],
    introLine: "Every book here has something written in the margins. None of it was there when the books were new.",
    characters: [
      {
        id: "marginalia", name: "Marginalia", kind: "notes", color: "#b8a8ff",
        x: 650, y: 540, paceRange: 60,
        lines: [
          "Marginalia: this part is true.",
          "Marginalia: she didn't mean for any of us to happen. we just... did.",
          "Marginalia: careful. some pages remember more than they should.",
        ],
      },
    ],
  },
};
