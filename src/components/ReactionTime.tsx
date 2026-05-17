import { useState, useRef, useCallback } from 'react';
import { Sounds } from '../utils/useSounds';
import { usePersistedNullableNumber } from '../utils/useBestScore';

type GameState = 'idle' | 'waiting' | 'ready' | 'result' | 'too-early';

export function ReactionTime() {
  const [state, setState] = useState<GameState>('idle');
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [bestTime, setBestTime] = usePersistedNullableNumber('reaction-best', null);
  const [attempts, setAttempts] = useState<number[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRound = useCallback(() => {
    setState('waiting');
    const delay = Math.random() * 4000 + 1500;
    timeoutRef.current = setTimeout(() => {
      setState('ready'); Sounds.reactionGo();
      startTimeRef.current = Date.now();
    }, delay);
  }, []);

  const handleClick = () => {
    if (state === 'idle' || state === 'result' || state === 'too-early') {
      startRound();
      return;
    }

    if (state === 'waiting') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setState('too-early'); Sounds.reactionEarly();
      return;
    }

    if (state === 'ready') {
      const time = Date.now() - startTimeRef.current;
      setReactionTime(time);
      setAttempts((prev) => [...prev, time]);
      if (!bestTime || time < bestTime) {
        setBestTime(time);
      }
      setState('result'); Sounds.reactionResult(time);
    }
  };

  const getReactionRating = (ms: number) => {
    if (ms < 200) return { label: 'Incredible! ⚡', color: 'text-yellow-300' };
    if (ms < 300) return { label: 'Amazing! 🔥', color: 'text-orange-300' };
    if (ms < 400) return { label: 'Great! 👏', color: 'text-green-300' };
    if (ms < 500) return { label: 'Good! 👍', color: 'text-blue-300' };
    return { label: 'Keep Practicing! 💪', color: 'text-purple-300' };
  };

  const avgTime = attempts.length > 0
    ? Math.round(attempts.reduce((a, b) => a + b, 0) / attempts.length)
    : null;

  const getBgColor = () => {
    switch (state) {
      case 'idle': return 'from-slate-600 to-slate-700';
      case 'waiting': return 'from-red-600 to-red-800';
      case 'ready': return 'from-green-500 to-emerald-600';
      case 'result': return 'from-blue-600 to-indigo-700';
      case 'too-early': return 'from-orange-600 to-amber-700';
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-4 text-center">
        {bestTime !== null && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
            <div className="text-xs text-purple-200 uppercase tracking-wider">Best</div>
            <div className="text-2xl font-bold text-yellow-300">{bestTime}ms</div>
          </div>
        )}
        {avgTime !== null && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
            <div className="text-xs text-purple-200 uppercase tracking-wider">Average</div>
            <div className="text-2xl font-bold text-cyan-300">{avgTime}ms</div>
          </div>
        )}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Attempts</div>
          <div className="text-2xl font-bold text-white">{attempts.length}</div>
        </div>
      </div>

      <button
        onClick={handleClick}
        className={`w-80 h-80 rounded-3xl bg-gradient-to-br ${getBgColor()} 
          flex flex-col items-center justify-center text-white font-bold
          transition-all duration-300 shadow-2xl cursor-pointer
          hover:scale-[1.02] active:scale-95 border-4 border-white/20`}
      >
        {state === 'idle' && (
          <>
            <div className="text-6xl mb-4">🎯</div>
            <div className="text-2xl mb-2">Click to Start</div>
            <div className="text-sm opacity-70">Test your reaction speed</div>
          </>
        )}
        {state === 'waiting' && (
          <>
            <div className="text-6xl mb-4 animate-pulse">🔴</div>
            <div className="text-2xl mb-2">Wait for green...</div>
            <div className="text-sm opacity-70">Don't click yet!</div>
          </>
        )}
        {state === 'ready' && (
          <>
            <div className="text-6xl mb-4">🟢</div>
            <div className="text-3xl mb-2">CLICK NOW!</div>
            <div className="text-sm opacity-70">As fast as you can!</div>
          </>
        )}
        {state === 'result' && reactionTime !== null && (
          <>
            <div className="text-5xl mb-3">⏱️</div>
            <div className="text-5xl font-black mb-2">{reactionTime}ms</div>
            <div className={`text-xl font-bold ${getReactionRating(reactionTime).color}`}>
              {getReactionRating(reactionTime).label}
            </div>
            <div className="text-sm opacity-70 mt-3">Click to try again</div>
          </>
        )}
        {state === 'too-early' && (
          <>
            <div className="text-6xl mb-4">😅</div>
            <div className="text-2xl mb-2">Too Early!</div>
            <div className="text-sm opacity-70">Click to try again</div>
          </>
        )}
      </button>

      {attempts.length > 0 && (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 border border-white/20 w-80">
          <div className="text-xs text-purple-200 uppercase tracking-wider mb-3 text-center">Recent Attempts</div>
          <div className="flex flex-wrap gap-2 justify-center">
            {attempts.slice(-10).map((time, i) => (
              <span
                key={i}
                className={`px-3 py-1 rounded-full text-sm font-bold
                  ${time < 300 ? 'bg-yellow-500/30 text-yellow-300' :
                    time < 400 ? 'bg-green-500/30 text-green-300' :
                    time < 500 ? 'bg-blue-500/30 text-blue-300' :
                    'bg-purple-500/30 text-purple-300'}`}
              >
                {time}ms
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
