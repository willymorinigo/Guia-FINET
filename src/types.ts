export type MarketType = 'Global' | 'Argentina';

export interface Stock {
  id: string;
  ticker: string;
  name: string;
  market: MarketType;
  assetType?: 'Acción' | 'Bono' | 'ON' | 'Letra';
  baseCurrency: 'USD' | 'ARS';
  price: number;
  targetPrice: number;
  marketCap: number; // in billions
  peRatio: number;
  pbRatio: number;
  roe: number; // percentage
  pegRatio: number;
  dividendYield: number; // percentage
  volume24h: number; // in millions
  ema50: number;
  ema200: number;
  industry: string;
  description: string;
}

export interface MarketSignal {
  ticker: string;
  signal: 'BUY' | 'SELL' | 'HOLD' | 'WATCH';
  reason: string;
  technicalConfidence: number; // 0-100
  fundamentalConfidence: number; // 0-100
}

export interface PoliticalOutlook {
  summary: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  keyFactors: string[];
  impactOnLocal: string;
  impactOnGlobal: string;
}
