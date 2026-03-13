export interface Holding {
  ticker: string
  asset_class: string
  weight: number
  dollar_amount: number
  expected_return: number
  volatility: number
}

export interface Benchmark {
  name: string
  expected_return: number
  volatility: number
  sharpe_ratio: number
}

export interface OptimizeResult {
  expected_return: number
  volatility: number
  sharpe_ratio: number
  cvar_95: number
  holdings: Holding[]
  benchmarks: Benchmark[]
  budget: number
  explanation: string
}

export interface OptimizeRequest {
  budget: number
  risk_tolerance: string
  max_assets: number
  selected_asset_classes: string[]
}

export const ASSET_CLASS_COLORS: Record<string, string> = {
  'US Equities': '#6B9BF2',
  'International Equities': '#9B8FD4',
  'Fixed Income & Bonds': '#5BBAB3',
  'Real Estate': '#D4956A',
  'Commodities': '#C9B458',
  'Crypto': '#9B8FD4',
  'Sector ETFs': '#6DC47E',
  'Defensive Sectors': '#C97B8B',
}

export const ASSET_CLASSES = [
  { key: 'US Equities', label: 'US Equities', tickers: ['VOO', 'QQQ', 'IWM', 'VTV', 'VUG'] },
  { key: 'International Equities', label: 'International Equities', tickers: ['VEA', 'EWJ', 'VGK', 'VWO'] },
  { key: 'Fixed Income & Bonds', label: 'Fixed Income & Bonds', tickers: ['BND', 'IEF', 'TLT', 'LQD', 'SGOV'] },
  { key: 'Real Estate', label: 'Real Estate', tickers: ['VNQ'] },
  { key: 'Commodities', label: 'Commodities', tickers: ['GLD', 'DBC', 'USO', 'XLE'] },
  { key: 'Crypto', label: 'Crypto', tickers: ['IBIT'] },
  { key: 'Sector ETFs', label: 'Sector ETFs', tickers: ['ITA', 'SOXX', 'SRVR', 'CIBR'] },
  { key: 'Defensive Sectors', label: 'Defensive Sectors', tickers: ['XLP', 'XLV', 'XLU'] },
]
