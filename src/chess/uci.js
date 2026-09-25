import { EMPTY, FIELD_AVAILABILITY } from '../consts';
import { isInCheck, isWhiteToMove, pieceBelongsToSideToMove } from './attacks';
import { coordsToSquare, squareToCoords } from './board';
import { applyMove, getLegalMoveMatrix } from './moves';

export const GAME_RESULT = {
  PLAYING: 'playing',
  CHECKMATE: 'checkmate',
  STALEMATE: 'stalemate',
};

/**
 * Parse a UCI move like "e2e4" or "e7e8q" into from/to coords and optional promotion.
 */
export const parseUciMove = (uci) => {
  if (!uci || uci.length < 4) return null;
  const from = squareToCoords(uci.slice(0, 2));
  const to = squareToCoords(uci.slice(2, 4));
  if (!from || !to) return null;
  const promotion = uci.length >= 5 ? uci[4].toLowerCase() : null;
  return { from, to, promotion };
};

export const coordsToUci = (from, to, promotion = null) => {
  const base = `${coordsToSquare(from)}${coordsToSquare(to)}`;
  return promotion ? `${base}${promotion}` : base;
};

const PIECE_NAMES = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

/**
 * Human-readable description of a UCI move in the given position.
 * e.g. "knight g1 to f3", "pawn e4 takes d5", "castle kingside"
 */
export const describeUciMove = (game, uci) => {
  const parsed = parseUciMove(uci);
  if (!parsed || !game) {
    if (!uci || uci.length < 4) return uci || '';
    const promo = uci.length >= 5 ? `, promote to ${PIECE_NAMES[uci[4].toLowerCase()] || uci[4]}` : '';
    return `${uci.slice(0, 2)} to ${uci.slice(2, 4)}${promo}`;
  }

  const { from, to, promotion } = parsed;
  const fromSq = coordsToSquare(from);
  const toSq = coordsToSquare(to);
  const piece = game.board[from[0]]?.[from[1]];
  if (!piece || piece === EMPTY) return `${fromSq} to ${toSq}`;

  const name = PIECE_NAMES[piece.toLowerCase()] || 'piece';

  // Castling
  if (piece.toLowerCase() === 'k' && Math.abs(from[1] - to[1]) === 2) {
    return to[1] > from[1] ? 'castle kingside' : 'castle queenside';
  }

  const target = game.board[to[0]][to[1]];
  const isEp =
    piece.toLowerCase() === 'p' &&
    game.enPassant &&
    to[0] === game.enPassant[0] &&
    to[1] === game.enPassant[1];
  const isCapture = (target && target !== EMPTY) || isEp;

  let text = isCapture ? `${name} ${fromSq} takes on ${toSq}` : `${name} ${fromSq} to ${toSq}`;
  if (promotion) {
    text += `, promote to ${PIECE_NAMES[promotion] || promotion}`;
  }
  return text;
};

/**
 * Prefer Stockfish's best move only if it is legal in our rules engine.
 */
export const pickLegalEngineMove = (game, ...candidates) => {
  const legal = new Set(listLegalUciMoves(game));
  for (const raw of candidates) {
    if (!raw || raw === '(none)') continue;
    if (legal.has(raw)) return raw;
    if (raw.length === 4 && legal.has(`${raw}q`)) return `${raw}q`;
  }
  return null;
};

const needsPromotion = (game, from, to) => {
  const piece = game.board[from[0]][from[1]];
  if (!piece || piece.toUpperCase() !== 'P') return false;
  return to[0] === 0 || to[0] === 7;
};

/**
 * Apply a UCI string through the rules engine. Promotion defaults to queen.
 */
export const applyUciMove = (game, uci) => {
  const parsed = parseUciMove(uci);
  if (!parsed) return null;

  const { from, to, promotion } = parsed;
  const piece = game.board[from[0]][from[1]];
  if (!piece || piece === EMPTY) return null;
  if (!pieceBelongsToSideToMove(game, piece)) return null;

  const matrix = getLegalMoveMatrix(game, from);
  const availability = matrix[to[0]][to[1]];
  if (
    availability !== FIELD_AVAILABILITY.AVAILABLE &&
    availability !== FIELD_AVAILABILITY.HIT
  ) {
    return null;
  }

  const next = applyMove(game, from, to);

  // applyMove already promotes to queen; override if a different piece was requested
  if (promotion && needsPromotion(game, from, to)) {
    const white = piece === piece.toUpperCase();
    const map = { q: 'q', r: 'r', b: 'b', n: 'n' };
    const chosen = map[promotion] || 'q';
    next.board[to[0]][to[1]] = white ? chosen.toUpperCase() : chosen;
  }

  return next;
};

/**
 * List all legal moves for the side to move as UCI strings.
 * Pawn promotions are listed as queen-only (…q) to match engine apply defaults.
 */
export const listLegalUciMoves = (game) => {
  const moves = [];

  for (let rank = 0; rank < 8; rank++) {
    for (let column = 0; column < 8; column++) {
      const piece = game.board[rank][column];
      if (piece === EMPTY || !pieceBelongsToSideToMove(game, piece)) continue;

      const from = [rank, column];
      const matrix = getLegalMoveMatrix(game, from);

      for (let toRank = 0; toRank < 8; toRank++) {
        for (let toColumn = 0; toColumn < 8; toColumn++) {
          const availability = matrix[toRank][toColumn];
          if (
            availability !== FIELD_AVAILABILITY.AVAILABLE &&
            availability !== FIELD_AVAILABILITY.HIT
          ) {
            continue;
          }
          const to = [toRank, toColumn];
          const promo = needsPromotion(game, from, to) ? 'q' : null;
          moves.push(coordsToUci(from, to, promo));
        }
      }
    }
  }

  return moves;
};

export const hasLegalMoves = (game) => listLegalUciMoves(game).length > 0;

/**
 * @returns {'playing'|'checkmate'|'stalemate'}
 */
export const getGameResult = (game) => {
  if (hasLegalMoves(game)) return GAME_RESULT.PLAYING;
  const white = isWhiteToMove(game);
  if (isInCheck(game.board, white)) return GAME_RESULT.CHECKMATE;
  return GAME_RESULT.STALEMATE;
};

/**
 * Winner from the perspective of White when the game has ended.
 * @returns {'white'|'black'|'draw'|null}
 */
export const getWinner = (game) => {
  const result = getGameResult(game);
  if (result === GAME_RESULT.STALEMATE) return 'draw';
  if (result === GAME_RESULT.CHECKMATE) {
    // Side to move is checkmated, so the other side won
    return isWhiteToMove(game) ? 'black' : 'white';
  }
  return null;
};
