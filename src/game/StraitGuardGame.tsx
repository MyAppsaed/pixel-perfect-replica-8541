import { useEffect, useRef, useState } from "react";
import { GameManager, LEVELS } from "./straitguard";
import { audio } from "./audio";
import logoAsset from "@/assets/straitguard-logo.png.asset.json";
import { render } from "./Renderer";

type Screen = "menu" | "levels" | "play" | "pause" | "win" | "lose";
type Lang = "en" | "ar";

const I18N: Record<Lang, Record<string, string>> = {
  en: {
    tagline: "ESCORT · DEFEND · DELIVER",
    start: "▶ START MISSION",
    selectMission: "SELECT MISSION",
    mission: "MISSION",
    patrol: "PATROL", blockade: "BLOCKADE", gauntlet: "GAUNTLET",
    back: "◀ BACK", pause: "❚❚ PAUSE", paused: "PAUSED",
    resume: "▶ RESUME", restart: "↻ RESTART", menu: "⌂ MAIN MENU",
    complete: "MISSION COMPLETE", failed: "MISSION FAILED",
    completeSub: "CARGO DELIVERED · STRAIT SECURED",
    cargoLost: "Cargo ship destroyed", frigateLost: "Escort frigate sunk",
    playAgain: "▶ PLAY AGAIN", retry: "↻ RETRY",
    cargo: "CARGO", frigate: "FRIGATE", progress: "PROGRESS",
    lang: "العربية", sound: "SOUND", on: "ON", off: "OFF",
  },
  ar: {
    tagline: "مرافقة · دفاع · توصيل",
    start: "▶ بدء المهمة",
    selectMission: "اختر المهمة",
    mission: "مهمة",
    patrol: "دورية", blockade: "حصار", gauntlet: "تحدٍّ",
    back: "◀ رجوع", pause: "❚❚ إيقاف", paused: "متوقف",
    resume: "▶ استئناف", restart: "↻ إعادة", menu: "⌂ القائمة",
    complete: "اكتملت المهمة", failed: "فشلت المهمة",
    completeSub: "تم توصيل الشحنة · المضيق مؤمَّن",
    cargoLost: "تم تدمير سفينة الشحن", frigateLost: "أُغرقت الفرقاطة",
    playAgain: "▶ العب مجددًا", retry: "↻ أعد المحاولة",
    cargo: "الشحنة", frigate: "الفرقاطة", progress: "التقدم",
    lang: "English", sound: "الصوت", on: "تشغيل", off: "إيقاف",
  },
};

export default function StraitGuardGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameManager | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);
  const [screen, setScreen] = useState<Screen>("menu");
  const [lang, setLang] = useState<Lang>("en");
  const [muted, setMuted] = useState(false);
  const [, force] = useState(0);
  const t = I18N[lang];

  useEffect(() => {
    audio.setMuted(muted);
  }, [muted]);

  // music per screen
  useEffect(() => {
    if (muted) { audio.stopMusic(); return; }
    if (screen === "menu" || screen === "levels") audio.startMusic("menu");
    else if (screen === "play") audio.startMusic("play");
    else if (screen === "pause") audio.stopMusic();
  }, [screen, muted]);

  const click = (fn: () => void) => () => { audio.resume(); audio.play("click"); fn(); };

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

    const loop = (ts: number) => {
      const dt = Math.min(0.05, (ts - lastRef.current) / 1000 || 0);
      lastRef.current = ts;
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
    const onUp = () => { gameRef.current?.player.setTarget(null); };
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
  const restart = () => { const g = gameRef.current; if (g) startLevel(g.level); };
  const toMenu = () => { gameRef.current = null; setScreen("menu"); };

  const g = gameRef.current;
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <div dir={dir} className="relative w-full h-[100svh] bg-slate-900 overflow-hidden select-none touch-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {screen !== "play" && (
        <div className="absolute top-3 right-3 z-20 pointer-events-auto" dir="ltr">
          <button
            type="button"
            data-language-toggle
            aria-label="Switch language"
            onClick={click(() => setLang(lang === "en" ? "ar" : "en"))}
            className="btn-language"
          >
            🌐 LANGUAGE: <span>{lang === "en" ? "EN" : "AR"}</span> / {t.lang}
          </button>
        </div>
      )}

      {screen === "play" && g && (
        <div className="absolute top-0 left-0 right-0 p-3 flex items-start justify-between pointer-events-none">
          <div className="space-y-2 pointer-events-auto sg-panel px-3 py-2">
            <HpBar label={t.cargo} value={g.cargo.hp / g.cargo.maxHp} />
            <HpBar label={t.frigate} value={g.player.hp / g.player.maxHp} />
            <div className="text-[10px] tracking-[0.2em] text-cyan-200/80 font-mono">
              {t.progress} · {String(Math.floor(g.progress() * 100)).padStart(3, "0")}%
            </div>
          </div>
          <button onClick={click(pause)} className="pointer-events-auto btn-ghost">{t.pause}</button>
        </div>
      )}

      {screen === "menu" && (
        <Overlay>
          <img src={logoAsset.url} alt="StraitGuard"
            className="w-[min(90vw,520px)] rounded-2xl shadow-2xl ring-1 ring-cyan-400/30" />
          <p className="sg-tagline">{t.tagline}</p>
          <button onClick={click(() => setScreen("levels"))} className="btn-primary">{t.start}</button>
          <div className="flex gap-2 mt-2 flex-wrap justify-center">
            <button onClick={click(() => setMuted(!muted))} className="btn-ghost">
              {muted ? "🔇" : "🔊"} {t.sound}: {muted ? t.off : t.on}
            </button>
          </div>
        </Overlay>
      )}

      {screen === "levels" && (
        <Overlay>
          <SgTitle>{t.selectMission}</SgTitle>
          <div className="flex gap-3 flex-wrap justify-center">
            {[1, 2, 3].map((lvl) => (
              <button key={lvl} onClick={click(() => startLevel(lvl as 1 | 2 | 3))} className="btn-primary min-w-[150px]">
                <span className="block text-[10px] tracking-[0.25em] opacity-80">{t.mission} 0{lvl}</span>
                <span className="block text-lg font-black tracking-wider">
                  {lvl === 1 ? t.patrol : lvl === 2 ? t.blockade : t.gauntlet}
                </span>
              </button>
            ))}
          </div>
          <button onClick={click(toMenu)} className="btn-ghost">{t.back}</button>
        </Overlay>
      )}

      {screen === "pause" && (
        <Overlay>
          <SgTitle>{t.paused}</SgTitle>
          <button onClick={click(resume)} className="btn-primary">{t.resume}</button>
          <button onClick={click(restart)} className="btn-ghost">{t.restart}</button>
          <button onClick={click(toMenu)} className="btn-ghost">{t.menu}</button>
        </Overlay>
      )}

      {screen === "win" && (
        <Overlay>
          <SgTitle accent="cyan">{t.complete}</SgTitle>
          <p className="text-cyan-100/80 tracking-wider text-sm">{t.completeSub}</p>
          <button onClick={click(restart)} className="btn-primary">{t.playAgain}</button>
          <button onClick={click(toMenu)} className="btn-ghost">{t.menu}</button>
        </Overlay>
      )}

      {screen === "lose" && (
        <Overlay>
          <SgTitle accent="red">{t.failed}</SgTitle>
          <p className="text-red-200/80 tracking-wider text-sm uppercase">
            {g && !g.cargo.alive ? t.cargoLost : t.frigateLost}
          </p>
          <button onClick={click(restart)} className="btn-primary">{t.retry}</button>
          <button onClick={click(toMenu)} className="btn-ghost">{t.menu}</button>
        </Overlay>
      )}

      <style>{`
        .btn-primary {
          background: linear-gradient(180deg,#e8ecf2 0%,#aab3bf 45%,#6b7480 55%,#cfd6df 100%);
          color:#0b1620; font-weight:900; padding:12px 26px; border-radius:4px;
          letter-spacing:.18em; font-size:13px;
          border:1px solid rgba(120,220,255,.55);
          box-shadow: 0 0 0 1px rgba(0,0,0,.55), 0 0 14px rgba(80,200,255,.35),
            inset 0 1px 0 rgba(255,255,255,.7), inset 0 -2px 0 rgba(0,0,0,.25);
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
        .btn-language {
          color:#07141f;
          padding:11px 16px;
          border-radius:4px;
          background: linear-gradient(180deg,#dffaff 0%,#79d8ff 44%,#1f7aa3 58%,#bfeaff 100%);
          border:1px solid rgba(210,250,255,.9);
          letter-spacing:.1em;
          font-size:12px;
          font-weight:900;
          box-shadow: 0 0 0 1px rgba(0,0,0,.55), 0 0 22px rgba(80,200,255,.58), inset 0 1px 0 rgba(255,255,255,.8);
          clip-path: polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px);
          text-shadow:0 1px 0 rgba(255,255,255,.45);
        }
        .btn-language span{ color:#001d2c; }
        .btn-language:hover{ filter:brightness(1.08); }
        @media (max-width: 520px) {
          .btn-language { font-size:10px; padding:9px 12px; letter-spacing:.06em; }
        }
        .sg-panel {
          background: linear-gradient(180deg, rgba(10,22,34,.78), rgba(6,14,22,.78));
          border:1px solid rgba(120,220,255,.28);
          box-shadow: inset 0 0 14px rgba(80,200,255,.1), 0 4px 18px rgba(0,0,0,.4);
          backdrop-filter: blur(8px);
          clip-path: polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);
        }
        .sg-tagline { color: #9fd8ff; letter-spacing:.45em; font-size:11px; font-weight:700;
          text-shadow: 0 0 12px rgba(80,200,255,.45); }
        [dir="rtl"] .sg-tagline { letter-spacing:.2em; }
      `}</style>

      <div className="sr-only">Levels available: {Object.keys(LEVELS).join(", ")}</div>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 p-6
      bg-[radial-gradient(ellipse_at_center,rgba(8,20,32,.6),rgba(2,6,12,.92))] backdrop-blur-md">
      {children}
    </div>
  );
}

function SgTitle({ children, accent = "silver" }: { children: React.ReactNode; accent?: "silver" | "cyan" | "red" }) {
  const grad =
    accent === "cyan" ? "linear-gradient(180deg,#dffaff 0%,#7fd9ff 45%,#1f7aa3 55%,#bfeaff 100%)"
    : accent === "red" ? "linear-gradient(180deg,#ffd6d6 0%,#ff7878 45%,#8a1a1a 55%,#ffb8b8 100%)"
    : "linear-gradient(180deg,#f4f6fa 0%,#b9c0cc 45%,#5a6470 55%,#e0e5ec 100%)";
  return (
    <h2 className="text-3xl md:text-4xl font-black tracking-[0.2em] uppercase"
      style={{ backgroundImage: grad, WebkitBackgroundClip: "text", backgroundClip: "text",
        color: "transparent", textShadow: "0 0 24px rgba(80,200,255,.25)",
        filter: "drop-shadow(0 2px 0 rgba(0,0,0,.6))" }}>
      {children}
    </h2>
  );
}

function HpBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="w-48">
      <div className="flex justify-between text-[10px] tracking-[0.25em] text-cyan-100/80 mb-0.5 font-bold">
        <span>{label}</span>
        <span className="font-mono opacity-70">{String(Math.floor(value * 100)).padStart(3, "0")}</span>
      </div>
      <div className="h-2 w-full bg-black/70 overflow-hidden border border-cyan-400/30 shadow-[inset_0_0_6px_rgba(0,0,0,0.8)]">
        <div className="h-full transition-[width] duration-150"
          style={{ width: `${Math.max(0, value) * 100}%`,
            background: "linear-gradient(90deg,#ffb648 0%,#ff6a1f 60%,#ff2e2e 100%)",
            boxShadow: "0 0 8px rgba(255,140,40,.6)" }} />
      </div>
    </div>
  );
}
