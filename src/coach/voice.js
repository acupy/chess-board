import { describeUciMove, explainMoveIdea } from '../chess';

/** Explain eval drop in plain language (pawn = unit of how much worse the position got). */
const formatLoss = (lossCp) => {
  if (typeof lossCp !== 'number' || lossCp < 30) return '';
  const pawns = lossCp / 100;
  if (pawns < 0.5) return '';
  return ` Your position got about ${pawns.toFixed(1)} pawns worse.`;
};

/**
 * Chatty, rule-based comment after the player moves.
 * Uses only verdict, described moves, and board-derived “why” lines — no LLM.
 */
export const coachOnMove = ({
  gameBefore,
  playedUci,
  bestUci,
  verdict,
  lossCp = 0,
}) => {
  const played = describeUciMove(gameBefore, playedUci) || 'that move';
  const whyPlayed = explainMoveIdea(gameBefore, playedUci);
  const best = bestUci ? describeUciMove(gameBefore, bestUci) : null;
  const whyBest = bestUci ? explainMoveIdea(gameBefore, bestUci) : '';
  const sameAsBest = Boolean(bestUci && playedUci === bestUci);

  if (verdict === 'excellent' || sameAsBest) {
    const why = whyPlayed ? ` ${whyPlayed}` : '';
    return `Yes! ${played} — that’s the best move here.${why} Well done.`;
  }

  if (verdict === 'good') {
    const why = whyPlayed ? ` ${whyPlayed}` : '';
    return `Nice — ${played} is a good move.${why} Keep it up.`;
  }

  if (!best) {
    if (verdict === 'inaccuracy') {
      return `Hmm, ${played} wasn’t the strongest. Take another look next time.`;
    }
    if (verdict === 'mistake') {
      return `Careful — ${played} was a mistake.${formatLoss(lossCp)} Stay calm and keep playing.`;
    }
    return `Ouch — ${played} was a blunder.${formatLoss(lossCp)} Don’t worry; focus on the next move.`;
  }

  const altWhy = whyBest ? ` ${whyBest}` : '';

  if (verdict === 'inaccuracy') {
    return `Hmm, ${played} wasn’t the strongest. I’d prefer ${best}.${altWhy}`;
  }

  if (verdict === 'mistake') {
    return `Careful — ${played} was a mistake.${formatLoss(lossCp)} I would have played ${best}.${altWhy}`;
  }

  // blunder
  return `Ouch — ${played} was a blunder.${formatLoss(lossCp)} Better was ${best}.${altWhy} Stay calm and play the next move carefully.`;
};

/**
 * Hint in coach voice — move + rule-based why only.
 */
export const coachHint = ({ game, bestUci }) => {
  if (!bestUci) {
    return 'I don’t see a clear tip right now — the game may already be over.';
  }
  const move = describeUciMove(game, bestUci);
  const why = explainMoveIdea(game, bestUci);
  if (why) {
    return `Try this: ${move}. ${why}`;
  }
  return `Try this: ${move}.`;
};

/**
 * Closing line after the game ends.
 */
export const coachGameOver = ({ result, playerElo, eloDelta = 0, reason }) => {
  const delta =
    typeof eloDelta === 'number' && eloDelta !== 0
      ? ` Your rating is now ${playerElo} (${eloDelta > 0 ? '+' : ''}${eloDelta}).`
      : ` Your rating is about ${playerElo}.`;

  if (result === 'win') {
    const how = reason === 'checkmate' ? 'Checkmate — you win!' : 'You win!';
    return `${how} Great game.${delta}`;
  }

  if (result === 'draw') {
    return `Draw — a fair fight.${delta}`;
  }

  const how =
    reason === 'checkmate'
      ? 'Checkmate — I win this time.'
      : reason === 'resignation'
        ? 'You resigned.'
        : 'You lost.';
  return `${how} That’s okay — every game teaches something.${delta}`;
};

const VERDICT_RANK = {
  excellent: 0,
  good: 1,
  inaccuracy: 2,
  mistake: 3,
  blunder: 4,
};

/**
 * Aggregate player-move quality for an end-of-game summary.
 */
export const summarizePlayerMoves = (moves = []) => {
  const playerMoves = moves.filter((m) => m?.by === 'player' && m.verdict);
  const counts = {
    excellent: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  };
  for (const move of playerMoves) {
    if (counts[move.verdict] != null) counts[move.verdict] += 1;
  }

  const strong = counts.excellent + counts.good;
  const slips = counts.mistake + counts.blunder;

  let best = null;
  let worst = null;
  for (const move of playerMoves) {
    const rank = VERDICT_RANK[move.verdict];
    if (rank == null) continue;

    if (!best || rank < VERDICT_RANK[best.verdict]) {
      best = move;
    } else if (rank === VERDICT_RANK[best.verdict] && (move.lossCp ?? 9999) < (best.lossCp ?? 9999)) {
      best = move;
    }

    if (!worst || rank > VERDICT_RANK[worst.verdict]) {
      worst = move;
    } else if (rank === VERDICT_RANK[worst.verdict] && (move.lossCp ?? 0) > (worst.lossCp ?? 0)) {
      worst = move;
    }
  }

  return { counts, strong, slips, total: playerMoves.length, best, worst };
};

/**
 * End-of-game coach line: result + what went well / what didn’t.
 */
export const coachGameSummary = ({
  result,
  playerElo,
  eloDelta = 0,
  reason,
  moves = [],
}) => {
  const closing = coachGameOver({ result, playerElo, eloDelta, reason });
  const { counts, strong, slips, total } = summarizePlayerMoves(moves);

  if (total === 0) {
    return `${closing} Open History anytime to review past games.`;
  }

  const parts = [closing];

  if (strong > 0 && slips === 0) {
    parts.push(
      ` You played ${strong} strong move${strong === 1 ? '' : 's'} with no big slips — nice consistency.`
    );
  } else if (strong > 0) {
    parts.push(
      ` You had ${strong} strong move${strong === 1 ? '' : 's'} and ${slips} real slip${slips === 1 ? '' : 's'}.`
    );
  } else if (slips > 0) {
    parts.push(
      ` There were ${slips} tough moment${slips === 1 ? '' : 's'} this game — worth a quick review.`
    );
  }

  if (counts.excellent > 0) {
    parts.push(
      ` Highlight: ${counts.excellent} excellent find${counts.excellent === 1 ? '' : 's'}.`
    );
  }

  parts.push(' Open History to step through the game with me.');
  return parts.join('');
};

/**
 * Review-mode comment for a single ply (player or engine).
 * Slips (!! not used here — ?? / ? / ?!) lead with the better move like a live hint.
 */
export const coachReviewMove = ({ gameBefore, move }) => {
  if (!move) {
    return 'Start of the game. Step forward to walk through the moves.';
  }

  if (move.by === 'engine') {
    const played = describeUciMove(gameBefore, move.uci) || move.uci;
    return `I played ${played}. Step forward when you’re ready.`;
  }

  if (!gameBefore) {
    return 'Looking back — step through to see what changed.';
  }

  const played = describeUciMove(gameBefore, move.uci) || move.uci;
  const verdict = move.verdict || 'good';
  const bestUci = move.bestUci;
  const isSlip =
    verdict === 'inaccuracy' || verdict === 'mistake' || verdict === 'blunder';
  const hasBetter = Boolean(bestUci && bestUci !== move.uci);

  if (isSlip && hasBetter) {
    const best = describeUciMove(gameBefore, bestUci) || bestUci;
    const whyBest = explainMoveIdea(gameBefore, bestUci);
    const label =
      verdict === 'blunder' ? 'blunder' : verdict === 'mistake' ? 'mistake' : 'inaccuracy';
    const why = whyBest ? ` ${whyBest}` : '';
    return `You played ${played} — that was a ${label}.${formatLoss(move.lossCp || 0)} Better would have been ${best}.${why}`;
  }

  if (isSlip && !hasBetter) {
    const label =
      verdict === 'blunder' ? 'blunder' : verdict === 'mistake' ? 'mistake' : 'inaccuracy';
    return `You played ${played} — that was a ${label}.${formatLoss(move.lossCp || 0)} I’m checking what would have been stronger…`;
  }

  if (hasBetter) {
    const best = describeUciMove(gameBefore, bestUci) || bestUci;
    const whyBest = explainMoveIdea(gameBefore, bestUci);
    const why = whyBest ? ` ${whyBest}` : '';
    return `You played ${played}. A stronger idea was ${best}.${why}`;
  }

  const body = coachOnMove({
    gameBefore,
    playedUci: move.uci,
    bestUci,
    verdict,
    lossCp: move.lossCp || 0,
  });
  return body;
};

export const coachWelcome = () =>
  'I’ll play a bit stronger than your rating so the games help you improve. Make a move — I’ll praise strong play and point out mistakes clearly.';

export const coachUndo = () =>
  'Okay, that move is undone. Your turn again.';

/**
 * Point out new hanging pieces / absolute pins for the learner.
 * @param {{ kind: string, label: string }[]} dangers
 */
export const coachDanger = (dangers) => {
  if (!dangers?.length) return '';

  const hangings = dangers.filter((d) => d.kind === 'hanging');
  const pins = dangers.filter((d) => d.kind === 'pin');
  const parts = [];

  if (hangings.length === 1) {
    parts.push(`Careful — ${hangings[0].label} is hanging (attacked and not defended).`);
  } else if (hangings.length > 1) {
    const list = hangings.map((d) => d.label.replace(/^your /, '')).join(', ');
    parts.push(`Careful — these pieces are hanging: ${list}.`);
  }

  if (pins.length === 1) {
    parts.push(
      hangings.length
        ? `Also, ${pins[0].label} is pinned to your king — it can’t safely move off that line.`
        : `Watch out — ${pins[0].label} is pinned to your king — it can’t safely move off that line.`
    );
  } else if (pins.length > 1) {
    const list = pins.map((d) => d.label.replace(/^your /, '')).join(', ');
    parts.push(
      hangings.length
        ? `Also, these pieces are pinned to your king: ${list}.`
        : `Watch out — these pieces are pinned to your king: ${list}.`
    );
  }

  return parts.join(' ');
};
