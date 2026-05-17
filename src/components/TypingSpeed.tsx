import { useState, useEffect, useRef, useCallback } from 'react';
import { Sounds } from '../utils/useSounds';
import { usePersistedNumber } from '../utils/useBestScore';

const WORDS = [
  'function', 'variable', 'react', 'component', 'javascript', 'typescript', 'python',
  'keyboard', 'monitor', 'internet', 'browser', 'website', 'server', 'database',
  'algorithm', 'programming', 'developer', 'software', 'hardware', 'network',
  'beautiful', 'mountain', 'elephant', 'chocolate', 'adventure', 'champion',
  'dinosaur', 'fireworks', 'galaxies', 'harmonica', 'iceberg', 'jukebox',
  'kangaroo', 'labyrinth', 'mushroom', 'notebook', 'orchid', 'paradise',
  'quantity', 'rainbow', 'sandwich', 'treasure', 'umbrella', 'volcano',
  'whisper', 'xylophone', 'yacht', 'zeppelin', 'abstract', 'brilliant',
  'calculate', 'determine', 'enormous', 'fantastic', 'generate', 'hypothesis',
  'imagine', 'journey', 'knowledge', 'lightning', 'magnificent', 'navigate',
  'obstacle', 'phenomenon', 'question', 'remarkable', 'spectacular', 'tremendous',
];

export function TypingSpeed() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [currentWord, setCurrentWord] = useState('');
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [wordsTyped, setWordsTyped] = useState(0);
  const [correctChars, setCorrectChars] = useState(0);
  const [, setTotalChars] = useState(0);
  const [highScore, setHighScore] = usePersistedNumber('typing-best', 0);
  const [combo, setCombo] = useState(0);
  const [words, setWords] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const startGame = useCallback(() => {
    const shuffled = [...WORDS].sort(() => Math.random() - 0.5);
    setWords(shuffled);
    setCurrentWord(shuffled[0]);
    setInput('');
    setScore(0);
    setTimeLeft(60);
    setWordsTyped(0);
    setCorrectChars(0);
    setTotalChars(0);
    setCombo(0);
    setGameState('playing');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return; Sounds.typeKey();
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

  const handleInput = (value: string) => {
    if (gameState !== 'playing') return; Sounds.typeKey();
    setInput(value);

    if (value === currentWord) {
      setScore((s) => s + currentWord.length + combo * 2);
      setWordsTyped((w) => w + 1);
      setCorrectChars((c) => c + currentWord.length);
      setTotalChars((t) => t + currentWord.length);
      setCombo((c) => c + 1); Sounds.wordComplete();
      const nextIdx = wordsTyped + 1;
      if (nextIdx < words.length) {
        setCurrentWord(words[nextIdx]);
      } else {
        const newWords = [...WORDS].sort(() => Math.random() - 0.5);
        setWords(newWords);
        setCurrentWord(newWords[0]);
      }
      setInput('');
    }
  };

  const getCharColor = (index: number) => {
    if (index >= input.length) return 'text-white/40';
    return input[index] === currentWord[index] ? 'text-green-400' : 'text-red-400';
  };

  const wpm = Math.round((correctChars / 5) / ((60 - timeLeft) / 60)) || 0;

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
          <div className="text-xs text-purple-200 uppercase tracking-wider">WPM</div>
          <div className="text-2xl font-bold text-cyan-300">{wpm}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Combo</div>
          <div className="text-2xl font-bold text-orange-300">x{combo}</div>
        </div>
      </div>

      {gameState === 'idle' && (
        <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl px-8 py-12 border border-white/20">
          <div className="text-6xl mb-4">⌨️</div>
          <div className="text-2xl font-bold text-white mb-2">Speed Typist</div>
          <div className="text-purple-200 mb-6">Type as many words as you can in 60 seconds!</div>
          <button onClick={startGame} className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg active:scale-95 text-lg">
            ⌨️ Start Typing
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="w-full max-w-md">
          {/* Current word display */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-8 py-8 border border-white/20 mb-6 text-center">
            <div className="text-4xl font-mono font-bold tracking-wider">
              {currentWord.split('').map((char, i) => (
                <span key={i} className={getCharColor(i)}>
                  {char}
                </span>
              ))}
            </div>
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            className="w-full px-6 py-4 bg-white/10 border-2 border-white/20 rounded-xl text-white text-xl
              font-mono text-center focus:outline-none focus:border-cyan-400 transition-all"
            placeholder="Type here..."
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />

          <div className="text-center mt-3 text-purple-300 text-sm">
            Words typed: {wordsTyped} • Keep going!
          </div>
        </div>
      )}

      {gameState === 'ended' && (
        <div className="text-center bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-sm rounded-2xl px-8 py-6 border border-cyan-400/40">
          <div className="text-4xl mb-2">⌨️</div>
          <div className="text-2xl font-bold text-cyan-300 mb-1">Time's Up!</div>
          <div className="text-3xl font-bold text-white mb-1">{score} points</div>
          <div className="text-purple-200 text-sm mb-4">
            {wordsTyped} words • {wpm} WPM
          </div>
          <button onClick={startGame} className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg active:scale-95">
            🔄 Type Again
          </button>
        </div>
      )}
    </div>
  );
}
