import { useCallback, useEffect, useRef, useState } from 'react';
import { Sounds } from '../utils/useSounds';
import { usePersistedNumber } from '../utils/useBestScore';

const W = 320;
const H = 480;
const GRAVITY = 0.4;
const JUMP_VEL = -11;
const DOODLE_W = 28;
const DOODLE_H = 28;
const PLAT_W = 60;
const PLAT_H = 12;
const PLAT_GAP = 70;

interface Plat {
  id: number;
  x: number;
  y: number;
  type: 'normal' | 'moving'; // no more 'break'
  dir: number;
  broken: boolean;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
}

let _id = 0;
function makePlat(y: number): Plat {
  // 30% moving, 70% normal — no break platforms
  const type: Plat['type'] = Math.random() < 0.3 ? 'moving' : 'normal';
  return {
    id: _id++,
    x: 8 + Math.random() * (W - PLAT_W - 16),
    y,
    type,
    dir: Math.random() > 0.5 ? 1 : -1,
    broken: false,
  };
}

export function DoodleBouncer() {
  const [best, setBest] = usePersistedNumber('doodle-best', 0);
  const [phase, setPhase] = useState<'idle' | 'playing' | 'dead'>('idle');
  const [, setTick] = useState(0);

  const g = useRef({
    px: W / 2, py: 0,
    vx: 0, vy: 0,
    camY: 0,
    highestCamY: 0,
    score: 0,
    plats: [] as Plat[],
    parts: [] as Particle[],
    keys: { left: false, right: false },
  });

  const initGame = useCallback(() => {
    _id = 0;
    const gr = g.current;
    gr.px = W / 2; gr.py = 0;
    gr.vx = 0; gr.vy = JUMP_VEL;
    gr.score = 0;
    gr.camY = -H * 0.75;
    gr.highestCamY = gr.camY;
    gr.plats = [];
    gr.parts = [];
    gr.plats.push({ id: _id++, x: W / 2 - PLAT_W / 2, y: 30, type: 'normal', dir: 1, broken: false });
    for (let i = 1; i < 12; i++) gr.plats.push(makePlat(30 - i * PLAT_GAP));
  }, []);

  const start = useCallback(() => { initGame(); setPhase('playing'); }, [initGame]);

  useEffect(() => {
    if (phase !== 'playing') return;
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(32, now - last) / 16.67;
      last = now;
      const gr = g.current;

      if (gr.keys.left) gr.vx = -5.5;
      else if (gr.keys.right) gr.vx = 5.5;
      else gr.vx *= 0.82;

      gr.px += gr.vx * dt;
      if (gr.px < -DOODLE_W / 2) gr.px = W + DOODLE_W / 2;
      if (gr.px > W + DOODLE_W / 2) gr.px = -DOODLE_W / 2;

      gr.vy += GRAVITY * dt;
      gr.py += gr.vy * dt;

      const playerScreenY = gr.py - gr.camY;
      if (playerScreenY < H * 0.4) gr.camY = gr.py - H * 0.4;

      if (gr.camY < gr.highestCamY) {
        gr.highestCamY = gr.camY;
        gr.score = Math.floor(-gr.highestCamY / 8);
      }

      if (gr.vy > 0) {
        for (const p of gr.plats) {
          if (p.broken) continue;
          const playerFeet = gr.py + DOODLE_H / 2;
          const playerLeft = gr.px - DOODLE_W / 2;
          const playerRight = gr.px + DOODLE_W / 2;
          const overlapX = playerRight > p.x && playerLeft < p.x + PLAT_W;
          const prevFeet = playerFeet - gr.vy * dt;
          const crossedTop = prevFeet <= p.y && playerFeet >= p.y;
          if (overlapX && crossedTop) {
            gr.py = p.y - DOODLE_H / 2;
            if (p.type === 'moving') { Sounds.movingBounce(); } else { Sounds.bounce(); } gr.vy = JUMP_VEL + (p.type === 'moving' ? -1.5 : 0);
            break;
          }
        }
      }

      for (const p of gr.plats) {
        if (p.type !== 'moving' || p.broken) continue;
        p.x += p.dir * 1.5 * dt;
        if (p.x <= 4) { p.x = 4; p.dir = 1; }
        if (p.x >= W - PLAT_W - 4) { p.x = W - PLAT_W - 4; p.dir = -1; }
      }

      const highestPlat = gr.plats.reduce((m, p) => Math.min(m, p.y), Infinity);
      if (highestPlat > gr.camY + H * 0.2) {
        gr.plats.push(makePlat(highestPlat - PLAT_GAP - Math.random() * 20));
      }

      const screenBottom = gr.camY + H;
      gr.plats = gr.plats.filter((p) => p.y < screenBottom + 80);

      for (const pt of gr.parts) {
        pt.x += pt.vx * dt; pt.y += pt.vy * dt;
        pt.vy += GRAVITY * 0.4 * dt;
        pt.life -= 0.03 * dt;
      }
      gr.parts = gr.parts.filter((p) => p.life > 0);

      if (gr.py - gr.camY > H + 60) {
        setBest((prev) => Math.max(prev, gr.score));
        setPhase('dead');
        return;
      }

      setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, setBest]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (phase !== 'playing') return;
      if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); g.current.keys.left = true; }
      if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); g.current.keys.right = true; }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') g.current.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') g.current.keys.right = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [phase]);

  const gr = g.current;
  const toScreenY = (worldY: number) => worldY - gr.camY;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-4 text-center">
        <div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3">
          <div className="text-xs uppercase text-purple-200">Height</div>
          <div className="text-2xl font-bold text-yellow-300">{gr.score}</div>
        </div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3">
          <div className="text-xs uppercase text-purple-200">Best</div>
          <div className="text-2xl font-bold text-emerald-300">{best}</div>
        </div>
      </div>

      {phase === 'idle' && (
        <div className="rounded-2xl border border-white/20 bg-white/10 px-8 py-10 text-center">
          <div className="mb-4 text-6xl">🐸</div>
          <div className="mb-2 text-2xl font-bold text-white">Doodle Bouncer</div>
          <div className="mb-2 text-purple-200">Bounce up forever. Don't fall!</div>
          <div className="mb-6 text-sm text-purple-300">Arrow keys / A D — or tap buttons below</div>
          <div className="mb-4 flex justify-center gap-2 text-xs text-purple-300">
            <span className="rounded bg-emerald-500/30 px-2 py-1">Green = Normal</span>
            <span className="rounded bg-cyan-500/30 px-2 py-1">Blue = Moving</span>
          </div>
          <button onClick={start} className="rounded-xl bg-gradient-to-r from-green-500 to-lime-600 px-8 py-3 text-lg font-bold text-white shadow-lg active:scale-95">
            🐸 Start Bouncing
          </button>
        </div>
      )}

      {phase === 'playing' && (
        <div className="select-none">
          <div
            className="relative overflow-hidden rounded-xl border-2 border-white/20"
            style={{ width: W, height: H, background: 'linear-gradient(180deg, #0a0f2e 0%, #1a2a4a 100%)' }}
            onTouchMove={(e) => {
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              g.current.px = e.touches[0].clientX - rect.left;
            }}
          >
            {Array.from({ length: 25 }).map((_, i) => (
              <div key={i} className="absolute rounded-full bg-white" style={{
                width: i % 3 === 0 ? 2 : 1, height: i % 3 === 0 ? 2 : 1,
                opacity: 0.2 + (i % 4) * 0.1,
                left: (i * 67 + 13) % W, top: (i * 43 + 7) % H,
              }} />
            ))}

            <div className="absolute right-3 top-3 text-right">
              <div className="text-xs text-white/50">height</div>
              <div className="text-lg font-bold text-yellow-300">{gr.score}</div>
            </div>

            {gr.plats.map((p) => {
              if (p.broken) return null;
              const sy = toScreenY(p.y);
              if (sy < -PLAT_H || sy > H + PLAT_H) return null;
              return (
                <div
                  key={p.id}
                  className={`absolute rounded-lg ${
                    p.type === 'moving'
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-500'
                      : 'bg-gradient-to-r from-emerald-400 to-green-500'
                  }`}
                  style={{ left: p.x, top: sy, width: PLAT_W, height: PLAT_H, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
                />
              );
            })}

            {gr.parts.map((pt, i) => (
              <div key={i} className="absolute rounded-full bg-cyan-300"
                style={{ left: pt.x - 3, top: toScreenY(pt.y) - 3, width: 6, height: 6, opacity: pt.life }} />
            ))}

            {(() => {
              const sy = toScreenY(gr.py);
              return (
                <div className="absolute text-2xl" style={{
                  left: gr.px - DOODLE_W / 2, top: sy - DOODLE_H / 2,
                  width: DOODLE_W, height: DOODLE_H,
                  lineHeight: `${DOODLE_H}px`, textAlign: 'center',
                  filter: 'drop-shadow(0 0 6px rgba(100,255,100,0.5))',
                }}>
                  {gr.vy < 0 ? '🐸' : '😮'}
                </div>
              );
            })()}
          </div>

          <div className="mt-3 flex justify-center gap-6">
            <button
              onTouchStart={(e) => { e.preventDefault(); g.current.keys.left = true; }}
              onTouchEnd={(e) => { e.preventDefault(); g.current.keys.left = false; }}
              onMouseDown={() => { g.current.keys.left = true; }}
              onMouseUp={() => { g.current.keys.left = false; }}
              onMouseLeave={() => { g.current.keys.left = false; }}
              className="rounded-xl border border-white/20 bg-white/10 px-12 py-4 text-xl text-white active:scale-95 select-none"
            >←</button>
            <button
              onTouchStart={(e) => { e.preventDefault(); g.current.keys.right = true; }}
              onTouchEnd={(e) => { e.preventDefault(); g.current.keys.right = false; }}
              onMouseDown={() => { g.current.keys.right = true; }}
              onMouseUp={() => { g.current.keys.right = false; }}
              onMouseLeave={() => { g.current.keys.right = false; }}
              className="rounded-xl border border-white/20 bg-white/10 px-12 py-4 text-xl text-white active:scale-95 select-none"
            >→</button>
          </div>
        </div>
      )}

      {phase === 'dead' && (
        <div className="rounded-2xl border border-green-400/40 bg-green-500/10 px-8 py-8 text-center">
          <div className="mb-2 text-5xl">🐸</div>
          <div className="mb-1 text-2xl font-bold text-red-300">You fell!</div>
          <div className="mb-1 text-4xl font-black text-white">{gr.score}m</div>
          {gr.score >= best && gr.score > 0 && (
            <div className="mb-3 text-sm font-bold text-yellow-300">🏆 New best!</div>
          )}
          <button onClick={start} className="rounded-xl bg-gradient-to-r from-green-500 to-lime-600 px-8 py-3 font-bold text-white shadow-lg active:scale-95">
            🔄 Bounce Again
          </button>
        </div>
      )}
    </div>
  );
}