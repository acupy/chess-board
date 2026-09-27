import { useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBookOpen,
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
  findPlayerDangers,
  GAME_RESULT,
  getGameResult,
  getWinner,
  isInCheck,
  isWhiteToMove,
  parseFEN,
  parseUciMove,
  pickLegalEngineMove,
  serializeFEN,
  takeNewDangers,
  validateFEN,
} from './chess';
import { engineEloForPlayer, updateElo } from './coach/elo';
import {
  coachDanger,
  coachGameSummary,
  coachHint,
  coachOnMove,
  coachReviewMove,
  coachUndo,
  coachWelcome,
} from './coach/voice';
import { loadProfile, recordGameResult, setPlayerElo, loadSession, saveSession, clearSession } from './coach/storage';
import {
  deleteArchivedGame,
  fenAtPly,
  fenBeforePly,
  formatArchiveResult,
  loadArchivedGames,
  saveArchivedGame,
} from './coach/archive';
import { toWhiteEval } from './coach/evalDisplay';
import {
  getGameTheme,
  loadPreferences,
  pieceStylesForTheme,
  resolvePieceStyle,
  THEME_OPTIONS,
  updatePreferences,
} from './coach/preferences';
import { MIN_UCI_ELO } from './engine/strength';
import { analyze, classifyMove, initEngine, pickMove } from './engine/stockfish';

const START_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const readInitialSession = () => {
  const saved = loadSession();
  if (!saved?.fen || !validateFEN(saved.fen)) return null;
  return saved;
};

function App() {
  const initialPrefs = loadPreferences();
  const initialSession = readInitialSession();
  const initialProfile = loadProfile();
  const initialFen = initialSession?.fen || START_POSITION;
  const initialStartFen =
    initialSession?.startFen && validateFEN(initialSession.startFen)
      ? initialSession.startFen
      : START_POSITION;
  const initialEngineElo =
    initialSession?.engineElo ?? engineEloForPlayer(initialProfile.elo);
  const restoredGame = Boolean(
    initialSession &&
      (initialSession.fen !== START_POSITION ||
        initialSession.moves?.length > 0 ||
        initialSession.gameOver)
  );

  const [textInput, setTextInput] = useState(initialFen);
  const [position, setPosition] = useState(initialFen);
  const [pieceStyle, setPieceStyle] = useState(initialPrefs.pieceStyle);
  const [theme, setTheme] = useState(initialPrefs.theme);
  const [pointOutDangers, setPointOutDangers] = useState(initialPrefs.pointOutDangers);
  const [chessRulesEnforced, setChessRulesEnforced] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [coachMode, setCoachMode] = useState(true);

  const [profile, setProfile] = useState(initialProfile);
  const [engineElo, setEngineElo] = useState(initialEngineElo);
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState(initialSession?.verdict ?? null);
  const [coachMessage, setCoachMessage] = useState(initialSession?.coachMessage || '');
  const [status, setStatus] = useState(initialSession?.status || '');
  const [gameOver, setGameOver] = useState(Boolean(initialSession?.gameOver));
  const [engineReady, setEngineReady] = useState(false);
  const [eloDraft, setEloDraft] = useState(() => String(initialProfile.elo));
  const [history, setHistory] = useState(initialSession?.history || []);
  const [moves, setMoves] = useState(initialSession?.moves || []);
  const [hintSquares, setHintSquares] = useState(null);
  const [altSquares, setAltSquares] = useState(null);
  const [dangerMarks, setDangerMarks] = useState([]);
  const [evalCp, setEvalCp] = useState(0);
  const [evalMate, setEvalMate] = useState(null);

  const [panelMode, setPanelMode] = useState('play'); // play | history | review
  const [archivedGames, setArchivedGames] = useState(() => loadArchivedGames());
  const [reviewGame, setReviewGame] = useState(null);
  const [reviewPly, setReviewPly] = useState(0);

  const gameEndedRef = useRef(Boolean(initialSession?.gameOver));
  const sessionEngineEloRef = useRef(initialEngineElo);
  const positionRef = useRef(initialFen);
  const movesRef = useRef(initialSession?.moves || []);
  const startFenRef = useRef(initialStartFen);
  const announcedDangersRef = useRef(new Set());
  const liveSnapshotRef = useRef(null);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    movesRef.current = moves;
  }, [moves]);

  const applyEvalFromAnalysis = useCallback((analysis, whiteToMove) => {
    const next = toWhiteEval(analysis?.score, whiteToMove);
    setEvalCp(next.cp);
    setEvalMate(next.mate);
    return next;
  }, []);

  const syncDangerMarks = useCallback(
    (game, { announce = false } = {}) => {
      if (!coachMode || !pointOutDangers || !game || panelMode !== 'play') {
        setDangerMarks([]);
        return '';
      }
      const { all } = findPlayerDangers(game, true);
      setDangerMarks(all);
      if (!announce) {
        announcedDangersRef.current = new Set(all.map((d) => d.key));
        return '';
      }
      return coachDanger(takeNewDangers(announcedDangersRef.current, all));
    },
    [coachMode, pointOutDangers, panelMode]
  );

  useEffect(() => {
    let cancelled = false;
    if (!restoredGame) setStatus('Getting ready…');
    initEngine()
      .then(() => {
        if (cancelled) return;
        setEngineReady(true);
        if (restoredGame) {
          if (!gameEndedRef.current) {
            setStatus((prev) => prev || 'Welcome back — your move.');
            setCoachMessage((prev) => prev || 'Picked up where you left off. Your move.');
          }
        } else {
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
  }, [restoredGame]);

  useEffect(() => {
    setEloDraft(String(profile.elo));
  }, [profile.elo]);

  useEffect(() => {
    document.documentElement.className = getGameTheme(theme).chrome;
  }, [theme]);

  // Persist coach game so refresh / reopen can continue
  useEffect(() => {
    if (!coachMode || panelMode !== 'play') return;
    saveSession({
      fen: position,
      startFen: startFenRef.current,
      moves,
      history,
      verdict,
      coachMessage,
      status,
      gameOver,
      engineElo,
    });
  }, [coachMode, panelMode, position, moves, history, verdict, coachMessage, status, gameOver, engineElo]);

  const finishGame = useCallback((result, reason) => {
    if (gameEndedRef.current) return;
    gameEndedRef.current = true;
    setGameOver(true);

    const nextProfile = recordGameResult(result, sessionEngineEloRef.current, updateElo);
    setProfile(nextProfile);

    const gameMoves = movesRef.current || [];
    saveArchivedGame({
      result,
      reason: reason || '',
      playerElo: nextProfile.elo,
      eloDelta: nextProfile.lastDelta || 0,
      engineElo: sessionEngineEloRef.current,
      startFen: startFenRef.current || START_POSITION,
      moves: gameMoves,
    });
    setArchivedGames(loadArchivedGames());

    const label =
      result === 'win' ? 'You won' : result === 'draw' ? 'Draw' : 'You lost';
    setStatus(
      `${label}${reason ? ` — ${reason}` : ''}. Elo ${nextProfile.elo} (${nextProfile.lastDelta >= 0 ? '+' : ''}${nextProfile.lastDelta})`
    );

    setCoachMessage(
      coachGameSummary({
        result,
        playerElo: nextProfile.elo,
        eloDelta: nextProfile.lastDelta || 0,
        reason,
        moves: gameMoves,
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
    async (fenAfterPlayer, context = {}) => {
      setStatus('I’m thinking…');
      const game = parseFEN(fenAfterPlayer);
      const history = movesRef.current || [];
      const lastOwnUci =
        context.lastOwnUci ??
        [...history].reverse().find((move) => move.by === 'engine')?.uci ??
        null;
      const lastOpponentUci =
        context.lastOpponentUci ??
        [...history].reverse().find((move) => move.by === 'player')?.uci ??
        null;
      const rawUci = await pickMove(fenAfterPlayer, sessionEngineEloRef.current, undefined, {
        lastOpponentUci,
        lastOwnUci,
      });
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
      setMoves((prev) => {
        const nextMoves = [...prev, { uci, by: 'engine', fenAfter: nextFen }];
        movesRef.current = nextMoves;
        return nextMoves;
      });
      setHintSquares(null);
      setAltSquares(null);

      const ended = checkAndFinish(next);
      if (!ended) {
        try {
          const evalAnalysis = await analyze(nextFen, 450);
          applyEvalFromAnalysis(evalAnalysis, isWhiteToMove(next));
        } catch {
          /* keep previous eval */
        }
        const dangerLine = syncDangerMarks(next, { announce: true });
        if (dangerLine) {
          setCoachMessage(dangerLine);
        }
        if (isInCheck(next.board, isWhiteToMove(next))) {
          setStatus('Check! Your move.');
        } else {
          setStatus('Your move.');
        }
      } else {
        try {
          const evalAnalysis = await analyze(nextFen, 450);
          applyEvalFromAnalysis(evalAnalysis, isWhiteToMove(next));
        } catch {
          /* keep previous eval */
        }
      }
    },
    [checkAndFinish, syncDangerMarks, applyEvalFromAnalysis]
  );

  // If refresh interrupted the opponent's reply, finish that move on load
  useEffect(() => {
    if (!engineReady || !coachMode || panelMode !== 'play' || gameOver || busy) return;
    let cancelled = false;
    try {
      const game = parseFEN(position);
      if (isWhiteToMove(game)) return undefined;
      setBusy(true);
      setStatus('I’m thinking…');
      playEngineReply(position).finally(() => {
        if (!cancelled) setBusy(false);
      });
    } catch {
      /* ignore bad fen */
    }
    return () => {
      cancelled = true;
    };
    // Only when the engine first becomes ready for a restored mid-turn position
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineReady]);

  const handlePlayerMove = useCallback(
    async ({ fen, uci, game }) => {
      if (!coachMode || panelMode !== 'play' || gameOver || busy) return;

      const fenBefore = positionRef.current;
      setHistory((prev) => [
        ...prev,
        {
          fen: fenBefore,
          verdict,
          coachMessage,
          status,
          moves,
          evalCp,
          evalMate,
        },
      ]);
      setBusy(true);
      setPosition(fen);
      setTextInput(fen);
      setMoves((prev) => {
        const nextMoves = [...prev, { uci, by: 'player', fenAfter: fen }];
        movesRef.current = nextMoves;
        return nextMoves;
      });
      setHintSquares(null);
      setAltSquares(null);
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

        applyEvalFromAnalysis(afterAnalysis, isWhiteToMove(game));

        setVerdict(classification.verdict);
        setMoves((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.by === 'player' && last.uci === uci) {
            next[next.length - 1] = {
              ...last,
              fenAfter: fen,
              verdict: classification.verdict,
              lossCp: classification.lossCp,
              bestUci: classification.bestMove || undefined,
            };
          }
          movesRef.current = next;
          return next;
        });

        setCoachMessage(
          (() => {
            const moveMsg = coachOnMove({
              gameBefore: beforeGame,
              playedUci: uci,
              bestUci: classification.bestMove,
              verdict: classification.verdict,
              lossCp: classification.lossCp,
            });
            const dangerLine = syncDangerMarks(game, { announce: true });
            return dangerLine ? `${moveMsg} ${dangerLine}` : moveMsg;
          })()
        );

        const ended = checkAndFinish(game);
        if (!ended) {
          if (isInCheck(game.board, isWhiteToMove(game))) {
            setStatus('Check! I’m thinking…');
          }
          await playEngineReply(fen, { lastOpponentUci: uci });
        }
      } catch (err) {
        setStatus(err.message || 'Something went wrong looking at that move.');
        try {
          const ended = checkAndFinish(game);
          if (!ended) await playEngineReply(fen, { lastOpponentUci: uci });
        } catch {
          /* ignore */
        }
      } finally {
        setBusy(false);
      }
    },
    [coachMode, panelMode, gameOver, busy, checkAndFinish, playEngineReply, syncDangerMarks, applyEvalFromAnalysis, verdict, coachMessage, status, moves, evalCp, evalMate]
  );

  const onUndo = () => {
    if (panelMode !== 'play' || busy || gameOver || history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setPosition(previous.fen);
    setTextInput(previous.fen);
    setVerdict(previous.verdict ?? null);
    setCoachMessage(previous.coachMessage || coachUndo());
    setStatus(previous.status || 'Your move.');
    setMoves(previous.moves || []);
    setHintSquares(null);
    setAltSquares(null);
    setEvalCp(typeof previous.evalCp === 'number' ? previous.evalCp : 0);
    setEvalMate(previous.evalMate ?? null);
    try {
      syncDangerMarks(parseFEN(previous.fen), { announce: false });
    } catch {
      setDangerMarks([]);
      announcedDangersRef.current = new Set();
    }
  };

  const onHint = async () => {
    if (panelMode !== 'play' || busy || gameOver) return;
    setBusy(true);
    setStatus('Looking for a nudge…');
    try {
      const game = parseFEN(position);
      const analysis = await analyze(position, 800);
      const best = pickLegalEngineMove(game, analysis.bestMove, analysis.pv);
      if (!best) {
        setCoachMessage(coachHint({ game, bestUci: null }));
        setHintSquares(null);
        setAltSquares(null);
        setStatus('Your move.');
        return;
      }

      const parsed = parseUciMove(best);
      if (parsed) {
        setHintSquares({ from: parsed.from, to: parsed.to });
        setAltSquares(null);
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
    if (panelMode !== 'play' || busy || gameOver) return;
    setBusy(true);
    try {
      finishGame('loss', 'resignation');
    } finally {
      setBusy(false);
    }
  };

  const reviewGenRef = useRef(0);

  const applyReviewPly = useCallback(async (game, ply) => {
    const gen = ++reviewGenRef.current;
    const safePly = Math.max(0, Math.min(ply, game.moves?.length || 0));
    const fen = fenAtPly(game, safePly) || game.startFen;
    setReviewPly(safePly);
    setPosition(fen);
    setTextInput(fen);
    setDangerMarks([]);
    setHintSquares(null);
    setAltSquares(null);

    if (safePly === 0) {
      setVerdict(null);
      setEvalCp(0);
      setEvalMate(null);
      setCoachMessage(coachReviewMove({ gameBefore: null, move: null }));
      setStatus(`Review · ${formatArchiveResult(game.result)} · start`);
      return;
    }

    const move = game.moves[safePly - 1];
    const fenBefore = fenBeforePly(game, safePly) || game.startFen;
    let beforeGame = null;
    try {
      beforeGame = parseFEN(fenBefore);
    } catch {
      beforeGame = null;
    }

    const played = move?.uci ? parseUciMove(move.uci) : null;
    if (played) {
      setAltSquares({ from: played.from, to: played.to });
    }

    if (move?.by === 'player') {
      setVerdict(move.verdict || null);
    } else {
      setVerdict(null);
    }

    let enriched = { ...move };
    const isSlip =
      move?.by === 'player' &&
      (move.verdict === 'inaccuracy' ||
        move.verdict === 'mistake' ||
        move.verdict === 'blunder');
    const needsAnalysis =
      isSlip && beforeGame && (!move.bestUci || move.bestUci === move.uci);

    setCoachMessage(coachReviewMove({ gameBefore: beforeGame, move: enriched }));
    setStatus(`Review · ${formatArchiveResult(game.result)} · ${safePly}/${game.moves.length}`);

    if (needsAnalysis) {
      setStatus(
        `Review · ${formatArchiveResult(game.result)} · ${safePly}/${game.moves.length} · finding better…`
      );
      try {
        const beforeAnalysis = await analyze(fenBefore, 900);
        if (gen !== reviewGenRef.current) return;
        applyEvalFromAnalysis(beforeAnalysis, isWhiteToMove(beforeGame));
        const legalBest = pickLegalEngineMove(
          beforeGame,
          beforeAnalysis?.bestMove,
          beforeAnalysis?.pv
        );
        if (legalBest && legalBest !== move.uci) {
          enriched = { ...enriched, bestUci: legalBest };
          try {
            const afterAnalysis = await analyze(fen, 500);
            if (gen !== reviewGenRef.current) return;
            applyEvalFromAnalysis(afterAnalysis, (() => {
              try {
                return isWhiteToMove(parseFEN(fen));
              } catch {
                return false;
              }
            })());
            const classification = classifyMove(
              beforeAnalysis,
              afterAnalysis,
              move.uci,
              true
            );
            enriched = {
              ...enriched,
              lossCp: classification.lossCp,
              verdict: move.verdict || classification.verdict,
            };
          } catch {
            /* keep verdict from archive */
          }
          // Cache on the in-memory archive so re-visiting this ply is instant
          move.bestUci = enriched.bestUci;
          if (typeof enriched.lossCp === 'number') move.lossCp = enriched.lossCp;
        }
      } catch {
        if (gen !== reviewGenRef.current) return;
        setCoachMessage(
          coachReviewMove({ gameBefore: beforeGame, move: enriched })
        );
        setStatus(
          `Review · ${formatArchiveResult(game.result)} · ${safePly}/${game.moves.length}`
        );
        return;
      }
    } else {
      try {
        const snapAnalysis = await analyze(fen, 400);
        if (gen !== reviewGenRef.current) return;
        let whiteToMove = true;
        try {
          whiteToMove = isWhiteToMove(parseFEN(fen));
        } catch {
          whiteToMove = true;
        }
        applyEvalFromAnalysis(snapAnalysis, whiteToMove);
      } catch {
        /* keep previous */
      }
    }

    if (gen !== reviewGenRef.current) return;

    const best =
      enriched?.by === 'player' && enriched.bestUci && enriched.bestUci !== enriched.uci
        ? parseUciMove(enriched.bestUci)
        : null;

    if (best) {
      setHintSquares({ from: best.from, to: best.to });
      if (played) setAltSquares({ from: played.from, to: played.to });
    } else if (played && !isSlip) {
      setHintSquares({ from: played.from, to: played.to });
      setAltSquares(null);
    }

    setCoachMessage(coachReviewMove({ gameBefore: beforeGame, move: enriched }));
    setStatus(`Review · ${formatArchiveResult(game.result)} · ${safePly}/${game.moves.length}`);
  }, [applyEvalFromAnalysis]);

  const snapshotLive = useCallback(() => {
    liveSnapshotRef.current = {
      position,
      textInput,
      moves,
      history,
      verdict,
      coachMessage,
      status,
      gameOver,
      hintSquares,
      altSquares,
      dangerMarks,
      evalCp,
      evalMate,
      gameEnded: gameEndedRef.current,
    };
  }, [
    position,
    textInput,
    moves,
    history,
    verdict,
    coachMessage,
    status,
    gameOver,
    hintSquares,
    altSquares,
    dangerMarks,
    evalCp,
    evalMate,
  ]);

  const restoreLive = useCallback(() => {
    const snap = liveSnapshotRef.current;
    liveSnapshotRef.current = null;
    setReviewGame(null);
    setReviewPly(0);
    setAltSquares(null);
    setPanelMode('play');
    if (!snap) return;
    setPosition(snap.position);
    setTextInput(snap.textInput);
    setMoves(snap.moves);
    setHistory(snap.history);
    setVerdict(snap.verdict);
    setCoachMessage(snap.coachMessage);
    setStatus(snap.status);
    setGameOver(snap.gameOver);
    setHintSquares(snap.hintSquares);
    setAltSquares(snap.altSquares);
    setDangerMarks(snap.dangerMarks || []);
    setEvalCp(typeof snap.evalCp === 'number' ? snap.evalCp : 0);
    setEvalMate(snap.evalMate ?? null);
    gameEndedRef.current = snap.gameEnded;
  }, []);

  const onOpenHistory = () => {
    if (panelMode === 'history') {
      onCloseHistory();
      return;
    }
    if (panelMode === 'play') snapshotLive();
    setPanelMode('history');
    setArchivedGames(loadArchivedGames());
  };

  const onCloseHistory = () => {
    if (reviewGame) {
      setPanelMode('review');
      return;
    }
    restoreLive();
  };

  const onReviewGame = (game) => {
    if (panelMode === 'play') snapshotLive();
    setReviewGame(game);
    setPanelMode('review');
    applyReviewPly(game, game.moves?.length || 0);
  };

  const onExitReview = () => {
    restoreLive();
  };

  const onDeleteArchived = (id) => {
    const next = deleteArchivedGame(id);
    setArchivedGames(next);
    if (reviewGame?.id === id) {
      setReviewGame(null);
      restoreLive();
    }
  };

  const onReviewPlyChange = (ply) => {
    if (!reviewGame) return;
    applyReviewPly(reviewGame, ply);
  };

  const onNewGame = () => {
    if (busy) return;
    clearSession();
    const nextProfile = loadProfile();
    setProfile(nextProfile);
    const nextEngine = engineEloForPlayer(nextProfile.elo);
    setEngineElo(nextEngine);
    sessionEngineEloRef.current = nextEngine;
    startFenRef.current = START_POSITION;
    gameEndedRef.current = false;
    liveSnapshotRef.current = null;
    setPanelMode('play');
    setReviewGame(null);
    setReviewPly(0);
    setGameOver(false);
    setVerdict(null);
    setHistory([]);
    setMoves([]);
    setHintSquares(null);
    setAltSquares(null);
    setDangerMarks([]);
    setEvalCp(0);
    setEvalMate(null);
    announcedDangersRef.current = new Set();
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

  const draftOpponentElo = engineEloForPlayer(Number(eloDraft) || profile.elo);
  const reviewing = panelMode === 'review';
  const displayMoves = reviewing && reviewGame ? reviewGame.moves : moves;

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
        <div className="header-actions">
          {coachMode && (
            <button
              type="button"
              className={`header-action-btn${panelMode === 'history' ? ' active' : ''}`}
              onClick={onOpenHistory}
              title="Game history"
              aria-label="Game history"
              aria-pressed={panelMode === 'history'}
            >
              <FontAwesomeIcon icon={faBookOpen} />
            </button>
          )}
          <button
            type="button"
            className={`header-action-btn config-button${showConfig ? ' active' : ''}`}
            onClick={() => setShowConfig((open) => !open)}
            title="Settings"
            aria-label="Settings"
            aria-pressed={showConfig}
          >
            <FontAwesomeIcon icon={faGear} />
          </button>
        </div>
      </header>
      <div className="content-container">
        <div className="main-column">
          <Board
            position={position}
            pieceStyle={pieceStyle}
            chessRulesEnforced={coachMode ? true : chessRulesEnforced}
            coachMode={coachMode && panelMode === 'play'}
            interactionDisabled={
              reviewing ||
              panelMode === 'history' ||
              busy ||
              gameOver ||
              (coachMode && !engineReady)
            }
            busy={busy}
            onPlayerMove={handlePlayerMove}
            hintFrom={hintSquares?.from || null}
            hintTo={hintSquares?.to || null}
            altFrom={altSquares?.from || null}
            altTo={altSquares?.to || null}
            dangerMarks={reviewing ? [] : dangerMarks}
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
              canUndo={!gameOver && history.length > 0 && panelMode === 'play'}
              onNewGame={onNewGame}
              onResign={onResign}
              theme={theme}
              moves={displayMoves}
              evalCp={evalCp}
              evalMate={evalMate}
              panelMode={panelMode}
              archivedGames={archivedGames}
              onCloseHistory={onCloseHistory}
              onReviewGame={onReviewGame}
              onDeleteArchived={onDeleteArchived}
              onExitReview={onExitReview}
              reviewPly={reviewPly}
              reviewMoveCount={reviewGame?.moves?.length || 0}
              onReviewPly={onReviewPlyChange}
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
                  {draftOpponentElo < MIN_UCI_ELO
                    ? `Opponent target ~${draftOpponentElo}. Chooses among Stockfish’s top moves like a human at that rating — missed tactics and believable mistakes, not random legal moves.`
                    : `Opponent plays ~${draftOpponentElo} Elo (Stockfish UCI_Elo).`}
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
                    const nextPiece = resolvePieceStyle(nextTheme, pieceStyle);
                    setTheme(nextTheme);
                    setPieceStyle(nextPiece);
                    updatePreferences({ theme: nextTheme, pieceStyle: nextPiece });
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
                  {pieceStylesForTheme(theme).map((style) => (
                    <option key={style.id} value={style.id}>
                      {style.label}
                    </option>
                  ))}
                </select>
              </label>
              {pieceStyle === 'military' && (
                <span className="elo-setting-hint">
                  Light uniforms against dark. A capture plays out as a short strike.
                </span>
              )}
              {pieceStyle === 'abstract' && (
                <span className="elo-setting-hint">
                  Flat insignia, light against dark.
                </span>
              )}
              {pieceStyle === 'symbols' && (
                <span className="elo-setting-hint">
                  Cartoon helmet, grenade, plane, crossed guns, tank, and target.
                </span>
              )}
              {pieceStyle === 'fantasy' && (
                <span className="elo-setting-hint">
                  Haven against Inferno. A capture plays out as a short fight. Select a piece to see who it is.
                </span>
              )}
              {coachMode && (
                <label style={{ flexFlow: 'row' }}>
                  Point out dangers:
                  <FontAwesomeIcon
                    icon={pointOutDangers ? faSquareCheck : faSquare}
                    onClick={() => {
                      const next = !pointOutDangers;
                      setPointOutDangers(next);
                      updatePreferences({ pointOutDangers: next });
                      if (!next) {
                        setDangerMarks([]);
                        announcedDangersRef.current = new Set();
                      } else {
                        try {
                          syncDangerMarks(parseFEN(position), { announce: false });
                        } catch {
                          setDangerMarks([]);
                        }
                      }
                    }}
                    size="lg"
                    style={{ marginLeft: '10px', cursor: 'pointer' }}
                  />
                </label>
              )}
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
