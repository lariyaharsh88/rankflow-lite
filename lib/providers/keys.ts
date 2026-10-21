export interface KeyStatus {
  mock: boolean;
  gemini: boolean;
  serper: boolean;
  tavily: boolean;
}

export function keyStatus(): KeyStatus {
  const mock = process.env.MOCK_PROVIDERS === "1" || process.env.MOCK_PROVIDERS === "true";
  return {
    mock,
    gemini: mock || Boolean(process.env.GEMINI_API_KEY?.trim()),
    serper: mock || Boolean(process.env.SERPER_API_KEY?.trim()),
    tavily: mock || Boolean(process.env.TAVILY_API_KEY?.trim()),
  };
}

export function geminiKey(): string {
  const k = process.env.GEMINI_API_KEY?.trim();
  if (!k) throw new Error("GEMINI_API_KEY is not set. Add it to .env and restart the server.");
  return k;
}

export const serperKey = () => process.env.SERPER_API_KEY?.trim() || null;
export const tavilyKey = () => process.env.TAVILY_API_KEY?.trim() || null;
export const isMock = () => keyStatus().mock;
