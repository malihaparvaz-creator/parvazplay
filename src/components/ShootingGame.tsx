import { useState, useEffect, useCallback, useRef } from 'react';
import { Sounds } from '../utils/useSounds';
import { usePersistedNumber } from '../utils/useBestScore';

interface Target {
  id: number;
  x: number;
  y: number;
  size: number;
  type: 'enemy' | 'bonus' | 'bomb';
  speed: number;
}

export function ShootingGame() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [targets, setTargets] = useState<Target[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [highScore, setHighScore] = usePersistedNumber('shooting-best', 0);
  const [combo, setCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [shots, setShots] = useState(0);
  const nextId = useRef(0);
  const areaRef = useRef<HTMLDivElement>(null);

  const WIDTH = 400;
  const HEIGHT = 350;

  const startGame = useCallback(() => {
    setGameState('playing');
    setTargets([]);
    setScore(0);
    setTimeLeft(30);
    setCombo(0);
    setHits(0);
    setShots(0);
    nextId.current = 0;
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setGameState('ended');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const spawner = setInterval(() => {
      const type: Target['type'] = Math.random() < 0.15 ? 'bonus' : Math.random() < 0.2 ? 'bomb' : 'enemy';
      const size = type === 'bonus' ? 35 : type === 'bomb' ? 40 : 30 + Math.random() * 20;
      setTargets((prev) => [
        ...prev,
        {
          id: nextId.current++,
          x: Math.random() * (WIDTH - size),
          y: Math.random() * (HEIGHT - size),
          size,
          type,
          speed: 1 + Math.random() * 2,
        },
      ]);
    }, 600);
    return () => clearInterval(spawner);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const mover = setInterval(() => {
      setTargets((prev) =>
        prev
          .map((t) => ({
            ...t,
            x: t.x + (Math.random() - 0.5) * t.speed * 4,
            y: t.y + (Math.random() - 0.5) * t.speed * 4,
          }))
          .filter((t) => t.x > -50 && t.x < WIDTH + 50 && t.y > -50 && t.y < HEIGHT + 50)
      );
    }, 50);
    return () => clearInterval(mover);
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'ended' && score > highScore) setHighScore(score);
  }, [gameState, score, highScore]);

  const handleShoot = (id: number, type: Target['type']) => {
    setShots((s) => s + 1);
    setTargets((prev) => prev.filter((t) => t.id !== id));
    if (type === 'enemy') {
      setScore((s) => s + 10 + combo * 2);
      setCombo((c) => c + 1);
      setHits((h) => h + 1);
    } else if (type === 'bonus') {
      setScore((s) => s + 25 + combo * 3);
      setCombo((c) => c + 1);
      setHits((h) => h + 1);
    } else {
      setScore((s) => Math.max(0, s - 20));
      setCombo(0);
    }
  };

  const handleMiss = () => {
    if (gameState !== 'playing') return;
    setShots((s) => s + 1);
    setCombo(0);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-4 text-center flex-wrap justify-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Score</div>
          <div className="text-2xl font-bold text-yellow-300">{score}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Time</div>
          <div className={`text-2xl font-bold ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>{timeLeft}s</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Combo</div>
          <div className="text-2xl font-bold text-orange-300">x{combo}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Best</div>
          <div className="text-2xl font-bold text-emerald-300">{highScore}</div>
        </div>
      </div>

      {gameState === 'idle' && (
        <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl px-8 py-12 border border-white/20">
          <div className="text-6xl mb-4">🎯</div>
          <div className="text-2xl font-bold text-white mb-2">Target Shooter</div>
          <div className="text-purple-200 mb-2">Click enemies to shoot! Avoid bombs 💣</div>
          <div className="text-sm text-purple-300 mb-6">👾 Enemy = +10 | ⭐ Bonus = +25 | 💣 Bomb = -20</div>
          <button onClick={startGame} className="px-8 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white font-bold rounded-xl hover:from-red-600 hover:to-pink-700 transition-all shadow-lg active:scale-95 text-lg">
            🔫 Start Shooting
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div
          ref={areaRef}
          onClick={handleMiss}
          className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl overflow-hidden border-2 border-white/20 cursor-crosshair"
          style={{ width: WIDTH, height: HEIGHT }}
        >
          {targets.map((t) => (
            <button
              key={t.id}
              onClick={(e) => {
                e.stopPropagation();
                handleShoot(t.id, t.type);
              }}
              className="absolute flex items-center justify-center transition-none hover:scale-110 cursor-crosshair"
              style={{
                left: t.x,
                top: t.y,
                width: t.size,
                height: t.size,
              }}
            >
              <span style={{ fontSize: t.size * 0.7 }}>
                {t.type === 'enemy' ? '👾' : t.type === 'bonus' ? '⭐' : '💣'}
              </span>
            </button>
          ))}
          {/* Crosshair overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
            <div className="w-8 h-8 border-2 border-red-400 rounded-full" />
          </div>
        </div>
      )}

      {gameState === 'ended' && (
        <div className="text-center bg-gradient-to-r from-red-500/20 to-pink-500/20 backdrop-blur-sm rounded-2xl px-8 py-6 border border-red-400/40">
          <div className="text-4xl mb-2">🎯</div>
          <div className="text-2xl font-bold text-red-300 mb-1">Time's Up!</div>
          <div className="text-3xl font-bold text-white mb-1">{score} points</div>
          <div className="text-purple-200 text-sm mb-4">
            Accuracy: {shots > 0 ? Math.round((hits / shots) * 100) : 0}% • Hits: {hits}/{shots}
          </div>
          <button onClick={startGame} className="px-8 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white font-bold rounded-xl hover:from-red-600 hover:to-pink-700 transition-all shadow-lg active:scale-95">
            🔄 Shoot Again
          </button>
        </div>
      )}
    </div>
  );
}
