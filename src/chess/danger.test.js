import { describe, expect, it } from 'vitest';
import { parseFEN } from './fen';
import {
  findAbsolutePins,
  findHangingPieces,
  findPlayerDangers,
  takeNewDangers,
} from './danger';

describe('findHangingPieces', () => {
  it('flags an undefended piece under attack', () => {
    // White knight on c3 attacked by black pawn on b4, no defenders
    const game = parseFEN('4k3/8/8/8/1p6/2N5/8/4K3 w - - 0 1');
    const hangings = findHangingPieces(game.board, true);
    expect(hangings.map((h) => h.square)).toEqual(['c3']);
    expect(hangings[0].kind).toBe('hanging');
  });

  it('does not flag a defended piece', () => {
    // Knight on c3 attacked by b4 pawn but defended by b2 pawn
    const game = parseFEN('4k3/8/8/8/1p6/2N5/1P6/4K3 w - - 0 1');
    expect(findHangingPieces(game.board, true)).toEqual([]);
  });

  it('ignores the king', () => {
    const game = parseFEN('4k3/8/8/8/8/8/8/r3K3 w - - 0 1');
    expect(findHangingPieces(game.board, true)).toEqual([]);
  });
});

describe('findAbsolutePins', () => {
  it('detects a piece pinned to the king by a rook', () => {
    // Black rook on e8, white knight on e4, white king on e1
    const game = parseFEN('4r3/8/8/8/4N3/8/8/4K3 w - - 0 1');
    const pins = findAbsolutePins(game.board, true);
    expect(pins.map((p) => p.square)).toEqual(['e4']);
    expect(pins[0].kind).toBe('pin');
  });

  it('detects a bishop pin', () => {
    // Black bishop on a5, white knight on c3, white king on e1
    const game = parseFEN('4k3/8/8/b7/8/2N5/8/4K3 w - - 0 1');
    const pins = findAbsolutePins(game.board, true);
    expect(pins.map((p) => p.square)).toEqual(['c3']);
  });

  it('ignores a relative pin (king not behind)', () => {
    // Rook lines up with knight and queen, but king is elsewhere
    const game = parseFEN('4r3/8/8/8/4N3/8/4Q3/4K2R w - - 0 1');
    // e4 knight between e8 rook and e2 queen — relative to queen, not absolute to king
    const pins = findAbsolutePins(game.board, true);
    expect(pins.map((p) => p.square)).not.toContain('e4');
  });
});

describe('takeNewDangers', () => {
  it('announces each danger once until it is resolved', () => {
    const announced = new Set();
    const hanging = { key: 'hanging:c3', kind: 'hanging' };

    expect(takeNewDangers(announced, [hanging])).toEqual([hanging]);
    expect(takeNewDangers(announced, [hanging])).toEqual([]);

    // Resolved
    expect(takeNewDangers(announced, [])).toEqual([]);
    expect(announced.has('hanging:c3')).toBe(false);

    // Reappears → announce again
    expect(takeNewDangers(announced, [hanging])).toEqual([hanging]);
  });
});

describe('findPlayerDangers', () => {
  it('combines hangings and pins', () => {
    // e4 knight pinned (defended by Bf3); h3 rook hanging to g4 pawn
    const game = parseFEN('4r3/8/8/8/4N1p1/5B1R/8/4K3 w - - 0 1');
    const dangers = findPlayerDangers(game, true);
    expect(dangers.hangings.map((h) => h.square)).toEqual(['h3']);
    expect(dangers.pins.map((p) => p.square)).toEqual(['e4']);
    expect(dangers.all).toHaveLength(2);
  });
});
