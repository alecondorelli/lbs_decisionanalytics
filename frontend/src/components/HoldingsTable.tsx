import { Holding, ASSET_CLASS_COLORS } from '../types'

interface Props {
  holdings: Holding[]
}

export default function HoldingsTable({ holdings }: Props) {
  return (
    <div className="bg-bg-card border border-border-card rounded-card p-6 overflow-x-auto">
      <h3 className="text-sm font-medium text-text-secondary mb-6 tracking-[-0.02em]">
        Holdings Detail
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[rgba(255,255,255,0.1)]">
            {['Ticker', 'Asset Class', 'Weight', 'Amount', 'Exp. Return', 'Volatility'].map(
              (h) => (
                <th
                  key={h}
                  className="text-left text-xs text-text-muted font-medium pb-3 pr-4 tracking-[-0.02em]"
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => {
            const color = ASSET_CLASS_COLORS[h.asset_class] || '#6B9BF2'
            return (
              <tr
                key={h.ticker}
                className="border-b border-[rgba(255,255,255,0.06)] last:border-none"
              >
                <td className="py-3 pr-4 font-medium text-white">{h.ticker}</td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-text-secondary text-xs">{h.asset_class}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-white">{h.weight.toFixed(1)}%</td>
                <td className="py-3 pr-4 text-text-secondary">
                  ${h.dollar_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className={`py-3 pr-4 ${h.expected_return >= 0 ? 'text-perf-positive' : 'text-perf-negative'}`}>
                  {h.expected_return >= 0 ? '+' : ''}{h.expected_return.toFixed(1)}%
                </td>
                <td className="py-3 text-text-secondary">{h.volatility.toFixed(1)}%</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
