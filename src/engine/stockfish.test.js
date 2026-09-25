import { describe, expect, it } from 'vitest';
import { classifyMove, strengthOptionsForElo } from '../engine/stockfish';

describe('strengthOptionsForElo', () => {
  it('uses UCI_Elo at and above 1320', () => {
    expect(strengthOptionsForElo(1320)).toEqual({
      limitStrength: true,
      uciElo: 1320,
      skillLevel: null,
    });
    expect(strengthOptionsForElo(1500).uciElo).toBe(1500);
  });

  it('maps beginners to Skill Level', () => {
    const low = strengthOptionsForElo(400);
    expect(low.limitStrength).toBe(false);
    expect(low.skillLevel).toBeGreaterThanOrEqual(0);
    expect(low.skillLevel).toBeLessThanOrEqual(10);
  });
});

describe('classifyMove', () => {
  it('marks best move as excellent', () => {
    const result = classifyMove(
      { bestMove: 'e2e4', score: { cp: 20 } },
      { bestMove: 'e7e5', score: { cp: -25 } },
      'e2e4',
      true
    );
    expect(result.verdict).toBe('excellent');
    expect(result.isBest).toBe(true);
  });

  it('flags a large eval drop as a blunder', () => {
    const result = classifyMove(
      { bestMove: 'e2e4', score: { cp: 30 } },
      { bestMove: 'd8h4', score: { cp: 500 } }, // black to move after white blunder; STM score +500 for black means white is -500
      'f2f3',
      true
    );
    expect(result.lossCp).toBeGreaterThan(300);
    expect(result.verdict).toBe('blunder');
  });
});
