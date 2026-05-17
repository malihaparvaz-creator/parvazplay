import { useCallback, useEffect, useRef, useState } from 'react';
import { Sounds } from '../utils/useSounds';
import { usePersistedNumber } from '../utils/useBestScore';

const COLS = 19;
const ROWS = 21;
const CELL = 18;

// 0=wall, 1=pellet, 2=empty, 3=power, 4=ghost house
const MAZE: number[][] = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0],
  [0,3,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,3,0],
  [0,1,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,1,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0],
  [0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,0],
  [0,0,0,0,1,0,0,0,2,0,2,0,0,0,1,0,0,0,0],
  [2,2,2,0,1,0,2,2,2,2,2,2,2,0,1,0,2,2,2],
  [0,0,0,0,1,0,2,0,0,4,0,0,2,0,1,0,0,0,0],
  [2,2,2,2,1,2,2,0,4,4,4,0,2,2,1,2,2,2,2],
  [0,0,0,0,1,0,2,0,0,0,0,0,2,0,1,0,0,0,0],
  [2,2,2,0,1,0,2,2,2,2,2,2,2,0,1,0,2,2,2],
  [0,0,0,0,1,0,2,0,0,0,0,0,2,0,1,0,0,0,0],
  [0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0],
  [0,1,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,1,0],
  [0,3,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,3,0],
  [0,0,1,0,1,0,1,0,0,0,0,0,1,0,1,0,1,0,0],
  [0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,0],
  [0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// Ghost personality types
type GhostMode = 'chase' | 'random' | 'ambush' | 'scatter';

interface Ghost {
  id: number;
  r: number;
  c: number;
  color: string;
  dir: [number, number];
  scared: boolean;
  scaredTimer: number;
  dead: boolean;
  house: boolean;
  mode: GhostMode;
  scatterTarget: [number, number]; // corner to scatter to
  randomTimer: number; // for random ghost direction changes
}

const GHOST_COLORS = ['#ef4444', '#06b6d4', '#f59e0b', '#ec4899'];
const DIRS: [number, number][] = [[-1,0],[1,0],[0,-1],[0,1]];

function cloneMaze(): number[][] {
  return MAZE.map((row) => [...row]);
}

function dist(a: [number, number], b: [number, number]): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function isPassable(maze: number[][], r: number, c: number): boolean {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
  return maze[r][c] !== 0;
}

function moveGhost(g: Ghost, maze: number[][], playerR: number, playerC: number): Ghost {
  if (g.dead) {
    // Return to house — always chase house center
    const target: [number, number] = [9, 9];
    const validDirs = DIRS.filter(([dr, dc]) => isPassable(maze, g.r + dr, g.c + dc));
    const best = validDirs.sort((a, b) =>
      dist([g.r + a[0], g.c + a[1]], target) - dist([g.r + b[0], g.c + b[1]], target)
    )[0];
    if (!best) return g;
    const nr = g.r + best[0];
    const nc = g.c + best[1];
    if (nr === 9 && nc === 9) return { ...g, r: nr, c: nc, dead: false, house: true, scared: false };
    return { ...g, r: nr, c: nc, dir: best };
  }

  // Scared: flee toward opposite corner of player
  if (g.scared) {
    const fleeTarget: [number, number] = [ROWS - 1 - playerR, COLS - 1 - playerC];
    const validDirs = DIRS.filter(([dr, dc]) => {
      if (!isPassable(maze, g.r + dr, g.c + dc)) return false;
      if (g.dir[0] === -dr && g.dir[1] === -dc) return false; // no reverse
      return true;
    });
    if (validDirs.length === 0) {
      // allow reverse
      const rev = DIRS.filter(([dr, dc]) => isPassable(maze, g.r + dr, g.c + dc));
      if (rev.length === 0) return g;
      const pick = rev[Math.floor(Math.random() * rev.length)];
      return { ...g, r: g.r + pick[0], c: g.c + pick[1], dir: pick };
    }
    // Mostly flee but 25% random to avoid getting stuck
    let pick: [number, number];
    if (Math.random() < 0.25) {
      pick = validDirs[Math.floor(Math.random() * validDirs.length)];
    } else {
      pick = validDirs.sort((a, b) =>
        dist([g.r + b[0], g.c + b[1]], fleeTarget) - dist([g.r + a[0], g.c + a[1]], fleeTarget)
      )[0];
    }
    return { ...g, r: g.r + pick[0], c: g.c + pick[1], dir: pick };
  }

  // Normal movement — each ghost has its own personality
  let target: [number, number];

  switch (g.mode) {
    case 'chase':
      // Directly chases the player
      target = [playerR, playerC];
      break;

    case 'ambush':
      // Targets 4 tiles ahead of player's current position (predict)
      target = [
        Math.max(0, Math.min(ROWS - 1, playerR + g.dir[0] * 4)),
        Math.max(0, Math.min(COLS - 1, playerC + g.dir[1] * 4)),
      ];
      break;

    case 'scatter':
      // Patrols its assigned corner, ignores player
      target = g.scatterTarget;
      break;

    case 'random':
      // Mostly random direction — only loosely targets player
      target = [playerR, playerC];
      break;
  }

  const validDirs = DIRS.filter(([dr, dc]) => {
    if (!isPassable(maze, g.r + dr, g.c + dc)) return false;
    if (g.dir[0] === -dr && g.dir[1] === -dc) return false; // no 180 turn
    return true;
  });

  if (validDirs.length === 0) {
    const rev = DIRS.filter(([dr, dc]) => isPassable(maze, g.r + dr, g.c + dc));
    if (rev.length === 0) return g;
    const pick = rev[Math.floor(Math.random() * rev.length)];
    return { ...g, r: g.r + pick[0], c: g.c + pick[1], dir: pick };
  }

  let pick: [number, number];

  if (g.mode === 'random') {
    // 60% random, 40% toward player
    if (Math.random() < 0.6) {
      pick = validDirs[Math.floor(Math.random() * validDirs.length)];
    } else {
      pick = validDirs.sort((a, b) =>
        dist([g.r + a[0], g.c + a[1]], target) - dist([g.r + b[0], g.c + b[1]], target)
      )[0];
    }
  } else if (g.mode === 'scatter') {
    // At scatter corner, go random; otherwise aim for corner
    if (dist([g.r, g.c], g.scatterTarget) < 3) {
      pick = validDirs[Math.floor(Math.random() * validDirs.length)];
    } else {
      pick = validDirs.sort((a, b) =>
        dist([g.r + a[0], g.c + a[1]], target) - dist([g.r + b[0], g.c + b[1]], target)
      )[0];
    }
  } else {
    // chase / ambush: always pick best direction toward target
    pick = validDirs.sort((a, b) =>
      dist([g.r + a[0], g.c + a[1]], target) - dist([g.r + b[0], g.c + b[1]], target)
    )[0];
  }

  return { ...g, r: g.r + pick[0], c: g.c + pick[1], dir: pick };
}

export function GridGobblers() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [maze, setMaze] = useState(cloneMaze());
  const [player, setPlayer] = useState<[number, number]>([15, 9]);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [best, setBest] = usePersistedNumber('gobblers-best', 0);
  const [powerMode, setPowerMode] = useState(false);
  const [powerTimer, setPowerTimer] = useState(0);

  const mazeRef = useRef(cloneMaze());
  const playerRef = useRef<[number, number]>([15, 9]);
  const ghostsRef = useRef<Ghost[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const powerRef = useRef(false);
  const powerTimerRef = useRef(0);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);

  const makeGhosts = (): Ghost[] => [
    // Red: chaser — relentlessly follows player
    { id: 0, r: 9, c: 8, color: GHOST_COLORS[0], dir: [0, 1], scared: false, scaredTimer: 0, dead: false, house: true, mode: 'chase', scatterTarget: [1, 17], randomTimer: 0 },
    // Cyan: ambusher — targets ahead of player
    { id: 1, r: 9, c: 9, color: GHOST_COLORS[1], dir: [0, -1], scared: false, scaredTimer: 0, dead: false, house: true, mode: 'ambush', scatterTarget: [1, 1], randomTimer: 0 },
    // Orange: random — chaotic, barely tracks player
    { id: 2, r: 10, c: 8, color: GHOST_COLORS[2], dir: [1, 0], scared: false, scaredTimer: 0, dead: false, house: true, mode: 'random', scatterTarget: [19, 1], randomTimer: 0 },
    // Pink: scatter — patrols corners, doesn't hunt
    { id: 3, r: 10, c: 10, color: GHOST_COLORS[3], dir: [-1, 0], scared: false, scaredTimer: 0, dead: false, house: true, mode: 'scatter', scatterTarget: [19, 17], randomTimer: 0 },
  ];

  const startGame = useCallback(() => {
    const fresh = cloneMaze();
    mazeRef.current = fresh;
    playerRef.current = [15, 9];
    scoreRef.current = 0;
    livesRef.current = 3;
    powerRef.current = false;
    powerTimerRef.current = 0;
    const initialGhosts = makeGhosts();
    ghostsRef.current = initialGhosts;
    setMaze(fresh);
    setPlayer([15, 9]);
    setGhosts(initialGhosts);
    setScore(0);
    setLives(3);
    setPowerMode(false);
    setPowerTimer(0);
    setGameState('playing');
  }, []);

  const movePlayer = useCallback((dr: number, dc: number) => {
    if (gameState !== 'playing') return;
    const [r, c] = playerRef.current;
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;
    if (mazeRef.current[nr][nc] === 0) return;

    if (mazeRef.current[nr][nc] === 1) {
      mazeRef.current[nr][nc] = 2;
      scoreRef.current += 10;
    }
    if (mazeRef.current[nr][nc] === 3) {
      mazeRef.current[nr][nc] = 2;
      scoreRef.current += 50; Sounds.powerPellet();
      powerRef.current = true;
      powerTimerRef.current = 600;
      ghostsRef.current = ghostsRef.current.map((g) => ({ ...g, scared: !g.dead }));
    }

    playerRef.current = [nr, nc];
    setPlayer([nr, nc]);
    setMaze(mazeRef.current.map((row) => [...row]));
    setScore(scoreRef.current);
  }, [gameState]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, [number, number]> = {
        ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
        w: [-1, 0], s: [1, 0], a: [0, -1], d: [0, 1],
      };
      const dir = map[e.key];
      if (dir) { e.preventDefault(); movePlayer(dir[0], dir[1]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [movePlayer]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const loop = (time: number) => {
      const dt = Math.min(34, time - lastTimeRef.current);
      lastTimeRef.current = time;
      const step = dt / 16.67;

      if (powerRef.current) {
        powerTimerRef.current -= step;
        if (powerTimerRef.current <= 0) {
          powerRef.current = false;
          ghostsRef.current = ghostsRef.current.map((g) => ({ ...g, scared: false }));
        }
      }

      // Ghosts move at different speeds based on personality
      const tickRate = 5;
      if (Math.random() < tickRate * step / 60) {
        const [pr, pc] = playerRef.current;
        ghostsRef.current = ghostsRef.current.map((g) => {
          // Stagger ghosts out of house one by one
          if (g.house) {
            if (g.id === 0 && time > 1500) return { ...g, house: false };
            if (g.id === 1 && time > 3000) return { ...g, house: false };
            if (g.id === 2 && time > 5000) return { ...g, house: false };
            if (g.id === 3 && time > 7000) return { ...g, house: false };
            return g;
          }
          return moveGhost(g, mazeRef.current, pr, pc);
        });
      }

      // Collision
      const [pr, pc] = playerRef.current;
      let hitGhost = false;
      ghostsRef.current = ghostsRef.current.map((g) => {
        if (g.house) return g;
        if (g.r === pr && g.c === pc) {
          if (g.scared && !g.dead) {
            scoreRef.current += 200;
            Sounds.eatGhost(); return { ...g, dead: true, scared: false };
          } else if (!g.dead) {
            hitGhost = true;
          }
        }
        return g;
      });

      if (hitGhost) {
        livesRef.current -= 1; Sounds.ghostKill();
        if (livesRef.current <= 0) {
          setBest((prev) => Math.max(prev, scoreRef.current));
          setGameState('ended');
          return;
        }
        playerRef.current = [15, 9];
        ghostsRef.current = makeGhosts();
        powerRef.current = false;
        powerTimerRef.current = 0;
        setPlayer([15, 9]);
        setLives(livesRef.current);
        setPowerMode(false);
      }

      const pelletsLeft = mazeRef.current.flat().filter((v) => v === 1 || v === 3).length;
      if (pelletsLeft === 0) {
        scoreRef.current += 1000;
        setBest((prev) => Math.max(prev, scoreRef.current));
        setGameState('ended');
        return;
      }

      setGhosts(ghostsRef.current.map((g) => ({ ...g })));
      setScore(scoreRef.current);
      setPowerMode(powerRef.current);
      setPowerTimer(powerTimerRef.current);

      frameRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [gameState, setBest]);

  const pelletsLeft = maze.flat().filter((v) => v === 1 || v === 3).length;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-3 text-center">
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
          <div className="text-xs text-purple-200">Score</div>
          <div className="text-2xl font-bold text-yellow-300">{score}</div>
        </div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
          <div className="text-xs text-purple-200">Lives</div>
          <div className="text-2xl">{'❤️'.repeat(lives)}</div>
        </div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
          <div className="text-xs text-purple-200">Pellets</div>
          <div className="text-2xl font-bold text-cyan-300">{pelletsLeft}</div>
        </div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
          <div className="text-xs text-purple-200">Best</div>
          <div className="text-2xl font-bold text-emerald-300">{best}</div>
        </div>
      </div>

      {gameState === 'idle' && (
        <div className="rounded-2xl border border-white/20 bg-white/10 px-8 py-10 text-center">
          <div className="mb-4 text-6xl">😋</div>
          <div className="mb-2 text-2xl font-bold text-white">Grid Gobblers</div>
          <div className="mb-4 text-purple-200">Chomp all pellets. Eat power dots to scare ghosts.</div>
          <div className="mb-6 grid grid-cols-2 gap-2 text-xs">
            <span className="rounded bg-red-500/20 px-2 py-1 text-red-300">🔴 Chaser — hunts you</span>
            <span className="rounded bg-cyan-500/20 px-2 py-1 text-cyan-300">🔵 Ambusher — cuts you off</span>
            <span className="rounded bg-yellow-500/20 px-2 py-1 text-yellow-300">🟡 Random — chaotic</span>
            <span className="rounded bg-pink-500/20 px-2 py-1 text-pink-300">🩷 Patrol — corners only</span>
          </div>
          <button onClick={startGame} className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-600 px-8 py-3 text-lg font-bold text-white shadow-lg active:scale-95">
            😋 Start Chomping
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="flex flex-col items-center gap-2">
          {powerMode && (
            <div className="animate-pulse rounded-full bg-blue-500/30 px-4 py-1 text-sm font-bold text-blue-200">
              👻 Power Mode! {Math.ceil(powerTimer / 60)}s
            </div>
          )}
          <div
            className="grid gap-[1px] rounded-xl border-2 border-white/20 bg-slate-950 p-1"
            style={{ gridTemplateColumns: `repeat(${COLS}, ${CELL}px)` }}
          >
            {maze.map((row, r) =>
              row.map((cell, c) => {
                const isPlayer = player[0] === r && player[1] === c;
                const ghost = ghosts.find((g) => g.r === r && g.c === c && !g.dead && !g.house);
                const isGhostHouse = MAZE[r][c] === 4;
                return (
                  <div
                    key={`${r}-${c}`}
                    className={`flex items-center justify-center rounded-sm ${cell === 0 ? 'bg-slate-800' : 'bg-slate-900'}`}
                    style={{ width: CELL, height: CELL }}
                  >
                    {isPlayer && <span className="text-sm">😋</span>}
                    {ghost && !isPlayer && (
                      <span className="text-sm" style={{ filter: ghost.scared ? 'hue-rotate(180deg)' : 'none' }}>
                        {ghost.scared ? '🥶' : '👻'}
                      </span>
                    )}
                    {!isPlayer && !ghost && cell === 1 && <div className="h-1.5 w-1.5 rounded-full bg-yellow-300" />}
                    {!isPlayer && !ghost && cell === 3 && <div className="h-3 w-3 animate-pulse rounded-full bg-blue-400" />}
                    {!isPlayer && !ghost && isGhostHouse && <div className="h-1 w-1 rounded-full bg-slate-700" />}
                  </div>
                );
              })
            )}
          </div>
          <div className="grid w-44 grid-cols-3 gap-2">
            <div />
            <button onClick={() => movePlayer(-1, 0)} className="rounded-lg bg-white/10 py-2 text-white active:scale-95">↑</button>
            <div />
            <button onClick={() => movePlayer(0, -1)} className="rounded-lg bg-white/10 py-2 text-white active:scale-95">←</button>
            <button onClick={() => movePlayer(1, 0)} className="rounded-lg bg-white/10 py-2 text-white active:scale-95">↓</button>
            <button onClick={() => movePlayer(0, 1)} className="rounded-lg bg-white/10 py-2 text-white active:scale-95">→</button>
          </div>
        </div>
      )}

      {gameState === 'ended' && (
        <div className="rounded-2xl border border-yellow-400/40 bg-yellow-500/20 px-8 py-6 text-center">
          <div className="mb-2 text-4xl">{pelletsLeft === 0 ? '🏆' : '💀'}</div>
          <div className="mb-1 text-2xl font-bold text-yellow-300">{pelletsLeft === 0 ? 'Cleared!' : 'Game Over!'}</div>
          <div className="mb-4 text-3xl font-bold text-white">{score} points</div>
          <button onClick={startGame} className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-600 px-8 py-3 font-bold text-white shadow-lg active:scale-95">
            🔄 Chomp Again
          </button>
        </div>
      )}
    </div>
  );
}