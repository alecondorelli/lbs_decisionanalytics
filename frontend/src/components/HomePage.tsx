interface Props {
  onStart: () => void
}

export default function HomePage({ onStart }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl text-center animate-fade-in-up">
        {/* Logo / Icon */}
        <div className="w-20 h-20 mx-auto mb-8 rounded-[24px] bg-bg-card border border-border-card flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>

        <h1 className="text-5xl md:text-6xl font-light tracking-[-0.04em] mb-4">
          Portfolio Optimizer
        </h1>
        <p className="text-lg text-text-secondary tracking-[-0.02em] mb-2 font-light">
          Powered by Gurobi Mathematical Optimization
        </p>
        <p className="text-text-muted text-sm max-w-md mx-auto mb-12 leading-relaxed">
          Build a risk-optimized investment portfolio tailored to your goals.
          Select your asset classes, set your risk tolerance, and let the optimizer
          find the optimal allocation using CVaR-constrained mean-variance optimization.
        </p>

        <button
          onClick={onStart}
          className="px-8 py-4 bg-white text-black font-medium rounded-2xl text-sm tracking-[0.5px] uppercase hover:bg-white/90 transition-all duration-200 active:scale-[0.98]"
        >
          Get Started
        </button>

        <div className="mt-16 grid grid-cols-3 gap-8 text-center">
          {[
            { value: '26', label: 'ETFs Available' },
            { value: 'CVaR', label: 'Risk Control' },
            { value: 'Live', label: 'Market Data' },
          ].map((item) => (
            <div key={item.label}>
              <div className="text-2xl font-light tracking-[-0.04em] text-accent-blue">
                {item.value}
              </div>
              <div className="text-xs text-text-muted mt-1 tracking-[-0.02em]">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 text-xs text-text-muted tracking-[-0.02em]">
        Decision Analytics & Modelling — London Business School
      </div>
    </div>
  )
}
