import { useCallback, useEffect, useState } from 'react';
import { Sounds } from '../utils/useSounds';
import { useBestScore } from '../utils/useBestScore';

type Cell = '' | 'X' | 'O';

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function findWinner(board: Cell[]): { winner: Cell; line: number[] | null } {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return { winner: '', line: null };
}

function minimax(board: Cell[], player: 'X' | 'O'): { score: number; move: number } {
  const { winner } = findWinner(board);
  if (winner === 'O') return { score: 10, move: -1 };
  if (winner === 'X') return { score: -10, move: -1 };
  if (board.every((cell) => cell !== '')) return { score: 0, move: -1 };

  const moves: { score: number; move: number }[] = [];
  for (let i = 0; i < 9; i++) {
    if (board[i] !== '') continue;
    const next = [...board];
    next[i] = player;
    const result = minimax(next, player === 'O' ? 'X' : 'O');
    moves.push({ score: result.score, move: i });
  }

  if (player === 'O') {
    return moves.reduce((best, current) => (current.score > best.score ? current : best));
  }
  return moves.reduce((best, current) => (current.score < best.score ? current : best));
}

export function TicTacToe() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(''));
  const [turn, setTurn] = useState<'X' | 'O'>('X');
  const [thinking, setThinking] = useState(false);
  const { winner, line } = findWinner(board);
  const isDraw = !winner && board.every((cell) => cell !== '');
  const { best: wins, submit: recordWin } = useBestScore('ttt-wins');

  const reset = useCallback(() => {
    setBoard(Array(9).fill(''));
    setTurn('X');
    setThinking(false);
  }, []);

  useEffect(() => {
    if (winner === 'X') { Sounds.tttWin(); recordWin(wins + 1); }
  }, [winner, wins, recordWin]);

  const playerMove = (i: number) => {
    if (board[i] || winner || isDraw || turn !== 'X' || thinking) return;
    const next = [...board];
    next[i] = 'X';
    setBoard(next);
    setTurn('O');
  };

  useEffect(() => {
    if (turn !== 'O' || winner || isDraw) return;
    setThinking(true);
    const timer = setTimeout(() => {
      const { move } = minimax(board, 'O');
      if (move >= 0) {
        const next = [...board];
        next[move] = 'O';
        setBoard(next);
      }
      setTurn('X');
      setThinking(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [turn, board, winner, isDraw]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-3 text-center">
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs text-purple-200">Turn</div><div className="text-2xl font-bold">{winner || isDraw ? '—' : turn === 'X' ? '❌ You' : '⭕ AI'}</div></div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs text-purple-200">Total Wins</div><div className="text-2xl font-bold text-emerald-300">{wins}</div></div>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-900 p-3">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => playerMove(i)}
            disabled={!!cell || !!winner || isDraw || turn !== 'X'}
            className={`flex h-20 w-20 items-center justify-center rounded-lg text-4xl font-black transition ${
              line?.includes(i) ? 'bg-yellow-500/30' : 'bg-white/10 hover:bg-white/20'
            } ${cell === 'X' ? 'text-red-400' : 'text-cyan-300'}`}
          >
            {cell}
          </button>
        ))}
      </div>

      {(winner || isDraw) && (
        <div className="rounded-2xl border border-white/20 bg-white/10 px-8 py-4 text-center">
          <div className="mb-2 text-2xl font-bold">
            {winner === 'X' ? '🏆 You beat the AI!' : winner === 'O' ? '🤖 AI wins!' : '🤝 Draw!'}
          </div>
          <button onClick={reset} className="rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-2 font-bold text-white active:scale-95">Play Again</button>
        </div>
      )}

      <div className="text-xs text-purple-300">The AI plays perfect minimax — the best you can do is draw 😉</div>
    </div>
  );
}
