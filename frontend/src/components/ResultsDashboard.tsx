import { OptimizeResult } from '../types'
import AllocationChart from './charts/AllocationChart'
import BenchmarkChart from './charts/BenchmarkChart'
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

        {/* Holdings Table */}
        <div className="mb-6">
          <HoldingsTable holdings={result.holdings} />
        </div>

        {/* Explanation */}
        <div className="bg-bg-card border border-border-card rounded-card p-6 mb-8">
          <h3 className="text-sm font-medium text-text-secondary mb-3 tracking-[-0.02em]">
            Optimization Rationale
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed tracking-[-0.01em]">
            {result.explanation}
          </p>
        </div>
      </div>
    </div>
  )
}
