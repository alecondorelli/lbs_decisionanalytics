import { useState, useEffect } from 'react'

interface Props {
  numTickers: number
  numClasses: number
  riskTolerance: string
  isComplete: boolean
  onViewResults: () => void
}

const RISK_LABELS: Record<string, string> = {
  low: 'conservative',
  medium: 'moderate',
  high: 'aggressive',
}

export default function LoadingState({
  numTickers,
  numClasses,
  riskTolerance,
  isComplete,
  onViewResults,
}: Props) {
  const [visibleCards, setVisibleCards] = useState(0)

  useEffect(() => {
    if (isComplete) return
    const timers = [
      setTimeout(() => setVisibleCards(1), 800),
      setTimeout(() => setVisibleCards(2), 3000),
      setTimeout(() => setVisibleCards(3), 5500),
      setTimeout(() => setVisibleCards(4), 8000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [isComplete])

  useEffect(() => {
    if (isComplete) setVisibleCards(4)
  }, [isComplete])

  const riskLabel = RISK_LABELS[riskTolerance] || riskTolerance

  const cards = [
    {
      title: 'Scenario Generation',
      desc: 'Generating 500 market scenarios using historical return patterns (block bootstrap method)',
    },
    {
      title: 'Model Construction',
      desc: `Building optimization model with ${numTickers} assets across ${numClasses} asset class${numClasses !== 1 ? 'es' : ''} for a ${riskLabel} risk profile`,
    },
    {
      title: 'Risk Optimization',
      desc: 'Minimizing tail risk (CVaR) while maximizing expected returns using Gurobi mixed-integer solver',
    },
    {
      title: 'Constraint Enforcement',
      desc: 'Applying portfolio constraints: max 25% per asset, minimum diversification across asset classes',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in-up">
          {!isComplete ? (
            <>
              {/* Pulsing indicator */}
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-accent-blue/20 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-accent-blue/30 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-accent-blue animate-pulse-glow" />
                </div>
              </div>
              <h3 className="text-2xl font-light tracking-[-0.04em] mb-2">
                Optimizing Your Portfolio
              </h3>
              <p className="text-text-muted text-sm tracking-[-0.02em]">
                Running Gurobi solver with CVaR constraints...
              </p>
            </>
          ) : (
            <>
              {/* Checkmark */}
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-perf-positive/20 flex items-center justify-center stagger-fade-in">
                <svg className="w-8 h-8 text-perf-positive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="text-2xl font-light tracking-[-0.04em] mb-2">
                Optimization Complete
              </h3>
              <p className="text-text-muted text-sm tracking-[-0.02em]">
                Your portfolio has been optimized across {numTickers} assets
              </p>
            </>
          )}
        </div>

        {/* Explanation cards */}
        <div className="space-y-3 mb-10">
          {cards.map((card, i) => (
            <div
              key={i}
              className={`bg-bg-card border border-border-card rounded-card p-5 transition-all duration-500 ${
                i < visibleCards
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-4 pointer-events-none'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${
                  isComplete
                    ? 'bg-perf-positive/20'
                    : i < visibleCards - 1
                      ? 'bg-perf-positive/20'
                      : 'bg-accent-blue/20'
                }`}>
                  {isComplete || i < visibleCards - 1 ? (
                    <svg className="w-3.5 h-3.5 text-perf-positive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-accent-blue animate-pulse-glow" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-white mb-1">{card.title}</div>
                  <div className="text-xs text-text-secondary leading-relaxed">{card.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View results button */}
        {isComplete && (
          <div className="text-center stagger-fade-in">
            <button
              onClick={onViewResults}
              className="px-8 py-4 bg-white text-black font-medium rounded-2xl text-sm tracking-[0.5px] uppercase hover:bg-white/90 transition-all duration-200 active:scale-[0.98]"
            >
              View Your Optimized Portfolio
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
