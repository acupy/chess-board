const DEFAULT_MODEL = 'qwen2.5:7b';
const OLLAMA_BASE = '/api/ollama';

export class OllamaUnavailableError extends Error {
  constructor(message = 'Ollama is not running') {
    super(message);
    this.name = 'OllamaUnavailableError';
  }
}

export const checkOllama = async (model = DEFAULT_MODEL) => {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (!res.ok) throw new OllamaUnavailableError();
    const data = await res.json();
    const names = (data.models || []).map((m) => m.name);
    const hasModel = names.some((n) => n === model || n.startsWith(`${model}:`));
    return { ok: true, hasModel, models: names };
  } catch (err) {
    if (err instanceof OllamaUnavailableError) throw err;
    throw new OllamaUnavailableError(
      `Cannot reach Ollama. Start it with \`ollama serve\` and pull a model (e.g. \`ollama pull ${DEFAULT_MODEL}\`).`
    );
  }
};

const chat = async (messages, { model = DEFAULT_MODEL, temperature = 0.6 } = {}) => {
  let res;
  try {
    res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        options: { temperature },
        messages,
      }),
    });
  } catch {
    throw new OllamaUnavailableError(
      `Cannot reach Ollama. Start it with \`ollama serve\` and pull a model (e.g. \`ollama pull ${DEFAULT_MODEL}\`).`
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 404 || /not found/i.test(text)) {
      throw new OllamaUnavailableError(
        `Model "${model}" not found. Run: ollama pull ${model}`
      );
    }
    if (res.status >= 500) {
      throw new OllamaUnavailableError(
        `Ollama failed (${res.status}). Is a model pulled? Try: ollama pull ${model}`
      );
    }
    throw new OllamaUnavailableError(`Ollama error (${res.status}): ${text || res.statusText}`);
  }

  const data = await res.json();
  return (data.message?.content || '').trim();
};

const SYSTEM_COACH = `You are a friendly chess coach talking to a human player who plays White.
Keep replies to 1–3 short sentences. Be encouraging but honest.
CRITICAL: Never invent moves, squares, or pieces. Only refer to moves and squares explicitly given to you.
Never choose the next engine move yourself — only comment on the given analysis.
Use plain language; mention piece names and squares only when they appear in the user message.`;

/**
 * Comment on a completed player move.
 */
export const coachOnMove = async ({
  fen,
  playedMove,
  playedDescription,
  bestMove,
  bestDescription,
  verdict,
  lossCp,
  model = DEFAULT_MODEL,
}) => {
  const user = `Position (FEN): ${fen}
Player played: ${playedDescription || playedMove} (UCI ${playedMove})
Engine's preferred move: ${bestDescription || bestMove || 'unknown'}${bestMove ? ` (UCI ${bestMove})` : ''}
Verdict: ${verdict} (centipawn loss ≈ ${lossCp})

Write a brief coach comment. If mentioning a better move, you MUST only mention the engine's preferred move above — never a different one.`;

  return chat(
    [
      { role: 'system', content: SYSTEM_COACH },
      { role: 'user', content: user },
    ],
    { model, temperature: 0.4 }
  );
};

/**
 * Phrase a hint — move identity is fixed; model only adds soft encouragement.
 */
export const coachHint = async ({
  fen,
  bestMove,
  moveDescription,
  model = DEFAULT_MODEL,
}) => {
  const user = `Position (FEN): ${fen}
The ONLY correct hint is: ${moveDescription} (UCI ${bestMove}).

Write ONE short sentence explaining the idea behind this exact move (e.g. develops a piece, challenges the center, improves king safety).
Rules you must follow:
- Refer only to this move: ${moveDescription}
- Do NOT suggest any other piece, square, or move
- Do NOT write UCI (no strings like e2e4)
- Do NOT change the destination or origin squares`;

  return chat(
    [
      { role: 'system', content: SYSTEM_COACH },
      { role: 'user', content: user },
    ],
    { model, temperature: 0.2 }
  );
};

/**
 * Brief note when the game ends.
 */
export const coachGameOver = async ({ result, playerElo, eloDelta, model = DEFAULT_MODEL }) => {
  const user = `Game over. Result for the player (White): ${result}.
Their Elo changed by ${eloDelta >= 0 ? '+' : ''}${eloDelta} (now around ${playerElo}).
Give a short closing remark (1–2 sentences).`;

  return chat(
    [
      { role: 'system', content: SYSTEM_COACH },
      { role: 'user', content: user },
    ],
    { model }
  );
};

export { DEFAULT_MODEL };
