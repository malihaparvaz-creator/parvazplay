import { useState, useEffect, useCallback } from 'react';
import { Sounds } from '../utils/useSounds';
import { usePersistedNumber } from '../utils/useBestScore';

interface MathProblem {
  question: string;
  answer: number;
  options: number[];
}

function generateProblem(difficulty: number): MathProblem {
  const ops = ['+', '-', '×'];
  if (difficulty > 5) ops.push('÷');

  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;

  const maxNum = Math.min(10 + difficulty * 3, 50);

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * maxNum) + 1;
      b = Math.floor(Math.random() * maxNum) + 1;
      answer = a + b;
      break;
    case '-':
      a = Math.floor(Math.random() * maxNum) + 5;
      b = Math.floor(Math.random() * a) + 1;
      answer = a - b;
      break;
    case '×':
      a = Math.floor(Math.random() * Math.min(maxNum / 2, 12)) + 1;
      b = Math.floor(Math.random() * Math.min(maxNum / 2, 12)) + 1;
      answer = a * b;
      break;
    case '÷':
      b = Math.floor(Math.random() * 10) + 2;
      answer = Math.floor(Math.random() * 10) + 1;
      a = b * answer;
      break;
    default:
      a = 1; b = 1; answer = 2;
  }

  const options = new Set<number>([answer]);
  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 10) - 5;
    const wrong = answer + (offset === 0 ? 1 : offset);
    if (wrong >= 0) options.add(wrong);
  }

  return {
    question: `${a} ${op} ${b}`,
    answer,
    options: [...options].sort(() => Math.random() - 0.5),
  };
}

export function MathBlitz() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [problem, setProblem] = useState<MathProblem | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = usePersistedNumber('math-best', 0);
  const [difficulty, setDifficulty] = useState(1);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [problemsSolved, setProblemsSolved] = useState(0);

  const startGame = useCallback(() => {
    setScore(0);
    setTimeLeft(60);
    setStreak(0);
    setDifficulty(1);
    setProblemsSolved(0);
    setFeedback(null);
    setGameState('playing');
    setProblem(generateProblem(1));
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
    if (gameState === 'ended' && score > highScore) setHighScore(score);
  }, [gameState, score, highScore]);

  const handleAnswer = (answer: number) => {
    if (!problem || gameState !== 'playing') return;

    if (answer === problem.answer) {
      const points = 10 + streak * 2 + difficulty * 2;
      setScore((s) => s + points);
      setStreak((s) => s + 1); Sounds.answerCorrect();
      setProblemsSolved((p) => p + 1);
      setFeedback('correct');
      if ((problemsSolved + 1) % 5 === 0) {
        setDifficulty((d) => d + 1);
      }
    } else {
      setStreak(0); Sounds.answerWrong();
      setFeedback('wrong');
    }

    setTimeout(() => {
      setFeedback(null);
      setProblem(generateProblem(difficulty));
    }, 200);
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
          <div className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>{timeLeft}s</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Streak</div>
          <div className="text-2xl font-bold text-orange-300">🔥 {streak}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Level</div>
          <div className="text-2xl font-bold text-purple-300">{difficulty}</div>
        </div>
      </div>

      {gameState === 'idle' && (
        <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl px-8 py-12 border border-white/20">
          <div className="text-6xl mb-4">🧮</div>
          <div className="text-2xl font-bold text-white mb-2">Math Blitz</div>
          <div className="text-purple-200 mb-6">Solve as many math problems as you can in 60 seconds!</div>
          <button onClick={startGame} className="px-8 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-bold rounded-xl hover:from-violet-600 hover:to-fuchsia-700 transition-all shadow-lg active:scale-95 text-lg">
            🧮 Start Blitz
          </button>
        </div>
      )}

      {gameState === 'playing' && problem && (
        <div className="w-full max-w-sm">
          <div className={`bg-white/10 backdrop-blur-sm rounded-2xl px-8 py-10 border-2 text-center mb-6 transition-all duration-200
            ${feedback === 'correct' ? 'border-green-400 bg-green-500/20' : feedback === 'wrong' ? 'border-red-400 bg-red-500/20' : 'border-white/20'}`}
          >
            <div className="text-purple-300 text-sm mb-2">Solve:</div>
            <div className="text-5xl font-black text-white font-mono">{problem.question}</div>
            <div className="text-3xl text-purple-300 mt-2">= ?</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {problem.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                className="py-4 bg-white/10 border-2 border-white/20 rounded-xl text-white font-bold text-2xl
                  hover:bg-white/20 hover:border-white/40 transition-all active:scale-95 cursor-pointer"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {gameState === 'ended' && (
        <div className="text-center bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 backdrop-blur-sm rounded-2xl px-8 py-6 border border-violet-400/40">
          <div className="text-4xl mb-2">🧮</div>
          <div className="text-2xl font-bold text-violet-300 mb-1">Time's Up!</div>
          <div className="text-3xl font-bold text-white mb-1">{score} points</div>
          <div className="text-purple-200 text-sm mb-4">
            {problemsSolved} problems solved • Level {difficulty}
          </div>
          <button onClick={startGame} className="px-8 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-bold rounded-xl hover:from-violet-600 hover:to-fuchsia-700 transition-all shadow-lg active:scale-95">
            🔄 Blitz Again
          </button>
        </div>
      )}
    </div>
  );
}
