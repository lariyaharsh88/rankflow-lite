/**
 * Gemini REST helper with model fallback. Ported (trimmed) from RankFlowHQ.
 * Tries GEMINI_MODEL first, then a static list, then anything ListModels reports.
 */
const MODEL_CANDIDATES = [
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash-001",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro-latest",
];

type Method = "generateContent" | "streamGenerateContent";

const listCache = new Map<string, { ids: string[]; at: number }>();

async function discoverModels(apiKey: string): Promise<string[]> {
  const ck = apiKey.slice(0, 12);
  const hit = listCache.get(ck);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.ids;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=100`,
    );
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as {
      models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
    };
    const ids = (data.models ?? [])
      .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
      .map((m) => (m.name ?? "").replace(/^models\//, ""))
      .filter((id) => id.includes("gemini") && !/embedding|tts|audio|image/i.test(id))
      .sort((a, b) => (a.includes("flash") ? 0 : 1) - (b.includes("flash") ? 0 : 1));
    listCache.set(ck, { ids, at: Date.now() });
    return ids;
  } catch {
    listCache.set(ck, { ids: [], at: Date.now() });
    return [];
  }
}

async function modelOrder(apiKey: string): Promise<string[]> {
  const out: string[] = [];
  const preferred = process.env.GEMINI_MODEL?.trim();
  if (preferred) out.push(preferred);
  for (const m of [...MODEL_CANDIDATES, ...(await discoverModels(apiKey))]) {
    if (!out.includes(m)) out.push(m);
  }
  return out;
}

function errorMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    if (parsed.error?.message) return parsed.error.message;
  } catch {
    /* raw */
  }
  return raw.slice(0, 300);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function postWithFallback(
  method: Method,
  apiKey: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const models = await modelOrder(apiKey);
  let rateLimited = 0;
  let lastDetail = "";
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}?key=${encodeURIComponent(apiKey)}${method === "streamGenerateContent" ? "&alt=sse" : ""}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return res;
    const detail = errorMessage(await res.text());
    lastDetail = `${model}: ${detail}`;
    if (res.status === 429) {
      rateLimited++;
      if (i < models.length - 1) await sleep(900);
      continue;
    }
    if (res.status === 404 || res.status === 400) continue;
    throw new Error(`Gemini error ${res.status}: ${lastDetail}`);
  }
  if (rateLimited === models.length) {
    throw new Error(
      "Gemini is rate limited on every model right now. Wait a minute and try again, or enable billing in Google AI Studio.",
    );
  }
  throw new Error(`Gemini: no usable model for this key. Last error: ${lastDetail}`);
}

function textFromChunk(parsed: unknown): string {
  const cands = (parsed as { candidates?: unknown })?.candidates;
  if (!Array.isArray(cands) || !cands[0]) return "";
  const parts = (cands[0] as { content?: { parts?: Array<{ text?: string }> } }).content?.parts;
  return (parts ?? []).map((p) => p.text ?? "").join("");
}

export async function geminiStream(
  prompt: string,
  apiKey: string,
  onChunk: (text: string) => void,
  opts: { temperature?: number; maxOutputTokens?: number } = {},
): Promise<string> {
  const res = await postWithFallback("streamGenerateContent", apiKey, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxOutputTokens ?? 8192,
    },
  });
  if (!res.body) throw new Error("Gemini stream: empty body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  const handle = (line: string) => {
    const t = line.trim();
    if (!t.startsWith("data:")) return;
    const payload = t.slice(5).trim();
    if (!payload || payload === "[DONE]") return;
    try {
      const parsed = JSON.parse(payload) as unknown;
      const text = Array.isArray(parsed)
        ? parsed.map(textFromChunk).join("")
        : textFromChunk(parsed);
      if (text) {
        full += text;
        onChunk(text);
      }
    } catch {
      /* partial */
    }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(handle);
  }
  if (buffer.trim()) handle(buffer);
  return full;
}

export async function geminiJSON<T>(
  prompt: string,
  apiKey: string,
  opts: { temperature?: number; maxOutputTokens?: number } = {},
): Promise<T> {
  const res = await postWithFallback("generateContent", apiKey, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.3,
      maxOutputTokens: opts.maxOutputTokens ?? 8192,
      responseMimeType: "application/json",
    },
  });
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned an empty JSON response.");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Gemini returned malformed JSON.");
  }
}
