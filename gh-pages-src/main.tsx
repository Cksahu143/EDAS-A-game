import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { EdasGame } from "../src/game/EdasGame";
import "../src/styles.css";

const root = document.getElementById("root")!;
createRoot(root).render(
  <StrictMode>
    <EdasGame />
  </StrictMode>,
);
