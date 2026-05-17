import { useEffect, useState } from 'react';
import { BgMusic, BgTrack, Sounds } from './utils/useSounds';
import { TetrisGame } from './components/TetrisGame';
import { MemoryMatch } from './components/MemoryMatch';
import { ReactionTime } from './components/ReactionTime';
import { WhackAMole } from './components/WhackAMole';
import { TriviaChallenge } from './components/TriviaChallenge';
import { RacingGame } from './components/RacingGame';
import { ShootingGame } from './components/ShootingGame';
import { ArcheryGame } from './components/ArcheryGame';
import { PuzzleGame } from './components/PuzzleGame';
import { TypingSpeed } from './components/TypingSpeed';
import { ColorMatch } from './components/ColorMatch';
import { MathBlitz } from './components/MathBlitz';
import { FlappyGame } from './components/FlappyGame';
import { BrickBreaker } from './components/BrickBreaker';
import { Game2048 } from './components/Game2048';
import { SimonGame } from './components/SimonGame';
import { DoodleBouncer } from './components/DoodleBouncer';
import { GridGobblers } from './components/GridGobblers';
import { PongGame } from './components/PongGame';
import { AsteroidDodger } from './components/AsteroidDodger';
import { CatchGame } from './components/CatchGame';
import { TowerStack } from './components/TowerStack';
import { MinesweeperGame } from './components/MinesweeperGame';
import { WordScramble } from './components/WordScramble';
import { RhythmTap } from './components/RhythmTap';
import { ConnectFour } from './components/ConnectFour';
import { TicTacToe } from './components/TicTacToe';
import { SlidingPuzzle } from './components/SlidingPuzzle';
import { LightsOut } from './components/LightsOut';
import { MemoryGrid } from './components/MemoryGrid';

type GameMode =
  | 'menu' | 'tetris' | 'memory' | 'reaction' | 'whack' | 'trivia' | 'racing' | 'shooting' | 'archery'
  | 'puzzle' | 'typing' | 'color' | 'math' | 'flappy' | 'bricks' | '2048' | 'simon'
  | 'catch' | 'tower' | 'mines' | 'scramble' | 'rhythm'
  | 'connect4' | 'ttt' | 'sliding' | 'lights' | 'mgrid'
  | 'doodle' | 'gobblers' | 'pong' | 'asteroid';

// Which background music track each game uses
const GAME_TRACK: Partial<Record<GameMode, BgTrack>> = {
  tetris:   'intense',
  memory:   'chill',
  reaction: 'arcade',
  whack:    'arcade',
  trivia:   'puzzle',
  racing:   'action',
  shooting: 'action',
  archery:  'chill',
  puzzle:   'puzzle',
  typing:   'arcade',
  color:    'puzzle',
  math:     'intense',
  flappy:   'arcade',
  bricks:   'arcade',
  '2048':   'chill',
  simon:    'puzzle',
  doodle:   'arcade',
  gobblers: 'intense',
  pong:     'intense',
  asteroid: 'action',
  catch:    'chill',
  tower:    'arcade',
  mines:    'puzzle',
  scramble: 'puzzle',
  rhythm:   'intense',
  connect4: 'intense',
  ttt:      'puzzle',
  sliding:  'chill',
  lights:   'chill',
  mgrid:    'puzzle',
  
};

const GAMES: Array<{ id: Exclude<GameMode, 'menu'>; name: string; emoji: string; description: string; color: string; shadowColor: string; difficulty: string; detail: string }> = [
  { id: 'tetris',   name: 'Tetris',           emoji: '🟦', description: 'The classic — stack pieces and clear lines!',       color: 'from-cyan-500 to-blue-600',     shadowColor: 'shadow-cyan-500/30',    difficulty: 'Hard',   detail: 'Auto-saves' },
  { id: 'memory',   name: 'Memory Match',     emoji: '🧠', description: 'Flip cards and find matching pairs!',               color: 'from-purple-500 to-indigo-600', shadowColor: 'shadow-purple-500/30',  difficulty: 'Easy',   detail: '16 cards' },
  { id: 'reaction', name: 'Reaction Time',    emoji: '⚡', description: 'Test your reflexes and speed!',                     color: 'from-blue-500 to-cyan-600',     shadowColor: 'shadow-blue-500/30',    difficulty: 'Easy',   detail: 'Speed test' },
  { id: 'whack',    name: 'Whack-a-Mole',     emoji: '🐹', description: 'Whack moles before they disappear!',               color: 'from-amber-500 to-orange-600',  shadowColor: 'shadow-amber-500/30',   difficulty: 'Medium', detail: '30 seconds' },
  { id: 'trivia',   name: 'Trivia Challenge', emoji: '📚', description: '160+ questions across many categories!',            color: 'from-emerald-500 to-teal-600',  shadowColor: 'shadow-emerald-500/30', difficulty: 'Hard',   detail: '15 questions' },
  { id: 'racing',   name: 'Street Racer',     emoji: '🏎️', description: 'Dodge traffic with smooth rising speed.',           color: 'from-red-500 to-rose-600',      shadowColor: 'shadow-red-500/30',     difficulty: 'Medium', detail: 'Arrow keys' },
  { id: 'shooting', name: 'Target Shooter',   emoji: '🎯', description: 'Click enemies, grab bonuses, avoid bombs!',        color: 'from-red-600 to-pink-600',      shadowColor: 'shadow-red-500/30',     difficulty: 'Medium', detail: '30 seconds' },
  { id: 'archery',  name: 'Archery Master',   emoji: '🏹', description: 'Aim, set power, and hit the bullseye!',            color: 'from-green-500 to-emerald-600', shadowColor: 'shadow-green-500/30',   difficulty: 'Hard',   detail: '5 arrows' },
  { id: 'puzzle',   name: 'Word Puzzle',      emoji: '🧩', description: 'Guess the word before running out of lives!',      color: 'from-indigo-500 to-violet-600', shadowColor: 'shadow-indigo-500/30',  difficulty: 'Medium', detail: '10 words' },
  { id: 'typing',   name: 'Speed Typist',     emoji: '⌨️', description: 'Type words as fast as you can!',                   color: 'from-cyan-500 to-blue-600',     shadowColor: 'shadow-cyan-500/30',    difficulty: 'Medium', detail: '60 seconds' },
  { id: 'color',    name: 'Color Match',      emoji: '🎨', description: 'Does the word color match its name?',              color: 'from-pink-500 to-rose-600',     shadowColor: 'shadow-pink-500/30',    difficulty: 'Hard',   detail: '30 seconds' },
  { id: 'math',     name: 'Math Blitz',       emoji: '🧮', description: 'Solve math problems against the clock!',           color: 'from-violet-500 to-fuchsia-600',shadowColor: 'shadow-violet-500/30',  difficulty: 'Hard',   detail: '60 seconds' },
  { id: 'flappy',   name: 'Flappy Dash',      emoji: '🐦', description: 'Tap through moving pipe gaps.',                   color: 'from-sky-500 to-cyan-600',      shadowColor: 'shadow-sky-500/30',     difficulty: 'Medium', detail: 'Space/tap' },
  { id: 'bricks',   name: 'Brick Breaker',    emoji: '🧱', description: 'Bounce the ball and clear the bricks.',           color: 'from-orange-500 to-red-600',    shadowColor: 'shadow-orange-500/30',  difficulty: 'Medium', detail: 'Paddle' },
  { id: '2048',     name: '2048',             emoji: '🔢', description: 'Merge tiles until the board locks.',              color: 'from-amber-500 to-yellow-600',  shadowColor: 'shadow-amber-500/30',   difficulty: 'Medium', detail: 'Sliding tiles' },
  { id: 'simon',    name: 'Simon Says',       emoji: '🟢', description: 'Memorize and repeat growing patterns.',           color: 'from-green-500 to-teal-600',    shadowColor: 'shadow-green-500/30',   difficulty: 'Medium', detail: 'Memory' },
  { id: 'doodle',   name: 'Doodle Bouncer',   emoji: '🐸', description: "Bounce up forever on platforms. Don't fall!",    color: 'from-lime-500 to-green-600',    shadowColor: 'shadow-lime-500/30',    difficulty: 'Medium', detail: 'Arrow keys' },
  { id: 'gobblers', name: 'Grid Gobblers',    emoji: '😋', description: 'Chomp pellets, eat power dots, dodge ghosts!',   color: 'from-yellow-500 to-orange-600', shadowColor: 'shadow-yellow-500/30',  difficulty: 'Hard',   detail: 'WASD / Arrows' },
  { id: 'pong',     name: 'Pong',             emoji: '🏓', description: 'Classic paddle vs AI. First to 7 wins!',         color: 'from-cyan-500 to-blue-600',     shadowColor: 'shadow-cyan-500/30',    difficulty: 'Medium', detail: 'Arrow keys' },
  { id: 'asteroid', name: 'Asteroid Dodger',  emoji: '🚀', description: 'Pilot through an asteroid field.',               color: 'from-slate-500 to-gray-700',    shadowColor: 'shadow-slate-500/30',   difficulty: 'Medium', detail: 'Survival' },
  { id: 'catch',    name: 'Fruit Catcher',    emoji: '🧺', description: 'Catch fruit and avoid falling bombs.',           color: 'from-amber-500 to-yellow-600',  shadowColor: 'shadow-yellow-500/30',  difficulty: 'Easy',   detail: '45 seconds' },
  { id: 'tower',    name: 'Tower Stack',      emoji: '🏗️', description: 'Stack blocks as the tower narrows.',             color: 'from-teal-500 to-cyan-600',     shadowColor: 'shadow-teal-500/30',    difficulty: 'Hard',   detail: 'Timing' },
  { id: 'mines',    name: 'Minesweeper',      emoji: '💣', description: 'Reveal safe tiles without hitting mines.',       color: 'from-slate-500 to-gray-700',    shadowColor: 'shadow-slate-500/30',   difficulty: 'Hard',   detail: '8x8 board' },
  { id: 'scramble', name: 'Word Scramble',    emoji: '🔤', description: 'Unscramble 100+ words with hints.',              color: 'from-blue-500 to-indigo-600',   shadowColor: 'shadow-blue-500/30',    difficulty: 'Medium', detail: '100+ words' },
  { id: 'rhythm',   name: 'Rhythm Tap',       emoji: '🎵', description: 'Hit falling notes on the beat line.',            color: 'from-fuchsia-500 to-pink-600',  shadowColor: 'shadow-fuchsia-500/30', difficulty: 'Hard',   detail: 'A S D F' },
  { id: 'connect4', name: 'Connect Four',     emoji: '🔴', description: 'Beat the AI by lining up four discs.',          color: 'from-red-500 to-yellow-500',    shadowColor: 'shadow-red-500/30',     difficulty: 'Hard',   detail: 'vs AI' },
  { id: 'ttt',      name: 'Tic-Tac-Toe',     emoji: '❌', description: 'Try to beat unbeatable minimax AI.',             color: 'from-pink-500 to-purple-600',   shadowColor: 'shadow-pink-500/30',    difficulty: 'Hard',   detail: 'vs AI' },
  { id: 'sliding',  name: '15 Puzzle',        emoji: '🔢', description: 'Slide numbered tiles into order.',               color: 'from-cyan-500 to-blue-600',     shadowColor: 'shadow-cyan-500/30',    difficulty: 'Hard',   detail: 'Auto-saves' },
  { id: 'lights',   name: 'Lights Out',       emoji: '💡', description: 'Turn off every light — clicks toggle neighbors.', color: 'from-yellow-500 to-amber-600',  shadowColor: 'shadow-yellow-500/30',  difficulty: 'Medium', detail: 'Levels' },
  { id: 'mgrid',    name: 'Memory Grid',      emoji: '🧠', description: 'Memorize lit tiles, then tap them back.',        color: 'from-purple-500 to-pink-600',   shadowColor: 'shadow-purple-500/30',  difficulty: 'Medium', detail: 'Pattern recall' },
  
];

export function App() {
  const [currentGame, setCurrentGame] = useState<GameMode>('menu');
  const [musicOn, setMusicOn] = useState(true);
  const game = GAMES.find((g) => g.id === currentGame);

  // Start/stop background music on game change
  useEffect(() => {
    if (musicOn) {
      if (currentGame === 'menu') {
        BgMusic.play('chill');
      } else {
        const track = GAME_TRACK[currentGame];
        if (track) BgMusic.play(track);
      }
    } else {
      BgMusic.stop();
    }
    return () => { BgMusic.stop(); };
  }, [currentGame, musicOn]);

  // Stop background music when the user 'exits' the app (tab hidden/page hidden).
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) BgMusic.stop();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const goToGame = (id: GameMode) => {
    Sounds.unlock(); // unlock audio context on first interaction
    Sounds.click();
    setCurrentGame(id);
  };

  const goToMenu = () => {
    Sounds.click();
    setCurrentGame('menu');
  };

  const toggleMusic = () => {
    if (musicOn) {
      BgMusic.stop();
      setMusicOn(false);
    } else {
      setMusicOn(true);
      const track = currentGame === 'menu' ? 'chill' : GAME_TRACK[currentGame];
      if (track) BgMusic.play(track as BgTrack);
    }
  };

  const renderGame = () => {
    switch (currentGame) {
      case 'tetris':   return <TetrisGame />;
      case 'memory':   return <MemoryMatch />;
      case 'reaction': return <ReactionTime />;
      case 'whack':    return <WhackAMole />;
      case 'trivia':   return <TriviaChallenge />;
      case 'racing':   return <RacingGame />;
      case 'shooting': return <ShootingGame />;
      case 'archery':  return <ArcheryGame />;
      case 'puzzle':   return <PuzzleGame />;
      case 'typing':   return <TypingSpeed />;
      case 'color':    return <ColorMatch />;
      case 'math':     return <MathBlitz />;
      case 'flappy':   return <FlappyGame />;
      case 'bricks':   return <BrickBreaker />;
      case '2048':     return <Game2048 />;
      case 'simon':    return <SimonGame />;
      case 'doodle':   return <DoodleBouncer />;
      case 'gobblers': return <GridGobblers />;
      case 'pong':     return <PongGame />;
      case 'asteroid': return <AsteroidDodger />;
      case 'catch':    return <CatchGame />;
      case 'tower':    return <TowerStack />;
      case 'mines':    return <MinesweeperGame />;
      case 'scramble': return <WordScramble />;
      case 'rhythm':   return <RhythmTap />;
      case 'connect4': return <ConnectFour />;
      case 'ttt':      return <TicTacToe />;
      case 'sliding':  return <SlidingPuzzle />;
      case 'lights':   return <LightsOut />;
      case 'mgrid':    return <MemoryGrid />;
      default: return null;
    }
  };

  if (currentGame === 'menu') {
    return (
      <div
        className="min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white"
        onClick={Sounds.unlock}
      >
        <div className="fixed top-4 right-4 z-30">
          <button
            onClick={toggleMusic}
            title={musicOn ? 'Mute music' : 'Unmute music'}
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-lg backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
          >
            {musicOn ? '🔊' : '🔇'}
          </button>
        </div>
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute left-10 top-20 h-72 w-72 animate-pulse rounded-full bg-purple-500/10 blur-3xl" />
          <div className="absolute bottom-20 right-10 h-96 w-96 animate-pulse rounded-full bg-blue-500/10 blur-3xl" style={{ animationDelay: '1s' }} />
          <div className="absolute left-1/2 top-1/2 h-80 w-80 animate-pulse rounded-full bg-pink-500/10 blur-3xl" style={{ animationDelay: '2s' }} />
        </div>
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-8">
          <div className="mb-10 pt-6 text-center">
            <div className="mb-4 animate-bounce text-7xl" style={{ animationDuration: '2s' }}>🎮</div>
            <h1 className="mb-3 bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-400 bg-clip-text text-5xl font-black text-transparent md:text-6xl">Parvaz Play</h1>
            <p className="mb-1 text-xl text-purple-200">Your ultimate mini-game arcade</p>
            <p className="text-purple-300/70">{GAMES.length} games • All best scores auto-save to your browser</p>
          </div>
          <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {GAMES.map((entry) => (
              <button
                key={entry.id}
                onClick={() => goToGame(entry.id as GameMode)}
                className={`group relative rounded-2xl border border-white/10 bg-white/5 p-5 text-left shadow-xl backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] hover:border-white/30 hover:bg-white/10 hover:shadow-2xl active:scale-[0.98] ${entry.shadowColor}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${entry.color} text-2xl shadow-lg transition-transform duration-300 group-hover:scale-110`}>{entry.emoji}</div>
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-0.5 text-lg font-bold text-white transition-colors group-hover:text-yellow-300">{entry.name}</h3>
                    <p className="mb-2 text-xs leading-relaxed text-purple-200">{entry.description}</p>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full bg-gradient-to-r ${entry.color} px-2 py-0.5 text-[10px] font-bold text-white`}>{entry.difficulty}</span>
                      <span className="text-[10px] text-purple-400">{entry.detail}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="pb-8 text-center text-sm text-purple-400/50">Made to cure boredom • Best scores saved automatically</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-10 top-20 h-72 w-72 animate-pulse rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute bottom-20 right-10 h-96 w-96 animate-pulse rounded-full bg-blue-500/10 blur-3xl" style={{ animationDelay: '1s' }} />
      </div>
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-6">
        <div className="fixed top-4 right-4 z-30">
          <button
            onClick={toggleMusic}
            title={musicOn ? 'Mute music' : 'Unmute music'}
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-lg backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
          >
            {musicOn ? '🔊' : '🔇'}
          </button>
        </div>
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={goToMenu}
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 font-semibold text-white shadow-lg backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
          >
            <span className="text-lg">←</span><span>Back to Menu</span>
          </button>
        </div>
        <div className="mb-6 text-center">
          <div className="mb-1 text-4xl">{game?.emoji}</div>
          <h2 className="bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-400 bg-clip-text text-3xl font-black text-transparent">{game?.name}</h2>
          <p className="mt-1 text-sm text-purple-300">{game?.description}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm md:p-8">
          {renderGame()}
        </div>
        <div className="py-6 text-center text-sm text-purple-400/40">Parvaz Play</div>
      </div>
    </div>
  );
}
