import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const CHARACTERS = [
  { id: "player", name: "The Student", role: "Protagonist wandering the school on the morning of the Great Competition." },
  { id: "coco", name: "CoCo", role: "Firefly-like companion with a warm glow. Meets the player in the underground chamber." },
  { id: "runner", name: "The Runner", role: "A student who sprints across the grounds and accidentally knocks the player into the hatch." },
  { id: "sprocket", name: "Sprocket", role: "Fen Sollene's first successful creation — a small, fragile being who is slowly decaying. Wanders the underground chamber; flickers and glitches at the edges when idle." },
  { id: "npcs", name: "Fellow Students", role: "Background classmates preparing for the competition." },
];

export default defineTool({
  name: "list_characters",
  title: "List characters",
  description: "List the named characters that appear in the EDAS game.",
  inputSchema: {
    query: z.string().trim().optional().describe("Optional case-insensitive filter over name or role."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ query }) => {
    const q = query?.toLowerCase();
    const items = q
      ? CHARACTERS.filter((c) => c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q))
      : CHARACTERS;
    return {
      content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
      structuredContent: { characters: items },
    };
  },
});
