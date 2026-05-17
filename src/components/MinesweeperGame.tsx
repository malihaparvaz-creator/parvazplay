import { useCallback, useMemo, useState } from 'react';
import { Sounds } from '../utils/useSounds';

type Cell = { mine: boolean; revealed: boolean; flagged: boolean; count: number };
const SIZE = 8;
const MINES = 10;

function buildBoard() {
  const board: Cell[][] = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => ({ mine: false, revealed: false, flagged: false, count: 0 })));
  let placed = 0;
  while (placed < MINES) {
    const r = Math.floor(Math.random() * SIZE);
    const c = Math.floor(Math.random() * SIZE);
    if (!board[r][c].mine) { board[r][c].mine = true; placed++; }
  }
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    board[r][c].count = neighbors(r, c).filter(([nr, nc]) => board[nr][nc].mine).length;
  }
  return board;
}

function neighbors(r: number, c: number) {
  const result: [number, number][] = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) result.push([nr, nc]);
  }
  return result;
}

export function MinesweeperGame() {
  const [board, setBoard] = useState<Cell[][]>(buildBoard());
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [flagMode, setFlagMode] = useState(false);
  const revealedCount = useMemo(() => board.flat().filter((cell) => cell.revealed).length, [board]);
  const flags = useMemo(() => board.flat().filter((cell) => cell.flagged).length, [board]);
  const reset = useCallback(() => { setBoard(buildBoard()); setGameState('playing'); setFlagMode(false); }, []);

  const reveal = (r: number, c: number) => {
    if (gameState !== 'playing') return;
    const next = board.map((row) => row.map((cell) => ({ ...cell })));
    const cell = next[r][c];
    if (cell.flagged || cell.revealed) return;
    if (flagMode) { cell.flagged = true; setBoard(next); return; }
    Sounds.mineBoom(); if (cell.mine) { next.flat().forEach((x) => { if (x.mine) x.revealed = true; }); setBoard(next); setGameState('lost'); return; }
    const stack: [number, number][] = [[r, c]];
    while (stack.length) {
      const [cr, cc] = stack.pop()!;
      const current = next[cr][cc];
      if (current.revealed || current.flagged) continue;
      current.revealed = true;
      if (current.count === 0) neighbors(cr, cc).forEach(([nr, nc]) => { if (!next[nr][nc].revealed && !next[nr][nc].mine) stack.push([nr, nc]); });
    }
    setBoard(next);
    if (next.flat().filter((x) => x.revealed).length === SIZE * SIZE - MINES) { Sounds.mineClear(); setGameState('won'); }
  };

  const flag = (r: number, c: number) => {
    if (gameState !== 'playing') return;
    const next = board.map((row) => row.map((cell) => ({ ...cell })));
    if (!next[r][c].revealed) { next[r][c].flagged = !next[r][c].flagged; Sounds.mineFlag(); }
    setBoard(next);
  };

  return <div className="flex flex-col items-center gap-4"><div className="flex flex-wrap justify-center gap-4 text-center"><div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs text-purple-200">Safe</div><div className="text-2xl font-bold text-yellow-300">{revealedCount}/{SIZE * SIZE - MINES}</div></div><div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs text-purple-200">Flags</div><div className="text-2xl font-bold text-red-300">{flags}/{MINES}</div></div></div><div className="flex gap-3"><button onClick={() => setFlagMode((f) => !f)} className={`rounded-xl px-5 py-2 font-bold ${flagMode ? 'bg-red-500 text-white' : 'bg-white/10 text-white'}`}>🚩 Flag Mode</button><button onClick={reset} className="rounded-xl bg-purple-500/60 px-5 py-2 font-bold">New Board</button></div><div className="grid gap-1 rounded-xl bg-slate-900 p-2" style={{ gridTemplateColumns: `repeat(${SIZE}, 34px)` }}>{board.map((row, r) => row.map((cell, c) => <button key={`${r}-${c}`} onClick={() => reveal(r, c)} onContextMenu={(e) => { e.preventDefault(); flag(r, c); }} className={`flex h-8 w-8 items-center justify-center rounded text-sm font-bold ${cell.revealed ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'} ${cell.count === 1 ? 'text-blue-300' : cell.count === 2 ? 'text-green-300' : cell.count >= 3 ? 'text-red-300' : 'text-white'}`}>{cell.revealed ? (cell.mine ? '💣' : cell.count || '') : cell.flagged ? '🚩' : ''}</button>))}</div>{gameState !== 'playing' && <div className="text-center"><div className={`mb-3 text-2xl font-bold ${gameState === 'won' ? 'text-green-300' : 'text-red-300'}`}>{gameState === 'won' ? 'Cleared the minefield!' : 'Boom! Mine hit!'}</div><button onClick={reset} className="rounded-xl bg-gradient-to-r from-red-500 to-orange-600 px-8 py-3 font-bold text-white active:scale-95">Play Again</button></div>}</div>;
}