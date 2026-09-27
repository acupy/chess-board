import { describe, expect, it } from 'vitest';
import {
  evalWhoIsAhead,
  formatEvalLabel,
  toWhiteEval,
  whiteShareFromCp,
} from './evalDisplay';

describe('evalDisplay', () => {
  it('maps equal eval near half the doughnut', () => {
    expect(whiteShareFromCp(0)).toBeCloseTo(0.5, 5);
  });

  it('gives White more share when ahead', () => {
    expect(whiteShareFromCp(200)).toBeGreaterThan(0.5);
    expect(whiteShareFromCp(-200)).toBeLessThan(0.5);
  });

  it('flips STM scores to White’s perspective', () => {
    expect(toWhiteEval({ type: 'cp', cp: 40 }, true).cp).toBe(40);
    expect(toWhiteEval({ type: 'cp', cp: 40 }, false).cp).toBe(-40);
    expect(toWhiteEval({ type: 'mate', value: 2 }, false).mate).toBe(-2);
  });

  it('treats mate 0 as already checkmated (no mate-in-N count)', () => {
    // Black to move, already mated by White → #+
    expect(toWhiteEval({ type: 'mate', value: 0 }, false)).toEqual({
      cp: 100000,
      mate: null,
    });
    expect(formatEvalLabel(toWhiteEval({ type: 'mate', value: 0 }, false))).toBe('#+');
    // White to move, already mated by Black → #−
    expect(toWhiteEval({ type: 'mate', value: 0 }, true)).toEqual({
      cp: -100000,
      mate: null,
    });
    expect(formatEvalLabel(toWhiteEval({ type: 'mate', value: 0 }, true))).toBe('#−');
  });

  it('formats labels', () => {
    expect(formatEvalLabel({ cp: 0 })).toBe('0.0');
    expect(formatEvalLabel({ cp: 120 })).toBe('+1.2');
    expect(formatEvalLabel({ mate: 3 })).toBe('#+3');
    expect(formatEvalLabel({ mate: -2 })).toBe('#−2');
    expect(formatEvalLabel({ cp: -100000, mate: null })).toBe('#−');
    expect(formatEvalLabel({ cp: 100000, mate: null })).toBe('#+');
    // mate-in-1 still shows the count
    expect(formatEvalLabel({ cp: 99900, mate: 1 })).toBe('#+1');
  });

  it('names who is ahead', () => {
    expect(evalWhoIsAhead({ cp: 0 })).toBe('equal');
    expect(evalWhoIsAhead({ cp: 80 })).toBe('white');
    expect(evalWhoIsAhead({ mate: -1 })).toBe('black');
  });
});
