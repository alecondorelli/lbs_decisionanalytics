import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Holding, ASSET_CLASS_COLORS } from '../../types'

interface Props {
  holdings: Holding[]
}

export default function AllocationChart({ holdings }: Props) {
  const data = holdings.map((h) => ({
    name: h.ticker,
    value: h.weight,
    assetClass: h.asset_class,
    color: ASSET_CLASS_COLORS[h.asset_class] || '#6B9BF2',
  }))

  return (
    <div className="bg-bg-card border border-border-card rounded-card p-6">
      <h3 className="text-sm font-medium text-text-secondary mb-6 tracking-[-0.02em]">
        Portfolio Allocation
      </h3>
      <div className="flex items-center gap-8">
        <div className="w-48 h-48 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="65%"
                outerRadius="95%"
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div className="bg-white text-black px-3 py-2 rounded-lg text-xs shadow-lg">
                      <div className="font-semibold">{d.name}</div>
                      <div>{d.value.toFixed(1)}%</div>
                    </div>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-xs text-text-secondary truncate">{d.name}</span>
              <span className="text-xs text-white ml-auto font-medium">{d.value.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
