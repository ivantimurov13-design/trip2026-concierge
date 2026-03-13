function getAllowedOrigins() {
  const fallback = ['https://ivantimurov13-design.github.io'];
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw || !raw.trim()) return fallback;
  return raw.split(',').map((item) => item.trim()).filter(Boolean);
}

function setCors(req, res) {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    return true;
  }

  return false;
}

function extractAnswer(data) {
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data.output)) return '';

  const chunks = [];
  for (const item of data.output) {
    if (item.type !== 'message' || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (part.type === 'output_text' && typeof part.text === 'string') {
        chunks.push(part.text);
      }
    }
  }

  return chunks.join('\n').trim();
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((msg) => msg && (msg.role === 'user' || msg.role === 'assistant') && typeof msg.content === 'string')
    .slice(-8)
    .map((msg) => ({ role: msg.role, content: msg.content.slice(0, 3000) }));
}

module.exports = async function handler(req, res) {
  const corsOk = setCors(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!corsOk) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    const history = sanitizeHistory(body.history);
    const context = body.context || {};

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });
    }

    const instructions = [
      'Ты — премиальный AI-консьерж семейного путешествия «Европа 2026».',
      'Всегда отвечай по-русски.',
      'Тон: уверенный, заботливый, практичный, без воды.',
      'Приоритеты: семейная логистика, дети, коляска, удобный ритм, вкусная еда, короткие маршруты, шопинг часов.',
      'Если данных из маршрута достаточно — опирайся именно на них, а не фантазируй.',
      'Если информации не хватает, честно скажи, что это предположение.',
      'По возможности пиши структурно: что лучше / почему / как сделать на практике.',
      'Не перегружай ответ. Обычно 5–10 предложений достаточно.'
    ].join(' ');

    const contextText = JSON.stringify(context, null, 2);
    const model = process.env.OPENAI_MODEL || 'gpt-5-mini';

    const input = [
      {
        role: 'system',
        content: `Контекст поездки:\n${contextText}`
      },
      ...history,
      {
        role: 'user',
        content: question.slice(0, 4000)
      }
    ];

    const openaiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        store: false,
        instructions,
        input
      })
    });

    const data = await openaiRes.json();

    if (!openaiRes.ok) {
      return res.status(500).json({
        error: 'OpenAI request failed',
        details: data
      });
    }

    const answer = extractAnswer(data) || 'Не удалось сформировать ответ.';
    return res.status(200).json({ answer, model });
  } catch (error) {
    return res.status(500).json({
      error: 'Server error',
      details: error && error.message ? error.message : String(error)
    });
  }
};
