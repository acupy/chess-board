import { describe, expect, it } from 'vitest';
import {
  MIN_UCI_ELO,
  qualityForLossCp,
  qualityWeightsForElo,
  strengthOptionsForElo,
} from './strength';

describe('strengthOptionsForElo', () => {
  it('uses calibrated UCI_Elo at and above Stockfish’s 1320 floor', () => {
    expect(strengthOptionsForElo(1320)).toMatchObject({
      mode: 'uciElo',
      limitStrength: true,
      uciElo: 1320,
      multiPv: 1,
    });
    expect(strengthOptionsForElo(1500).uciElo).toBe(1500);
  });

  it('uses the human-error model below 1320 instead of Skill Level 10', () => {
    const defaultOpp = strengthOptionsForElo(1280);
    expect(defaultOpp.mode).toBe('human');
    expect(defaultOpp.limitStrength).toBe(false);
    expect(defaultOpp.skillLevel).toBe(20);
    expect(defaultOpp.multiPv).toBeGreaterThanOrEqual(10);
    expect(strengthOptionsForElo(400).mode).toBe('human');
  });
});

describe('quality buckets', () => {
  it('maps eval loss to human-readable quality', () => {
    expect(qualityForLossCp(0)).toBe('best');
    expect(qualityForLossCp(40)).toBe('veryGood');
    expect(qualityForLossCp(100)).toBe('reasonable');
    expect(qualityForLossCp(200)).toBe('inaccurate');
    expect(qualityForLossCp(400)).toBe('bad');
    expect(qualityForLossCp(800)).toBe('blunder');
  });

  it('uses the 400-Elo mix: mostly reasonable/inaccurate, rare best, some blunders', () => {
    const w = qualityWeightsForElo(400);
    expect(w.best).toBeCloseTo(0.05, 5);
    expect(w.reasonable).toBeCloseTo(0.25, 5);
    expect(w.inaccurate).toBeCloseTo(0.3, 5);
    expect(w.blunder).toBeCloseTo(0.1, 5);
    expect(w.best + w.veryGood).toBeLessThan(w.reasonable + w.inaccurate);
  });

  it('shifts toward the best move as Elo rises to 1300', () => {
    expect(qualityWeightsForElo(1300).best).toBeGreaterThan(qualityWeightsForElo(1000).best);
    expect(qualityWeightsForElo(1000).best).toBeGreaterThan(qualityWeightsForElo(700).best);
    expect(qualityWeightsForElo(1300).blunder).toBeLessThan(qualityWeightsForElo(400).blunder);
  });

  it('does not invent a UCI path below the Stockfish floor', () => {
    expect(strengthOptionsForElo(400).uciElo).toBeNull();
    expect(MIN_UCI_ELO).toBe(1320);
  });
});
