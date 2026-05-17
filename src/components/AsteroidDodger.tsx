import { useCallback, useEffect, useRef, useState } from 'react';
import { Sounds } from '../utils/useSounds';
import { usePersistedNumber } from '../utils/useBestScore';

const W = 360;
const H = 480;

interface Asteroid {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  rot: number;
  rotSpeed: number;
}

interface Star {
  x: number; y: number; speed: number; size: number;
}

export function AsteroidDodger() {
  const [best, setBest] = usePersistedNumber('asteroid-best', 0);
  const [phase, setPhase] = useState<'idle' | 'playing' | 'dead'>('idle');
  const [score, setScore] = useState(0);
  const [shipX, setShipX] = useState(W / 2);

  const g = useRef({
    sx: W / 2,
    sy: H - 70,
    score: 0,
    speed: 2.8,
    spawnRate: 55,
    asteroids: [] as Asteroid[],
    stars: [] as Star[],
    nextId: 0,
    keys: { left: false, right: false },
    invuln: 0,
    lives: 3,
  });

  const start = useCallback(() => {
    const gr = g.current;
    gr.sx = W / 2; gr.sy = H - 70;
    gr.score = 0; gr.speed = 2.8; gr.spawnRate = 55;
    gr.asteroids = []; gr.nextId = 0;
    gr.keys = { left: false, right: false };
    gr.invuln = 0; gr.lives = 3;
    // Background stars
    gr.stars = Array.from({ length: 40 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 0.5 + Math.random() * 2,
      size: Math.random() > 0.7 ? 2 : 1,
    }));
    setScore(0); setShipX(W / 2);
    setPhase('playing');
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    let raf = 0;
    let last = performance.now();
    let spawnTimer = 0;

    const loop = (now: number) => {
      const dt = Math.min(32, now - last) / 16.67;
      last = now;
      const gr = g.current;

      // Ship movement
      const moveSpeed = 6.5;
      if (gr.keys.left) gr.sx -= moveSpeed * dt;
      if (gr.keys.right) gr.sx += moveSpeed * dt;
      gr.sx = Math.max(16, Math.min(W - 16, gr.sx));

      // Stars
      for (const s of gr.stars) {
        s.y += s.speed * gr.speed * dt;
        if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
      }

      // Spawn asteroids
      spawnTimer += dt;
      if (spawnTimer >= gr.spawnRate) {
        spawnTimer = 0;
        const size = 18 + Math.random() * 22;
        gr.asteroids.push({
          id: gr.nextId++,
          x: Math.random() * (W - size),
          y: -size,
          size,
          speed: gr.speed + Math.random() * 1.5,
          rot: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 4,
        });
      }

      // Move asteroids
      for (const a of gr.asteroids) {
        a.y += a.speed * dt;
        a.rot += a.rotSpeed * dt;
      }
      gr.asteroids = gr.asteroids.filter((a) => a.y < H + 50);

      // Score increases with survival time
      gr.score += dt * 1.2;
      // Gradual difficulty ramp
      gr.speed = Math.min(8, 2.8 + gr.score / 400);
      gr.spawnRate = Math.max(18, 55 - gr.score / 15);

      // Invulnerability countdown
      if (gr.invuln > 0) gr.invuln -= dt;

      // Collision
      if (gr.invuln <= 0) {
        const shipR = 12;
        for (const a of gr.asteroids) {
          const dx = gr.sx - (a.x + a.size / 2);
          const dy = gr.sy - (a.y + a.size / 2);
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < shipR + a.size / 2 - 4) {
            gr.lives--; Sounds.asteroidHit();
            if (gr.lives <= 0) {
              setBest((prev) => Math.max(prev, Math.floor(gr.score)));
              setPhase('dead');
              return;
            }
            gr.invuln = 90; // ~1.5s invulnerability
            // Clear nearby asteroids
            gr.asteroids = gr.asteroids.filter((ast) => {
              const ddx = gr.sx - (ast.x + ast.size / 2);
              const ddy = gr.sy - (ast.y + ast.size / 2);
              return Math.sqrt(ddx * ddx + ddy * ddy) > 60;
            });
            break;
          }
        }
      }

      setScore(gr.score);
      setShipX(gr.sx);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, setBest]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (phase !== 'playing') return;
      if (e.key === 'ArrowLeft' || e.key === 'a') g.current.keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') g.current.keys.right = true;
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

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-4 text-center">
        <div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3"><div className="text-xs uppercase text-purple-200">Score</div><div className="text-2xl font-bold text-yellow-300">{Math.floor(score)}</div></div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3"><div className="text-xs uppercase text-purple-200">Lives</div><div className="text-2xl">{'🚀'.repeat(gr.lives)}</div></div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3"><div className="text-xs uppercase text-purple-200">Best</div><div className="text-2xl font-bold text-emerald-300">{best}</div></div>
      </div>

      {phase === 'idle' && (
        <div className="rounded-2xl border border-white/20 bg-white/10 px-8 py-12 text-center">
          <div className="mb-4 text-6xl">🚀</div>
          <div className="mb-2 text-2xl font-bold text-white">Asteroid Dodger</div>
          <div className="mb-6 text-purple-200">Pilot your ship through an asteroid field. It gets faster!</div>
          <button onClick={start} className="rounded-xl bg-gradient-to-r from-slate-500 to-gray-700 px-8 py-3 text-lg font-bold text-white shadow-lg active:scale-95">🚀 Launch</button>
        </div>
      )}

      {phase === 'playing' && (
        <div className="select-none">
          <div
            className="relative overflow-hidden rounded-xl border-2 border-white/20"
            style={{ width: W, height: H, background: 'linear-gradient(180deg, #0a0a1a 0%, #1a0a2e 100%)' }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              g.current.sx = Math.max(16, Math.min(W - 16, e.clientX - rect.left));
            }}
            onTouchMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              g.current.sx = Math.max(16, Math.min(W - 16, e.touches[0].clientX - rect.left));
            }}
          >
            {/* Stars */}
            {gr.stars.map((s, i) => (
              <div key={i} className="absolute rounded-full bg-white" style={{ left: s.x, top: s.y, width: s.size, height: s.size, opacity: 0.4 + s.size * 0.2 }} />
            ))}

            {/* Asteroids */}
            {gr.asteroids.map((a) => (
              <div
                key={a.id}
                className="absolute flex items-center justify-center rounded-full border-2 border-stone-600 bg-stone-700 text-lg"
                style={{
                  left: a.x, top: a.y, width: a.size, height: a.size,
                  transform: `rotate(${a.rot}deg)`,
                }}
              >
                🪨
              </div>
            ))}

            {/* Ship */}
            <div
              className="absolute text-2xl transition-opacity"
              style={{
                left: shipX - 13, top: gr.sy - 13,
                opacity: gr.invuln > 0 && Math.floor(gr.invuln / 6) % 2 === 0 ? 0.3 : 1,
              }}
            >
              🚀
            </div>
          </div>

          <div className="mt-3 flex justify-center gap-4">
            <button
              onTouchStart={(e) => { e.preventDefault(); g.current.keys.left = true; }}
              onTouchEnd={(e) => { e.preventDefault(); g.current.keys.left = false; }}
              onMouseDown={() => g.current.keys.left = true}
              onMouseUp={() => g.current.keys.left = false}
              onMouseLeave={() => g.current.keys.left = false}
              className="rounded-lg border border-white/20 bg-white/10 px-10 py-3 text-white active:scale-95 select-none"
            >←</button>
            <button
              onTouchStart={(e) => { e.preventDefault(); g.current.keys.right = true; }}
              onTouchEnd={(e) => { e.preventDefault(); g.current.keys.right = false; }}
              onMouseDown={() => g.current.keys.right = true}
              onMouseUp={() => g.current.keys.right = false}
              onMouseLeave={() => g.current.keys.right = false}
              className="rounded-lg border border-white/20 bg-white/10 px-10 py-3 text-white active:scale-95 select-none"
            >→</button>
          </div>
        </div>
      )}

      {phase === 'dead' && (
        <div className="rounded-2xl border border-slate-400/40 bg-slate-500/20 px-8 py-6 text-center">
          <div className="mb-2 text-4xl">💥</div>
          <div className="mb-1 text-2xl font-bold text-slate-300">Ship Destroyed!</div>
          <div className="mb-4 text-3xl font-bold text-white">{Math.floor(score)} points</div>
          <button onClick={start} className="rounded-xl bg-gradient-to-r from-slate-500 to-gray-700 px-8 py-3 font-bold text-white shadow-lg active:scale-95">🚀 Fly Again</button>
        </div>
      )}
    </div>
  );
}
