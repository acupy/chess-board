import { PIECE_STYLES } from '../consts';

const STORAGE_KEY = 'chess-coach-preferences';

export const THEME_OPTIONS = [
  { id: 'gray', label: 'Carbon / metal' },
  { id: 'green', label: 'Military' },
  { id: 'purple', label: 'Night purple' },
];

export const defaultPreferences = () => ({
  pieceStyle: 'cburnett',
  theme: 'gray',
});

export const loadPreferences = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPreferences();
    const parsed = JSON.parse(raw);
    const pieceStyle = PIECE_STYLES.some((s) => s.id === parsed.pieceStyle)
      ? parsed.pieceStyle
      : defaultPreferences().pieceStyle;
    const theme = THEME_OPTIONS.some((t) => t.id === parsed.theme)
      ? parsed.theme
      : defaultPreferences().theme;
    return { pieceStyle, theme };
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
