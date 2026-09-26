import { describe, expect, it } from 'vitest';
import { parseFEN } from '../chess';
import {
  featuresForMove,
  pickHumanMove,
  pickWeighted,
  salienceForFeatures,
} from './humanPlay';

describe('pickWeighted', () => {
  it('picks the only positive weight', () => {
    const items = [
      { id: 'a', w: 0 },
      { id: 'b', w: 1 },
    ];
    expect(pickWeighted(items, (item) => item.w, () => 0.1).id).toBe('b');
  });
});

describe('salienceForFeatures', () => {
  it('treats a recapture as much more human than an aimless wing pawn', () => {
    const recapture = {
      isRecapture: true,
      isCapture: true,
      takesHanging: false,
      givesCheck: false,
      addressesThreat: false,
      attacksPiece: false,
      develops: false,
      isCastle: false,
      isPawnMove: false,
      isLuftOrProbe: false,
      repeatsPiece: false,
      isAimlessWingPush: false,
      leavesHanging: false,
    };
    const a5 = {
      isRecapture: false,
      isCapture: false,
      takesHanging: false,
      givesCheck: false,
      addressesThreat: false,
      attacksPiece: false,
      develops: false,
      isCastle: false,
      isPawnMove: true,
      isLuftOrProbe: false,
      repeatsPiece: false,
      isAimlessWingPush: true,
      leavesHanging: false,
    };
    expect(salienceForFeatures(recapture, 400)).toBeGreaterThan(salienceForFeatures(a5, 400) * 8);
  });
});

describe('pickHumanMove', () => {
  it('does not pick a5 when a sensible recapture is available at 400', () => {
    // After 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Bxc6 — Black should recapture, not a5.
    const game = parseFEN('r1bqkbnr/1ppp1ppp/p1B5/4p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 4');
    const engineLines = [
      { uci: 'b7c6', cp: 20 },
      { uci: 'd7c6', cp: 10 },
      { uci: 'a6a5', cp: -420 },
    ];

    const counts = { b7c6: 0, d7c6: 0, a6a5: 0 };
    for (let i = 0; i < 80; i++) {
      const move = pickHumanMove({
        game,
        engineLines,
        elo: 400,
        lastOpponentUci: 'b5c6',
      });
      counts[move] = (counts[move] || 0) + 1;
    }

    expect(counts.b7c6 + counts.d7c6).toBeGreaterThan(counts.a6a5 * 3);
    expect(counts.a6a5).toBeLessThan(20);
  });

  it('ranks a kingside luft probe above an aimless a-pawn push', () => {
    const h6 = {
      isRecapture: false,
      isCapture: false,
      takesHanging: false,
      givesCheck: false,
      addressesThreat: false,
      attacksPiece: false,
      develops: false,
      isCastle: false,
      isPawnMove: true,
      isLuftOrProbe: true,
      repeatsPiece: false,
      isAimlessWingPush: false,
      leavesHanging: false,
    };
    const a5 = {
      ...h6,
      isLuftOrProbe: false,
      isAimlessWingPush: true,
    };
    expect(salienceForFeatures(h6, 400)).toBeGreaterThan(salienceForFeatures(a5, 400) * 4);
  });

  it('at 1300 prefers competent developing moves over a wing-pawn blunder', () => {
    const game = parseFEN('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
    const engineLines = [
      { uci: 'g1f3', cp: 40 },
      { uci: 'b1c3', cp: 25 },
      { uci: 'f2f4', cp: -80 },
      { uci: 'h2h4', cp: -350 },
    ];

    let competent = 0;
    let wing = 0;
    for (let i = 0; i < 40; i++) {
      const move = pickHumanMove({ game, engineLines, elo: 1300 });
      if (move === 'g1f3' || move === 'b1c3') competent += 1;
      if (move === 'h2h4') wing += 1;
    }
    expect(competent).toBeGreaterThan(28);
    expect(wing).toBeLessThan(6);
  });

  it('falls back to a legal move when the engine returns nothing', () => {
    const game = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const move = pickHumanMove({ game, engineLines: [], elo: 400 });
    expect(move).toMatch(/^[a-h][1-8][a-h][1-8]/);
  });
});

describe('featuresForMove', () => {
  it('marks Bxc6 as a capture a human would recapture', () => {
    const game = parseFEN('r1bqkbnr/1ppp1ppp/p1B5/4p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 4');
    const dxc6 = featuresForMove(game, 'd7c6', { lastOpponentUci: 'b5c6' });
    expect(dxc6.isRecapture).toBe(true);
    expect(dxc6.isCapture).toBe(true);
  });
});
