import { useEffect, useRef } from 'react';
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

function CoachPanel({
  profile,
  engineElo,
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
  const listRef = useRef(null);
  const rows = pairMoves(moves);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [moves.length]);

  return (
    <div className="coach-panel">
      <div className="coach-panel-header">
        <div className="coach-elo-block">
          <span className="coach-elo-label">Your Elo</span>
          <span className="coach-elo-value">{profile.elo}</span>
          {typeof profile.lastDelta === 'number' && profile.lastDelta !== 0 && (
            <span className={`coach-elo-delta ${profile.lastDelta > 0 ? 'up' : 'down'}`}>
              {profile.lastDelta > 0 ? '+' : ''}
              {profile.lastDelta}
            </span>
          )}
        </div>
        <div className="coach-elo-block secondary">
          <span className="coach-elo-label">Opponent</span>
          <span className="coach-elo-value">{engineElo}</span>
        </div>
        <div className="coach-record">
          {profile.wins}W · {profile.draws}D · {profile.losses}L
        </div>
      </div>

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

      <div className="coach-move-list" ref={listRef} aria-label="Move history">
        {rows.length === 0 ? (
          <p className="coach-move-empty">No moves yet</p>
        ) : (
          <ol className="coach-move-rows">
            {rows.map((row) => (
              <li key={row.n} className="coach-move-row">
                <span className="coach-move-num">{row.n}.</span>
                <MoveCell move={row.white} />
                <MoveCell move={row.black} />
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="coach-actions">
        <button type="button" className="coach-btn" onClick={onHint} disabled={busy || gameOver}>
          Hint
        </button>
        <button type="button" className="coach-btn" onClick={onUndo} disabled={busy || !canUndo}>
          Undo
        </button>
        <button type="button" className="coach-btn" onClick={onResign} disabled={busy || gameOver}>
          Resign
        </button>
        <button type="button" className="coach-btn primary" onClick={onNewGame} disabled={busy}>
          New game
        </button>
      </div>
    </div>
  );
}

export default CoachPanel;
