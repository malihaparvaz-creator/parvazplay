import { useCallback, useEffect, useRef, useState } from 'react';
import { Sounds } from '../utils/useSounds';
import { usePersistedNumber } from '../utils/useBestScore';

type Item = { id: number; x: number; y: number; type: 'good' | 'gold' | 'bad' };
const W = 420;
const H = 340;

export function CatchGame() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [basketX, setBasketX] = useState(180);
  const [items, setItems] = useState<Item[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(45);
  const [best, setBest] = usePersistedNumber('catch-best', 0);
  const xRef = useRef(180);
  const idRef = useRef(0);

  const startGame = useCallback(() => { xRef.current = 180; idRef.current = 0; setBasketX(180); setItems([]); setScore(0); setLives(3); setTimeLeft(45); setGameState('playing'); }, []);
  const move = useCallback((delta: number) => { xRef.current = Math.max(0, Math.min(W - 70, xRef.current + delta)); setBasketX(xRef.current); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (gameState !== 'playing') return; if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') move(-28); if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') move(28); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameState, move]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => setTimeLeft((t) => { if (t <= 1) { setGameState('ended'); return 0; } return t - 1; }), 1000);
    const spawner = setInterval(() => {
      const type = Math.random() < 0.16 ? 'bad' : Math.random() < 0.18 ? 'gold' : 'good';
      setItems((prev) => [...prev, { id: idRef.current++, x: Math.random() * (W - 30), y: -30, type }]);
    }, 520);
    const mover = setInterval(() => {
      setItems((prev) => {
        const next: Item[] = [];
        prev.forEach((item) => {
          const y = item.y + 7;
          const caught = y > H - 55 && item.x + 24 > xRef.current && item.x < xRef.current + 70;
          if (caught) {
            if (item.type === 'bad') { Sounds.catchBomb(); setScore((s) => Math.max(0, s - 20)); setLives((l) => { if (l <= 1) setGameState('ended'); return Math.max(0, l - 1); }); }
            else { if (item.type === 'gold') { Sounds.catchGold(); } else { Sounds.catchFruit(); } setScore((s) => s + (item.type === 'gold' ? 30 : 10)); }
          } else if (y < H + 40) next.push({ ...item, y });
        });
        return next;
      });
    }, 35);
    return () => { clearInterval(timer); clearInterval(spawner); clearInterval(mover); };
  }, [gameState]);

  useEffect(() => { if (gameState === 'ended') setBest((b) => Math.max(b, score)); }, [gameState, score]);

  return <div className="flex flex-col items-center gap-4"><div className="flex flex-wrap justify-center gap-4 text-center"><div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs text-purple-200">Score</div><div className="text-2xl font-bold text-yellow-300">{score}</div></div><div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs text-purple-200">Lives</div><div className="text-2xl">{'❤️'.repeat(lives)}</div></div><div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs text-purple-200">Time</div><div className="text-2xl font-bold text-white">{timeLeft}s</div></div><div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs text-purple-200">Best</div><div className="text-2xl font-bold text-emerald-300">{best}</div></div></div>{gameState === 'idle' && <div className="rounded-2xl border border-white/20 bg-white/10 px-8 py-12 text-center"><div className="mb-4 text-6xl">🧺</div><div className="mb-2 text-2xl font-bold">Fruit Catcher</div><div className="mb-6 text-purple-200">Catch fruit and stars. Avoid bombs or lose hearts.</div><button onClick={startGame} className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 px-8 py-3 font-bold text-white active:scale-95">Start Catching</button></div>}{gameState === 'playing' && <div><div className="relative overflow-hidden rounded-xl border-2 border-white/20 bg-gradient-to-b from-slate-800 to-slate-950" style={{ width: W, height: H }}>{items.map((item) => <div key={item.id} className="absolute text-2xl" style={{ left: item.x, top: item.y }}>{item.type === 'bad' ? '💣' : item.type === 'gold' ? '⭐' : '🍎'}</div>)}<div className="absolute text-4xl" style={{ left: basketX, top: H - 45 }}>🧺</div></div><div className="mt-3 flex justify-center gap-4"><button onClick={() => move(-34)} className="rounded-lg bg-white/10 px-8 py-2">←</button><button onClick={() => move(34)} className="rounded-lg bg-white/10 px-8 py-2">→</button></div></div>}{gameState === 'ended' && <div className="rounded-2xl border border-yellow-400/40 bg-yellow-500/20 px-8 py-6 text-center"><div className="mb-2 text-4xl">🧺</div><div className="mb-1 text-2xl font-bold text-yellow-300">Round Over!</div><div className="mb-4 text-3xl font-bold">{score} points</div><button onClick={startGame} className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 px-8 py-3 font-bold text-white active:scale-95">Catch Again</button></div>}</div>;
}