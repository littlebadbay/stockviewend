export interface QuoteDTO {
  symbol: string; // e.g., 600000.SH
  name?: string;
  price: number;
  change?: number;
  changePercent?: number;
  open?: number;
  high?: number;
  low?: number;
  prevClose?: number;
  volume?: number; // shares
  time?: number; // epoch ms
}

export interface KlineDTO {
  timestamp: number; // epoch ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SymbolDTO {
  symbol: string; // e.g., 600000.SH
  name: string;
  exchange?: 'SH' | 'SZ';
}
