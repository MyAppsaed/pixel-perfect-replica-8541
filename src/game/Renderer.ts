import type { GameManager } from "./straitguard";

export function render(ctx: CanvasRenderingContext2D, g: GameManager) {
  const { width: W, height: H } = g;

  // water
  ctx.fillStyle = "#0b3a5b";
  ctx.fillRect(0, 0, W, H);

  // animated water stripes (parallax from cameraY)
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  const stripeH = 22;
  const offset = (g.cameraY * 0.6) % stripeH;
  for (let y = -stripeH + offset; y < H; y += stripeH * 2) {
    ctx.fillRect(120, y, W - 240, stripeH);
  }

  // land left/right
  const landW = 110;
  ctx.fillStyle = "#3b6a2a";
  ctx.fillRect(0, 0, landW, H);
  ctx.fillRect(W - landW, 0, landW, H);
  ctx.fillStyle = "#264a1a";
  ctx.fillRect(landW - 8, 0, 8, H);
  ctx.fillRect(W - landW, 0, 8, H);

  // progress finish line indicator at top once near end
  const prog = g.progress();
  ctx.fillStyle = `rgba(255,220,80,${0.2 + prog * 0.6})`;
  ctx.fillRect(landW, 20, W - landW * 2, 4);

  // cargo
  drawShip(ctx, g.cargo.pos.x, g.cargo.pos.y, g.cargo.size.x, g.cargo.size.y, "#c9a24a", "#5a3a10");
  drawHpBar(ctx, g.cargo.pos.x, g.cargo.pos.y - g.cargo.size.y / 2 - 10, 60, g.cargo.hp / g.cargo.maxHp, "#f0c040");

  // enemies
  for (const e of g.enemies) {
    drawShip(ctx, e.pos.x, e.pos.y, e.size.x, e.size.y, e.color, "#2a0a0a");
    drawHpBar(ctx, e.pos.x, e.pos.y - e.size.y / 2 - 8, e.size.x + 6, e.hp / e.maxHp, "#ff6060");
  }

  // player
  drawShip(ctx, g.player.pos.x, g.player.pos.y, g.player.size.x, g.player.size.y, "#4ad29a", "#0a2a1a");

  // bullets
  for (const b of g.bullets) {
    ctx.beginPath();
    ctx.fillStyle = b.from === "player" ? "#bff7d8" : "#ffd060";
    ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawShip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, stroke: string) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  // rounded rect-ish hull
  const rx = x - w / 2, ry = y - h / 2;
  ctx.moveTo(rx + w * 0.15, ry);
  ctx.lineTo(rx + w * 0.85, ry);
  ctx.lineTo(rx + w, ry + h * 0.5);
  ctx.lineTo(rx + w * 0.85, ry + h);
  ctx.lineTo(rx + w * 0.15, ry + h);
  ctx.lineTo(rx, ry + h * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawHpBar(ctx: CanvasRenderingContext2D, cx: number, y: number, w: number, frac: number, color: string) {
  const h = 5;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(cx - w / 2, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(cx - w / 2, y, w * Math.max(0, frac), h);
}
