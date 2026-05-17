import { useCallback, useEffect, useRef, useState } from 'react';
import { Sounds } from '../utils/useSounds';
import { usePersistedNumber } from '../utils/useBestScore';

type Brick = { id: number; x: number; y: number; active: boolean; color: string };
type Ball = { x: number; y: number; vx: number; vy: number };
const W = 420;
const H = 320;
const PADDLE_W = 82;
const BRICK_W = 62;
const BRICK_H = 18;

const makeBricks = () => {
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400'];
  return Array.from({ length: 24 }, (_, i) => ({ id: i, x: 18 + (i % 6) * 66, y: 28 + Math.floor(i / 6) * 25, active: true, color: colors[Math.floor(i / 6)] }));
};

export function BrickBreaker() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended' | 'won'>('idle');
  const [paddleX, setPaddleX] = useState((W - PADDLE_W) / 2);
  const [ball, setBall] = useState<Ball>({ x: W / 2, y: H - 60, vx: 3, vy: -3 });
  const [bricks, setBricks] = useState<Brick[]>(makeBricks());
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [best, setBest] = usePersistedNumber('bricks-best', 0);
  const paddleRef = useRef((W - PADDLE_W) / 2);
  const ballRef = useRef<Ball>({ x: W / 2, y: H - 60, vx: 3, vy: -3 });
  const bricksRef = useRef<Brick[]>(makeBricks());
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const frameRef = useRef(0);

  const startGame = useCallback(() => {
    const freshBricks = makeBricks();
    paddleRef.current = (W - PADDLE_W) / 2;
    ballRef.current = { x: W / 2, y: H - 60, vx: 3, vy: -3 };
    bricksRef.current = freshBricks;
    scoreRef.current = 0;
    livesRef.current = 3;
    setPaddleX(paddleRef.current);
    setBall(ballRef.current);
    setBricks(freshBricks);
    setScore(0);
    setLives(3);
    setGameState('playing');
  }, []);
  const movePaddle = useCallback((delta: number) => { paddleRef.current = Math.max(0, Math.min(W - PADDLE_W, paddleRef.current + delta)); setPaddleX(paddleRef.current); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (gameState !== 'playing') return; if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') movePaddle(-26); if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') movePaddle(26); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameState, movePaddle]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const loop = () => {
      const b = { ...ballRef.current };
      b.x += b.vx;
      b.y += b.vy;
      if (b.x <= 8 || b.x >= W - 8) b.vx *= -1;
      if (b.y <= 8) b.vy *= -1;
      if (b.y >= H - 34 && b.y <= H - 20 && b.x >= paddleRef.current && b.x <= paddleRef.current + PADDLE_W && b.vy > 0) { const offset = (b.x - (paddleRef.current + PADDLE_W / 2)) / (PADDLE_W / 2); b.vx = offset * 4.5; b.vy = -Math.abs(b.vy) - 0.05; Sounds.paddleBounce(); }
      const hit = bricksRef.current.find((brick) => brick.active && b.x > brick.x && b.x < brick.x + BRICK_W && b.y > brick.y && b.y < brick.y + BRICK_H);
      if (hit) { bricksRef.current = bricksRef.current.map((brick) => brick.id === hit.id ? { ...brick, active: false } : brick); b.vy *= -1; scoreRef.current += 10; Sounds.brickHit(); }
      if (b.y > H + 10) { livesRef.current -= 1; if (livesRef.current <= 0) { setGameState('ended'); setBest((bestScore) => Math.max(bestScore, scoreRef.current)); return; } b.x = W / 2; b.y = H - 60; b.vx = Math.random() > 0.5 ? 3 : -3; b.vy = -3; Sounds.brickLoseLife(); }
      if (bricksRef.current.every((brick) => !brick.active)) { setGameState('won'); setBest((bestScore) => Math.max(bestScore, scoreRef.current)); return; }
      ballRef.current = b;
      setBall(b);
      setBricks(bricksRef.current);
      setScore(scoreRef.current);
      setLives(livesRef.current);
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [gameState]);

  return <div className="flex flex-col items-center gap-4"><div className="flex gap-4 text-center"><div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs text-purple-200">Score</div><div className="text-2xl font-bold text-yellow-300">{score}</div></div><div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs text-purple-200">Lives</div><div className="text-2xl">{'❤️'.repeat(lives)}</div></div><div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs text-purple-200">Best</div><div className="text-2xl font-bold text-emerald-300">{best}</div></div></div>{gameState === 'idle' && <div className="rounded-2xl border border-white/20 bg-white/10 px-8 py-12 text-center"><div className="mb-4 text-6xl">🧱</div><div className="mb-2 text-2xl font-bold">Brick Breaker</div><div className="mb-6 text-purple-200">Bounce the ball, break every brick, and keep it above the floor.</div><button onClick={startGame} className="rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-8 py-3 font-bold text-white active:scale-95">Start Breaking</button></div>}{gameState === 'playing' && <div><div className="relative overflow-hidden rounded-xl border-2 border-white/20 bg-slate-900" style={{ width: W, height: H }}>{bricks.map((brick) => brick.active && <div key={brick.id} className={`absolute rounded ${brick.color}`} style={{ left: brick.x, top: brick.y, width: BRICK_W, height: BRICK_H }} />)}<div className="absolute rounded-full bg-white shadow-lg shadow-white/40" style={{ left: ball.x - 7, top: ball.y - 7, width: 14, height: 14 }} /><div className="absolute rounded-full bg-cyan-400" style={{ left: paddleX, top: H - 24, width: PADDLE_W, height: 12 }} /></div><div className="mt-3 flex justify-center gap-4"><button onClick={() => movePaddle(-32)} className="rounded-lg border border-white/20 bg-white/10 px-6 py-2 active:scale-95">←</button><button onClick={() => movePaddle(32)} className="rounded-lg border border-white/20 bg-white/10 px-6 py-2 active:scale-95">→</button></div></div>}{(gameState === 'ended' || gameState === 'won') && <div className="rounded-2xl border border-orange-400/40 bg-orange-500/20 px-8 py-6 text-center"><div className="mb-2 text-4xl">{gameState === 'won' ? '🏆' : '💥'}</div><div className="mb-1 text-2xl font-bold text-orange-300">{gameState === 'won' ? 'Board Cleared!' : 'Game Over!'}</div><div className="mb-4 text-3xl font-bold">{score} points</div><button onClick={startGame} className="rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-8 py-3 font-bold text-white active:scale-95">Play Again</button></div>}</div>;
}