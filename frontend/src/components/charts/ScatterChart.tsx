import { useEffect, useState } from 'react'
import {
  ScatterChart as RechartsScatter,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
} from 'recharts'
import { EtfPoint, ASSET_CLASS_COLORS } from '../../types'
import { fetchEtfScatter } from '../../api'

interface Props {
  portfolioReturn: number
  portfolioVolatility: number
}

interface ScatterPoint {
  x: number
  y: number
  ticker: string
  asset_class: string
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScatterPoint }> }) {
  if (!active || !payload?.length) return null
  const pt = payload[0].payload
  return (
    <div
      style={{
        background: '#1B151A',
        border: '1px solid #3D2C2A',
        borderRadius: '12px',
        padding: '10px 14px',
        fontSize: '12px',
        color: '#FFFFFF',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: '4px' }}>{pt.ticker}</div>
      <div style={{ color: '#9CA3AF', fontSize: '11px' }}>{pt.asset_class}</div>
      <div style={{ marginTop: '6px' }}>
        Return: <span style={{ color: '#BED26F' }}>{pt.y.toFixed(1)}%</span>
      </div>
      <div>
        Volatility: <span style={{ color: '#E8845C' }}>{pt.x.toFixed(1)}%</span>
      </div>
    </div>
  )
}

// Custom dot renderer that colors each ETF by asset class
function renderDot(props: { cx: number; cy: number; payload: ScatterPoint }) {
  const { cx, cy, payload } = props
  const color = ASSET_CLASS_COLORS[payload.asset_class] || '#6B9BF2'
  return <circle cx={cx} cy={cy} r={5} fill={color} fillOpacity={0.85} stroke={color} strokeWidth={1} />
}

export default function ScatterChartComponent({ portfolioReturn, portfolioVolatility }: Props) {
  const [etfs, setEtfs] = useState<EtfPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEtfScatter()
      .then(setEtfs)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-bg-card border border-border-card rounded-card p-6">
        <div className="text-text-muted text-sm">Loading ETF scatter data...</div>
      </div>
    )
  }

  // Prepare ETF scatter points: x = volatility, y = return
  const etfPoints: ScatterPoint[] = etfs.map((e) => ({
    x: e.annual_volatility,
    y: e.annual_return,
    ticker: e.ticker,
    asset_class: e.asset_class,
  }))

  // Portfolio point
  const portfolioPoint: ScatterPoint[] = [
    {
      x: portfolioVolatility,
      y: portfolioReturn,
      ticker: 'Your Portfolio',
      asset_class: 'Portfolio',
    },
  ]

  // Capital Market Line: from rf through the ETF with highest Sharpe
  const rf = 2.0 // risk-free rate %
  let maxSharpe = 0
  let tangentVol = 0
  let tangentRet = 0
  for (const pt of etfPoints) {
    if (pt.x > 0) {
      const sharpe = (pt.y - rf) / pt.x
      if (sharpe > maxSharpe) {
        maxSharpe = sharpe
        tangentVol = pt.x
        tangentRet = pt.y
      }
    }
  }

  // CML extends from (0, rf) through tangent point, to max volatility on chart
  const maxVol = Math.max(...etfPoints.map((p) => p.x), portfolioVolatility) * 1.15
  const cmlEndReturn = rf + maxSharpe * maxVol

  // CML line as two points
  const cmlPoints = [
    { x: 0, y: rf, ticker: 'CML Start', asset_class: '' },
    { x: maxVol, y: cmlEndReturn, ticker: 'CML End', asset_class: '' },
  ]

  // Determine if portfolio is above or below CML
  const cmlReturnAtPortVol = rf + maxSharpe * portfolioVolatility
  const aboveCml = portfolioReturn > cmlReturnAtPortVol

  // Unique asset classes for legend
  const classesInData = [...new Set(etfs.map((e) => e.asset_class))]

  return (
    <div className="bg-bg-card border border-border-card rounded-card p-6">
      <div className="mb-6">
        <h3 className="text-sm font-medium text-text-secondary tracking-[-0.02em]">
          Risk–Return Scatter & Capital Market Line
        </h3>
        <p className="text-xs text-text-muted mt-1 tracking-[-0.02em]">
          Each dot is an ETF plotted by annualized volatility (risk) and return. The dashed line is the Capital Market
          Line.
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <RechartsScatter margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            type="number"
            dataKey="x"
            name="Volatility"
            tick={{ fill: '#555555', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            domain={[0, 'auto']}
          >
            <Label value="Volatility (%)" position="insideBottom" offset={-5} style={{ fill: '#555555', fontSize: 11 }} />
          </XAxis>
          <YAxis
            type="number"
            dataKey="y"
            name="Return"
            tick={{ fill: '#555555', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
          >
            <Label value="Return (%)" angle={-90} position="insideLeft" offset={5} style={{ fill: '#555555', fontSize: 11 }} />
          </YAxis>
          <Tooltip content={<CustomTooltip />} />

          {/* CML as a reference line from (0,rf) through tangent */}
          <ReferenceLine
            segment={[
              { x: 0, y: rf },
              { x: maxVol, y: cmlEndReturn },
            ]}
            stroke="#FFD700"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            ifOverflow="extendDomain"
          />

          {/* ETF dots */}
          <Scatter name="ETFs" data={etfPoints} shape={renderDot} />

          {/* Portfolio point — larger, highlighted */}
          <Scatter
            name="Your Portfolio"
            data={portfolioPoint}
            shape={(props: { cx: number; cy: number }) => (
              <g>
                <circle cx={props.cx} cy={props.cy} r={9} fill="#BED26F" fillOpacity={0.3} />
                <circle cx={props.cx} cy={props.cy} r={6} fill="#BED26F" stroke="#0D0C13" strokeWidth={2} />
              </g>
            )}
          />
        </RechartsScatter>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 px-2">
        {classesInData.map((cls) => (
          <div key={cls} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ASSET_CLASS_COLORS[cls] || '#6B9BF2' }} />
            <span className="text-xs text-text-secondary">{cls}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#BED26F' }} />
          <span className="text-xs text-text-secondary">Your Portfolio</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 border-t-2 border-dashed" style={{ borderColor: '#FFD700' }} />
          <span className="text-xs text-text-secondary">CML (rf = {rf}%)</span>
        </div>
      </div>

      {/* CML interpretation */}
      <div className="mt-4 px-2">
        <p className="text-xs text-text-muted leading-relaxed">
          {aboveCml ? (
            <>
              Your portfolio sits <span className="text-perf-positive font-medium">above</span> the Capital Market
              Line — it offers a higher return than a simple mix of the risk-free asset and the market tangent portfolio
              at the same volatility level.
            </>
          ) : (
            <>
              Your portfolio sits <span className="text-perf-negative font-medium">below</span> the Capital Market
              Line — a mix of the risk-free asset and the tangent portfolio could achieve a similar return at lower
              volatility.
            </>
          )}
        </p>
      </div>
    </div>
  )
}
