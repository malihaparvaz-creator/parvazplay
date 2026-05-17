import { useCallback, useEffect, useState } from 'react';
import { Sounds } from '../utils/useSounds';
import { useAutosave, useBestScore } from '../utils/useBestScore';

const SIZE = 5;

type Board = boolean[][];

const emptyBoard = (): Board => Array.from({ length: SIZE }, () => Array(SIZE).fill(false));

function shuffle(): Board {
  let board = emptyBoard();
  // Simulate 8-15 random clicks so we know it's solvable
  const clicks = 8 + Math.floor(Math.random() * 8);
  for (let i = 0; i < clicks; i++) {
    const r = Math.floor(Math.random() * SIZE);
    const c = Math.floor(Math.random() * SIZE);
    board = applyClick(board, r, c);
  }
  if (board.every((row) => row.every((cell) => !cell))) return shuffle();
  return board;
}

function applyClick(board: Board, r: number, c: number): Board {
  const next = board.map((row) => [...row]);
  const toggle = (rr: number, cc: number) => {
    if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) next[rr][cc] = !next[rr][cc];
  };
  toggle(r, c);
  toggle(r - 1, c);
  toggle(r + 1, c);
  toggle(r, c - 1);
  toggle(r, c + 1);
  return next;
}

interface SaveState {
  board: Board;
  moves: number;
  level: number;
}

const INITIAL: SaveState = { board: emptyBoard(), moves: 0, level: 1 };

export function LightsOut() {
  const [save, setSave, clearSave] = useAutosave<SaveState>('lights-out', INITIAL);
  const [board, setBoard] = useState<Board>(save.board);
  const [moves, setMoves] = useState(save.moves);
  const [level, setLevel] = useState(save.level);
  const { best, submit } = useBestScore('lights-out-level');

  const allOff = board.every((row) => row.every((cell) => !cell));

  useEffect(() => {
    setSave({ board, moves, level });
  }, [board, moves, level, setSave]);

  useEffect(() => {
    if (allOff && moves > 0) {
      submit(level);
    }
  }, [allOff, moves, level, submit]);

  const newPuzzle = useCallback(() => {
    setBoard(shuffle());
    setMoves(0);
  }, []);

  const handleClick = (r: number, c: number) => {
    if (allOff && moves > 0) return;
    setBoard((prev) => applyClick(prev, r, c));
    setMoves((m) => m + 1);
  };

  const nextLevel = () => {
    setLevel((l) => l + 1);
    setMoves(0);
    setBoard(shuffle());
  };

  const reset = () => {
    setLevel(1);
    setMoves(0);
    setBoard(emptyBoard());
    clearSave();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-3 text-center">
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs text-purple-200">Level</div><div className="text-2xl font-bold text-yellow-300">{level}</div></div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs text-purple-200">Moves</div><div className="text-2xl font-bold text-cyan-300">{moves}</div></div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs text-purple-200">Best Level</div><div className="text-2xl font-bold text-emerald-300">{best}</div></div>
      </div>

      <div className="grid gap-2 rounded-2xl bg-slate-900 p-3" style={{ gridTemplateColumns: `repeat(${SIZE}, 56px)` }}>
        {board.map((row, r) => row.map((on, c) => (
          <button
            key={`${r}-${c}`}
            onClick={() => handleClick(r, c)}
            className={`h-14 w-14 rounded-xl border transition ${
              on
                ? 'border-yellow-200 bg-yellow-300 shadow-lg shadow-yellow-400/50'
                : 'border-slate-700 bg-slate-800 hover:bg-slate-700'
            }`}
          />
        )))}
      </div>

      <div className="flex gap-3">
        <button onClick={newPuzzle} className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 px-6 py-2 font-bold text-white active:scale-95">🎲 New Puzzle</button>
        <button onClick={reset} className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white active:scale-95">Reset Progress</button>
      </div>

      {allOff && moves > 0 && (
        <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/20 px-8 py-4 text-center">
          <div className="mb-3 text-2xl font-bold text-emerald-300">💡 All lights out in {moves} moves!</div>
          <button onClick={nextLevel} className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 px-6 py-2 font-bold text-white active:scale-95">▶️ Next Level</button>
        </div>
      )}
    </div>
  );
}
