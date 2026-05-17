import { useState, useEffect, useCallback, useRef } from 'react';
import { Sounds } from '../utils/useSounds';
import { usePersistedNumber } from '../utils/useBestScore';

const GAME_DURATION = 30;
const GRID_SIZE = 9;

export function WhackAMole() {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [activeMoles, setActiveMoles] = useState<boolean[]>(Array(GRID_SIZE).fill(false));
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [highScore, setHighScore] = usePersistedNumber('whack-best', 0);
  const [whacked, setWhacked] = useState<number | null>(null);
  const [misses, setMisses] = useState(0);
  const moleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startGame = useCallback(() => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setActiveMoles(Array(GRID_SIZE).fill(false));
    setGameState('playing');
    setMisses(0);
    setWhacked(null);
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;

    gameTimerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setGameState('ended');
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    moleTimerRef.current = setInterval(() => {
    setActiveMoles(() => {
      const newMoles = Array(GRID_SIZE).fill(false);
      const numMoles = Math.random() < 0.3 ? 2 : 1; Sounds.moleUp();
      for (let i = 0; i < numMoles; i++) {
        const idx = Math.floor(Math.random() * GRID_SIZE);
        newMoles[idx] = true;
      }
      return newMoles;
    });
    }, 800);

    return () => {
      if (moleTimerRef.current) clearInterval(moleTimerRef.current);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'ended') {
      if (score > highScore) {
        setHighScore(score);
      }
    }
  }, [gameState, score, highScore]);

  const whackMole = (index: number) => {
    if (gameState !== 'playing') return;
    if (!activeMoles[index]) { Sounds.moleWrongHit();
      setMisses((m) => m + 1);
      return;
    }
    setScore((s) => s + 10); Sounds.whack();
    setWhacked(index);
    setActiveMoles((prev) => {
      const newMoles = [...prev];
      newMoles[index] = false;
      return newMoles;
    });
    setTimeout(() => setWhacked(null), 200);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-4 text-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Score</div>
          <div className="text-2xl font-bold text-yellow-300">{score}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Time</div>
          <div className={`text-2xl font-bold ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
            {timeLeft}s
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">High</div>
          <div className="text-2xl font-bold text-emerald-300">{highScore}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Misses</div>
          <div className="text-2xl font-bold text-red-300">{misses}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {activeMoles.map((isActive, index) => (
          <button
            key={index}
            onClick={() => whackMole(index)}
            className={`w-24 h-24 rounded-2xl text-4xl font-bold transition-all duration-150 
              border-4 cursor-pointer
              ${whacked === index
                ? 'bg-yellow-400/60 border-yellow-300 scale-90 shadow-lg shadow-yellow-500/50'
                : isActive
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 border-amber-300 scale-110 shadow-lg shadow-orange-500/50 animate-pulse hover:scale-110'
                  : 'bg-gradient-to-br from-emerald-700 to-green-800 border-emerald-600 hover:border-emerald-400 hover:scale-105'
              }`}
            disabled={gameState !== 'playing'}
          >
            {isActive ? '🐹' : '🕳️'}
          </button>
        ))}
      </div>

      {gameState === 'idle' && (
        <button
          onClick={startGame}
          className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl
            hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30
            active:scale-95 text-lg"
        >
          🎮 Start Game
        </button>
      )}

      {gameState === 'playing' && (
        <div className="text-purple-200 text-sm animate-pulse">
          🐹 Whack the moles as fast as you can!
        </div>
      )}

      {gameState === 'ended' && (
        <div className="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 backdrop-blur-sm rounded-2xl px-8 py-6 border border-yellow-400/40 text-center">
          <div className="text-4xl mb-2">🏆</div>
          <div className="text-2xl font-bold text-yellow-300 mb-1">Time's Up!</div>
          <div className="text-3xl font-bold text-white mb-2">{score} points</div>
          {score >= highScore && score > 0 && (
            <div className="text-yellow-400 font-bold animate-pulse">🎉 New High Score!</div>
          )}
          <div className="text-purple-200 text-sm mt-2">
            Accuracy: {score + misses > 0 ? Math.round((score / (score + misses)) * 100) : 0}%
          </div>
          <button
            onClick={startGame}
            className="mt-4 px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl
              hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30
              active:scale-95"
          >
            🔄 Play Again
          </button>
        </div>
      )}
    </div>
  );
}
