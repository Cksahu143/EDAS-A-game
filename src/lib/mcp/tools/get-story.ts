import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const STORY = {
  title: "EDAS",
  tagline: "A hand-painted story of a strange school.",
  synopsis:
    "On the morning of the Great Competition, a student wanders the sun-drenched grounds of an old school. Beneath the hedges, something waits — a hatch in the wet stone, a fall through memory, and a garden of forgotten numbers.",
  phases: [
    { name: "Prologue", summary: "Undertale-style opening cutscene explains the Great Competition and hints at the secret beneath the school." },
    { name: "The School", summary: "Explore the hand-painted grounds, meet other students, wander the hedge maze." },
    { name: "The Discovery", summary: "As the player nears the hatch, wind changes and birds hush. Grass parts to reveal it." },
    { name: "The Collision", summary: "A student sprints past and slams into the player, knocking them into the pit." },
    { name: "The Fall", summary: "A long descent through memory visions — old classrooms, teachers, a lone tree." },
    { name: "Underground", summary: "A subterranean chamber, a firefly companion named CoCo, glowing mushrooms, a broken clock." },
    { name: "The Garden of Forgotten Numbers", summary: "The first learning puzzle: count 1 to 10 by placing flowers at a stone gate." },
  ],
};

export default defineTool({
  name: "get_story",
  title: "Get EDAS story",
  description: "Return the current story synopsis and phase breakdown for the EDAS game.",
  inputSchema: {
    include_phases: z
      .boolean()
      .optional()
      .describe("Include the phase-by-phase breakdown. Defaults to true."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ include_phases = true }) => {
    const payload = include_phases ? STORY : { ...STORY, phases: undefined };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
