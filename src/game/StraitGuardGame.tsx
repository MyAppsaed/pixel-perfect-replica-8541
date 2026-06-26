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
          <div className="space-y-2 pointer-events-auto sg-panel px-3 py-2">
            <HpBar label="CARGO" value={g.cargo.hp / g.cargo.maxHp} />
            <HpBar label="FRIGATE" value={g.player.hp / g.player.maxHp} />
            <div className="text-[10px] tracking-[0.2em] text-cyan-200/80 font-mono">
              PROGRESS · {String(Math.floor(g.progress() * 100)).padStart(3, "0")}%
            </div>
          </div>
          <button onClick={pause} className="pointer-events-auto btn-ghost">
            ❚❚ PAUSE
          </button>
        </div>
      )}

      {/* Overlays */}
      {screen === "menu" && (
        <Overlay>
          <img
            src={logoAsset.url}
            alt="StraitGuard"
            className="w-[min(90vw,520px)] rounded-2xl shadow-2xl ring-1 ring-cyan-400/30"
          />
          <p className="sg-tagline">ESCORT · DEFEND · DELIVER</p>
          <button onClick={() => setScreen("levels")} className="btn-primary">▶ START MISSION</button>
        </Overlay>
      )}

      {screen === "levels" && (
        <Overlay>
          <SgTitle>SELECT MISSION</SgTitle>
          <div className="flex gap-3 flex-wrap justify-center">
            {[1, 2, 3].map((lvl) => (
              <button key={lvl} onClick={() => startLevel(lvl as 1 | 2 | 3)} className="btn-primary min-w-[150px]">
                <span className="block text-[10px] tracking-[0.25em] opacity-80">MISSION 0{lvl}</span>
                <span className="block text-lg font-black tracking-wider">
                  {lvl === 1 ? "PATROL" : lvl === 2 ? "BLOCKADE" : "GAUNTLET"}
                </span>
              </button>
            ))}
          </div>
          <button onClick={toMenu} className="btn-ghost">◀ BACK</button>
        </Overlay>
      )}

      {screen === "pause" && (
        <Overlay>
          <SgTitle>PAUSED</SgTitle>
          <button onClick={resume} className="btn-primary">▶ RESUME</button>
          <button onClick={restart} className="btn-ghost">↻ RESTART</button>
          <button onClick={toMenu} className="btn-ghost">⌂ MAIN MENU</button>
        </Overlay>
      )}

      {screen === "win" && (
        <Overlay>
          <SgTitle accent="cyan">MISSION COMPLETE</SgTitle>
          <p className="text-cyan-100/80 tracking-wider text-sm">CARGO DELIVERED · STRAIT SECURED</p>
          <button onClick={restart} className="btn-primary">▶ PLAY AGAIN</button>
          <button onClick={toMenu} className="btn-ghost">⌂ MAIN MENU</button>
        </Overlay>
      )}

      {screen === "lose" && (
        <Overlay>
          <SgTitle accent="red">MISSION FAILED</SgTitle>
          <p className="text-red-200/80 tracking-wider text-sm uppercase">
            {g && !g.cargo.alive ? "Cargo ship destroyed" : "Escort frigate sunk"}
          </p>
          <button onClick={restart} className="btn-primary">↻ RETRY</button>
          <button onClick={toMenu} className="btn-ghost">⌂ MAIN MENU</button>
        </Overlay>
      )}

      <style>{`
        .btn-primary {
          background: linear-gradient(180deg,#e8ecf2 0%,#aab3bf 45%,#6b7480 55%,#cfd6df 100%);
          color:#0b1620; font-weight:900; padding:12px 26px; border-radius:4px;
          letter-spacing:.18em; font-size:13px;
          border:1px solid rgba(120,220,255,.55);
          box-shadow:
            0 0 0 1px rgba(0,0,0,.55),
            0 0 14px rgba(80,200,255,.35),
            inset 0 1px 0 rgba(255,255,255,.7),
            inset 0 -2px 0 rgba(0,0,0,.25);
          clip-path: polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);
          text-shadow:0 1px 0 rgba(255,255,255,.5);
          transition:transform .1s, filter .15s;
        }
        .btn-primary:hover{ transform: translateY(-1px); filter:brightness(1.08); }
        .btn-primary:active{ transform: translateY(1px); }
        .btn-ghost {
          color:#cfeaff; padding:10px 22px; border-radius:4px;
          background: linear-gradient(180deg, rgba(15,30,45,.85), rgba(8,16,24,.85));
          border:1px solid rgba(120,220,255,.35);
          letter-spacing:.18em; font-size:12px; font-weight:700;
          box-shadow: inset 0 0 12px rgba(80,200,255,.12), 0 0 8px rgba(0,0,0,.4);
          clip-path: polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px);
          backdrop-filter: blur(6px);
        }
        .btn-ghost:hover{ border-color: rgba(120,220,255,.7); color:#fff; }
        .sg-panel {
          background: linear-gradient(180deg, rgba(10,22,34,.78), rgba(6,14,22,.78));
          border:1px solid rgba(120,220,255,.28);
          box-shadow: inset 0 0 14px rgba(80,200,255,.1), 0 4px 18px rgba(0,0,0,.4);
          backdrop-filter: blur(8px);
          clip-path: polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);
        }
        .sg-tagline {
          color: #9fd8ff; letter-spacing:.45em; font-size:11px; font-weight:700;
          text-shadow: 0 0 12px rgba(80,200,255,.45);
        }
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
