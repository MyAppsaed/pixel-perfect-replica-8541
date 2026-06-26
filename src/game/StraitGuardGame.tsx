import { useEffect, useRef, useState } from "react";
import { GameManager, LEVELS } from "./straitguard";
import logoAsset from "@/assets/straitguard-logo.png.asset.json";
import { render } from "./Renderer";

type Screen = "menu" | "levels" | "play" | "pause" | "win" | "lose";

export default function StraitGuardGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameManager | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);
  const [screen, setScreen] = useState<Screen>("menu");
  const [, force] = useState(0);

  // setup canvas + loop
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (gameRef.current) gameRef.current.resize(rect.width, rect.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - lastRef.current) / 1000 || 0);
      lastRef.current = t;
      const g = gameRef.current;
      if (g) {
        g.update(dt);
        render(ctx, g);
        if (g.status === "win") setScreen("win");
        else if (g.status === "lose") setScreen("lose");
        force((n) => (n + 1) % 1000);
      } else {
        ctx.fillStyle = "#0b3a5b";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    // input
    const getPos = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onDown = (e: PointerEvent) => {
      const g = gameRef.current;
      if (!g || g.status !== "playing") return;
      canvas.setPointerCapture(e.pointerId);
      g.player.setTarget(getPos(e));
    };
    const onMove = (e: PointerEvent) => {
      const g = gameRef.current;
      if (!g || g.status !== "playing") return;
      if (e.buttons === 0 && e.pointerType === "mouse") return;
      g.player.setTarget(getPos(e));
    };
    const onUp = () => {
      const g = gameRef.current;
      if (!g) return;
      g.player.setTarget(null);
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const startLevel = (lvl: 1 | 2 | 3) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const g = new GameManager({ width: rect.width, height: rect.height, level: lvl });
    g.start(lvl);
    gameRef.current = g;
    setScreen("play");
  };
  const pause = () => { gameRef.current?.pause(); setScreen("pause"); };
  const resume = () => { gameRef.current?.resume(); setScreen("play"); };
  const restart = () => {
    const g = gameRef.current;
    if (g) startLevel(g.level);
  };
  const toMenu = () => { gameRef.current = null; setScreen("menu"); };

  const g = gameRef.current;

  return (
    <div className="relative w-full h-[100svh] bg-slate-900 overflow-hidden select-none touch-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* HUD */}
      {screen === "play" && g && (
        <div className="absolute top-0 left-0 right-0 p-3 flex items-start justify-between pointer-events-none">
          <div className="space-y-2 pointer-events-auto">
            <HpBar label="Cargo" value={g.cargo.hp / g.cargo.maxHp} color="bg-amber-400" />
            <HpBar label="Escort" value={g.player.hp / g.player.maxHp} color="bg-emerald-400" />
            <div className="text-xs text-white/80 font-mono">Progress {Math.floor(g.progress() * 100)}%</div>
          </div>
          <button
            onClick={pause}
            className="pointer-events-auto rounded-md bg-white/10 hover:bg-white/20 text-white px-3 py-2 backdrop-blur"
          >
            ⏸ Pause
          </button>
        </div>
      )}

      {/* Overlays */}
      {screen === "menu" && (
        <Overlay>
          <img
            src={logoAsset.url}
            alt="StraitGuard"
            className="w-[min(90vw,520px)] rounded-2xl shadow-2xl ring-1 ring-white/10"
          />
          <p className="text-white/70 max-w-sm text-center">Escort the cargo ship through a hostile strait. Drag to move. Auto-fire.</p>
          <button onClick={() => setScreen("levels")} className="btn-primary">▶ Start Game</button>
        </Overlay>
      )}

      {screen === "levels" && (
        <Overlay>
          <h2 className="text-3xl font-bold text-white">Select Level</h2>
          <div className="flex gap-3 flex-wrap justify-center">
            {[1, 2, 3].map((lvl) => (
              <button key={lvl} onClick={() => startLevel(lvl as 1 | 2 | 3)} className="btn-primary min-w-[140px]">
                Level {lvl}
                <span className="block text-xs font-normal opacity-80">
                  {lvl === 1 ? "Easy" : lvl === 2 ? "Medium" : "Hard"}
                </span>
              </button>
            ))}
          </div>
          <button onClick={toMenu} className="btn-ghost">Back</button>
        </Overlay>
      )}

      {screen === "pause" && (
        <Overlay>
          <h2 className="text-3xl font-bold text-white">Paused</h2>
          <button onClick={resume} className="btn-primary">Resume</button>
          <button onClick={restart} className="btn-ghost">Restart</button>
          <button onClick={toMenu} className="btn-ghost">Main Menu</button>
        </Overlay>
      )}

      {screen === "win" && (
        <Overlay>
          <h2 className="text-4xl font-black text-emerald-400">Victory</h2>
          <p className="text-white/70">Cargo delivered safely through the strait.</p>
          <button onClick={restart} className="btn-primary">Play Again</button>
          <button onClick={toMenu} className="btn-ghost">Main Menu</button>
        </Overlay>
      )}

      {screen === "lose" && (
        <Overlay>
          <h2 className="text-4xl font-black text-red-400">Mission Failed</h2>
          <p className="text-white/70">
            {g && !g.cargo.alive ? "The cargo ship was destroyed." : "Your escort was sunk."}
          </p>
          <button onClick={restart} className="btn-primary">Retry</button>
          <button onClick={toMenu} className="btn-ghost">Main Menu</button>
        </Overlay>
      )}

      <style>{`
        .btn-primary {
          background: linear-gradient(180deg,#f5c449,#d99a1f);
          color:#1a1208; font-weight:700; padding:12px 24px; border-radius:10px;
          box-shadow:0 6px 20px rgba(0,0,0,.35); transition:transform .1s;
        }
        .btn-primary:hover{ transform: translateY(-1px); }
        .btn-primary:active{ transform: translateY(1px); }
        .btn-ghost {
          color:#fff; padding:10px 20px; border-radius:10px;
          background: rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.15);
        }
        .btn-ghost:hover{ background: rgba(255,255,255,.16); }
      `}</style>

      {/* level meta for SR */}
      <div className="sr-only">
        Levels available: {Object.keys(LEVELS).join(", ")}
      </div>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-slate-950/70 backdrop-blur-sm p-6">
      {children}
    </div>
  );
}

function HpBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="w-44">
      <div className="text-[11px] uppercase tracking-wider text-white/70 mb-0.5">{label}</div>
      <div className="h-2.5 w-full rounded-full bg-black/50 overflow-hidden border border-white/10">
        <div className={`h-full ${color} transition-[width] duration-150`} style={{ width: `${Math.max(0, value) * 100}%` }} />
      </div>
    </div>
  );
}
