const DEFAULT_MOOD_IMAGES = {
  proud: 'img/coach/coach-proud.png',
  neutral: 'img/coach/coach-neutral.png',
  concerned: 'img/coach/coach-concerned.png',
  shocked: 'img/coach/coach-shocked.png',
};

const MILITARY_MOOD_IMAGES = {
  proud: 'img/coach/coach-mil-proud.png',
  neutral: 'img/coach/coach-mil-neutral.png',
  concerned: 'img/coach/coach-mil-concerned.png',
  shocked: 'img/coach/coach-mil-shocked.png',
};

const MOOD_LABELS = {
  proud: 'Coach is impressed',
  neutral: 'Coach is listening',
  concerned: 'Coach looks thoughtful',
  shocked: 'Coach is shocked',
};

/**
 * Map move verdict / game vibe to a coach facial mood.
 */
export const moodFromVerdict = (verdict, { busy = false, gameOver = false, status = '' } = {}) => {
  if (busy) return 'neutral';
  if (gameOver) {
    const s = (status || '').toLowerCase();
    if (s.includes('won')) return 'proud';
    if (s.includes('draw')) return 'concerned';
    if (s.includes('lost') || s.includes('resign')) return 'concerned';
  }
  switch (verdict) {
    case 'excellent':
    case 'good':
      return 'proud';
    case 'inaccuracy':
      return 'concerned';
    case 'mistake':
    case 'blunder':
      return 'shocked';
    default:
      return 'neutral';
  }
};

function CoachAvatar({ mood = 'neutral', theme = 'gray' }) {
  const set = theme === 'green' ? MILITARY_MOOD_IMAGES : DEFAULT_MOOD_IMAGES;
  const src = set[mood] || set.neutral;
  const label = MOOD_LABELS[mood] || MOOD_LABELS.neutral;

  return (
    <div className={`coach-avatar mood-${mood} theme-${theme}`} title={label}>
      <img src={src} alt={label} className="coach-avatar-img" draggable={false} />
    </div>
  );
}

export default CoachAvatar;
