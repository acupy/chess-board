import { describe, expect, it } from 'vitest';
import { parseFEN } from './fen';
import {
  applyUciMove,
  coordsToUci,
  describeUciMove,
  explainMoveIdea,
  GAME_RESULT,
  getGameResult,
  getWinner,
  listLegalUciMoves,
  parseUciMove,
  pickLegalEngineMove,
} from './uci';

describe('UCI helpers', () => {
  it('parses and formats UCI moves', () => {
    expect(parseUciMove('e2e4')).toEqual({
      from: [6, 4],
      to: [4, 4],
      promotion: null,
    });
    expect(parseUciMove('e7e8q')).toEqual({
      from: [1, 4],
      to: [0, 4],
      promotion: 'q',
    });
    expect(coordsToUci([6, 4], [4, 4])).toBe('e2e4');
    expect(coordsToUci([1, 4], [0, 4], 'q')).toBe('e7e8q');
  });

  it('applies a legal UCI move', () => {
    const game = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const next = applyUciMove(game, 'e2e4');
    expect(next).not.toBeNull();
    expect(next.board[4][4]).toBe('P');
    expect(next.board[6][4]).toBe('-');
    expect(next.turn).toBe('b');
  });

  it('rejects illegal UCI moves', () => {
    const game = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(applyUciMove(game, 'e2e5')).toBeNull();
    expect(applyUciMove(game, 'e7e5')).toBeNull();
  });

  it('lists legal opening moves including double pawn pushes', () => {
    const game = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const moves = listLegalUciMoves(game);
    expect(moves).toContain('e2e4');
    expect(moves).toContain('g1f3');
    expect(moves).not.toContain('e2e5');
    expect(moves.length).toBe(20);
  });

  it('describes UCI moves in plain English', () => {
    const game = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(describeUciMove(game, 'e2e4')).toBe('pawn e2 to e4');
    expect(describeUciMove(game, 'g1f3')).toBe('knight g1 to f3');
  });

  it('names captured pieces and check, and does not call a recapture a developing move', () => {
    const game = parseFEN('r1bqkbnr/1p1npppp/p2p4/1Bp5/4P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 0 5');
    expect(describeUciMove(game, 'b5d7')).toBe('bishop b5 takes knight on d7 with check');
    expect(explainMoveIdea(game, 'b5d7')).toBe('Black has to recapture or move the king.');
    expect(explainMoveIdea(game, 'b5d7')).not.toMatch(/develop/i);
    expect(explainMoveIdea(game, 'b1c3')).toMatch(/develops your knight/i);
  });

  it('only accepts legal engine candidates', () => {
    const game = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(pickLegalEngineMove(game, 'e2e5', 'e2e4')).toBe('e2e4');
    expect(pickLegalEngineMove(game, 'a1a8')).toBeNull();
  });

  it('detects checkmate and stalemate', () => {
    const mate = parseFEN('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1');
    expect(getGameResult(mate)).toBe(GAME_RESULT.CHECKMATE);
    expect(getWinner(mate)).toBe('white');

    const stale = parseFEN('7k/5P2/6K1/8/8/8/8/8 b - - 0 1');
    expect(getGameResult(stale)).toBe(GAME_RESULT.STALEMATE);
    expect(getWinner(stale)).toBe('draw');

    const playing = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(getGameResult(playing)).toBe(GAME_RESULT.PLAYING);
    expect(getWinner(playing)).toBeNull();
  });
});
