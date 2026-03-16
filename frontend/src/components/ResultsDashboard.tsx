import { OptimizeResult, ASSET_CLASS_COLORS } from '../types'
import AllocationChart from './charts/AllocationChart'
import BenchmarkChart from './charts/BenchmarkChart'
import BacktestChart from './charts/BacktestChart'

import HoldingsTable from './HoldingsTable'

interface Props {
  result: OptimizeResult
  onBack: () => void
}

function MetricCard({
  label,
  value,
  suffix = '%',
  positive,
}: {
  label: string
  value: number
  suffix?: string
  positive?: boolean
}) {
  const colorClass =
    positive === undefined
      ? 'text-white'
      : positive
        ? 'text-perf-positive'
        : 'text-perf-negative'

  return (
    <div className="bg-bg-card border border-border-card rounded-card p-5">
      <div className="text-xs text-text-muted mb-2 tracking-[-0.02em] font-medium uppercase">
        {label}
      </div>
      <div className={`text-3xl font-light tracking-[-0.04em] ${colorClass}`}>
        {value >= 0 && positive !== undefined ? '+' : ''}
        {value.toFixed(suffix === 'x' ? 2 : 1)}
        <span className="text-lg text-text-muted ml-1">{suffix}</span>
      </div>
    </div>
  )
}

function PortfolioBreakdown({ result }: { result: OptimizeResult }) {
  const { asset_class_breakdown, defensive_allocation, concentration } = result.portfolio_analysis
  const entries = Object.entries(asset_class_breakdown)
  const total = entries.reduce((s, [, v]) => s + v, 0)

  // Find the ticker with highest weight
  const topHolding = result.holdings[0]

  return (
    <div className="bg-bg-card border border-border-card rounded-card p-6">
      <h3 className="text-sm font-medium text-text-secondary mb-6 tracking-[-0.02em]">
        Portfolio Breakdown
      </h3>

      {/* Stacked bar */}
      <div className="mb-6">
        <div className="text-xs text-text-muted mb-2 font-medium uppercase">Asset Class Distribution</div>
        <div className="h-4 rounded-full overflow-hidden flex">
          {entries.map(([cls, wt]) => (
            <div
              key={cls}
              style={{
                width: `${(wt / total) * 100}%`,
                backgroundColor: ASSET_CLASS_COLORS[cls] || '#6B9BF2',
              }}
              title={`${cls}: ${wt.toFixed(1)}%`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
          {entries.map(([cls, wt]) => (
            <div key={cls} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: ASSET_CLASS_COLORS[cls] || '#6B9BF2' }}
              />
              <span className="text-xs text-text-secondary">{cls}</span>
              <span className="text-xs text-white font-medium">{wt.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bg-primary rounded-xl p-4 border border-border-card">
          <div className="text-xs text-text-muted mb-1 font-medium uppercase">Defensive Allocation</div>
          <div className="text-xl font-light tracking-[-0.04em] text-perf-positive">
            {defensive_allocation.toFixed(1)}%
          </div>
          <div className="text-xs text-text-muted mt-1">Bonds + Defensive Sectors</div>
        </div>
        <div className="bg-bg-primary rounded-xl p-4 border border-border-card">
          <div className="text-xs text-text-muted mb-1 font-medium uppercase">Largest Position</div>
          <div className="text-xl font-light tracking-[-0.04em] text-white">
            {concentration.toFixed(1)}%
          </div>
          <div className="text-xs text-text-muted mt-1">
            in {topHolding?.ticker || '—'}
          </div>
        </div>
      </div>
    </div>
  )
}

function RationaleSection({ explanation }: { explanation: string }) {
  const paragraphs = explanation.split('\n\n').filter(Boolean)

  return (
    <div className="bg-bg-card border border-border-card rounded-card p-6">
      <h3 className="text-sm font-medium text-text-secondary mb-4 tracking-[-0.02em]">
        Optimization Rationale
      </h3>
      <div className="space-y-3">
        {paragraphs.map((p, i) => (
          <p
            key={i}
            className="text-sm text-text-secondary leading-relaxed tracking-[-0.01em]"
            dangerouslySetInnerHTML={{
              __html: p
                // Bold numbers with % or x suffix
                .replace(/(\d+\.?\d*%)/g, '<span class="text-white font-medium">$1</span>')
                // Bold dollar amounts
                .replace(/(\$[\d,]+)/g, '<span class="text-white font-medium">$1</span>')
                // Bold Sharpe values
                .replace(/(Sharpe [\d.]+)/g, '<span class="text-white font-medium">$1</span>')
                // Bold lambda
                .replace(/(λ = [\d.]+)/g, '<span class="text-perf-positive font-medium">$1</span>')
                // Bold "outperforms"
                .replace(/(outperforms)/g, '<span class="text-perf-positive font-medium">$1</span>')
                // Bold "trails"
                .replace(/(trails)/g, '<span class="text-perf-negative font-medium">$1</span>')
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default function ResultsDashboard({ result, onBack }: Props) {
  return (
    <div className="min-h-screen px-4 py-8 md:px-8">
      <div className="max-w-6xl mx-auto animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-light tracking-[-0.04em]">
              Optimized Portfolio
            </h2>
            <p className="text-text-secondary text-sm mt-1 tracking-[-0.02em]">
              Budget: ${result.budget.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <button
            onClick={onBack}
            className="px-5 py-2.5 bg-bg-card border border-border-card rounded-xl text-sm text-text-secondary hover:text-white hover:border-border-card-alt transition-all"
          >
            Adjust Inputs
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard
            label="Expected Return"
            value={result.expected_return}
            positive={result.expected_return >= 0}
          />
          <MetricCard
            label="Volatility"
            value={result.volatility}
          />
          <MetricCard
            label="Sharpe Ratio"
            value={result.sharpe_ratio}
            suffix="x"
            positive={result.sharpe_ratio > 0}
          />
          <MetricCard
            label="CVaR (95%)"
            value={result.cvar_95}
          />
        </div>

        {/* Backtest Chart — full width hero */}
        <div className="mb-6">
          <BacktestChart backtest={result.backtest} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <AllocationChart holdings={result.holdings} />
          <BenchmarkChart
            benchmarks={result.benchmarks}
            portfolioReturn={result.expected_return}
            portfolioVolatility={result.volatility}
            portfolioSharpe={result.sharpe_ratio}
          />
        </div>

        {/* Portfolio Breakdown */}
        <div className="mb-6">
          <PortfolioBreakdown result={result} />
        </div>

        {/* Holdings Table */}
        <div className="mb-6">
          <HoldingsTable holdings={result.holdings} />
        </div>

        {/* Rationale */}
        <div className="mb-8">
          <RationaleSection explanation={result.explanation} />
        </div>
      </div>
    </div>
  )
}
