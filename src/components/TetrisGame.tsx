import { useCallback, useEffect, useRef, useState } from 'react';
import { Sounds } from '../utils/useSounds';
import { useAutosave, useBestScore } from '../utils/useBestScore';

const COLS = 10;
const ROWS = 20;

type Cell = number; // 0 = empty, 1..7 = piece color index

type Shape = number[][];

interface PieceDef {
  shape: Shape;
  color: number;
}

const PIECES: PieceDef[] = [
  // I
  { color: 1, shape: [[1, 1, 1, 1]] },
  // O
  { color: 2, shape: [[1, 1], [1, 1]] },
  // T
  { color: 3, shape: [[0, 1, 0], [1, 1, 1]] },
  // S
  { color: 4, shape: [[0, 1, 1], [1, 1, 0]] },
  // Z
  { color: 5, shape: [[1, 1, 0], [0, 1, 1]] },
  // J
  { color: 6, shape: [[1, 0, 0], [1, 1, 1]] },
  // L
  { color: 7, shape: [[0, 0, 1], [1, 1, 1]] },
];

const COLOR_CLASSES: Record<number, string> = {
  0: 'bg-slate-900/60',
  1: 'bg-cyan-400',
  2: 'bg-yellow-400',
  3: 'bg-purple-400',
  4: 'bg-green-400',
  5: 'bg-red-400',
  6: 'bg-blue-400',
  7: 'bg-orange-400',
};

interface ActivePiece {
  shape: Shape;
  color: number;
  row: number;
  col: number;
}

const emptyBoard = (): Cell[][] => Array.from({ length: ROWS }, () => Array(COLS).fill(0));

function rotateShape(shape: Shape): Shape {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated: Shape = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rotated[c][rows - 1 - r] = shape[r][c];
    }
  }
  return rotated;
}

function randomPiece(): ActivePiece {
  const def = PIECES[Math.floor(Math.random() * PIECES.length)];
  const shape = def.shape.map((row) => [...row]);
  return {
    shape,
    color: def.color,
    row: 0,
    col: Math.floor((COLS - shape[0].length) / 2),
  };
}

function collides(board: Cell[][], piece: ActivePiece, dRow = 0, dCol = 0, shape?: Shape): boolean {
  const useShape = shape || piece.shape;
  for (let r = 0; r < useShape.length; r++) {
    for (let c = 0; c < useShape[r].length; c++) {
      if (!useShape[r][c]) continue;
      const nr = piece.row + r + dRow;
      const nc = piece.col + c + dCol;
      if (nc < 0 || nc >= COLS || nr >= ROWS) return true;
      if (nr >= 0 && board[nr][nc]) return true;
    }
  }
  return false;
}

function mergePiece(board: Cell[][], piece: ActivePiece): Cell[][] {
  const next = board.map((row) => [...row]);
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const nr = piece.row + r;
      const nc = piece.col + c;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        next[nr][nc] = piece.color;
      }
    }
  }
  return next;
}

function clearLines(board: Cell[][]): { board: Cell[][]; lines: number } {
  const remaining = board.filter((row) => row.some((cell) => !cell));
  const cleared = ROWS - remaining.length;
  const fresh = Array.from({ length: cleared }, () => Array(COLS).fill(0));
  return { board: [...fresh, ...remaining], lines: cleared };
}

const LINE_POINTS = [0, 100, 300, 500, 800];

interface SavedState {
  board: Cell[][];
  piece: ActivePiece | null;
  next: ActivePiece | null;
  score: number;
  lines: number;
  level: number;
  paused: boolean;
}

const INITIAL_STATE: SavedState = {
  board: emptyBoard(),
  piece: null,
  next: null,
  score: 0,
  lines: 0,
  level: 1,
  paused: false,
};

export function TetrisGame() {
  const [saved, setSaved, clearSaved] = useAutosave<SavedState>('tetris', INITIAL_STATE);
  const { best, submit } = useBestScore('tetris');
  const [board, setBoard] = useState<Cell[][]>(saved.board);
  const [piece, setPiece] = useState<ActivePiece | null>(saved.piece);
  const [nextPiece, setNextPiece] = useState<ActivePiece | null>(saved.next);
  const [score, setScore] = useState(saved.score);
  const [lines, setLines] = useState(saved.lines);
  const [level, setLevel] = useState(saved.level);
  const [paused, setPaused] = useState(saved.paused);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(saved.piece !== null);

  // Mirror state to refs for the game loop / key handlers
  const boardRef = useRef(board);
  const pieceRef = useRef<ActivePiece | null>(piece);
  const nextRef = useRef<ActivePiece | null>(nextPiece);
  const scoreRef = useRef(score);
  const linesRef = useRef(lines);
  const levelRef = useRef(level);
  const pausedRef = useRef(paused);
  const gameOverRef = useRef(false);
  const dropTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { pieceRef.current = piece; }, [piece]);
  useEffect(() => { nextRef.current = nextPiece; }, [nextPiece]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { linesRef.current = lines; }, [lines]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // Autosave whenever core state changes
  useEffect(() => {
    if (gameOverRef.current) return;
    setSaved({
      board,
      piece,
      next: nextPiece,
      score,
      lines,
      level,
      paused,
    });
  }, [board, piece, nextPiece, score, lines, level, paused, setSaved]);

  const dropSpeed = useCallback(() => Math.max(90, 700 - (levelRef.current - 1) * 60), []);

  const spawnNext = useCallback(() => {
    const incoming = nextRef.current || randomPiece();
    const upcoming = randomPiece();
    if (collides(boardRef.current, incoming)) {
      gameOverRef.current = true;
      setGameOver(true);
      submit(scoreRef.current);
      clearSaved();
      return;
    }
    setPiece(incoming);
    setNextPiece(upcoming);
  }, [clearSaved, submit]);

  const startGame = useCallback(() => {
    const fresh = emptyBoard();
    boardRef.current = fresh;
    nextRef.current = randomPiece();
    scoreRef.current = 0;
    linesRef.current = 0;
    levelRef.current = 1;
    pausedRef.current = false;
    gameOverRef.current = false;
    setBoard(fresh);
    setScore(0);
    setLines(0);
    setLevel(1);
    setPaused(false);
    setGameOver(false);
    setStarted(true);
    setNextPiece(randomPiece());
    setPiece(null);
    // spawn after state is wired
    setTimeout(() => spawnNext(), 0);
  }, [spawnNext]);

  const lockPiece = useCallback((current: ActivePiece) => {
    const merged = mergePiece(boardRef.current, current);
    const { board: cleared, lines: clearedLines } = clearLines(merged);
    boardRef.current = cleared;
    setBoard(cleared);
    if (clearedLines > 0) {
      const gained = LINE_POINTS[clearedLines] * levelRef.current; if (clearedLines === 4) Sounds.tetrisTetris(); else if (clearedLines > 0) Sounds.tetrisLine();
      const newLines = linesRef.current + clearedLines;
      const newLevel = Math.floor(newLines / 10) + 1;
      const newScore = scoreRef.current + gained;
      scoreRef.current = newScore;
      linesRef.current = newLines;
      levelRef.current = newLevel;
      setScore(newScore);
      setLines(newLines);
      setLevel(newLevel);
    }
    spawnNext(); Sounds.tetrisPlace();
  }, [spawnNext]);

  const tick = useCallback(() => {
    if (pausedRef.current || gameOverRef.current) return;
    const current = pieceRef.current;
    if (!current) return;
    if (!collides(boardRef.current, current, 1, 0)) {
      const moved = { ...current, row: current.row + 1 };
      pieceRef.current = moved;
      setPiece(moved);
    } else {
      lockPiece(current);
    }
  }, [lockPiece]);

  // Drop loop with level-based interval
  useEffect(() => {
    if (!started || gameOver) return;
    if (dropTimerRef.current) clearInterval(dropTimerRef.current);
    dropTimerRef.current = setInterval(tick, dropSpeed());
    return () => {
      if (dropTimerRef.current) clearInterval(dropTimerRef.current);
    };
  }, [started, gameOver, level, tick, dropSpeed]);

  const tryMove = useCallback((dCol: number) => {
    const current = pieceRef.current;
    if (!current || pausedRef.current || gameOverRef.current) return;
    if (!collides(boardRef.current, current, 0, dCol)) { Sounds.tetrisMove();
      const moved = { ...current, col: current.col + dCol };
      pieceRef.current = moved;
      setPiece(moved);
    }
  }, []);

  const tryRotate = useCallback(() => {
    const current = pieceRef.current;
    if (!current || pausedRef.current || gameOverRef.current) return;
    const rotated = rotateShape(current.shape); Sounds.tetrisRotate();
    // wall kicks: try shifts -1, +1, -2, +2
    const offsets = [0, -1, 1, -2, 2];
    for (const offset of offsets) {
      if (!collides(boardRef.current, current, 0, offset, rotated)) {
        const moved = { ...current, shape: rotated, col: current.col + offset };
        pieceRef.current = moved;
        setPiece(moved);
        return;
      }
    }
  }, []);

  const softDrop = useCallback(() => {
    tick();
  }, [tick]);

  const hardDrop = useCallback(() => {
    const current = pieceRef.current;
    if (!current || pausedRef.current || gameOverRef.current) return;
    let drop = 0;
    while (!collides(boardRef.current, current, drop + 1, 0)) drop++;
    const final = { ...current, row: current.row + drop };
    pieceRef.current = final;
    scoreRef.current += drop * 2; Sounds.tetrisHardDrop();
    setScore(scoreRef.current);
    lockPiece(final);
  }, [lockPiece]);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!started || gameOver) return;
      if (e.key === 'p' || e.key === 'P') {
        setPaused((p) => !p);
        return;
      }
      if (paused) return;
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          tryMove(-1);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          tryMove(1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          softDrop();
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
        case 'x':
        case 'X':
          e.preventDefault();
          tryRotate();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started, gameOver, paused, tryMove, softDrop, tryRotate, hardDrop]);

  // Build display board with current piece overlay
  const displayBoard = board.map((row) => [...row]);
  if (piece) {
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (!piece.shape[r][c]) continue;
        const nr = piece.row + r;
        const nc = piece.col + c;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          displayBoard[nr][nc] = piece.color;
        }
      }
    }
  }

  const hasResume = started && !gameOver;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-3 text-center">
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs uppercase text-purple-200">Score</div><div className="text-2xl font-bold text-yellow-300">{score}</div></div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs uppercase text-purple-200">Lines</div><div className="text-2xl font-bold text-cyan-300">{lines}</div></div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs uppercase text-purple-200">Level</div><div className="text-2xl font-bold text-green-300">{level}</div></div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs uppercase text-purple-200">Best</div><div className="text-2xl font-bold text-emerald-300">{best}</div></div>
      </div>

      {!started && !gameOver && (
        <div className="rounded-2xl border border-white/20 bg-white/10 px-8 py-12 text-center">
          <div className="mb-4 text-6xl">🟦</div>
          <div className="mb-2 text-2xl font-bold text-white">Tetris</div>
          <div className="mb-1 text-purple-200">Stack falling pieces, clear full rows.</div>
          <div className="mb-6 text-sm text-purple-300">← → move • ↑ rotate • ↓ soft drop • Space hard drop • P pause</div>
          <button onClick={startGame} className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3 text-lg font-bold text-white shadow-lg active:scale-95">
            {hasResume ? '▶️ New Game' : '🟦 Start Tetris'}
          </button>
        </div>
      )}

      {started && (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div
            className="grid gap-[2px] rounded-xl border-2 border-white/20 bg-slate-950 p-2"
            style={{ gridTemplateColumns: `repeat(${COLS}, 22px)` }}
          >
            {displayBoard.flatMap((row, r) =>
              row.map((cell, c) => (
                <div key={`${r}-${c}`} className={`h-[22px] w-[22px] rounded-sm ${COLOR_CLASSES[cell]}`} />
              ))
            )}
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="rounded-xl border border-white/20 bg-white/10 p-3">
              <div className="mb-2 text-center text-xs uppercase text-purple-200">Next</div>
              <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${nextPiece?.shape[0].length || 4}, 16px)` }}>
                {nextPiece?.shape.flatMap((row, r) =>
                  row.map((cell, c) => (
                    <div key={`${r}-${c}`} className={`h-4 w-4 rounded-sm ${cell ? COLOR_CLASSES[nextPiece.color] : 'bg-transparent'}`} />
                  ))
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPaused((p) => !p)} className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white active:scale-95">{paused ? '▶️' : '⏸️'}</button>
              <button onClick={startGame} className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white active:scale-95">🔄</button>
            </div>
            <div className="grid w-44 grid-cols-3 gap-2">
              <div />
              <button onClick={tryRotate} className="rounded-lg bg-white/10 py-2 text-white active:scale-95">⤴</button>
              <div />
              <button onClick={() => tryMove(-1)} className="rounded-lg bg-white/10 py-2 text-white active:scale-95">←</button>
              <button onClick={softDrop} className="rounded-lg bg-white/10 py-2 text-white active:scale-95">↓</button>
              <button onClick={() => tryMove(1)} className="rounded-lg bg-white/10 py-2 text-white active:scale-95">→</button>
              <div />
              <button onClick={hardDrop} className="rounded-lg bg-purple-500/60 py-2 text-sm font-bold text-white active:scale-95">DROP</button>
              <div />
            </div>
          </div>
        </div>
      )}

      {paused && started && !gameOver && (
        <div className="rounded-xl border border-yellow-400/40 bg-yellow-500/20 px-6 py-3 text-yellow-200">⏸️ Paused — press P or tap ▶️</div>
      )}

      {gameOver && (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/20 px-8 py-6 text-center">
          <div className="mb-2 text-4xl">💥</div>
          <div className="mb-1 text-2xl font-bold text-red-300">Game Over!</div>
          <div className="mb-4 text-3xl font-bold text-white">{score} points</div>
          <button onClick={startGame} className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3 font-bold text-white shadow-lg active:scale-95">
            🔄 Play Again
          </button>
        </div>
      )}
    </div>
  );
}
