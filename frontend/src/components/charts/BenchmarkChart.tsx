import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Benchmark } from '../../types'

interface Props {
  benchmarks: Benchmark[]
  portfolioReturn: number
  portfolioVolatility: number
  portfolioSharpe: number
}

export default function BenchmarkChart({
  benchmarks,
  portfolioReturn,
  portfolioVolatility,
  portfolioSharpe,
}: Props) {
  const data = [
    {
      name: 'Your Portfolio',
      'Expected Return': portfolioReturn,
      Volatility: portfolioVolatility,
      'Sharpe Ratio': portfolioSharpe,
    },
    ...benchmarks.map((b) => ({
      name: b.name.split(' (')[0],
      'Expected Return': b.expected_return,
      Volatility: b.volatility,
      'Sharpe Ratio': b.sharpe_ratio,
    })),
  ]

  return (
    <div className="bg-bg-card border border-border-card rounded-card p-6">
      <h3 className="text-sm font-medium text-text-secondary mb-6 tracking-[-0.02em]">
        vs Benchmarks — Return & Risk
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barGap={4} barCategoryGap="25%">
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="rgba(255,255,255,0.07)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              background: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              color: '#000',
              fontSize: '12px',
            }}
            formatter={(value: number, name: string) =>
              name === 'Sharpe Ratio' ? value.toFixed(2) : `${value.toFixed(1)}%`
            }
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', color: '#9CA3AF' }}
          />
          <Bar
            dataKey="Expected Return"
            fill="#BED26F"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="Volatility"
            fill="#E8845C"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
