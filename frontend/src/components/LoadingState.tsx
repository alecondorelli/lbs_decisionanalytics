export default function LoadingState() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="text-center animate-fade-in-up">
        {/* Animated rings */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full border-2 border-border-card animate-ping opacity-20" />
          <div className="absolute inset-2 rounded-full border-2 border-accent-blue/40 animate-pulse" />
          <div className="absolute inset-4 rounded-full border-2 border-accent-blue animate-pulse-glow" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-8 h-8 text-accent-blue animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        </div>

        <h3 className="text-xl font-light tracking-[-0.04em] mb-2">
          Optimizing Your Portfolio
        </h3>
        <p className="text-text-muted text-sm tracking-[-0.02em] animate-pulse-glow">
          Running Gurobi solver with CVaR constraints...
        </p>
      </div>
    </div>
  )
}
