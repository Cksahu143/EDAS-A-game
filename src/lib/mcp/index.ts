import { defineMcp } from "@lovable.dev/mcp-js";
import getStory from "./tools/get-story";
import listCharacters from "./tools/list-characters";
import getControls from "./tools/get-controls";

export default defineMcp({
  name: "edas-mcp",
  title: "EDAS",
  version: "0.1.0",
  instructions:
    "Tools for exploring EDAS, a hand-painted indie adventure game. Use `get_story` for synopsis and phases, `list_characters` for the cast, and `get_controls` for keyboard/touch controls.",
  tools: [getStory, listCharacters, getControls],
});
