import { createFileRoute } from "@tanstack/react-router";
import StraitGuardGame from "@/game/StraitGuardGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StraitGuard — Naval Escort Defense" },
      { name: "description", content: "Offline top-down naval defense prototype. Escort the cargo ship through a hostile strait across 3 levels." },
      { property: "og:title", content: "StraitGuard" },
      { property: "og:description", content: "Offline top-down naval defense prototype." },
    ],
  }),
  component: Index,
});

function Index() {
  return <StraitGuardGame />;
}
