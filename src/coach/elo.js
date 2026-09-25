/** Standard Elo expected score and rating update. */

export const expectedScore = (playerElo, opponentElo) =>
  1 / (1 + 10 ** ((opponentElo - playerElo) / 400));

export const kFactor = (gamesPlayed) => (gamesPlayed < 30 ? 32 : 16);

/**
 * @param {number} playerElo
 * @param {number} opponentElo
 * @param {number} score - 1 win, 0.5 draw, 0 loss
 * @param {number} gamesPlayed
 * @returns {{ nextElo: number, delta: number }}
 */
export const updateElo = (playerElo, opponentElo, score, gamesPlayed = 0) => {
  const k = kFactor(gamesPlayed);
  const expected = expectedScore(playerElo, opponentElo);
  const delta = Math.round(k * (score - expected));
  const nextElo = Math.max(100, Math.min(3000, Math.round(playerElo + delta)));
  return { nextElo, delta };
};

export const DEFAULT_PLAYER_ELO = 1200;
export const ENGINE_OFFSET = 80;
export const MIN_ENGINE_ELO = 400;
export const MAX_ENGINE_ELO = 2200;

/** Opponent target slightly above the player. */
export const engineEloForPlayer = (playerElo) =>
  Math.max(MIN_ENGINE_ELO, Math.min(MAX_ENGINE_ELO, Math.round(playerElo + ENGINE_OFFSET)));
