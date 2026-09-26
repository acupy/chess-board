import { describe, expect, it } from 'vitest';
import { classifyMove } from '../engine/stockfish';

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
