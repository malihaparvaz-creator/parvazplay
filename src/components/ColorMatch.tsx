import { useState, useEffect, useCallback } from 'react';
import { Sounds } from '../utils/useSounds';
import { usePersistedNumber } from '../utils/useBestScore';

const COLORS = [
  { name: 'Red', hex: '#ef4444', text: 'text-red-400' },
  { name: 'Blue', hex: '#3b82f6', text: 'text-blue-400' },
  { name: 'Green', hex: '#22c55e', text: 'text-green-400' },
  { name: 'Yellow', hex: '#eab308', text: 'text-yellow-400' },
  { name: 'Purple', hex: '#a855f7', text: 'text-purple-400' },
  { name: 'Orange', hex: '#f97316', text: 'text-orange-400' },
  { name: 'Pink', hex: '#ec4899', text: 'text-pink-400' },
  { name: 'Cyan', hex: '#06b6d4', text: 'text-cyan-400' },
];

export function ColorMatch() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [wordColor, setWordColor] = useState(COLORS[0]);
  const [textColor, setTextColor] = useState(COLORS[1]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [highScore, setHighScore] = usePersistedNumber('color-best', 0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const generateRound = useCallback(() => {
    const word = COLORS[Math.floor(Math.random() * COLORS.length)];
    let text = COLORS[Math.floor(Math.random() * COLORS.length)];
    // 50% chance they match
    if (Math.random() < 0.5) text = word;
    setWordColor(word);
    setTextColor(text);
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setTimeLeft(30);
    setStreak(0);
    setFeedback(null);
    setGameState('playing');
    generateRound();
  }, [generateRound]);

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
    if (gameState === 'ended' && score > highScore) setHighScore(score);
  }, [gameState, score, highScore]);

  const answer = (isMatch: boolean) => {
    if (gameState !== 'playing') return;
    const actualMatch = wordColor.name === textColor.name;

    if (isMatch === actualMatch) {
      setScore((s) => s + 10 + streak * 3);
      setStreak((s) => s + 1);
      setFeedback('correct'); Sounds.answerCorrect();
    } else {
      setScore((s) => Math.max(0, s - 5));
      setStreak(0);
      setFeedback('wrong'); Sounds.answerWrong();
    }

    setTimeout(() => {
      setFeedback(null);
      generateRound();
    }, 300);
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
          <div className="text-xs text-purple-200 uppercase tracking-wider">Streak</div>
          <div className="text-2xl font-bold text-orange-300">🔥 {streak}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Best</div>
          <div className="text-2xl font-bold text-emerald-300">{highScore}</div>
        </div>
      </div>

      {gameState === 'idle' && (
        <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl px-8 py-12 border border-white/20">
          <div className="text-6xl mb-4">🎨</div>
          <div className="text-2xl font-bold text-white mb-2">Color Match</div>
          <div className="text-purple-200 mb-2">Does the word's COLOR match what it SAYS?</div>
          <div className="text-sm text-purple-300 mb-6">
            Example: <span className="text-red-400 font-bold">Blue</span> = NO (word says Blue but is colored Red)
          </div>
          <button onClick={startGame} className="px-8 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold rounded-xl hover:from-pink-600 hover:to-rose-700 transition-all shadow-lg active:scale-95 text-lg">
            🎨 Start Game
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="w-full max-w-sm">
          <div className={`bg-white/10 backdrop-blur-sm rounded-2xl px-8 py-12 border-2 text-center mb-6 transition-all duration-200
            ${feedback === 'correct' ? 'border-green-400 bg-green-500/20' : feedback === 'wrong' ? 'border-red-400 bg-red-500/20' : 'border-white/20'}`}
          >
            <div className="text-purple-300 text-sm mb-3">Is this word's color matching its name?</div>
            <div className="text-6xl font-black" style={{ color: textColor.hex }}>
              {wordColor.name}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => answer(true)}
              className="flex-1 py-5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-xl rounded-xl
                hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg active:scale-95"
            >
              ✅ YES
            </button>
            <button
              onClick={() => answer(false)}
              className="flex-1 py-5 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold text-xl rounded-xl
                hover:from-red-600 hover:to-rose-700 transition-all shadow-lg active:scale-95"
            >
              ❌ NO
            </button>
          </div>
        </div>
      )}

      {gameState === 'ended' && (
        <div className="text-center bg-gradient-to-r from-pink-500/20 to-rose-500/20 backdrop-blur-sm rounded-2xl px-8 py-6 border border-pink-400/40">
          <div className="text-4xl mb-2">🎨</div>
          <div className="text-2xl font-bold text-pink-300 mb-1">Time's Up!</div>
          <div className="text-3xl font-bold text-white mb-4">{score} points</div>
          <button onClick={startGame} className="px-8 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold rounded-xl hover:from-pink-600 hover:to-rose-700 transition-all shadow-lg active:scale-95">
            🔄 Play Again
          </button>
        </div>
      )}
    </div>
  );
}
