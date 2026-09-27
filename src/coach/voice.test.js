import { describe, expect, it } from 'vitest';
import { parseFEN } from '../chess/fen';
import { coachDanger, coachGameOver, coachGameSummary, coachHint, coachOnMove, coachReviewMove, coachWelcome } from './voice';

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

  it('warns about hanging pieces and pins', () => {
    expect(
      coachDanger([{ kind: 'hanging', label: 'your knight on c3' }])
    ).toMatch(/hanging/i);
    expect(
      coachDanger([{ kind: 'pin', label: 'your knight on e4' }])
    ).toMatch(/pinned/i);
    expect(coachDanger([])).toBe('');
  });

  it('summarizes a finished game', () => {
    const msg = coachGameSummary({
      result: 'win',
      playerElo: 1220,
      eloDelta: 16,
      reason: 'checkmate',
      moves: [
        { by: 'player', uci: 'e2e4', verdict: 'excellent', lossCp: 0 },
        { by: 'engine', uci: 'e7e5' },
        { by: 'player', uci: 'a2a3', verdict: 'blunder', lossCp: 400 },
      ],
    });
    expect(msg).toMatch(/you win/i);
    expect(msg).toMatch(/strong move/i);
    expect(msg).toMatch(/history/i);
  });

  it('reviews a strong ply without the looking-back prefix', () => {
    const game = parseFEN(START);
    const msg = coachReviewMove({
      gameBefore: game,
      move: {
        by: 'player',
        uci: 'e2e4',
        verdict: 'excellent',
        bestUci: 'e2e4',
        lossCp: 0,
      },
    });
    expect(msg).toMatch(/best move/i);
    expect(msg).not.toMatch(/looking back/i);
  });

  it('leads review with the better move on slips', () => {
    const game = parseFEN(START);
    const msg = coachReviewMove({
      gameBefore: game,
      move: {
        by: 'player',
        uci: 'a2a3',
        verdict: 'blunder',
        bestUci: 'e2e4',
        lossCp: 350,
      },
    });
    expect(msg).toMatch(/better would have been/i);
    expect(msg).toMatch(/pawn e2 to e4/i);
    expect(msg).toMatch(/blunder/i);
    expect(msg).not.toMatch(/looking back/i);
  });
});
