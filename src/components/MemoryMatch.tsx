import { useState, useEffect, useCallback } from 'react';
import { Sounds } from '../utils/useSounds';
import { usePersistedNullableNumber } from '../utils/useBestScore';

const EMOJIS = ['🐶', '🐱', '🐸', '🦊', '🐼', '🐨', '🦁', '🐯'];

interface Card {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

export function MemoryMatch() {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [bestScore, setBestScore] = usePersistedNullableNumber('memory-best', null);
  const [timer, setTimer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const initGame = useCallback(() => {
    const shuffled = [...EMOJIS, ...EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, i) => ({
        id: i,
        emoji,
        flipped: false,
        matched: false,
      }));
    setCards(shuffled);
    setFlippedIds([]);
    setMoves(0);
    setMatches(0);
    setGameWon(false);
    setTimer(0);
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying && !gameWon) {
      interval = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, gameWon]);

  const handleCardClick = (id: number) => {
    if (flippedIds.length === 2) return;
    if (cards[id].flipped || cards[id].matched) return;

    if (!isPlaying) setIsPlaying(true);

    const newCards = [...cards];
    newCards[id].flipped = true; Sounds.flip();
    setCards(newCards);

    const newFlipped = [...flippedIds, id];
    setFlippedIds(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [first, second] = newFlipped;
      if (newCards[first].emoji === newCards[second].emoji) {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === first || c.id === second
                ? { ...c, matched: true }
                : c
            )
          );
          setMatches((m) => m + 1); Sounds.match();
          setFlippedIds([]);
        }, 500);
      } else {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === first || c.id === second
                ? { ...c, flipped: false }
                : c
            )
          );
          setFlippedIds([]);
        }, 800);
      }
    }
  };

  useEffect(() => {
    if (matches === EMOJIS.length && matches > 0) {
      setGameWon(true);
      if (!bestScore || moves < bestScore) {
        setBestScore(moves);
      }
    }
  }, [matches, moves, bestScore]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-6 text-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Moves</div>
          <div className="text-2xl font-bold text-white">{moves}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Matches</div>
          <div className="text-2xl font-bold text-white">{matches}/{EMOJIS.length}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Time</div>
          <div className="text-2xl font-bold text-white">{formatTime(timer)}</div>
        </div>
        {bestScore !== null && (
          <div className="bg-yellow-500/20 backdrop-blur-sm rounded-xl px-5 py-3 border border-yellow-400/30">
            <div className="text-xs text-yellow-200 uppercase tracking-wider">Best</div>
            <div className="text-2xl font-bold text-yellow-300">{bestScore}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-3 max-w-md">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            className={`w-20 h-20 rounded-xl text-3xl font-bold transition-all duration-300 transform
              ${
                card.flipped || card.matched
                  ? 'bg-white/90 scale-105 shadow-lg shadow-purple-500/30'
                  : 'bg-gradient-to-br from-purple-500 to-indigo-600 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/40 cursor-pointer'
              }
              ${card.matched ? 'opacity-70 scale-95' : ''}
            `}
            disabled={card.matched}
          >
            {card.flipped || card.matched ? card.emoji : '?'}
          </button>
        ))}
      </div>

      {gameWon && (
        <div className="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 backdrop-blur-sm rounded-2xl px-8 py-6 border border-yellow-400/40 text-center animate-bounce">
          <div className="text-4xl mb-2">🎉</div>
          <div className="text-2xl font-bold text-yellow-300 mb-1">You Won!</div>
          <div className="text-purple-200">
            Completed in {moves} moves and {formatTime(timer)}
          </div>
        </div>
      )}

      <button
        onClick={initGame}
        className="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl
          hover:from-purple-600 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/30
          active:scale-95"
      >
        🔄 New Game
      </button>
    </div>
  );
}
