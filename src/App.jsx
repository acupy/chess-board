import { useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChess,
  faGear,
  faSquare,
  faSquareCheck,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import Board from './Board';
import CoachPanel from './CoachPanel';
import {
  applyUciMove,
  GAME_RESULT,
  getGameResult,
  getWinner,
  isInCheck,
  isWhiteToMove,
  parseFEN,
  parseUciMove,
  pickLegalEngineMove,
  serializeFEN,
  validateFEN,
} from './chess';
import { engineEloForPlayer, updateElo } from './coach/elo';
import {
  coachGameOver,
  coachHint,
  coachOnMove,
  coachUndo,
  coachWelcome,
} from './coach/voice';
import { loadProfile, recordGameResult, setPlayerElo } from './coach/storage';
import { loadPreferences, updatePreferences, THEME_OPTIONS } from './coach/preferences';
import { analyze, classifyMove, initEngine, pickMove } from './engine/stockfish';
import { PIECE_STYLES } from './consts';

const START_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function App() {
  const initialPrefs = loadPreferences();
  const [textInput, setTextInput] = useState(START_POSITION);
  const [position, setPosition] = useState(START_POSITION);
  const [pieceStyle, setPieceStyle] = useState(initialPrefs.pieceStyle);
  const [theme, setTheme] = useState(initialPrefs.theme);
  const [chessRulesEnforced, setChessRulesEnforced] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [coachMode, setCoachMode] = useState(true);

  const [profile, setProfile] = useState(() => loadProfile());
  const [engineElo, setEngineElo] = useState(() => engineEloForPlayer(loadProfile().elo));
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [coachMessage, setCoachMessage] = useState('');
  const [status, setStatus] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [eloDraft, setEloDraft] = useState(() => String(loadProfile().elo));
  const [history, setHistory] = useState([]);
  const [moves, setMoves] = useState([]);
  const [hintSquares, setHintSquares] = useState(null);

  const gameEndedRef = useRef(false);
  const sessionEngineEloRef = useRef(engineElo);
  const positionRef = useRef(position);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    let cancelled = false;
    setStatus('Getting ready…');
    initEngine()
      .then(() => {
        if (!cancelled) {
          setEngineReady(true);
          setStatus('Your move. Good luck!');
          setCoachMessage(coachWelcome());
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setStatus(`Couldn’t load the opponent: ${err.message}`);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setEloDraft(String(profile.elo));
  }, [profile.elo]);

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  const finishGame = useCallback((result, reason) => {
    if (gameEndedRef.current) return;
    gameEndedRef.current = true;
    setGameOver(true);

    const nextProfile = recordGameResult(result, sessionEngineEloRef.current, updateElo);
    setProfile(nextProfile);

    const label =
      result === 'win' ? 'You won' : result === 'draw' ? 'Draw' : 'You lost';
    setStatus(
      `${label}${reason ? ` — ${reason}` : ''}. Elo ${nextProfile.elo} (${nextProfile.lastDelta >= 0 ? '+' : ''}${nextProfile.lastDelta})`
    );

    setCoachMessage(
      coachGameOver({
        result,
        playerElo: nextProfile.elo,
        eloDelta: nextProfile.lastDelta || 0,
        reason,
      })
    );
  }, []);

  const checkAndFinish = useCallback(
    (game) => {
      const result = getGameResult(game);
      if (result === GAME_RESULT.PLAYING) return false;

      const winner = getWinner(game);
      if (result === GAME_RESULT.STALEMATE || winner === 'draw') {
        finishGame('draw', 'stalemate');
      } else if (winner === 'white') {
        finishGame('win', 'checkmate');
      } else {
        finishGame('loss', 'checkmate');
      }
      return true;
    },
    [finishGame]
  );

  const playEngineReply = useCallback(
    async (fenAfterPlayer) => {
      setStatus('I’m thinking…');
      const game = parseFEN(fenAfterPlayer);
      const rawUci = await pickMove(fenAfterPlayer, sessionEngineEloRef.current);
      const uci = pickLegalEngineMove(game, rawUci);
      if (!uci) {
        setStatus('I couldn’t find a legal move.');
        return;
      }

      const next = applyUciMove(game, uci);
      if (!next) {
        setStatus('I stumbled on an illegal reply — your turn again.');
        return;
      }

      const nextFen = serializeFEN(next);
      setPosition(nextFen);
      setTextInput(nextFen);
      setMoves((prev) => [...prev, { uci, by: 'engine' }]);
      setHintSquares(null);

      const ended = checkAndFinish(next);
      if (!ended) {
        if (isInCheck(next.board, isWhiteToMove(next))) {
          setStatus('Check! Your move.');
        } else {
          setStatus('Your move.');
        }
      }
    },
    [checkAndFinish]
  );

  const handlePlayerMove = useCallback(
    async ({ fen, uci, game }) => {
      if (!coachMode || gameOver || busy) return;

      const fenBefore = positionRef.current;
      setHistory((prev) => [
        ...prev,
        {
          fen: fenBefore,
          verdict,
          coachMessage,
          status,
          moves,
        },
      ]);
      setBusy(true);
      setPosition(fen);
      setTextInput(fen);
      setMoves((prev) => [...prev, { uci, by: 'player' }]);
      setHintSquares(null);
      setStatus('Looking at your move…');

      try {
        const beforeGame = parseFEN(fenBefore);
        const [beforeAnalysis, afterAnalysis] = await Promise.all([
          analyze(fenBefore),
          analyze(fen),
        ]);

        const classification = classifyMove(beforeAnalysis, afterAnalysis, uci, true);
        const legalBest = pickLegalEngineMove(
          beforeGame,
          classification.bestMove,
          beforeAnalysis?.pv
        );
        if (legalBest) classification.bestMove = legalBest;

        setVerdict(classification.verdict);
        setMoves((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.by === 'player' && last.uci === uci) {
            next[next.length - 1] = { ...last, verdict: classification.verdict };
          }
          return next;
        });

        setCoachMessage(
          coachOnMove({
            gameBefore: beforeGame,
            playedUci: uci,
            bestUci: classification.bestMove,
            verdict: classification.verdict,
            lossCp: classification.lossCp,
          })
        );

        const ended = checkAndFinish(game);
        if (!ended) {
          if (isInCheck(game.board, isWhiteToMove(game))) {
            setStatus('Check! I’m thinking…');
          }
          await playEngineReply(fen);
        }
      } catch (err) {
        setStatus(err.message || 'Something went wrong looking at that move.');
        try {
          const ended = checkAndFinish(game);
          if (!ended) await playEngineReply(fen);
        } catch {
          /* ignore */
        }
      } finally {
        setBusy(false);
      }
    },
    [coachMode, gameOver, busy, checkAndFinish, playEngineReply, verdict, coachMessage, status, moves]
  );

  const onUndo = () => {
    if (busy || gameOver || history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setPosition(previous.fen);
    setTextInput(previous.fen);
    setVerdict(previous.verdict ?? null);
    setCoachMessage(previous.coachMessage || coachUndo());
    setStatus(previous.status || 'Your move.');
    setMoves(previous.moves || []);
    setHintSquares(null);
  };

  const onHint = async () => {
    if (busy || gameOver) return;
    setBusy(true);
    setStatus('Looking for a nudge…');
    try {
      const game = parseFEN(position);
      const analysis = await analyze(position, 800);
      const best = pickLegalEngineMove(game, analysis.bestMove, analysis.pv);
      if (!best) {
        setCoachMessage(coachHint({ game, bestUci: null }));
        setHintSquares(null);
        setStatus('Your move.');
        return;
      }

      const parsed = parseUciMove(best);
      if (parsed) {
        setHintSquares({ from: parsed.from, to: parsed.to });
      }

      setCoachMessage(coachHint({ game, bestUci: best }));
      setStatus('Your move.');
    } catch (err) {
      setStatus(err.message || 'Hint failed.');
    } finally {
      setBusy(false);
    }
  };

  const onResign = async () => {
    if (busy || gameOver) return;
    setBusy(true);
    try {
      finishGame('loss', 'resignation');
    } finally {
      setBusy(false);
    }
  };

  const onNewGame = () => {
    if (busy) return;
    const nextProfile = loadProfile();
    setProfile(nextProfile);
    const nextEngine = engineEloForPlayer(nextProfile.elo);
    setEngineElo(nextEngine);
    sessionEngineEloRef.current = nextEngine;
    gameEndedRef.current = false;
    setGameOver(false);
    setVerdict(null);
    setHistory([]);
    setMoves([]);
    setHintSquares(null);
    setPosition(START_POSITION);
    setTextInput(START_POSITION);
    setCoachMessage(coachWelcome());
    setStatus(engineReady ? 'Your move.' : 'Getting ready…');
  };

  const onFENChanged = (event) => {
    const value = event.target.value;
    setTextInput(value);
    if (!coachMode && validateFEN(value)) {
      setPosition(value);
    }
  };

  const applyManualElo = () => {
    const next = setPlayerElo(eloDraft);
    setProfile(next);
    const nextEngine = engineEloForPlayer(next.elo);
    setEngineElo(nextEngine);
    sessionEngineEloRef.current = nextEngine;
    setEloDraft(String(next.elo));
    setStatus(`Elo set to ${next.elo}. Opponent strength is now ${nextEngine}.`);
  };

  return (
    <div className="app-shell">
      <header>
        <h1 className="header-brand" title="Chess coach">
          <FontAwesomeIcon icon={faChess} />
          <span className="header-brand-text">chess coach</span>
        </h1>
        <div className="header-elo" title={coachMode ? 'Your Elo | Opponent Elo' : 'Your Elo'}>
          <span className="header-elo-you">
            <span className="header-elo-label">Elo</span>
            {profile.elo}
            {typeof profile.lastDelta === 'number' && profile.lastDelta !== 0 && (
              <span className={`header-elo-delta ${profile.lastDelta > 0 ? 'up' : 'down'}`}>
                {profile.lastDelta > 0 ? '+' : ''}
                {profile.lastDelta}
              </span>
            )}
          </span>
          {coachMode && (
            <>
              <span className="header-elo-pipe" aria-hidden="true">
                |
              </span>
              <span className="header-elo-opp">
                <span className="header-elo-label">Opp</span>
                {engineElo}
              </span>
            </>
          )}
        </div>
        <div className="config-button" onClick={() => setShowConfig((open) => !open)}>
          <FontAwesomeIcon icon={faGear} />
        </div>
      </header>
      <div className="content-container">
        <div className="main-column">
          <Board
            position={position}
            pieceStyle={pieceStyle}
            chessRulesEnforced={coachMode ? true : chessRulesEnforced}
            coachMode={coachMode}
            interactionDisabled={busy || gameOver || (coachMode && !engineReady)}
            busy={busy}
            onPlayerMove={handlePlayerMove}
            hintFrom={hintSquares?.from || null}
            hintTo={hintSquares?.to || null}
            onBoardUpdated={(fen) => {
              setTextInput(fen);
              if (!coachMode) setPosition(fen);
            }}
          />
          {coachMode && (
            <CoachPanel
              profile={profile}
              verdict={verdict}
              coachMessage={coachMessage}
              status={status}
              busy={busy || !engineReady}
              gameOver={gameOver}
              onHint={onHint}
              onUndo={onUndo}
              canUndo={!gameOver && history.length > 0}
              onNewGame={onNewGame}
              onResign={onResign}
              theme={theme}
              moves={moves}
            />
          )}
        </div>
        {showConfig && (
          <div className="config-panel">
            <div className="config-panel-header">
              <div>Config</div>
              <div className="close-btn" onClick={() => setShowConfig(false)}>
                <FontAwesomeIcon icon={faXmark} />
              </div>
            </div>
            <div className="config-panel-body">
              <label style={{ flexFlow: 'row' }}>
                Coach mode:
                <FontAwesomeIcon
                  icon={coachMode ? faSquareCheck : faSquare}
                  onClick={() => {
                    const next = !coachMode;
                    setCoachMode(next);
                    if (next) onNewGame();
                  }}
                  size="lg"
                  style={{ marginLeft: '10px', cursor: 'pointer' }}
                />
              </label>
              <label>
                Your Elo
                <div className="elo-setting-row">
                  <input
                    type="number"
                    min={100}
                    max={3000}
                    step={10}
                    value={eloDraft}
                    onChange={(event) => setEloDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') applyManualElo();
                    }}
                  />
                  <button type="button" className="coach-btn" onClick={applyManualElo}>
                    Apply
                  </button>
                </div>
                <span className="elo-setting-hint">
                  Opponent plays ~{engineEloForPlayer(Number(eloDraft) || profile.elo)} Elo
                </span>
              </label>
              <label>
                Board status (FEN)
                <input
                  type="text"
                  value={textInput}
                  onChange={onFENChanged}
                  disabled={coachMode}
                />
              </label>
              <label>
                Theme
                <select
                  value={theme}
                  onChange={(event) => {
                    const nextTheme = event.target.value;
                    setTheme(nextTheme);
                    updatePreferences({ theme: nextTheme });
                  }}
                >
                  {THEME_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Piece style
                <select
                  onChange={(event) => {
                    const nextStyle = event.target.value;
                    setPieceStyle(nextStyle);
                    updatePreferences({ pieceStyle: nextStyle });
                  }}
                  value={pieceStyle}
                >
                  {PIECE_STYLES.map((style) => (
                    <option key={style.id} value={style.id}>
                      {style.label}
                    </option>
                  ))}
                </select>
              </label>
              {!coachMode && (
                <label style={{ flexFlow: 'row' }}>
                  Enforce chess rules:
                  <FontAwesomeIcon
                    icon={chessRulesEnforced ? faSquareCheck : faSquare}
                    onClick={() => setChessRulesEnforced((value) => !value)}
                    size="lg"
                    style={{ marginLeft: '10px', cursor: 'pointer' }}
                  />
                </label>
              )}
            </div>
          </div>
        )}
      </div>
      <footer>
        <span>chess coach</span>
        <span aria-hidden="true">·</span>
        <span>2018–{new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}

export default App;
