import { DEFAULT_PLAYER_ELO } from './elo';

const STORAGE_KEY = 'chess-coach-profile';

export const defaultProfile = () => ({
  elo: DEFAULT_PLAYER_ELO,
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
});

export const loadProfile = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw);
    return {
      ...defaultProfile(),
      ...parsed,
      elo: Number(parsed.elo) || DEFAULT_PLAYER_ELO,
      gamesPlayed: Number(parsed.gamesPlayed) || 0,
      wins: Number(parsed.wins) || 0,
      losses: Number(parsed.losses) || 0,
      draws: Number(parsed.draws) || 0,
    };
  } catch {
    return defaultProfile();
  }
};

export const saveProfile = (profile) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  return profile;
};

const clampElo = (elo) => Math.max(100, Math.min(3000, Math.round(Number(elo) || DEFAULT_PLAYER_ELO)));

/**
 * Manually set the player's Elo (e.g. from settings). Clears lastDelta.
 */
export const setPlayerElo = (elo) => {
  const profile = loadProfile();
  const next = {
    ...profile,
    elo: clampElo(elo),
    lastDelta: 0,
  };
  return saveProfile(next);
};

/**
 * Apply a game result and persist.
 * @param {'win'|'loss'|'draw'} result - from the player's perspective
 * @param {number} opponentElo
 * @param {(elo, opp, score, games) => { nextElo, delta }} updateEloFn
 */
export const recordGameResult = (result, opponentElo, updateEloFn) => {
  const profile = loadProfile();
  const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
  const { nextElo, delta } = updateEloFn(profile.elo, opponentElo, score, profile.gamesPlayed);

  const next = {
    elo: nextElo,
    gamesPlayed: profile.gamesPlayed + 1,
    wins: profile.wins + (result === 'win' ? 1 : 0),
    losses: profile.losses + (result === 'loss' ? 1 : 0),
    draws: profile.draws + (result === 'draw' ? 1 : 0),
    lastDelta: delta,
  };

  return saveProfile(next);
};
