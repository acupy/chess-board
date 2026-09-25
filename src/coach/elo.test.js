import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PLAYER_ELO,
  engineEloForPlayer,
  expectedScore,
  kFactor,
  updateElo,
} from './elo';

describe('Elo', () => {
  it('computes expected score symmetrically', () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5, 5);
    expect(expectedScore(1400, 1200)).toBeGreaterThan(0.5);
    expect(expectedScore(1000, 1200)).toBeLessThan(0.5);
  });

  it('uses higher K early then lower K', () => {
    expect(kFactor(0)).toBe(32);
    expect(kFactor(29)).toBe(32);
    expect(kFactor(30)).toBe(16);
  });

  it('gains Elo on a win against a stronger opponent', () => {
    const { nextElo, delta } = updateElo(1200, 1280, 1, 0);
    expect(delta).toBeGreaterThan(0);
    expect(nextElo).toBe(1200 + delta);
  });

  it('loses Elo on a loss', () => {
    const { nextElo, delta } = updateElo(1200, 1200, 0, 0);
    expect(delta).toBeLessThan(0);
    expect(nextElo).toBe(1200 + delta);
  });

  it('sets engine slightly above the player', () => {
    expect(engineEloForPlayer(DEFAULT_PLAYER_ELO)).toBe(1280);
    expect(engineEloForPlayer(100)).toBeGreaterThanOrEqual(400);
    expect(engineEloForPlayer(3000)).toBeLessThanOrEqual(2200);
  });
});
