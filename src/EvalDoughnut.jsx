import { evalWhoIsAhead, formatEvalLabel, whiteShareFromCp } from './coach/evalDisplay';

const R = 18;
const C = 22;
const STROKE = 6;
const CIRC = 2 * Math.PI * R;

/**
 * Doughnut of White vs Black eval share (White’s perspective).
 * Light arc = White advantage share; dark = Black.
 */
function EvalDoughnut({ cp = 0, mate = null, soft = false }) {
  const whiteShare = whiteShareFromCp(cp);
  const whiteLen = Math.max(0, Math.min(CIRC, CIRC * whiteShare));
  const label = formatEvalLabel({ cp, mate });
  const ahead = evalWhoIsAhead({ cp, mate });
  const title =
    ahead === 'equal'
      ? 'Position is about equal'
      : ahead === 'white'
        ? `White is ahead (${label})`
        : `Black is ahead (${label})`;

  return (
    <div
      className={`eval-doughnut${soft ? ' soft' : ''}${ahead !== 'equal' ? ` ahead-${ahead}` : ''}`}
      title={title}
      aria-label={title}
      role="img"
    >
      <svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true">
        <circle
          className="eval-doughnut-black"
          cx={C}
          cy={C}
          r={R}
          fill="none"
          strokeWidth={STROKE}
        />
        <circle
          className="eval-doughnut-white"
          cx={C}
          cy={C}
          r={R}
          fill="none"
          strokeWidth={STROKE}
          strokeDasharray={`${whiteLen} ${CIRC}`}
          strokeDashoffset={0}
          transform={`rotate(-90 ${C} ${C})`}
          strokeLinecap="butt"
        />
      </svg>
      <span className="eval-doughnut-label">{label}</span>
    </div>
  );
}

export default EvalDoughnut;
