import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faChevronLeft,
  faChevronRight,
  faFlag,
  faLightbulb,
  faPlus,
  faRotateLeft,
  faTrash,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import CoachAvatar, { moodFromVerdict } from './CoachAvatar';
import EvalDoughnut from './EvalDoughnut';
import {
  formatArchiveDate,
  formatArchiveResult,
} from './coach/archive';

const VERDICT_LABELS = {
  excellent: 'Excellent',
  good: 'Good move',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
};

const VERDICT_SHORT = {
  excellent: '!!',
  good: '!',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
};

const HISTORY_WINDOW = 2;

/** Format UCI like e2e4 → e2–e4, e7e8q → e7–e8=Q */
function formatUci(uci) {
  if (!uci || uci.length < 4) return uci || '';
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promo = uci.length >= 5 ? `=${uci[4].toUpperCase()}` : '';
  return `${from}–${to}${promo}`;
}

/** Pair plies into numbered rows: [{ n, white, black, whiteIndex, blackIndex }] */
function pairMoves(moves) {
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({
      n: Math.floor(i / 2) + 1,
      white: moves[i] || null,
      black: moves[i + 1] || null,
      whiteIndex: i,
      blackIndex: i + 1 < moves.length ? i + 1 : null,
    });
  }
  return rows;
}

function MoveCell({ move, active, onSelect }) {
  if (!move) return <span className="coach-move-cell empty">…</span>;
  const mark = move.verdict ? VERDICT_SHORT[move.verdict] : '';
  const className = [
    'coach-move-cell',
    move.by,
    move.verdict ? `verdict-${move.verdict}` : '',
    active ? 'active' : '',
    onSelect ? 'selectable' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (onSelect) {
    return (
      <button
        type="button"
        className={className}
        title={move.verdict ? VERDICT_LABELS[move.verdict] : undefined}
        onClick={onSelect}
      >
        {formatUci(move.uci)}
        {mark && <span className="coach-move-mark">{mark}</span>}
      </button>
    );
  }

  return (
    <span
      className={className}
      title={move.verdict ? VERDICT_LABELS[move.verdict] : undefined}
    >
      {formatUci(move.uci)}
      {mark && <span className="coach-move-mark">{mark}</span>}
    </span>
  );
}

function MoveRows({ rows, activePly = null, onSelectPly = null }) {
  if (rows.length === 0) {
    return <p className="coach-move-empty">No moves yet</p>;
  }
  return (
    <ol className="coach-move-rows">
      {rows.map((row) => (
        <li key={row.n} className="coach-move-row">
          <span className="coach-move-num">{row.n}.</span>
          <MoveCell
            move={row.white}
            active={activePly === row.whiteIndex + 1}
            onSelect={
              onSelectPly && row.white
                ? () => onSelectPly(row.whiteIndex + 1)
                : undefined
            }
          />
          <MoveCell
            move={row.black}
            active={activePly === row.blackIndex + 1}
            onSelect={
              onSelectPly && row.black != null && row.blackIndex != null
                ? () => onSelectPly(row.blackIndex + 1)
                : undefined
            }
          />
        </li>
      ))}
    </ol>
  );
}

function ActionButton({ className, onClick, disabled, icon, label }) {
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
    >
      <FontAwesomeIcon icon={icon} className="coach-btn-icon" />
      <span className="coach-btn-label">{label}</span>
    </button>
  );
}

function HistoryList({ games, onReview, onDelete, onClose }) {
  return (
    <div className="coach-panel coach-panel--history">
      <div className="coach-history-header">
        <h2 className="coach-history-title">Game history</h2>
        <button
          type="button"
          className="coach-hist-btn"
          aria-label="Close history"
          onClick={onClose}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
      {games.length === 0 ? (
        <p className="coach-move-empty">No finished games yet. Play one to review it here.</p>
      ) : (
        <ul className="coach-history-list">
          {games.map((game) => (
            <li key={game.id} className="coach-history-item">
              <button
                type="button"
                className="coach-history-main"
                onClick={() => onReview(game)}
              >
                <span className={`coach-history-result result-${game.result}`}>
                  {formatArchiveResult(game.result)}
                </span>
                <span className="coach-history-meta">
                  {formatArchiveDate(game.savedAt)}
                  {typeof game.eloDelta === 'number' && game.eloDelta !== 0 && (
                    <span className={game.eloDelta > 0 ? 'up' : 'down'}>
                      {' '}
                      {game.eloDelta > 0 ? '+' : ''}
                      {game.eloDelta}
                    </span>
                  )}
                </span>
                <span className="coach-history-plies">
                  {game.moves?.length || 0} plies
                </span>
              </button>
              <button
                type="button"
                className="coach-hist-btn"
                aria-label="Delete game"
                title="Delete"
                onClick={() => onDelete(game.id)}
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CoachPanel({
  profile,
  verdict,
  coachMessage,
  status,
  busy,
  gameOver,
  onHint,
  onUndo,
  canUndo = false,
  onNewGame,
  onResign,
  theme = 'classic',
  moves = [],
  evalCp = 0,
  evalMate = null,
  panelMode = 'play',
  archivedGames = [],
  onCloseHistory,
  onReviewGame,
  onDeleteArchived,
  onExitReview,
  reviewPly = 0,
  reviewMoveCount = 0,
  onReviewPly,
}) {
  const mood = moodFromVerdict(verdict, { busy, gameOver, status });
  const rows = pairMoves(moves);
  const listRef = useRef(null);
  const [historyEnd, setHistoryEnd] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // 'resign' | 'new' | null
  const followLatest = historyEnd == null;
  const end = followLatest ? rows.length : Math.min(historyEnd, rows.length);
  const start = Math.max(0, end - HISTORY_WINDOW);
  const visible = rows.slice(start, end);
  const canOlder = start > 0;
  const canNewer = end < rows.length;

  const prevLen = useRef(moves.length);
  useEffect(() => {
    if (moves.length !== prevLen.current) {
      prevLen.current = moves.length;
      if (followLatest) setHistoryEnd(null);
    }
  }, [moves.length, followLatest]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [moves.length]);

  useEffect(() => {
    setConfirmAction(null);
  }, [panelMode, gameOver, busy]);

  if (panelMode === 'history') {
    return (
      <HistoryList
        games={archivedGames}
        onReview={onReviewGame}
        onDelete={onDeleteArchived}
        onClose={onCloseHistory}
      />
    );
  }

  const reviewing = panelMode === 'review';
  const activePly = reviewing ? reviewPly : null;

  return (
    <div className={`coach-panel${reviewing ? ' coach-panel--review' : ''}`}>
      <div className="coach-body">
        <div className="coach-aside">
          <CoachAvatar mood={mood} theme={theme} />
          <EvalDoughnut cp={evalCp} mate={evalMate} soft={busy} />
        </div>
        <div className="coach-speech">
          {verdict && (
            <div className={`coach-verdict verdict-${verdict}`}>
              {VERDICT_LABELS[verdict] || verdict}
            </div>
          )}
          <p className="coach-message">
            {coachMessage ||
              'Make a move — I’ll cheer the good ones and be honest about the rest.'}
          </p>
          {status && <p className="coach-status">{status}</p>}
        </div>
      </div>

      <div className="coach-move-list coach-move-list--compact" aria-label="Move history">
        <button
          type="button"
          className="coach-hist-btn"
          aria-label="Older moves"
          disabled={!canOlder}
          onClick={() => setHistoryEnd(Math.max(HISTORY_WINDOW, end - HISTORY_WINDOW))}
        >
          ‹
        </button>
        <div className="coach-move-window">
          <MoveRows
            rows={visible}
            activePly={activePly}
            onSelectPly={reviewing ? onReviewPly : null}
          />
        </div>
        <button
          type="button"
          className="coach-hist-btn"
          aria-label="Newer moves"
          disabled={!canNewer}
          onClick={() => {
            const next = end + HISTORY_WINDOW;
            setHistoryEnd(next >= rows.length ? null : next);
          }}
        >
          ›
        </button>
      </div>

      <div
        className="coach-move-list coach-move-list--full"
        aria-label="Move history"
        ref={listRef}
      >
        <MoveRows
          rows={rows}
          activePly={activePly}
          onSelectPly={reviewing ? onReviewPly : null}
        />
      </div>

      <div className="coach-footer">
        {!reviewing && (
          <div className="coach-record" title="Wins · Draws · Losses">
            <span>{profile.wins}W</span>
            <span>{profile.draws}D</span>
            <span>{profile.losses}L</span>
          </div>
        )}
        {reviewing ? (
          <div className="coach-actions">
            <ActionButton
              className="coach-btn"
              onClick={() => onReviewPly?.(Math.max(0, reviewPly - 1))}
              disabled={reviewPly <= 0}
              icon={faChevronLeft}
              label="Prev"
            />
            <ActionButton
              className="coach-btn"
              onClick={() => onReviewPly?.(Math.min(reviewMoveCount, reviewPly + 1))}
              disabled={reviewPly >= reviewMoveCount}
              icon={faChevronRight}
              label="Next"
            />
            <ActionButton
              className="coach-btn primary"
              onClick={onExitReview}
              disabled={false}
              icon={faXmark}
              label="Exit"
            />
          </div>
        ) : confirmAction ? (
          <div className="coach-confirm" role="alertdialog" aria-labelledby="coach-confirm-label">
            <p id="coach-confirm-label" className="coach-confirm-text">
              {confirmAction === 'resign'
                ? 'Resign this game?'
                : gameOver
                  ? 'Start a new game?'
                  : 'Leave this game and start a new one?'}
            </p>
            <div className="coach-actions">
              <ActionButton
                className={`coach-btn ${confirmAction === 'resign' ? 'danger' : 'primary'}`}
                onClick={() => {
                  const action = confirmAction;
                  setConfirmAction(null);
                  if (action === 'resign') onResign?.();
                  else onNewGame?.();
                }}
                disabled={busy}
                icon={faCheck}
                label={confirmAction === 'resign' ? 'Resign' : 'New game'}
              />
              <ActionButton
                className="coach-btn"
                onClick={() => setConfirmAction(null)}
                disabled={false}
                icon={faXmark}
                label="Cancel"
              />
            </div>
          </div>
        ) : (
          <div className="coach-actions">
            <ActionButton
              className="coach-btn"
              onClick={onHint}
              disabled={busy || gameOver}
              icon={faLightbulb}
              label="Hint"
            />
            <ActionButton
              className="coach-btn"
              onClick={onUndo}
              disabled={busy || !canUndo}
              icon={faRotateLeft}
              label="Undo"
            />
            <ActionButton
              className="coach-btn"
              onClick={() => setConfirmAction('resign')}
              disabled={busy || gameOver}
              icon={faFlag}
              label="Resign"
            />
            <ActionButton
              className="coach-btn primary"
              onClick={() => setConfirmAction('new')}
              disabled={busy}
              icon={faPlus}
              label="New"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default CoachPanel;
