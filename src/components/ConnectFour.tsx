import { useCallback, useEffect, useState } from 'react';
import { Sounds } from '../utils/useSounds';
import { useBestScore } from '../utils/useBestScore';

const ROWS = 6;
const COLS = 7;
const MAX_DEPTH = 7; // Alpha-beta minimax depth

type Cell = 0 | 1 | 2;

const emptyBoard = (): Cell[][] => Array.from({ length: ROWS }, () => Array(COLS).fill(0) as Cell[]);

function dropPiece(board: Cell[][], col: number, player: Cell): Cell[][] | null {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) {
      const next = board.map((row) => [...row]);
      next[r][col] = player;
      return next;
    }
  }
  return null;
}

function checkWin(board: Cell[][], player: Cell): boolean {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c <= COLS - 4; c++) {
    if ([0,1,2,3].every((i) => board[r][c+i] === player)) return true;
  }
  for (let r = 0; r <= ROWS - 4; r++) for (let c = 0; c < COLS; c++) {
    if ([0,1,2,3].every((i) => board[r+i][c] === player)) return true;
  }
  for (let r = 0; r <= ROWS - 4; r++) for (let c = 0; c <= COLS - 4; c++) {
    if ([0,1,2,3].every((i) => board[r+i][c+i] === player)) return true;
  }
  for (let r = 3; r < ROWS; r++) for (let c = 0; c <= COLS - 4; c++) {
    if ([0,1,2,3].every((i) => board[r-i][c+i] === player)) return true;
  }
  return false;
}

const isFull = (board: Cell[][]) => board[0].every((c) => c !== 0);

function scoreWindow(window: Cell[], player: Cell): number {
  const opp: Cell = player === 1 ? 2 : 1;
  const own = window.filter((c) => c === player).length;
  const empty = window.filter((c) => c === 0).length;
  const enemy = window.filter((c) => c === opp).length;
  if (enemy > 0 && own > 0) return 0;
  if (own === 4) return 100;
  if (own === 3 && empty === 1) return 5;
  if (own === 2 && empty === 2) return 2;
  if (enemy === 3 && empty === 1) return -4;
  return 0;
}

function heuristicScore(board: Cell[][], player: Cell): number {
  let score = 0;
  // Center column bonus
  for (let r = 0; r < ROWS; r++) if (board[r][3] === player) score += 3;
  // Horizontal
  for (let r = 0; r < ROWS; r++) for (let c = 0; c <= COLS - 4; c++) {
    score += scoreWindow([board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]], player);
  }
  // Vertical
  for (let c = 0; c < COLS; c++) for (let r = 0; r <= ROWS - 4; r++) {
    score += scoreWindow([board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]], player);
  }
  // Diagonal down-right
  for (let r = 0; r <= ROWS - 4; r++) for (let c = 0; c <= COLS - 4; c++) {
    score += scoreWindow([board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]], player);
  }
  // Diagonal up-right
  for (let r = 3; r < ROWS; r++) for (let c = 0; c <= COLS - 4; c++) {
    score += scoreWindow([board[r][c], board[r-1][c+1], board[r-2][c+2], board[r-3][c+3]], player);
  }
  return score;
}

// Column order: center-first for better pruning
const COL_ORDER = [3, 2, 4, 1, 5, 0, 6];

function minimax(
  board: Cell[][],
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean
): { score: number; col: number } {
  const aiWin = checkWin(board, 2);
  const playerWin = checkWin(board, 1);
  if (aiWin) return { score: 10000 + depth, col: -1 };
  if (playerWin) return { score: -10000 - depth, col: -1 };
  if (isFull(board) || depth === 0) return { score: heuristicScore(board, 2) - heuristicScore(board, 1), col: -1 };

  const validCols = COL_ORDER.filter((c) => board[0][c] === 0);
  let bestCol = validCols[0];

  if (maximizing) {
    let maxScore = -Infinity;
    for (const col of validCols) {
      const next = dropPiece(board, col, 2)!;
      const { score } = minimax(next, depth - 1, alpha, beta, false);
      if (score > maxScore) { maxScore = score; bestCol = col; }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break; // Prune
    }
    return { score: maxScore, col: bestCol };
  } else {
    let minScore = Infinity;
    for (const col of validCols) {
      const next = dropPiece(board, col, 1)!;
      const { score } = minimax(next, depth - 1, alpha, beta, true);
      if (score < minScore) { minScore = score; bestCol = col; }
      beta = Math.min(beta, score);
      if (beta <= alpha) break; // Prune
    }
    return { score: minScore, col: bestCol };
  }
}

function pickAIMove(board: Cell[][]): number {
  // Instant win check
  const validCols = COL_ORDER.filter((c) => board[0][c] === 0);
  for (const col of validCols) {
    const next = dropPiece(board, col, 2);
    if (next && checkWin(next, 2)) return col;
  }
  // Block player instant win
  for (const col of validCols) {
    const next = dropPiece(board, col, 1);
    if (next && checkWin(next, 1)) return col;
  }
  // Full alpha-beta minimax
  const { col } = minimax(board, MAX_DEPTH, -Infinity, Infinity, true);
  return col >= 0 ? col : validCols[0];
}

export function ConnectFour() {
  const [board, setBoard] = useState<Cell[][]>(emptyBoard());
  const [turn, setTurn] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<0 | 1 | 2>(0);
  const [draw, setDraw] = useState(false);
  const [thinking, setThinking] = useState(false);
  const { best: wins, submit: recordWin } = useBestScore('connect4-wins');

  const reset = useCallback(() => {
    setBoard(emptyBoard());
    setTurn(1);
    setWinner(0);
    setDraw(false);
    setThinking(false);
  }, []);

  const playerMove = (col: number) => {
    if (winner || draw || turn !== 1 || thinking) return;
    const next = dropPiece(board, col, 1);
    if (!next) return;
    setBoard(next);
    if (checkWin(next, 1)) { setWinner(1); recordWin(wins + 1); return; }
    if (isFull(next)) { setDraw(true); return; }
    setTurn(2);
  };

  useEffect(() => {
    if (turn !== 2 || winner || draw) return;
    setThinking(true);
    const timer = setTimeout(() => {
      const col = pickAIMove(board);
      const next = dropPiece(board, col, 2);
      if (next) {
        setBoard(next);
        if (checkWin(next, 2)) { Sounds.connect4Win(); setWinner(2); }
        else if (isFull(next)) setDraw(true);
        else setTurn(1);
      }
      setThinking(false);
    }, 420);
    return () => clearTimeout(timer);
  }, [turn, board, winner, draw]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-3 text-center">
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
          <div className="text-xs text-purple-200">Turn</div>
          <div className="text-2xl font-bold">{winner || draw ? '—' : turn === 1 ? '🔴 You' : '🟡 AI'}</div>
        </div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
          <div className="text-xs text-purple-200">Total Wins</div>
          <div className="text-2xl font-bold text-emerald-300">{wins}</div>
        </div>
        {thinking && (
          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
            <div className="text-xs text-purple-200">Status</div>
            <div className="text-sm font-bold text-yellow-300 animate-pulse">Thinking…</div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border-2 border-blue-700 bg-blue-800 p-2">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, 38px)` }}>
          {Array.from({ length: COLS }).map((_, c) => (
            <button
              key={`top-${c}`}
              onClick={() => playerMove(c)}
              disabled={!!winner || draw || turn !== 1 || thinking || board[0][c] !== 0}
              className="h-6 rounded-md bg-blue-900/40 text-xs text-blue-200 transition hover:bg-blue-900 disabled:opacity-30"
            >▼</button>
          ))}
          {board.flatMap((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-blue-900 ${
                  cell === 0 ? 'bg-blue-950' : cell === 1 ? 'bg-red-500' : 'bg-yellow-400'
                }`}
              />
            ))
          )}
        </div>
      </div>

      {(winner || draw) && (
        <div className="rounded-2xl border border-white/20 bg-white/10 px-8 py-4 text-center">
          <div className="mb-2 text-2xl font-bold">
            {winner === 1 ? '🏆 You win!' : winner === 2 ? '🤖 AI wins!' : '🤝 Draw!'}
          </div>
          <button onClick={reset} className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-2 font-bold text-white active:scale-95">
            Play Again
          </button>
        </div>
      )}
      <div className="text-xs text-purple-300">AI uses depth-7 alpha-beta minimax — good luck 😈</div>
    </div>
  );
}
