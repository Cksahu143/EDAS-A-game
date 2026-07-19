import { createFileRoute } from "@tanstack/react-router";
import { EdasGame } from "@/game/EdasGame";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return <EdasGame />;
}
