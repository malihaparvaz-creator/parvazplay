import { useCallback, useEffect, useRef, useState } from 'react';
import { Sounds } from '../utils/useSounds';
import { usePersistedNumber } from '../utils/useBestScore';

const W = 420;
const H = 280;
const PADDLE_H = 50;
const PADDLE_W = 8;
const BALL_R = 6;
const WIN_SCORE = 7;

/**
 * Predict where the ball will be when it reaches a given X position.
 * Simulates bounces off top/bottom walls.
 */
function predictBallY(bx: number, by: number, bvx: number, bvy: number, targetX: number): number {
  if (bvx <= 0) return by; // Ball moving away — return current position
  let x = bx;
  let y = by;
  let vy = bvy;
  const maxSteps = 600;
  for (let i = 0; i < maxSteps; i++) {
    x += bvx;
    y += vy;
    if (y <= BALL_R) { y = BALL_R; vy = Math.abs(vy); }
    if (y >= H - BALL_R) { y = H - BALL_R; vy = -Math.abs(vy); }
    if (x >= targetX) return y;
  }
  return y;
}

export function PongGame() {
  const [best, setBest] = usePersistedNumber('pong-best', 0);
  const [phase, setPhase] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [pScore, setPScore] = useState(0);
  const [aScore, setAScore] = useState(0);
  const [ballVis, setBallVis] = useState({ x: W / 2, y: H / 2 });
  const [pPaddleVis, setPPaddleVis] = useState(H / 2 - PADDLE_H / 2);
  const [aPaddleVis, setAPaddleVis] = useState(H / 2 - PADDLE_H / 2);

  const g = useRef({
    bx: W / 2, by: H / 2,
    bvx: 4.5, bvy: 3,
    py: H / 2 - PADDLE_H / 2,
    ay: H / 2 - PADDLE_H / 2,
    pScore: 0, aScore: 0,
    keys: { up: false, down: false },
    // AI state
    aiTarget: H / 2 - PADDLE_H / 2,
    aiUpdateTimer: 0,
  });

  const start = useCallback(() => {
    const gr = g.current;
    gr.bx = W / 2; gr.by = H / 2;
    gr.bvx = Math.random() > 0.5 ? 4.5 : -4.5;
    gr.bvy = (Math.random() - 0.5) * 5;
    gr.py = H / 2 - PADDLE_H / 2;
    gr.ay = H / 2 - PADDLE_H / 2;
    gr.aiTarget = H / 2 - PADDLE_H / 2;
    gr.aiUpdateTimer = 0;
    gr.pScore = 0; gr.aScore = 0;
    gr.keys = { up: false, down: false };
    setPScore(0); setAScore(0);
    setPhase('playing');
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(32, now - last) / 16.67;
      last = now;
      const gr = g.current;

      // Player paddle
      const speed = 6;
      if (gr.keys.up) gr.py -= speed * dt;
      if (gr.keys.down) gr.py += speed * dt;
      gr.py = Math.max(4, Math.min(H - PADDLE_H - 4, gr.py));

      // === AI with trajectory prediction ===
      // Re-calculate target every ~12 frames to simulate reaction lag
      gr.aiUpdateTimer -= dt;
      if (gr.aiUpdateTimer <= 0) {
        gr.aiUpdateTimer = 12 + Math.random() * 8; // reaction jitter
        if (gr.bvx > 0) {
          // Ball heading toward AI — predict landing Y
          const aiPaddleX = W - 16 - PADDLE_W;
          const landY = predictBallY(gr.bx, gr.by, gr.bvx, gr.bvy, aiPaddleX);
          // Add slight imperfection scaled by AI score (gets harder)
          const imperfection = Math.max(0, 12 - gr.aScore * 1.5);
          gr.aiTarget = landY - PADDLE_H / 2 + (Math.random() - 0.5) * imperfection;
        } else {
          // Ball moving away — drift to center
          gr.aiTarget = H / 2 - PADDLE_H / 2;
        }
        gr.aiTarget = Math.max(4, Math.min(H - PADDLE_H - 4, gr.aiTarget));
      }
      // Smoothly move toward target
      const aiSpeed = 4.2 + gr.aScore * 0.25;
      const diff = gr.aiTarget - gr.ay;
      if (Math.abs(diff) > 2) {
        gr.ay += Math.sign(diff) * Math.min(aiSpeed * dt, Math.abs(diff));
      }
      gr.ay = Math.max(4, Math.min(H - PADDLE_H - 4, gr.ay));

      // Ball movement
      gr.bx += gr.bvx * dt;
      gr.by += gr.bvy * dt;

      // Wall bounce
      if (gr.by <= BALL_R) { gr.by = BALL_R; gr.bvy = Math.abs(gr.bvy); Sounds.wallBounce(); }
      if (gr.by >= H - BALL_R) { gr.by = H - BALL_R; gr.bvy = -Math.abs(gr.bvy); Sounds.wallBounce(); }

      // Player paddle collision
      if (gr.bvx < 0 && gr.bx <= 16 + PADDLE_W && gr.bx >= 12 && gr.by >= gr.py && gr.by <= gr.py + PADDLE_H) {
        gr.bx = 16 + PADDLE_W; Sounds.paddleHit();
        gr.bvx = Math.abs(gr.bvx) + 0.25;
        const offset = (gr.by - (gr.py + PADDLE_H / 2)) / (PADDLE_H / 2);
        gr.bvy = offset * 5.5;
        const spd = Math.sqrt(gr.bvx * gr.bvx + gr.bvy * gr.bvy);
        if (spd > 10) { gr.bvx *= 10 / spd; gr.bvy *= 10 / spd; }
      }

      // AI paddle collision
      if (gr.bvx > 0 && gr.bx >= W - 16 - PADDLE_W && gr.bx <= W - 12 && gr.by >= gr.ay && gr.by <= gr.ay + PADDLE_H) {
        gr.bx = W - 16 - PADDLE_W; Sounds.paddleHit();
        gr.bvx = -Math.abs(gr.bvx) - 0.25;
        const offset = (gr.by - (gr.ay + PADDLE_H / 2)) / (PADDLE_H / 2);
        gr.bvy = offset * 5.5;
        const spd = Math.sqrt(gr.bvx * gr.bvx + gr.bvy * gr.bvy);
        if (spd > 10) { gr.bvx *= 10 / spd; gr.bvy *= 10 / spd; }
        // Invalidate AI target immediately after hit
        gr.aiUpdateTimer = 0;
      }

      // Score
      if (gr.bx < -10) {
        gr.aScore++;
        if (gr.aScore >= WIN_SCORE) {
          setAScore(gr.aScore);
          setPhase('ended');
          return;
        }
        resetBall(gr, -1); Sounds.pongScore();
      }
      if (gr.bx > W + 10) {
        gr.pScore++;
        setBest((prev) => Math.max(prev, gr.pScore));
        if (gr.pScore >= WIN_SCORE) {
          setPScore(gr.pScore);
          setPhase('ended');
          return;
        }
        resetBall(gr, 1);
      }

      setBallVis({ x: gr.bx, y: gr.by });
      setPPaddleVis(gr.py);
      setAPaddleVis(gr.ay);
      setPScore(gr.pScore);
      setAScore(gr.aScore);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, setBest]);

  function resetBall(gr: typeof g.current, dir: number) {
    gr.bx = W / 2; gr.by = H / 2;
    gr.bvx = dir * (4 + Math.random());
    gr.bvy = (Math.random() - 0.5) * 4;
    gr.aiUpdateTimer = 0;
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (phase !== 'playing') return;
      if (e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); g.current.keys.up = true; }
      if (e.key === 'ArrowDown' || e.key === 's') { e.preventDefault(); g.current.keys.down = true; }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') g.current.keys.up = false;
      if (e.key === 'ArrowDown' || e.key === 's') g.current.keys.down = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [phase]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-4 text-center">
        <div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3"><div className="text-xs text-purple-200">You</div><div className="text-2xl font-bold text-cyan-300">{pScore}</div></div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3"><div className="text-xs text-purple-200">AI</div><div className="text-2xl font-bold text-red-300">{aScore}</div></div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3"><div className="text-xs text-purple-200">Best Wins</div><div className="text-2xl font-bold text-emerald-300">{best}</div></div>
      </div>

      {phase === 'idle' && (
        <div className="rounded-2xl border border-white/20 bg-white/10 px-8 py-12 text-center">
          <div className="mb-4 text-6xl">🏓</div>
          <div className="mb-2 text-2xl font-bold text-white">Pong</div>
          <div className="mb-6 text-purple-200">First to {WIN_SCORE} wins. Arrow keys or W/S to move.</div>
          <button onClick={start} className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3 text-lg font-bold text-white shadow-lg active:scale-95">🏓 Start Match</button>
        </div>
      )}

      {phase === 'playing' && (
        <div className="flex flex-col items-center gap-3">
          <div className="relative overflow-hidden rounded-xl border-2 border-white/20 bg-slate-900" style={{ width: W, height: H }}>
            <div className="absolute left-1/2 top-0 h-full w-0.5 bg-white/10" />
            <div className="absolute rounded bg-cyan-400" style={{ left: 12, top: pPaddleVis, width: PADDLE_W, height: PADDLE_H }} />
            <div className="absolute rounded bg-red-400" style={{ right: 12, top: aPaddleVis, width: PADDLE_W, height: PADDLE_H }} />
            <div className="absolute rounded-full bg-white shadow-lg shadow-white/40" style={{ left: ballVis.x - BALL_R, top: ballVis.y - BALL_R, width: BALL_R * 2, height: BALL_R * 2 }} />
          </div>
          <div className="flex justify-center gap-4">
            <button onMouseDown={() => g.current.keys.up = true} onMouseUp={() => g.current.keys.up = false} onMouseLeave={() => g.current.keys.up = false} className="rounded-lg bg-white/10 px-8 py-2 text-white active:scale-95 select-none">↑</button>
            <button onMouseDown={() => g.current.keys.down = true} onMouseUp={() => g.current.keys.down = false} onMouseLeave={() => g.current.keys.down = false} className="rounded-lg bg-white/10 px-8 py-2 text-white active:scale-95 select-none">↓</button>
          </div>
        </div>
      )}

      {phase === 'ended' && (
        <div className="rounded-2xl border border-white/20 bg-white/10 px-8 py-6 text-center">
          <div className="mb-2 text-4xl">{pScore > aScore ? '🏆' : '🤖'}</div>
          <div className="mb-1 text-2xl font-bold text-white">{pScore > aScore ? 'You win!' : 'AI wins!'}</div>
          <div className="mb-4 text-xl text-purple-200">{pScore} - {aScore}</div>
          <button onClick={start} className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3 font-bold text-white shadow-lg active:scale-95">🔄 Rematch</button>
        </div>
      )}
    </div>
  );
}
