import React, { useEffect, useRef, useState } from 'react';
import { Arena, type DiagnosticsData } from '../game/Arena';
import type { Difficulty, GameState, Side } from '../game/logic';

const PENS = [
  {
    name: 'Chalkline 07',
    color: '#c83f2d',
    detail: 'Vermilion · lacquered wood',
    desc: 'Lightweight & nimble with sharp recovery.',
  },
  {
    name: 'Blue Note',
    color: '#1d4f7c',
    detail: 'Navy · brushed steel',
    desc: 'Balanced weight with reliable straight-line stability.',
  },
  {
    name: 'Gold Star',
    color: '#cfa23c',
    detail: 'Ochre · warm brass',
    desc: 'Heavy brass body delivering punishing collisions.',
  },
];

// Clean vector icons
const Icons = {
  Play: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  SoundOn: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  ),
  SoundOff: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  ),
  Restart: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  ),
  Menu: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Pause: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  ),
  Close: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Pen: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  ),
  Trophy: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34" />
      <path d="M6 4h12v7a6 6 0 0 1-12 0V4z" />
    </svg>
  ),
};

export default function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Arena | null>(null);

  const [screen, setScreen] = useState<'menu' | 'game' | 'pen' | 'settings' | 'tutorial'>('menu');
  const [turn, setTurn] = useState<Side>('player');
  const [gameState, setGameState] = useState<GameState>('READY');
  const [difficulty, setDifficulty] = useState<Difficulty>('Normal');
  const [selectedPen, setSelectedPen] = useState(0);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [result, setResult] = useState<Side | 'draw' | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(65);
  const [tutorialDone, setTutorialDone] = useState(() => localStorage.getItem('bb-tutorial-v2') === 'done');
  const [arenaError, setArenaError] = useState('');

  // Diagnostic mode
  const [showDebug, setShowDebug] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('debug') === '1';
    }
    return false;
  });
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);

  useEffect(() => {
    let alive = true;
    const arena = new Arena(hostRef.current!, {
      onTurn: (side) => {
        setTurn(side);
      },
      onStateChange: (state) => {
        setGameState(state);
      },
      onResult: (winner) => {
        setResult(winner);
        setScore((prev) => {
          if (winner === 'player') return [prev[0] + 1, prev[1]];
          if (winner === 'opponent') return [prev[0], prev[1] + 1];
          return prev;
        });
      },
    });

    gameRef.current = arena;
    arena.mute = muted;
    arena.volume = volume / 100;

    arena.init().catch((err) => {
      if (alive) {
        setArenaError(err instanceof Error ? err.message : 'Renderer initialization failed');
      }
    });

    return () => {
      alive = false;
      arena.destroy();
      gameRef.current = null;
    };
  }, []);

  // Sync mute and volume
  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.mute = muted;
      gameRef.current.volume = volume / 100;
    }
  }, [muted, volume]);

  // Diagnostics interval when enabled
  useEffect(() => {
    if (!showDebug) return;
    const interval = setInterval(() => {
      if (gameRef.current) {
        setDiagnostics(gameRef.current.getDiagnostics());
      }
    }, 120);
    return () => clearInterval(interval);
  }, [showDebug]);

  // Global hotkeys (ESC for pause, D for debug diagnostics)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && screen === 'game' && !result) {
        togglePause();
      }
      if (e.key === 'd' || e.key === 'D') {
        if (e.ctrlKey || e.altKey) {
          setShowDebug((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, result, isPaused]);

  const begin = () => {
    setResult(null);
    setIsPaused(false);
    setScore([0, 0]);
    if (!tutorialDone) {
      setScreen('tutorial');
    } else {
      setScreen('game');
      gameRef.current?.start([0, 0], difficulty, selectedPen);
    }
  };

  const completeTutorial = () => {
    setTutorialDone(true);
    localStorage.setItem('bb-tutorial-v2', 'done');
    setScreen('game');
    gameRef.current?.start(score, difficulty, selectedPen);
  };

  const nextRound = () => {
    setResult(null);
    setIsPaused(false);
    gameRef.current?.start(score, difficulty, selectedPen);
  };

  const restartMatch = () => {
    setResult(null);
    setIsPaused(false);
    setScore([0, 0]);
    gameRef.current?.start([0, 0], difficulty, selectedPen);
  };

  const togglePause = () => {
    if (!gameRef.current) return;
    if (isPaused) {
      gameRef.current.resume();
      setIsPaused(false);
    } else {
      gameRef.current.pause();
      setIsPaused(true);
    }
  };

  const matchWinner = score[0] >= 3 ? 'player' : score[1] >= 3 ? 'opponent' : null;

  return (
    <main className="app">
      {/* Pixi Canvas Arena */}
      <div className="arena" ref={hostRef} />

      {arenaError && (
        <div className="arena-error">
          <strong>Renderer Error:</strong> {arenaError}
        </div>
      )}

      {/* Top Bar */}
      <header className="topbar">
        <button
          className="wordmark"
          onClick={() => {
            setScreen('menu');
            setResult(null);
          }}
        >
          BACK<br />BENCHERS
          <span className="edition-badge">T-21</span>
        </button>

        <div className="arena-label">
          <span>CLASSROOM ARENA</span>
          <strong>TABLE NO. 21</strong>
        </div>

        <div className="topbar-actions">
          <button
            aria-label={muted ? 'Unmute' : 'Mute'}
            className="iconbtn"
            onClick={() => setMuted(!muted)}
            title="Toggle Sound"
          >
            {muted ? <Icons.SoundOff /> : <Icons.SoundOn />}
          </button>

          {screen === 'game' && !result && (
            <button
              aria-label={isPaused ? 'Resume Game' : 'Pause Game'}
              className="iconbtn"
              onClick={togglePause}
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Icons.Play /> : <Icons.Pause />}
            </button>
          )}

          <button
            aria-label="Settings"
            className="iconbtn"
            onClick={() => setScreen('settings')}
            title="Settings"
          >
            <Icons.Settings />
          </button>
        </div>
      </header>

      {/* Main Menu Screen */}
      {screen === 'menu' && (
        <section className="menu panel">
          <div className="eyebrow">ROOM 3-B · AFTERNOON STUDY PERIOD</div>
          <h1>
            Settle it<br />
            <em>on the desk.</em>
          </h1>
          <p>
            One weathered wooden bench. Two pens.<br />
            Drag backward to aim, release to flick.<br />
            Send the rival pen over the edge!
          </p>

          <button className="primary" onClick={begin}>
            <span>PLAY MATCH (FIRST TO 3)</span>
            <Icons.Play />
          </button>

          <div className="menu-row">
            <button onClick={() => setScreen('pen')}>
              <Icons.Pen /> &nbsp; CHOOSE PEN ({PENS[selectedPen].name})
            </button>
            <button onClick={() => setScreen('settings')}>
              <Icons.Settings /> &nbsp; SETTINGS
            </button>
          </div>

          <div className="desk-stamp">
            TABLE<br />
            <b>21</b>
            <small>ROOM 3-B</small>
          </div>
        </section>
      )}

      {/* In-Game Gameplay HUD */}
      {screen === 'game' && (
        <>
          <div className="hud">
            {/* Player chip */}
            <div className={`player-chip ${turn === 'player' ? 'active' : ''}`}>
              <div className="avatar-chip" style={{ background: PENS[selectedPen].color }}>
                <Icons.Pen />
              </div>
              <div>
                <small>YOU ({PENS[selectedPen].name})</small>
                <strong>{score[0]}</strong>
              </div>
            </div>

            {/* Turn & Status Card */}
            <div className="turn-card">
              <small>ROUND {score[0] + score[1] + 1} · FIRST TO 3</small>
              <strong className={turn === 'player' ? 'player-turn' : 'rival-turn'}>
                {turn === 'player' ? 'YOUR TURN' : "RIVAL'S TURN"}
              </strong>
              <span>
                {turn === 'player'
                  ? gameState === 'AIMING'
                    ? 'Release to flick!'
                    : gameState === 'SHOT_IN_MOTION'
                    ? 'Shot in motion...'
                    : 'Drag your pen backward to aim'
                  : 'The rival is taking aim...'}
              </span>
            </div>

            {/* Rival chip */}
            <div className={`player-chip rival ${turn === 'opponent' ? 'active' : ''}`}>
              <div>
                <small>BENCH RIVAL ({difficulty})</small>
                <strong>{score[1]}</strong>
              </div>
              <div className="avatar-chip rival-badge">
                <Icons.Pen />
              </div>
            </div>
          </div>

          {/* Quick Match Actions */}
          <div className="game-actions">
            <button onClick={restartMatch} title="Restart Match">
              <Icons.Restart /> <span>RESTART</span>
            </button>
            <button onClick={() => setScreen('menu')} title="Return to Menu">
              <Icons.Menu /> <span>MENU</span>
            </button>
          </div>
        </>
      )}

      {/* Pen Selection Modal */}
      {screen === 'pen' && (
        <div className="veil">
          <section className="modal panel">
            <button className="close" onClick={() => setScreen('menu')} aria-label="Close">
              <Icons.Close />
            </button>
            <div className="eyebrow">DESK COMPANION</div>
            <h2>Pick your pen.</h2>
            <div className="penlist">
              {PENS.map((p, idx) => (
                <button
                  key={p.name}
                  className={`pencard ${selectedPen === idx ? 'selected' : ''}`}
                  onClick={() => setSelectedPen(idx)}
                >
                  <span className="penart" style={{ '--pen': p.color } as React.CSSProperties}>
                    <i />
                  </span>
                  <b>{p.name}</b>
                  <small>{p.detail}</small>
                  <p className="pen-desc">{p.desc}</p>
                  {selectedPen === idx && <em>SELECTED</em>}
                </button>
              ))}
            </div>
            <button className="primary" onClick={() => setScreen('menu')}>
              <span>SAVE SELECTION</span>
              <Icons.Play />
            </button>
          </section>
        </div>
      )}

      {/* Settings Modal */}
      {screen === 'settings' && (
        <div className="veil">
          <section className="modal panel">
            <button className="close" onClick={() => setScreen('menu')} aria-label="Close">
              <Icons.Close />
            </button>
            <div className="eyebrow">HOUSE RULES & AUDIO</div>
            <h2>Settings</h2>

            <label className="setting">
              <span>Opponent difficulty</span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              >
                <option value="Easy">Easy (Casual flicks)</option>
                <option value="Normal">Normal (Steady aim)</option>
                <option value="Hard">Hard (Deadly strikes)</option>
              </select>
            </label>

            <label className="setting">
              <span>Sound effects volume</span>
              <div className="slider-row">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(+e.target.value)}
                />
                <span className="slider-val">{volume}%</span>
              </div>
            </label>

            <button className="setting toggle" onClick={() => setMuted(!muted)}>
              <span>Mute all sounds</span>
              <b>{muted ? 'MUTED' : 'ENABLED'}</b>
            </button>

            <button
              className="setting toggle"
              onClick={() => setShowDebug(!showDebug)}
            >
              <span>Developer diagnostics overlay</span>
              <b>{showDebug ? 'ACTIVE' : 'OFF'}</b>
            </button>

            <button className="primary" onClick={() => setScreen('menu')}>
              <span>APPLY & CLOSE</span>
              <Icons.Play />
            </button>
          </section>
        </div>
      )}

      {/* Tutorial Modal */}
      {screen === 'tutorial' && (
        <div className="veil">
          <section className="modal tutorial panel">
            <div className="eyebrow">FIRST BELL · HOW TO PLAY</div>
            <h2>Four moves to glory.</h2>
            <ol>
              <li>
                <b>Select your pen</b>
                <span>Click or tap your pen on Table No. 21.</span>
              </li>
              <li>
                <b>Pull back to aim</b>
                <span>
                  Drag away from your rival to build power and direction. Watch the aiming arc.
                </span>
              </li>
              <li>
                <b>Release to flick</b>
                <span>
                  Let go to launch! The farther you pull back, the stronger the impulse.
                </span>
              </li>
              <li>
                <b>Knock the rival off</b>
                <span>
                  Hit the rival pen over the desk rim. First student to 3 points wins the match!
                </span>
              </li>
            </ol>
            <button className="primary" onClick={completeTutorial}>
              <span>GOT IT — LET’S PLAY</span>
              <Icons.Play />
            </button>
          </section>
        </div>
      )}

      {/* Pause Screen Overlay */}
      {isPaused && screen === 'game' && !result && (
        <div className="veil">
          <section className="modal panel pause-modal">
            <div className="eyebrow">MATCH PAUSED</div>
            <h2>Time out.</h2>
            <p>Catch your breath. The match is paused.</p>
            <div className="pause-actions">
              <button className="primary" onClick={togglePause}>
                <span>RESUME MATCH</span>
                <Icons.Play />
              </button>
              <button className="secondary" onClick={restartMatch}>
                <Icons.Restart /> <span>RESTART MATCH</span>
              </button>
              <button
                className="textbtn"
                onClick={() => {
                  setIsPaused(false);
                  setScreen('menu');
                }}
              >
                RETURN TO MENU
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Round & Match Result Modal */}
      {result && (
        <div className="veil">
          <section className="modal result panel">
            <div className="resultseal">
              <Icons.Trophy />
            </div>

            <div className="eyebrow">
              {matchWinner
                ? 'MATCH COMPLETE'
                : `ROUND ${score[0] + score[1]} RESULT`}
            </div>

            <h2>
              {matchWinner === 'player'
                ? 'Class Champion!'
                : matchWinner === 'opponent'
                ? 'Rival Takes the Match!'
                : result === 'player'
                ? 'Beautiful flick!'
                : result === 'draw'
                ? 'Both pens off!'
                : 'Off the desk!'}
            </h2>

            <p>
              {matchWinner === 'player'
                ? 'You conquered Table No. 21 with a clean 3-point victory!'
                : matchWinner === 'opponent'
                ? 'The bench rival knocked you out of the classroom tournament.'
                : result === 'player'
                ? 'You sent the rival over the desk edge! Point to you.'
                : result === 'draw'
                ? 'A double fall over the rim. No points awarded this round.'
                : 'Your pen tumbled onto the classroom floor.'}
            </p>

            <div className="scoreline">
              <span>
                YOU <b>{score[0]}</b>
              </span>
              <i>—</i>
              <span>
                RIVAL <b>{score[1]}</b>
              </span>
            </div>

            {matchWinner ? (
              <button className="primary" onClick={restartMatch}>
                <span>START NEW MATCH</span>
                <Icons.Play />
              </button>
            ) : (
              <button className="primary" onClick={nextRound}>
                <span>NEXT ROUND</span>
                <Icons.Play />
              </button>
            )}

            <button
              className="textbtn"
              onClick={() => {
                setResult(null);
                setScreen('menu');
              }}
            >
              BACK TO MAIN LOBBY
            </button>
          </section>
        </div>
      )}

      {/* Real-time Diagnostics Panel (Development Only) */}
      {showDebug && diagnostics && (
        <aside className="diagnostics-panel" aria-label="Development Diagnostics">
          <div className="diag-header">
            <strong>DIAGNOSTICS</strong>
            <button onClick={() => setShowDebug(false)}>×</button>
          </div>
          <div className="diag-grid">
            <div>
              <span>State:</span> <b>{diagnostics.state}</b>
            </div>
            <div>
              <span>Turn:</span> <b>{diagnostics.turn}</b>
            </div>
            <div>
              <span>Timestep:</span> <b>1/60s (fixed)</b>
            </div>
            <div>
              <span>Scale:</span> <b>{diagnostics.scale.toFixed(1)} px/u</b>
            </div>
            <div>
              <span>Aim Power:</span> <b>{diagnostics.aimPower.toFixed(2)}</b>
            </div>
            <div>
              <span>Aim Angle:</span> <b>{((diagnostics.aimAngle * 180) / Math.PI).toFixed(0)}°</b>
            </div>
            <div>
              <span>Player Pos:</span>{' '}
              <b>
                {diagnostics.player.x.toFixed(2)}, {diagnostics.player.y.toFixed(2)}
              </b>
            </div>
            <div>
              <span>Player Vel:</span>{' '}
              <b>
                {Math.hypot(diagnostics.player.vx, diagnostics.player.vy).toFixed(2)}
              </b>
            </div>
            <div>
              <span>Rival Pos:</span>{' '}
              <b>
                {diagnostics.opponent.x.toFixed(2)}, {diagnostics.opponent.y.toFixed(2)}
              </b>
            </div>
            <div>
              <span>Rival Vel:</span>{' '}
              <b>
                {Math.hypot(diagnostics.opponent.vx, diagnostics.opponent.vy).toFixed(2)}
              </b>
            </div>
            <div>
              <span>Player Fall:</span>{' '}
              <b className={diagnostics.player.fallen ? 'bad' : 'good'}>
                {diagnostics.player.fallen ? 'FALLEN' : 'ON DESK'}
              </b>
            </div>
            <div>
              <span>Rival Fall:</span>{' '}
              <b className={diagnostics.opponent.fallen ? 'bad' : 'good'}>
                {diagnostics.opponent.fallen ? 'FALLEN' : 'ON DESK'}
              </b>
            </div>
          </div>
        </aside>
      )}

      {/* Footer */}
      <footer>
        <div className="footer-left">
          <span>PERIOD 6 · BACKBENCHERS TABLE NO. 21</span>
        </div>
        <div className="footer-right">
          <button
            className="footer-link"
            onClick={() => setShowDebug((prev) => !prev)}
            title="Toggle Debug Diagnostics"
          >
            [DEV {showDebug ? 'ON' : 'OFF'}]
          </button>
          <button
            className="footer-link"
            onClick={() => setMuted(!muted)}
            title="Toggle Audio"
          >
            {muted ? <Icons.SoundOff /> : <Icons.SoundOn />} SOUND {muted ? 'OFF' : 'ON'}
          </button>
        </div>
      </footer>
    </main>
  );
}
