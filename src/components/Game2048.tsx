import { useCallback, useEffect, useState } from 'react';
import { Sounds } from '../utils/useSounds';
import { usePersistedNumber } from '../utils/useBestScore';

type Board = number[][];
const SIZE = 4;
const emptyBoard = (): Board => Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

const addTile = (board: Board) => {
  const open: [number, number][] = [];
  board.forEach((row, r) => row.forEach((value, c) => { if (!value) open.push([r, c]); }));
  if (!open.length) return board;
  const next = board.map((row) => [...row]);
  const [r, c] = open[Math.floor(Math.random() * open.length)];
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
};

const startBoard = () => addTile(addTile(emptyBoard()));

function slideLine(line: number[]) {
  const filtered = line.filter(Boolean);
  const merged: number[] = [];
  let gained = 0;
  for (let i = 0; i < filtered.length; i++) {
    if (filtered[i] === filtered[i + 1]) {
      const value = filtered[i] * 2;
      merged.push(value);
      gained += value;
      i++;
    } else merged.push(filtered[i]);
  }
  while (merged.length < SIZE) merged.push(0);
  return { line: merged, gained };
}

function moveBoard(board: Board, dir: 'up' | 'down' | 'left' | 'right') {
  let gained = 0;
  let moved = false;
  const next = emptyBoard();
  for (let i = 0; i < SIZE; i++) {
    const original = dir === 'left' || dir === 'right' ? board[i] : board.map((row) => row[i]);
    const working = dir === 'right' || dir === 'down' ? [...original].reverse() : [...original];
    const result = slideLine(working);
    const finalLine = dir === 'right' || dir === 'down' ? result.line.reverse() : result.line;
    gained += result.gained;
    for (let j = 0; j < SIZE; j++) {
      if (dir === 'left' || dir === 'right') next[i][j] = finalLine[j];
      else next[j][i] = finalLine[j];
      if (finalLine[j] !== original[j]) moved = true;
    }
  }
  return { board: next, gained, moved };
}

const canMove = (board: Board) => {
  if (board.some((row) => row.some((v) => v === 0))) return true;
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (board[r][c] === board[r + 1]?.[c] || board[r][c] === board[r]?.[c + 1]) return true;
  }
  return false;
};

const tileClass = (value: number) => ({
  0: 'bg-white/10 text-transparent', 2: 'bg-amber-100 text-slate-800', 4: 'bg-amber-200 text-slate-800', 8: 'bg-orange-300 text-white', 16: 'bg-orange-400 text-white', 32: 'bg-red-400 text-white', 64: 'bg-red-500 text-white', 128: 'bg-yellow-400 text-white', 256: 'bg-green-400 text-white', 512: 'bg-cyan-400 text-white', 1024: 'bg-purple-400 text-white', 2048: 'bg-pink-500 text-white',
}[value] || 'bg-fuchsia-600 text-white');

export function Game2048() {
  const [board, setBoard] = useState<Board>(startBoard());
  const [score, setScore] = useState(0);
  const [best, setBest] = usePersistedNumber('2048-best', 0);
  const [gameOver, setGameOver] = useState(false);
  const reset = useCallback(() => { setBoard(startBoard()); setScore(0); setGameOver(false); }, []);
  const move = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    if (gameOver) return;
    const result = moveBoard(board, dir);
    if (!result.moved) return; Sounds.slideMove();
    const withTile = addTile(result.board);
    const newScore = score + result.gained;
    setBoard(withTile);
    setScore(newScore);
    setBest((b) => Math.max(b, newScore)); if (result.gained > 0) Sounds.tileMerge();
    if (!canMove(withTile)) setGameOver(true);
  }, [board, gameOver, score]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, 'up' | 'down' | 'left' | 'right'> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
      if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move]);
  return <div className="flex flex-col items-center gap-4"><div className="flex gap-4 text-center"><div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3"><div className="text-xs text-purple-200">Score</div><div className="text-2xl font-bold text-yellow-300">{score}</div></div><div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3"><div className="text-xs text-purple-200">Best</div><div className="text-2xl font-bold text-emerald-300">{best}</div></div></div><div className="grid grid-cols-4 gap-2 rounded-2xl bg-slate-800 p-3">{board.flatMap((row, r) => row.map((value, c) => <div key={`${r}-${c}`} className={`flex h-16 w-16 items-center justify-center rounded-xl text-xl font-black transition-all ${tileClass(value)}`}>{value || ''}</div>))}</div><div className="grid w-44 grid-cols-3 gap-2"><div /><button onClick={() => move('up')} className="rounded-lg bg-white/10 py-2 active:scale-95">↑</button><div /><button onClick={() => move('left')} className="rounded-lg bg-white/10 py-2 active:scale-95">←</button><button onClick={reset} className="rounded-lg bg-purple-500/50 py-2 text-sm font-bold active:scale-95">New</button><button onClick={() => move('right')} className="rounded-lg bg-white/10 py-2 active:scale-95">→</button><div /><button onClick={() => move('down')} className="rounded-lg bg-white/10 py-2 active:scale-95">↓</button><div /></div>{gameOver && <div className="text-center"><div className="mb-3 text-xl font-bold text-red-300">No moves left!</div><button onClick={reset} className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-3 font-bold text-white active:scale-95">Play Again</button></div>}</div>;
}