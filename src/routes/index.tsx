import { createFileRoute } from "@tanstack/react-router";
import StraitGuardGame from "@/game/StraitGuardGame";
import logoAsset from "@/assets/straitguard-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StraitGuard — Naval Escort Defense" },
      { name: "description", content: "Offline top-down naval defense prototype. Escort the cargo ship through a hostile strait across 3 levels." },
      { property: "og:title", content: "StraitGuard" },
      { property: "og:description", content: "Offline top-down naval defense prototype." },
      { property: "og:image", content: logoAsset.url },
      { name: "twitter:image", content: logoAsset.url },
    ],
    links: [
      { rel: "icon", href: logoAsset.url },
      { rel: "apple-touch-icon", href: logoAsset.url },
    ],
  }),
  component: Index,
});

function Index() {
  return <StraitGuardGame />;
}
