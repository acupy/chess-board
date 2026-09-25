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
    return `${how} Great game.${delta} Ready for another when you are.`;
  }

  if (result === 'draw') {
    return `Draw — a fair fight.${delta} Want to try again for a win?`;
  }

  const how =
    reason === 'checkmate'
      ? 'Checkmate — I win this time.'
      : reason === 'resignation'
        ? 'You resigned.'
        : 'You lost.';
  return `${how} That’s okay — every game teaches something.${delta} Start a new game whenever you’re ready.`;
};

export const coachWelcome = () =>
  'I’ll play a bit stronger than your rating so the games help you improve. Make a move — I’ll praise strong play and point out mistakes clearly.';

export const coachUndo = () =>
  'Okay, that move is undone. Your turn again.';
