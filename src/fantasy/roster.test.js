import { describe, expect, it } from 'vitest';
import { applyMove, parseFEN } from '../chess';
import { diffCapture } from './roster';

const capture = (fen, from, to) => {
  const game = parseFEN(fen);
  const next = applyMove(game, from, to);
  return diffCapture(game.board, next.board);
};

describe('diffCapture', () => {
  it('ignores a quiet pawn push', () => {
    expect(capture('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', [6, 4], [4, 4])).toBeNull();
  });

  it('ignores castling', () => {
    expect(capture('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', [7, 4], [7, 6])).toBeNull();
  });

  it('ignores a quiet promotion', () => {
    expect(capture('8/P7/8/8/8/8/8/4K2k w - - 0 1', [1, 0], [0, 0])).toBeNull();
  });

  it('finds a knight capture', () => {
    expect(capture('8/8/3p4/8/4N3/8/8/4K2k w - - 0 1', [4, 4], [2, 3])).toEqual({
      attacker: 'N',
      defender: 'p',
      from: [4, 4],
      to: [2, 3],
      victimAt: [2, 3],
    });
  });

  it('finds a black capture', () => {
    expect(capture('4k3/8/8/8/4n3/2P5/8/4K3 b - - 0 1', [4, 4], [5, 2])).toEqual({
      attacker: 'n',
      defender: 'P',
      from: [4, 4],
      to: [5, 2],
      victimAt: [5, 2],
    });
  });

  it('finds an en passant capture', () => {
    expect(capture('8/8/8/3pP3/8/8/8/4K2k w - d6 0 1', [3, 4], [2, 3])).toEqual({
      attacker: 'P',
      defender: 'p',
      from: [3, 4],
      to: [2, 3],
      victimAt: [3, 3],
    });
  });

  it('finds a promotion capture', () => {
    expect(capture('r7/1P6/8/8/8/8/8/4K2k w - - 0 1', [1, 1], [0, 0])).toEqual({
      attacker: 'Q',
      defender: 'r',
      from: [1, 1],
      to: [0, 0],
      victimAt: [0, 0],
    });
  });
});
