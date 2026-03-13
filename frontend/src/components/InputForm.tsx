import { useState } from 'react'
import { ASSET_CLASSES, ASSET_CLASS_COLORS, OptimizeResult } from '../types'
import { optimizePortfolio } from '../api'

interface Props {
  onLoading: () => void
  onResult: (r: OptimizeResult) => void
  onError: (e: string) => void
  error: string | null
}

export default function InputForm({ onLoading, onResult, onError, error }: Props) {
  const [budget, setBudget] = useState(100000)
  const [riskTolerance, setRiskTolerance] = useState<'low' | 'medium' | 'high'>('medium')
  const [maxAssets, setMaxAssets] = useState(6)
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(
    new Set(['US Equities', 'Fixed Income & Bonds'])
  )

  const toggleClass = (key: string) => {
    const next = new Set(selectedClasses)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    setSelectedClasses(next)
  }

  const handleSubmit = async () => {
    if (selectedClasses.size === 0) {
      onError('Please select at least one asset class.')
      return
    }
    onLoading()
    try {
      const result = await optimizePortfolio({
        budget,
        risk_tolerance: riskTolerance,
        max_assets: maxAssets,
        selected_asset_classes: Array.from(selectedClasses),
      })
      onResult(result)
    } catch (e: any) {
      onError(e.message || 'Optimization failed')
    }
  }

  const riskLabels = { low: 'Conservative', medium: 'Moderate', high: 'Aggressive' }
  const riskDescriptions = {
    low: 'Prioritize capital preservation. CVaR threshold: 5%',
    medium: 'Balance growth and risk. CVaR threshold: 10%',
    high: 'Maximize returns, accept higher drawdowns. CVaR threshold: 20%',
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl animate-fade-in-up">
        <h2 className="text-3xl font-light tracking-[-0.04em] mb-1">
          Configure Your Portfolio
        </h2>
        <p className="text-text-secondary text-sm mb-10 tracking-[-0.02em]">
          Set your preferences and let the optimizer do the work.
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm">
            {error}
          </div>
        )}

        {/* Budget */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-text-secondary mb-3 tracking-[-0.02em]">
            Investment Budget
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-lg">$</span>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              min={1000}
              step={1000}
              className="w-full bg-bg-card border border-border-card rounded-xl px-4 pl-8 py-4 text-white text-lg font-light tracking-[-0.02em] outline-none focus:border-accent-blue transition-colors"
            />
          </div>
          <p className="text-text-muted text-xs mt-2">Minimum $1,000</p>
        </div>

        {/* Risk Tolerance */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-text-secondary mb-3 tracking-[-0.02em]">
            Risk Tolerance
          </label>
          <div className="flex gap-3">
            {(['low', 'medium', 'high'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setRiskTolerance(level)}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                  riskTolerance === level
                    ? 'bg-white text-black shadow-[0_0_20px_rgba(95,27,5,0.3)]'
                    : 'bg-bg-card border border-border-card text-text-secondary hover:border-border-card-alt'
                }`}
              >
                {riskLabels[level]}
              </button>
            ))}
          </div>
          <p className="text-text-muted text-xs mt-2">
            {riskDescriptions[riskTolerance]}
          </p>
        </div>

        {/* Max Assets Slider */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-text-secondary mb-3 tracking-[-0.02em]">
            Maximum Assets in Portfolio
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={2}
              max={10}
              value={maxAssets}
              onChange={(e) => setMaxAssets(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-2xl font-light tracking-[-0.04em] text-accent-blue w-8 text-right">
              {maxAssets}
            </span>
          </div>
        </div>

        {/* Asset Classes */}
        <div className="mb-10">
          <label className="block text-sm font-semibold text-text-secondary mb-3 tracking-[-0.02em]">
            Asset Classes
          </label>
          <div className="grid grid-cols-2 gap-3">
            {ASSET_CLASSES.map((cls) => {
              const selected = selectedClasses.has(cls.key)
              const color = ASSET_CLASS_COLORS[cls.key]
              return (
                <button
                  key={cls.key}
                  onClick={() => toggleClass(cls.key)}
                  className={`relative p-4 rounded-xl text-left transition-all duration-200 ${
                    selected
                      ? 'bg-bg-card border-2'
                      : 'bg-bg-card border border-border-card hover:border-border-card-alt'
                  }`}
                  style={selected ? { borderColor: color } : undefined}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className={`text-sm font-medium ${selected ? 'text-white' : 'text-text-secondary'}`}>
                      {cls.label}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted pl-[18px]">
                    {cls.tickers.join(', ')}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={selectedClasses.size === 0}
          className="w-full py-4 bg-white text-black font-medium rounded-2xl text-sm tracking-[0.5px] uppercase hover:bg-white/90 transition-all duration-200 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Optimize My Portfolio
        </button>
      </div>
    </div>
  )
}
