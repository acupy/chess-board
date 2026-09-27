import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearArchivedGames,
  fenAtPly,
  fenBeforePly,
  loadArchivedGames,
  MAX_ARCHIVED_GAMES,
  saveArchivedGame,
} from './archive';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

describe('archive', () => {
  beforeEach(() => {
    clearArchivedGames();
  });

  it('saves and loads a finished game', () => {
    const saved = saveArchivedGame({
      result: 'win',
      reason: 'checkmate',
      playerElo: 1220,
      eloDelta: 12,
      engineElo: 1300,
      startFen: START,
      moves: [
        {
          uci: 'e2e4',
          by: 'player',
          fenAfter: AFTER_E4,
          verdict: 'good',
          lossCp: 20,
          bestUci: 'e2e4',
        },
      ],
    });

    expect(saved?.id).toBeTruthy();
    const list = loadArchivedGames();
    expect(list).toHaveLength(1);
    expect(list[0].moves[0].bestUci).toBe('e2e4');
    expect(list[0].result).toBe('win');
  });

  it('trims to MAX_ARCHIVED_GAMES', () => {
    for (let i = 0; i < MAX_ARCHIVED_GAMES + 5; i++) {
      saveArchivedGame({
        result: 'draw',
        reason: 'stalemate',
        playerElo: 1000 + i,
        eloDelta: 0,
        engineElo: 1100,
        startFen: START,
        moves: [],
        savedAt: i + 1,
        id: `g-${i}`,
      });
    }
    expect(loadArchivedGames()).toHaveLength(MAX_ARCHIVED_GAMES);
    expect(loadArchivedGames()[0].id).toBe(`g-${MAX_ARCHIVED_GAMES + 4}`);
  });

  it('resolves fen at and before a ply', () => {
    const game = {
      startFen: START,
      moves: [{ uci: 'e2e4', by: 'player', fenAfter: AFTER_E4 }],
    };
    expect(fenAtPly(game, 0)).toBe(START);
    expect(fenAtPly(game, 1)).toBe(AFTER_E4);
    expect(fenBeforePly(game, 1)).toBe(START);
  });
});
