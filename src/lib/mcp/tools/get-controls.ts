import { defineTool } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "get_controls",
  title: "Get game controls",
  description: "Return the keyboard and touch controls for the EDAS game.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const controls = {
      movement: "WASD or arrow keys (on-screen joystick on touch devices)",
      interact: "E — pick up or place flowers in the Garden of Forgotten Numbers",
      note: "The hatch opens automatically when the player enters its area — no key press required.",
    };
    return {
      content: [{ type: "text", text: JSON.stringify(controls, null, 2) }],
      structuredContent: controls,
    };
  },
});
