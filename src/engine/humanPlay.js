import { EMPTY } from '../consts';
import {
  applyUciMove,
  findHangingPieces,
  inspectUciMove,
  isWhiteToMove,
  listAttackers,
  listLegalUciMoves,
  parseUciMove,
} from '../chess';
import { noticeRatesForElo, qualityForLossCp, qualityWeightsForElo } from './strength';

const PIECE_CP = { p: 100, n: 300, b: 300, r: 500, q: 900, k: 0 };

const LUFT_SQUARES = new Set(['h3', 'h6', 'a3', 'a6', 'g3', 'g6']);
const AIMLESS_WING = new Set(['a4', 'a5', 'h4', 'h5']);

const squareKey = (coords) => (coords ? `${coords[0]},${coords[1]}` : '');

const hangingSet = (hangings) => new Set(hangings.map((h) => h.square));

const pieceAttacksEnemy = (board, from, usWhite) => {
  for (let rank = 0; rank < 8; rank++) {
    for (let column = 0; column < 8; column++) {
      const piece = board[rank][column];
      if (piece === EMPTY) continue;
      const enemy = usWhite ? piece === piece.toLowerCase() : piece === piece.toUpperCase();
      if (!enemy || piece.toLowerCase() === 'k') continue;
      const attackers = listAttackers(board, rank, column, usWhite);
      if (attackers.some((a) => a.rank === from[0] && a.column === from[1])) return true;
    }
  }
  return false;
};

export const featuresForMove = (game, uci, { lastOpponentUci = null, lastOwnUci = null } = {}) => {
  const facts = inspectUciMove(game, uci);
  if (!facts) return null;

  const usWhite = isWhiteToMove(game);
  const ourHanging = findHangingPieces(game.board, usWhite);
  const theirHanging = findHangingPieces(game.board, !usWhite);
  const next = applyUciMove(game, uci);
  const ourHangingAfter = next ? findHangingPieces(next.board, usWhite) : ourHanging;

  const ourBefore = hangingSet(ourHanging);
  const ourAfter = hangingSet(ourHangingAfter);
  const theirBefore = hangingSet(theirHanging);

  const lastOpp = lastOpponentUci ? parseUciMove(lastOpponentUci) : null;
  const lastOwn = lastOwnUci ? parseUciMove(lastOwnUci) : null;

  const takesHanging = Boolean(facts.isCapture && theirBefore.has(facts.toSq));
  const isRecapture = Boolean(
    facts.isCapture && lastOpp && lastOpp.to[0] === facts.to[0] && lastOpp.to[1] === facts.to[1]
  );
  const addressesThreat = ourBefore.has(facts.fromSq) || takesHanging;
  const leavesHanging = [...ourAfter].some((sq) => !ourBefore.has(sq));
  const ignoresHanging = ourHanging.length > 0 && !addressesThreat;

  const attackersOfFrom = listAttackers(game.board, facts.from[0], facts.from[1], !usWhite);
  const capturesAttacker = Boolean(
    facts.isCapture &&
      attackersOfFrom.some((a) => a.rank === facts.to[0] && a.column === facts.to[1])
  );

  return {
    uci,
    name: facts.name,
    fromSq: facts.fromSq,
    toSq: facts.toSq,
    isCapture: facts.isCapture,
    givesCheck: facts.givesCheck,
    isCastle: facts.isCastle,
    isPawnMove: facts.name === 'pawn',
    develops: Boolean(facts.leavesBackRank),
    isRecapture,
    takesHanging,
    addressesThreat: addressesThreat || capturesAttacker,
    leavesHanging,
    ignoresHanging,
    attacksPiece: Boolean(next && pieceAttacksEnemy(next.board, facts.to, usWhite)),
    isLuftOrProbe: facts.name === 'pawn' && LUFT_SQUARES.has(facts.toSq) && !facts.isCapture,
    isAimlessWingPush: facts.name === 'pawn' && AIMLESS_WING.has(facts.toSq) && !facts.isCapture,
    repeatsPiece: Boolean(
      lastOwn && lastOwn.to[0] === facts.from[0] && lastOwn.to[1] === facts.from[1]
    ),
    capturedName: facts.capturedName,
  };
};

export const salienceForFeatures = (features, elo) => {
  if (!features) return 0;
  const notice = noticeRatesForElo(elo);
  let score = 0.06;

  if (features.isRecapture) score += 1.15;
  if (features.takesHanging) score += 1.05 * notice.hangingOpponent;
  if (features.givesCheck) score += 0.95 * notice.checks;
  if (features.isCapture) score += 0.8 * notice.captures;
  if (features.addressesThreat) score += 0.85 * notice.ownHanging;
  if (features.attacksPiece) score += 0.42;
  if (features.develops) score += 0.4 * notice.development;
  if (features.isCastle) score += 0.55 * notice.castle;
  if (features.isPawnMove) score += elo < 800 ? 0.38 : 0.16;
  if (features.isLuftOrProbe) score += elo < 900 ? 0.32 : 0.08;
  if (features.repeatsPiece) score += elo < 800 ? 0.22 : 0.04;
  if (features.isAimlessWingPush) score *= 0.12;
  if (features.leavesHanging && !features.isCapture) score *= 0.55;

  return Math.max(0.01, score);
};

const estimateLossCp = (features) => {
  if (!features) return 800;
  if (features.takesHanging || features.isRecapture) return 15;
  if (features.givesCheck && features.isCapture) return 40;
  if (features.leavesHanging) return 420;
  if (features.ignoresHanging && features.isLuftOrProbe) return 220;
  if (features.ignoresHanging) return 300;
  if (features.givesCheck) return 90;
  if (features.isCapture) return 80;
  if (features.develops) return 110;
  if (features.isLuftOrProbe) return 200;
  if (features.isAimlessWingPush) return 650;
  return 240;
};

export const pickWeighted = (items, weightOf, rng = Math.random) => {
  if (!items.length) return null;
  const weights = items.map((item) => Math.max(0, weightOf(item)));
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return items[0];
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
};

const buildExtras = (game, already, elo, ctx) => {
  const legal = listLegalUciMoves(game);
  const extras = [];
  for (const uci of legal) {
    if (already.has(uci)) continue;
    const features = featuresForMove(game, uci, ctx);
    if (!features) continue;
    const interesting =
      features.isRecapture ||
      features.takesHanging ||
      features.givesCheck ||
      features.isCapture ||
      features.addressesThreat ||
      features.isLuftOrProbe ||
      (features.develops && elo < 900);
    if (!interesting) continue;
    extras.push({
      uci,
      features,
      lossCp: estimateLossCp(features),
      fromEngine: false,
    });
  }
  extras.sort((a, b) => salienceForFeatures(b.features, elo) - salienceForFeatures(a.features, elo));
  return extras.slice(0, 8);
};

/**
 * Choose a human-like move from Stockfish MultiPV lines (plus a few
 * salient extras a weak player would still look at).
 *
 * @param {{
 *   game: object,
 *   engineLines: { uci: string, cp: number }[],
 *   elo: number,
 *   lastOpponentUci?: string | null,
 *   lastOwnUci?: string | null,
 *   rng?: () => number,
 * }} args
 * @returns {string | null}
 */
export const pickHumanMove = ({
  game,
  engineLines,
  elo,
  lastOpponentUci = null,
  lastOwnUci = null,
  rng = Math.random,
}) => {
  const ctx = { lastOpponentUci, lastOwnUci };
  const legal = new Set(listLegalUciMoves(game));
  const lines = (engineLines || []).filter((line) => line?.uci && legal.has(line.uci));
  const bestCp = lines.reduce((best, line) => Math.max(best, line.cp), -Infinity);

  const pool = [];
  const seen = new Set();
  for (const line of lines) {
    const features = featuresForMove(game, line.uci, ctx);
    if (!features) continue;
    seen.add(line.uci);
    pool.push({
      uci: line.uci,
      features,
      lossCp: Number.isFinite(bestCp) ? bestCp - line.cp : estimateLossCp(features),
      fromEngine: true,
    });
  }

  for (const extra of buildExtras(game, seen, elo, ctx)) {
    seen.add(extra.uci);
    pool.push(extra);
  }

  if (!pool.length) {
    const fallback = listLegalUciMoves(game);
    return fallback[0] || null;
  }

  const notice = noticeRatesForElo(elo);
  let considered = [...pool];

  const winningTactics = considered.filter(
    (move) => (move.features.takesHanging || (move.features.givesCheck && move.lossCp <= 40)) && move.lossCp <= 80
  );
  if (winningTactics.length && rng() > notice.hangingOpponent) {
    const hidden = new Set(winningTactics.map((move) => move.uci));
    const rest = considered.filter((move) => !hidden.has(move.uci));
    if (rest.length) considered = rest;
  }

  const usWhite = isWhiteToMove(game);
  const ourHanging = findHangingPieces(game.board, usWhite);
  if (ourHanging.length && rng() > notice.ownHanging) {
    for (const move of considered) {
      if (move.features.addressesThreat) move.distractPenalty = 0.22;
      else if (move.features.isLuftOrProbe || move.features.develops || move.features.givesCheck) {
        move.distractBonus = 1.85;
      } else if (move.features.isAimlessWingPush) {
        move.distractPenalty = 0.08;
      }
    }
  }

  const qualityPrior = qualityWeightsForElo(elo);
  const picked = pickWeighted(
    considered,
    (move) => {
      const quality = qualityForLossCp(move.lossCp);
      const salience = salienceForFeatures(move.features, elo);
      const closeness = 1 / (1 + Math.max(0, move.lossCp) / 220);
      return (
        (qualityPrior[quality] || 0.001) *
        salience *
        closeness *
        (move.distractBonus || 1) *
        (move.distractPenalty || 1)
      );
    },
    rng
  );

  return picked?.uci || considered[0].uci;
};
