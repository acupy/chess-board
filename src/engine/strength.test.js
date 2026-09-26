import { describe, expect, it } from 'vitest';
import {
  MIN_UCI_ELO,
  chooseLimitedMove,
  strengthOptionsForElo,
} from './strength';

describe('strengthOptionsForElo', () => {
  it('uses calibrated UCI_Elo at and above Stockfish’s 1320 floor', () => {
    expect(strengthOptionsForElo(1320)).toEqual({
      limitStrength: true,
      uciElo: 1320,
      skillLevel: 20,
      mistakeRate: 0,
    });
    expect(strengthOptionsForElo(1500).uciElo).toBe(1500);
    expect(strengthOptionsForElo(1500).mistakeRate).toBe(0);
  });

  it('keeps Skill Level 0 below the floor instead of scaling up toward Skill 10', () => {
    const defaultOpp = strengthOptionsForElo(1280);
    expect(defaultOpp.limitStrength).toBe(false);
    expect(defaultOpp.skillLevel).toBe(0);
    expect(defaultOpp.uciElo).toBeNull();
    expect(defaultOpp.mistakeRate).toBeCloseTo((MIN_UCI_ELO - 1280) / (MIN_UCI_ELO - 100), 5);
    expect(defaultOpp.mistakeRate).toBeLessThan(0.05);
  });

  it('adds more extra mistakes as Elo drops below 1320', () => {
    const mid = strengthOptionsForElo(800);
    const low = strengthOptionsForElo(400);
    expect(mid.skillLevel).toBe(0);
    expect(low.skillLevel).toBe(0);
    expect(low.mistakeRate).toBeGreaterThan(mid.mistakeRate);
    expect(low.mistakeRate).toBeGreaterThan(0.7);
    expect(strengthOptionsForElo(100).mistakeRate).toBeCloseTo(1, 5);
  });
});

describe('chooseLimitedMove', () => {
  const legal = ['e7e5', 'c7c5', 'g8f6'];

  it('keeps the engine move when mistakeRate is 0', () => {
    expect(chooseLimitedMove(legal, 'e7e5', 0, () => 0)).toBe('e7e5');
  });

  it('replaces the engine move when the roll is below mistakeRate', () => {
    const picked = chooseLimitedMove(legal, 'e7e5', 1, () => 0);
    expect(legal).toContain(picked);
    expect(picked).not.toBe('e7e5');
  });

  it('falls back to a legal move if the engine suggestion is illegal', () => {
    expect(chooseLimitedMove(legal, 'a1a8', 0, () => 0)).toBe('e7e5');
  });
});
