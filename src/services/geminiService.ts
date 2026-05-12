import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

function getCachedData(key: string) {
  const cached = localStorage.getItem(key);
  if (!cached) return null;
  
  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp > CACHE_DURATION) {
    localStorage.removeItem(key);
    return null;
  }
  return data;
}

function setCachedData(key: string, data: any) {
  localStorage.setItem(key, JSON.stringify({
    data,
    timestamp: Date.now()
  }));
}

export async function fetchStockData(tickers: string[]) {
  const cacheKey = `stock_data_${tickers.sort().join('_')}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const prompt = `You are a financial data assistant. Search Invertir Online (https://www.invertironline.com) for the latest real-time stock price and target price (average analyst estimate) for these tickers: ${tickers.join(", ")}. 
    For Argentine assets (AL30, GD30, GGAL, YPFD, etc.), look for current market prices in ARS and verify the Dólar MEP rate. 
    Return a JSON array where each object has ticker, price, and targetPrice.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              ticker: { type: Type.STRING },
              price: { type: Type.NUMBER },
              targetPrice: { type: Type.NUMBER },
            },
            required: ["ticker", "price", "targetPrice"],
          },
        },
      },
    });

    const result = JSON.parse(response.text || "[]");
    if (result && result.length > 0) {
      setCachedData(cacheKey, result);
    }
    return result;
  } catch (error: any) {
    console.error("Error fetching stock data:", error);
    if (error?.message?.includes("RESOURCE_EXHAUSTED") || error?.status === 429) {
      throw new Error("QUOTA_EXCEEDED");
    }
    return [];
  }
}

export async function getPoliticalAnalysis(stocks: any[], promptSuffix: string) {
  const cacheKey = `pol_analysis_${stocks.map(s => s.ticker).sort().join('_')}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const context = `Assets: ${stocks.map(s => s.ticker).join(", ")}. ${promptSuffix}`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyse how current political and economic news affect these assets for a safe investor. Response must be JSON.
      ${context}`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            keyFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
            sentiment: { type: Type.STRING, enum: ["BULLISH", "NEUTRAL", "BEARISH"] }
          },
          required: ["summary", "keyFactors", "sentiment"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    if (result && result.summary) {
      setCachedData(cacheKey, result);
    }
    return result;
  } catch (error: any) {
    console.error("Error in political analysis:", error);
    if (error?.message?.includes("RESOURCE_EXHAUSTED") || error?.status === 429) {
      throw new Error("QUOTA_EXCEEDED");
    }
    return null;
  }
}
