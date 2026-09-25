import { describe, expect, it } from 'vitest';
import { parseFEN } from '../chess/fen';
import { coachGameOver, coachHint, coachOnMove, coachWelcome } from './voice';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('coach voice', () => {
  it('praises an excellent move without saying engine', () => {
    const game = parseFEN(START);
    const msg = coachOnMove({
      gameBefore: game,
      playedUci: 'e2e4',
      bestUci: 'e2e4',
      verdict: 'excellent',
      lossCp: 0,
    });
    expect(msg).toMatch(/exactly what I wanted|best move here/i);
    expect(msg).not.toMatch(/engine/i);
    expect(msg).toMatch(/pawn e2 to e4/i);
  });

  it('suggests a better move with a rule-based why on blunders', () => {
    const game = parseFEN(START);
    const msg = coachOnMove({
      gameBefore: game,
      playedUci: 'a2a3',
      bestUci: 'g1f3',
      verdict: 'blunder',
      lossCp: 350,
    });
    expect(msg).toMatch(/blunder/i);
    expect(msg).toMatch(/knight g1 to f3/i);
    expect(msg).toMatch(/develops your knight/i);
    expect(msg).toMatch(/3\.5 pawns worse/i);
    expect(msg).not.toMatch(/engine/i);
  });

  it('builds hints from the board only', () => {
    const game = parseFEN(START);
    const msg = coachHint({ game, bestUci: 'g1f3' });
    expect(msg).toMatch(/try this/i);
    expect(msg).toMatch(/knight g1 to f3/i);
    expect(msg).toMatch(/develops your knight/i);
    expect(msg).not.toMatch(/engine/i);
  });

  it('celebrates wins and consoles losses', () => {
    expect(coachGameOver({ result: 'win', playerElo: 1220, eloDelta: 16, reason: 'checkmate' })).toMatch(
      /you win/i
    );
    expect(
      coachGameOver({ result: 'loss', playerElo: 1180, eloDelta: -12, reason: 'checkmate' })
    ).toMatch(/that’s okay|thats okay/i);
    expect(coachWelcome()).not.toMatch(/engine/i);
  });
});
