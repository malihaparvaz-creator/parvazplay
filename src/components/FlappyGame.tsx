import { useCallback, useEffect, useRef, useState } from 'react';
import { Sounds } from '../utils/useSounds';
import { usePersistedNumber } from '../utils/useBestScore';

type Pipe = { id: number; x: number; gapY: number; passed: boolean };
const WIDTH = 420;
const HEIGHT = 340;
const BIRD_X = 82;
const GAP = 155;
const PIPE_WIDTH = 52;
const PIPE_CAP_H = 16;
const PIPE_CAP_EXTRA = 6; // cap is wider than pipe body

export function FlappyGame() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [birdY, setBirdY] = useState(160);
  const [birdVel, setBirdVel] = useState(0);
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [score, setScore] = useState(0);
  const [best, setBest] = usePersistedNumber('flappy-best', 0);

  const yRef = useRef(160);
  const velocityRef = useRef(0);
  const pipesRef = useRef<Pipe[]>([]);
  const scoreRef = useRef(0);
  const nextIdRef = useRef(0);
  const lastFrameRef = useRef(0);
  const frameRef = useRef(0);

  const addPipe = useCallback(() => {
    // Keep gap well away from top/bottom so caps are always visible
    const minGapCenter = GAP / 2 + PIPE_CAP_H + 20;
    const maxGapCenter = HEIGHT - GAP / 2 - PIPE_CAP_H - 20;
    const gapY = minGapCenter + Math.random() * (maxGapCenter - minGapCenter);
    pipesRef.current = [
      ...pipesRef.current,
      { id: nextIdRef.current++, x: WIDTH + 20, gapY, passed: false },
    ];
  }, []);

  const endGame = useCallback(() => {
    setGameState('ended');
    setBest((b) => Math.max(b, scoreRef.current));
  }, [setBest]);

  const flap = useCallback(() => {
    if (gameState === 'playing') { velocityRef.current = -6.5; Sounds.flap(); }
  }, [gameState]);

  const startGame = useCallback(() => {
    yRef.current = 160;
    velocityRef.current = -3;
    pipesRef.current = [];
    scoreRef.current = 0;
    nextIdRef.current = 0;
    lastFrameRef.current = performance.now();
    setBirdY(160);
    setBirdVel(0);
    setPipes([]);
    setScore(0);
    setGameState('playing');
    setTimeout(addPipe, 1200);
  }, [addPipe]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      if (gameState === 'idle' || gameState === 'ended') startGame();
      else flap();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flap, gameState, startGame]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const loop = (time: number) => {
      const dt = Math.min(34, time - lastFrameRef.current);
      lastFrameRef.current = time;
      const scale = dt / 16.67;

      // Gentler gravity
      velocityRef.current += 0.32 * scale;
      yRef.current += velocityRef.current * scale;

      // Speed starts slow, caps at a reasonable level
      const speed = 1.6 + Math.min(1.6, scoreRef.current * 0.04);

      pipesRef.current = pipesRef.current
        .map((p) => ({ ...p, x: p.x - speed * scale }))
        .filter((p) => p.x > -PIPE_WIDTH - 20);

      // Spawn when last pipe has moved far enough in
      const lastPipe = pipesRef.current[pipesRef.current.length - 1];
      if (!lastPipe || lastPipe.x < WIDTH - 220) addPipe();

      pipesRef.current = pipesRef.current.map((p) => {
        if (!p.passed && p.x + PIPE_WIDTH < BIRD_X) {
          scoreRef.current += 1; Sounds.pipe();
          return { ...p, passed: true };
        }
        return p;
      });

      const BIRD_R = 13;
      const hitPipe = pipesRef.current.some((p) => {
        const inX = BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_WIDTH;
        const inGap =
          yRef.current + BIRD_R > p.gapY - GAP / 2 &&
          yRef.current - BIRD_R < p.gapY + GAP / 2;
        return inX && !inGap;
      });

      const hitBounds = yRef.current < 14 || yRef.current > HEIGHT - 14;

      setBirdY(yRef.current);
      setBirdVel(velocityRef.current);
      setPipes([...pipesRef.current]);
      setScore(scoreRef.current);

      if (hitPipe || hitBounds) { Sounds.birdDie(); endGame(); return; }
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [addPipe, endGame, gameState]);

  const birdRotation = Math.max(-25, Math.min(40, birdVel * 4));

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-4 text-center">
        <div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3">
          <div className="text-xs uppercase text-purple-200">Score</div>
          <div className="text-2xl font-bold text-yellow-300">{score}</div>
        </div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3">
          <div className="text-xs uppercase text-purple-200">Best</div>
          <div className="text-2xl font-bold text-emerald-300">{best}</div>
        </div>
      </div>

      {gameState === 'idle' && (
        <div className="rounded-2xl border border-white/20 bg-white/10 px-8 py-12 text-center">
          <div className="mb-4 text-6xl">🐦</div>
          <div className="mb-2 text-2xl font-bold">Flappy Dash</div>
          <div className="mb-6 text-purple-200">Tap or press Space to flap through the gaps.</div>
          <button onClick={startGame} className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600 px-8 py-3 font-bold text-white active:scale-95">
            Start Flying
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div
          onMouseDown={flap}
          onTouchStart={(e) => { e.preventDefault(); flap(); }}
          className="relative cursor-pointer overflow-hidden rounded-xl border-2 border-white/20 select-none"
          style={{ width: WIDTH, height: HEIGHT, background: 'linear-gradient(180deg, #38bdf8 0%, #0369a1 70%, #075985 100%)' }}
        >
          {/* Clouds */}
          {[30, 160, 290, 370].map((cx, i) => (
            <div key={i} className="absolute" style={{ left: cx, top: 18 + (i % 2) * 22 }}>
              <div className="absolute rounded-full bg-white/70" style={{ width: 50, height: 18, top: 8, left: 0 }} />
              <div className="absolute rounded-full bg-white/70" style={{ width: 34, height: 22, top: 0, left: 8 }} />
              <div className="absolute rounded-full bg-white/70" style={{ width: 30, height: 16, top: 6, left: 22 }} />
            </div>
          ))}

          {/* Pipes — rendered as proper Flappy-style pipes with caps */}
          {pipes.map((p) => {
            const topPipeH = p.gapY - GAP / 2;
            const botPipeTop = p.gapY + GAP / 2;
            const botPipeH = HEIGHT - botPipeTop;

            return (
              <g key={p.id}>
                {/* ── TOP PIPE ── */}
                {/* Body */}
                <div
                  className="absolute"
                  style={{
                    left: p.x,
                    top: 0,
                    width: PIPE_WIDTH,
                    height: Math.max(0, topPipeH - PIPE_CAP_H),
                    background: 'linear-gradient(90deg, #15803d 0%, #22c55e 40%, #16a34a 70%, #166534 100%)',
                  }}
                />
                {/* Cap (wider, at the bottom of top pipe) */}
                <div
                  className="absolute rounded-b-md"
                  style={{
                    left: p.x - PIPE_CAP_EXTRA,
                    top: Math.max(0, topPipeH - PIPE_CAP_H),
                    width: PIPE_WIDTH + PIPE_CAP_EXTRA * 2,
                    height: PIPE_CAP_H,
                    background: 'linear-gradient(90deg, #166534 0%, #16a34a 30%, #22c55e 60%, #166534 100%)',
                    boxShadow: '0 3px 6px rgba(0,0,0,0.35)',
                  }}
                />

                {/* ── BOTTOM PIPE ── */}
                {/* Cap (wider, at the top of bottom pipe) */}
                <div
                  className="absolute rounded-t-md"
                  style={{
                    left: p.x - PIPE_CAP_EXTRA,
                    top: botPipeTop,
                    width: PIPE_WIDTH + PIPE_CAP_EXTRA * 2,
                    height: PIPE_CAP_H,
                    background: 'linear-gradient(90deg, #166534 0%, #16a34a 30%, #22c55e 60%, #166534 100%)',
                    boxShadow: '0 -3px 6px rgba(0,0,0,0.35)',
                  }}
                />
                {/* Body */}
                <div
                  className="absolute"
                  style={{
                    left: p.x,
                    top: botPipeTop + PIPE_CAP_H,
                    width: PIPE_WIDTH,
                    height: Math.max(0, botPipeH - PIPE_CAP_H),
                    background: 'linear-gradient(90deg, #15803d 0%, #22c55e 40%, #16a34a 70%, #166534 100%)',
                  }}
                />
              </g>
            );
          })}

          {/* Ground strip */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{ height: 14, background: 'linear-gradient(180deg, #65a30d, #4d7c0f)' }}
          />
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{ height: 6, background: '#713f12' }}
          />

          {/* Bird */}
          <div
            className="absolute text-3xl"
            style={{
              left: BIRD_X - 15,
              top: birdY - 15,
              transform: `scaleX(-1) rotate(${-birdRotation}deg)`,
              transformOrigin: 'center center',
              filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.5))',
            }}
          >
            🐦
          </div>

          {/* Score overlay */}
          <div className="absolute left-1/2 top-4 -translate-x-1/2 text-2xl font-black text-white drop-shadow-lg" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
            {score}
          </div>

          {/* Tap hint on first pipe */}
          {score === 0 && pipes.length === 0 && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce text-center text-white/70 text-sm font-semibold">
              Tap to flap!
            </div>
          )}
        </div>
      )}

      {gameState === 'ended' && (
        <div className="rounded-2xl border border-sky-400/40 bg-sky-500/20 px-8 py-6 text-center">
          <div className="mb-2 text-4xl">💨</div>
          <div className="mb-1 text-2xl font-bold text-sky-300">You crashed!</div>
          <div className="mb-4 text-3xl font-bold">{score} pipes</div>
          {score >= best && score > 0 && (
            <div className="mb-3 text-sm font-bold text-yellow-300">🏆 New best!</div>
          )}
          <button onClick={startGame} className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600 px-8 py-3 font-bold text-white active:scale-95">
            Fly Again
          </button>
        </div>
      )}
    </div>
  );
}