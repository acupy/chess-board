import { describe, expect, it } from 'vitest';
import { FIELD_AVAILABILITY } from '../consts';
import { parseFEN, serializeFEN, validateFEN } from './fen';
import { isInCheck } from './attacks';
import { applyMove, getLegalMoveMatrix, getPseudoLegalMoveMatrix, tryMove } from './moves';

const at = (square) => {
  const column = square.charCodeAt(0) - 97;
  const rank = 8 - Number(square[1]);
  return [rank, column];
};

const availabilityAt = (matrix, square) => {
  const [rank, column] = at(square);
  return matrix[rank][column];
};

const legalSquares = (fen, fromSquare) => {
  const game = parseFEN(fen);
  const matrix = getLegalMoveMatrix(game, at(fromSquare));
  const squares = [];
  for (let rank = 0; rank < 8; rank++) {
    for (let column = 0; column < 8; column++) {
      const value = matrix[rank][column];
      if (value === FIELD_AVAILABILITY.AVAILABLE || value === FIELD_AVAILABILITY.HIT) {
        squares.push(`${String.fromCharCode(97 + column)}${8 - rank}`);
      }
    }
  }
  return squares.sort();
};

describe('FEN', () => {
  it('accepts placement-only and full FEN', () => {
    expect(validateFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')).toBe(true);
    expect(validateFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe(true);
    expect(validateFEN('8/8/8/8/8/8/8')).toBe(false);
  });

  it('infers castling rights from a placement-only FEN', () => {
    const game = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    expect(game.castling).toEqual({ K: true, Q: true, k: true, q: true });
    expect(game.turn).toBe('w');
  });

  it('round-trips a full FEN', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    expect(serializeFEN(parseFEN(fen))).toBe(fen);
  });
});

describe('sliding and leaping pieces', () => {
  it('lets a rook slide and capture, but not jump', () => {
    const fen = '8/8/8/8/8/8/8/R3n3 w - - 0 1';
    const squares = legalSquares(fen, 'a1');
    expect(squares).toEqual(['a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'b1', 'c1', 'd1', 'e1']);
  });

  it('lets a bishop move on diagonals until blocked', () => {
    const fen = '8/8/8/8/8/8/8/B6p w - - 0 1';
    const squares = legalSquares(fen, 'a1');
    expect(squares).toEqual(['b2', 'c3', 'd4', 'e5', 'f6', 'g7', 'h8']);
  });

  it('gives a queen both rook and bishop rays', () => {
    const fen = '8/8/8/8/8/8/8/Q7 w - - 0 1';
    const squares = legalSquares(fen, 'a1');
    expect(squares).toContain('a8');
    expect(squares).toContain('h1');
    expect(squares).toContain('h8');
    expect(squares).not.toContain('b3');
  });

  it('lets a knight jump over pieces', () => {
    const fen = '8/8/8/8/8/8/P7/N7 w - - 0 1';
    expect(legalSquares(fen, 'a1')).toEqual(['b3', 'c2']);
  });
});

describe('pawns', () => {
  it('allows a single step and a double step from the home rank', () => {
    const fen = '8/8/8/8/8/8/P7/8 w - - 0 1';
    expect(legalSquares(fen, 'a2')).toEqual(['a3', 'a4']);
  });

  it('cannot double-step when the path is blocked', () => {
    const fen = '8/8/8/8/8/n7/P7/8 w - - 0 1';
    expect(legalSquares(fen, 'a2')).toEqual([]);
  });

  it('captures diagonally and never forward', () => {
    const fen = '8/8/8/8/8/1p6/P7/8 w - - 0 1';
    expect(legalSquares(fen, 'a2')).toEqual(['a3', 'a4', 'b3']);
  });

  it('supports en passant immediately after a double pawn push', () => {
    const before = parseFEN('8/3p4/8/4P3/8/8/8/8 b - - 0 1');
    const afterPush = applyMove(before, at('d7'), at('d5'));
    expect(afterPush.enPassant).toEqual(at('d6'));

    const matrix = getLegalMoveMatrix(afterPush, at('e5'));
    expect(availabilityAt(matrix, 'd6')).toBe(FIELD_AVAILABILITY.HIT);

    const afterCapture = applyMove(afterPush, at('e5'), at('d6'));
    expect(afterCapture.board[3][3]).toBe('-');
    expect(afterCapture.board[2][3]).toBe('P');
  });

  it('promotes a pawn that reaches the last rank', () => {
    const game = parseFEN('8/P7/8/8/8/8/8/8 w - - 0 1');
    const next = applyMove(game, at('a7'), at('a8'));
    expect(next.board[0][0]).toBe('Q');
  });

  it('lets black pawns move down the board and capture', () => {
    const fen = '8/p7/1P6/8/8/8/8/8 b - - 0 1';
    expect(legalSquares(fen, 'a7')).toEqual(['a5', 'a6', 'b6']);
  });
});

describe('king safety', () => {
  it('stops a king from stepping into check', () => {
    const fen = '8/1r6/8/8/8/8/8/K7 w - - 0 1';
    expect(legalSquares(fen, 'a1')).toEqual(['a2']);
  });

  it('blocks a pinned piece from leaving the pin line', () => {
    const fen = '8/8/8/8/8/8/8/K1N4r w - - 0 1';
    expect(legalSquares(fen, 'c1')).toEqual([]);
  });

  it('allows a pinned piece to capture along the pin', () => {
    const fen = '8/8/8/8/8/8/8/K1R4r w - - 0 1';
    expect(legalSquares(fen, 'c1')).toEqual(['b1', 'd1', 'e1', 'f1', 'g1', 'h1']);
  });

  it('requires a check to be escaped', () => {
    const fen = '8/8/8/8/8/8/r7/K1N5 w - - 0 1';
    expect(legalSquares(fen, 'c1')).toEqual(['a2']);
    expect(legalSquares(fen, 'a1')).toEqual(['a2', 'b1']);
  });
});

describe('castling', () => {
  it('allows kingside and queenside castling when the path is clear', () => {
    const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    expect(legalSquares(fen, 'e1')).toEqual(expect.arrayContaining(['c1', 'g1']));

    const afterKing = applyMove(parseFEN(fen), at('e1'), at('g1'));
    expect(afterKing.board[7][6]).toBe('K');
    expect(afterKing.board[7][5]).toBe('R');
    expect(afterKing.board[7][7]).toBe('-');
    expect(afterKing.castling.K).toBe(false);
    expect(afterKing.castling.Q).toBe(false);
  });

  it('rejects castling through check or out of check', () => {
    expect(legalSquares('r3k2r/8/8/8/8/6n1/8/R3K2R w KQkq - 0 1', 'e1')).not.toContain('g1');
    expect(legalSquares('r3k2r/8/8/8/b7/8/8/R3K2R w KQkq - 0 1', 'e1')).not.toContain('c1');
    expect(legalSquares('r3k2r/8/8/8/8/8/4r3/R3K2R w KQkq - 0 1', 'e1')).not.toContain('g1');
  });

  it('revokes castling after the king or rook moves', () => {
    const game = parseFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    const afterRook = applyMove(game, at('h1'), at('h2'));
    expect(afterRook.castling.K).toBe(false);
    expect(afterRook.castling.Q).toBe(true);
    expect(getLegalMoveMatrix(afterRook, at('e1'))[7][6]).toBe(FIELD_AVAILABILITY.UNAVAILABLE);
  });
});

describe('tryMove', () => {
  it('rejects illegal destinations when rules are enforced', () => {
    const game = parseFEN('8/8/8/8/8/8/P7/8 w - - 0 1');
    expect(tryMove(game, at('a2'), at('b3'), true)).toBeNull();
    expect(tryMove(game, at('a2'), at('a4'), true).board[4][0]).toBe('P');
  });

  it('allows free placement when rules are off', () => {
    const game = parseFEN('8/8/8/8/8/8/P7/8 w - - 0 1');
    const next = tryMove(game, at('a2'), at('h8'), false);
    expect(next.board[0][7]).toBe('P');
    expect(next.board[6][0]).toBe('-');
  });
});

describe('check detection', () => {
  it('detects a king under attack', () => {
    const game = parseFEN('8/8/8/8/8/8/r7/K7 w - - 0 1');
    expect(isInCheck(game.board, true)).toBe(true);
    expect(isInCheck(game.board, false)).toBe(false);
  });
});

describe('pseudo-legal vs legal', () => {
  it('still marks defended squares before legality filtering', () => {
    const game = parseFEN('8/8/8/8/8/8/P7/RN6 w - - 0 1');
    const matrix = getPseudoLegalMoveMatrix(game, at('a1'));
    expect(availabilityAt(matrix, 'b1')).toBe(FIELD_AVAILABILITY.DEFEND);
  });
});
