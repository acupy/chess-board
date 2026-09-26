import { PIECE_STYLES } from '../consts';

const STORAGE_KEY = 'chess-coach-preferences';

const LEGACY_THEMES = {
  gray: 'classic',
  green: 'military',
  purple: 'classic',
};

export const GAME_THEMES = [
  {
    id: 'classic',
    label: 'Classic',
    chrome: 'gray',
    coach: 'classic',
    defaultPiece: 'cburnett',
    hiddenPieces: ['fantasy', 'military'],
  },
  {
    id: 'military',
    label: 'Military',
    chrome: 'green',
    coach: 'military',
    defaultPiece: 'military',
    hiddenPieces: ['fantasy'],
  },
  {
    id: 'fantasy',
    label: 'Fantasy',
    chrome: 'fantasy',
    coach: 'fantasy',
    defaultPiece: 'fantasy',
    hiddenPieces: ['military'],
  },
];

export const THEME_OPTIONS = GAME_THEMES;

export const getGameTheme = (id) =>
  GAME_THEMES.find((theme) => theme.id === id) || GAME_THEMES[0];

export const pieceStylesForTheme = (themeId) => {
  const hidden = new Set(getGameTheme(themeId).hiddenPieces);
  return PIECE_STYLES.filter((style) => !hidden.has(style.id));
};

export const resolvePieceStyle = (themeId, pieceStyle) => {
  const theme = getGameTheme(themeId);
  const allowed = pieceStylesForTheme(theme.id).some((style) => style.id === pieceStyle);
  return allowed ? pieceStyle : theme.defaultPiece;
};

export const defaultPreferences = () => ({
  pieceStyle: 'cburnett',
  theme: 'classic',
  pointOutDangers: true,
});

export const loadPreferences = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPreferences();
    const parsed = JSON.parse(raw);
    const themeId = LEGACY_THEMES[parsed.theme] || parsed.theme;
    const theme = getGameTheme(themeId).id;
    const requested = PIECE_STYLES.some((style) => style.id === parsed.pieceStyle)
      ? parsed.pieceStyle
      : defaultPreferences().pieceStyle;
    const pieceStyle = resolvePieceStyle(theme, requested);
    const pointOutDangers =
      typeof parsed.pointOutDangers === 'boolean'
        ? parsed.pointOutDangers
        : defaultPreferences().pointOutDangers;
    const next = { pieceStyle, theme, pointOutDangers };
    if (parsed.theme !== theme || parsed.pieceStyle !== pieceStyle) {
      savePreferences(next);
    }
    return next;
  } catch {
    return defaultPreferences();
  }
};

export const savePreferences = (prefs) => {
  const next = { ...defaultPreferences(), ...prefs };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
};

export const updatePreferences = (partial) => {
  return savePreferences({ ...loadPreferences(), ...partial });
};
