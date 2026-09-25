import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFlag,
  faLightbulb,
  faPlus,
  faRotateLeft,
} from '@fortawesome/free-solid-svg-icons';
import CoachAvatar, { moodFromVerdict } from './CoachAvatar';

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

/** Pair plies into numbered rows: [{ n, white, black }] */
function pairMoves(moves) {
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({
      n: Math.floor(i / 2) + 1,
      white: moves[i] || null,
      black: moves[i + 1] || null,
    });
  }
  return rows;
}

function MoveCell({ move }) {
  if (!move) return <span className="coach-move-cell empty">…</span>;
  const mark = move.verdict ? VERDICT_SHORT[move.verdict] : '';
  return (
    <span
      className={`coach-move-cell ${move.by}${move.verdict ? ` verdict-${move.verdict}` : ''}`}
      title={move.verdict ? VERDICT_LABELS[move.verdict] : undefined}
    >
      {formatUci(move.uci)}
      {mark && <span className="coach-move-mark">{mark}</span>}
    </span>
  );
}

function MoveRows({ rows }) {
  if (rows.length === 0) {
    return <p className="coach-move-empty">No moves yet</p>;
  }
  return (
    <ol className="coach-move-rows">
      {rows.map((row) => (
        <li key={row.n} className="coach-move-row">
          <span className="coach-move-num">{row.n}.</span>
          <MoveCell move={row.white} />
          <MoveCell move={row.black} />
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
  theme = 'gray',
  moves = [],
}) {
  const mood = moodFromVerdict(verdict, { busy, gameOver, status });
  const rows = pairMoves(moves);
  const listRef = useRef(null);
  // null = follow the latest moves (mobile skipper)
  const [historyEnd, setHistoryEnd] = useState(null);
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

  return (
    <div className="coach-panel">
      <div className="coach-body">
        <CoachAvatar mood={mood} theme={theme} />
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
          <MoveRows rows={visible} />
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
        <MoveRows rows={rows} />
      </div>

      <div className="coach-footer">
        <div className="coach-record" title="Wins · Draws · Losses">
          <span>{profile.wins}W</span>
          <span>{profile.draws}D</span>
          <span>{profile.losses}L</span>
        </div>
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
            onClick={onResign}
            disabled={busy || gameOver}
            icon={faFlag}
            label="Resign"
          />
          <ActionButton
            className="coach-btn primary"
            onClick={onNewGame}
            disabled={busy}
            icon={faPlus}
            label="New"
          />
        </div>
      </div>
    </div>
  );
}

export default CoachPanel;
