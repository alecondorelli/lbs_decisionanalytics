import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { BacktestData } from '../../types'

interface Props {
  backtest: BacktestData
}

function formatDate(ym: string): string {
  const [y, m] = ym.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[parseInt(m, 10) - 1]} ${y}`
}

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`
  }
  return `$${value.toFixed(0)}`
}

function formatTooltipCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export default function BacktestChart({ backtest }: Props) {
  const data = backtest.dates.map((date, i) => ({
    date,
    label: formatDate(date),
    'Your Portfolio': backtest.portfolio[i],
    'S&P 500 (VOO)': backtest.voo[i],
    'Bonds (BND)': backtest.bnd[i],
    '60/40 Blend': backtest.blend_60_40[i],
  }))

  return (
    <div className="bg-bg-card border border-border-card rounded-card p-6">
      <div className="mb-6">
        <h3 className="text-sm font-medium text-text-secondary tracking-[-0.02em]">
          Historical Performance (3-Year Backtest)
        </h3>
        <p className="text-xs text-text-muted mt-1 tracking-[-0.02em]">
          How your optimized portfolio would have performed using historical data. Past performance does not guarantee future results.
        </p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="rgba(255,255,255,0.06)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: '#555555', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={5}
          />
          <YAxis
            tick={{ fill: '#555555', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatCurrency}
            width={50}
          />
          <Tooltip
            contentStyle={{
              background: '#1B151A',
              border: '1px solid #3D2C2A',
              borderRadius: '12px',
              color: '#FFFFFF',
              fontSize: '12px',
              padding: '12px 16px',
            }}
            labelStyle={{ color: '#9CA3AF', marginBottom: '8px', fontSize: '11px' }}
            formatter={(value: number, name: string) => [formatTooltipCurrency(value), name]}
            labelFormatter={(label: string) => label}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
            iconType="plainline"
          />
          <Line
            type="monotone"
            dataKey="Your Portfolio"
            stroke="#BED26F"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: '#BED26F', stroke: '#0D0C13', strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="S&P 500 (VOO)"
            stroke="#6B9BF2"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            activeDot={{ r: 3, fill: '#6B9BF2' }}
          />
          <Line
            type="monotone"
            dataKey="Bonds (BND)"
            stroke="#5BBAB3"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            activeDot={{ r: 3, fill: '#5BBAB3' }}
          />
          <Line
            type="monotone"
            dataKey="60/40 Blend"
            stroke="#9CA3AF"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            activeDot={{ r: 3, fill: '#9CA3AF' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
