import { useState, useEffect, useCallback } from 'react';
import { Sounds } from '../utils/useSounds';

const PUZZLES = [
  { word: 'JAVASCRIPT', hint: 'Popular programming language' },
  { word: 'ELEPHANT', hint: 'Largest land animal' },
  { word: 'PYRAMID', hint: 'Ancient Egyptian structure' },
  { word: 'GALAXY', hint: 'Collection of stars' },
  { word: 'VOLCANO', hint: 'Mountain that erupts' },
  { word: 'DIAMOND', hint: 'Hardest natural substance' },
  { word: 'PENGUIN', hint: 'Flightless bird from cold places' },
  { word: 'TORNADO', hint: 'Spinning wind funnel' },
  { word: 'CASTLE', hint: 'Medieval fortress' },
  { word: 'ROCKET', hint: 'Goes to space' },
  { word: 'WIZARD', hint: 'Magical spellcaster' },
  { word: 'DRAGON', hint: 'Mythical fire-breathing creature' },
  { word: 'OXYGEN', hint: 'Essential gas for breathing' },
  { word: 'GUITAR', hint: 'Six-stringed instrument' },
  { word: 'PLANET', hint: 'Orbits a star' },
  { word: 'FROZEN', hint: 'Turned to ice' },
  { word: 'BRIDGE', hint: 'Crosses over water' },
  { word: 'JUNGLE', hint: 'Dense tropical forest' },
  { word: 'ROBOT', hint: 'Mechanical helper' },
  { word: 'CIRCUS', hint: 'Entertainment with clowns and acrobats' },
  { word: 'PIRATE', hint: 'Sails seas seeking treasure' },
  { word: 'ZOMBIE', hint: 'Undead creature' },
  { word: 'THUNDER', hint: 'Sound after lightning' },
  { word: 'CRYSTAL', hint: 'Clear mineral formation' },
  { word: 'PHOENIX', hint: 'Bird that rises from ashes' },
  { word: 'MYSTERY', hint: 'Something unexplained' },
  { word: 'COMPASS', hint: 'Points north' },
  { word: 'HARBOR', hint: 'Where ships dock' },
  { word: 'SUNSET', hint: 'End of the day sky colors' },
  { word: 'KNIGHT', hint: 'Armored medieval warrior' },
];

export function PuzzleGame() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'ended'>('idle');
  const [currentPuzzle, setCurrentPuzzle] = useState(0);
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [puzzles, setPuzzles] = useState<typeof PUZZLES>([]);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(0);
  const maxWrong = 6;

  const startGame = useCallback(() => {
    const shuffled = [...PUZZLES].sort(() => Math.random() - 0.5).slice(0, 10);
    setPuzzles(shuffled);
    setCurrentPuzzle(0);
    setGuessedLetters(new Set());
    setWrongGuesses(0);
    setScore(0);
    setSolved(0);
    setGameState('playing');
  }, []);

  const currentWord = puzzles[currentPuzzle]?.word || '';
  const currentHint = puzzles[currentPuzzle]?.hint || '';

  const displayWord = currentWord
    .split('')
    .map((l) => (guessedLetters.has(l) ? l : '_'))
    .join(' ');

  const isWordGuessed = currentWord.split('').every((l) => guessedLetters.has(l));

  useEffect(() => {
    if (isWordGuessed && gameState === 'playing' && currentWord) {
      const bonus = Math.max(0, (maxWrong - wrongGuesses) * 15);
      setScore((s) => s + 50 + bonus);
      setSolved((s) => s + 1);
      setGameState('won'); Sounds.wordSolve();
    }
  }, [isWordGuessed, gameState, wrongGuesses, currentWord]);

  const guessLetter = (letter: string) => {
    if (gameState !== 'playing' || guessedLetters.has(letter)) return;
    const newGuessed = new Set(guessedLetters);
    newGuessed.add(letter);
    setGuessedLetters(newGuessed);
    if (!currentWord.includes(letter)) { Sounds.letterWrong();
      setWrongGuesses((w) => w + 1);
      if (wrongGuesses + 1 >= maxWrong) {
        if (currentPuzzle + 1 >= puzzles.length) {
          setGameState('ended');
        } else {
          nextPuzzle();
        }
      }
    }
  };

  const nextPuzzle = () => {
    if (currentPuzzle + 1 >= puzzles.length) {
      setGameState('ended');
    } else {
      setCurrentPuzzle((c) => c + 1);
      setGuessedLetters(new Set());
      setWrongGuesses(0);
      setGameState('playing');
    }
  };

  const getHangmanEmoji = () => {
    const faces = ['😊', '😐', '😟', '😰', '😨', '😱', '💀'];
    return faces[Math.min(wrongGuesses, 6)];
  };

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-4 text-center flex-wrap justify-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Score</div>
          <div className="text-2xl font-bold text-yellow-300">{score}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Puzzle</div>
          <div className="text-2xl font-bold text-white">{currentPuzzle + 1}/{puzzles.length}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Solved</div>
          <div className="text-2xl font-bold text-emerald-300">{solved}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Lives</div>
          <div className="text-2xl font-bold text-red-300">{'❤️'.repeat(Math.max(0, maxWrong - wrongGuesses))}</div>
        </div>
      </div>

      {gameState === 'idle' && (
        <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl px-8 py-12 border border-white/20">
          <div className="text-6xl mb-4">🧩</div>
          <div className="text-2xl font-bold text-white mb-2">Word Puzzle</div>
          <div className="text-purple-200 mb-6">Guess the word before you run out of lives!</div>
          <button onClick={startGame} className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg active:scale-95 text-lg">
            🧩 Start Puzzle
          </button>
        </div>
      )}

      {(gameState === 'playing' || gameState === 'won') && (
        <div className="w-full max-w-md">
          {/* Hangman face */}
          <div className="text-center text-5xl mb-4">{getHangmanEmoji()}</div>

          {/* Hint */}
          <div className="text-center mb-4">
            <span className="text-purple-300 text-sm">💡 Hint: </span>
            <span className="text-white font-semibold">{currentHint}</span>
          </div>

          {/* Word display */}
          <div className="text-center mb-6">
            <div className="text-3xl font-mono font-bold text-white tracking-widest">{displayWord}</div>
          </div>

          {/* Wrong guess indicator */}
          <div className="flex justify-center gap-1 mb-4">
            {Array.from({ length: maxWrong }).map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full ${i < wrongGuesses ? 'bg-red-500' : 'bg-white/20'}`}
              />
            ))}
          </div>

          {/* Alphabet buttons */}
          <div className="grid grid-cols-7 gap-1.5 mb-4">
            {alphabet.map((letter) => {
              const isGuessed = guessedLetters.has(letter);
              const isCorrect = isGuessed && currentWord.includes(letter);
              const isWrong = isGuessed && !currentWord.includes(letter);

              return (
                <button
                  key={letter}
                  onClick={() => guessLetter(letter)}
                  disabled={isGuessed || gameState === 'won'}
                  className={`w-10 h-10 rounded-lg font-bold text-sm transition-all
                    ${isCorrect ? 'bg-green-500/40 text-green-300 border border-green-400' : ''}
                    ${isWrong ? 'bg-red-500/40 text-red-300 border border-red-400' : ''}
                    ${!isGuessed ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-white/40 cursor-pointer active:scale-90' : ''}
                  `}
                >
                  {letter}
                </button>
              );
            })}
          </div>

          {gameState === 'won' && (
            <div className="text-center">
              <div className="text-green-400 font-bold text-lg mb-3 animate-pulse">
                ✅ Solved! +{50 + Math.max(0, (maxWrong - wrongGuesses) * 15)} points
              </div>
              <button onClick={nextPuzzle} className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg active:scale-95">
                {currentPuzzle + 1 >= puzzles.length ? '🏁 Finish' : '➡️ Next Word'}
              </button>
            </div>
          )}
        </div>
      )}

      {gameState === 'ended' && (
        <div className="text-center bg-gradient-to-r from-indigo-500/20 to-purple-500/20 backdrop-blur-sm rounded-2xl px-8 py-6 border border-indigo-400/40">
          <div className="text-4xl mb-2">🧩</div>
          <div className="text-2xl font-bold text-indigo-300 mb-1">Game Over!</div>
          <div className="text-3xl font-bold text-white mb-1">{score} points</div>
          <div className="text-purple-200 text-sm mb-4">Solved {solved}/{puzzles.length} words</div>
          <button onClick={startGame} className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg active:scale-95">
            🔄 Play Again
          </button>
        </div>
      )}
    </div>
  );
}
