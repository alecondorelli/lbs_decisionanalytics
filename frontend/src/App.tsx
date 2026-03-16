import { useState } from 'react'
import { OptimizeResult } from './types'
import HomePage from './components/HomePage'
import InputForm from './components/InputForm'
import LoadingState from './components/LoadingState'
import ResultsDashboard from './components/ResultsDashboard'

type View = 'home' | 'form' | 'loading' | 'results'

interface LoadingContext {
  numTickers: number
  numClasses: number
  riskTolerance: string
}

export default function App() {
  const [view, setView] = useState<View>('home')
  const [result, setResult] = useState<OptimizeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingCtx, setLoadingCtx] = useState<LoadingContext>({ numTickers: 0, numClasses: 0, riskTolerance: 'medium' })
  const [optimizationComplete, setOptimizationComplete] = useState(false)

  return (
    <div className="min-h-screen bg-bg-primary">
      {view === 'home' && <HomePage onStart={() => setView('form')} />}
      {view === 'form' && (
        <InputForm
          onLoading={(ctx) => {
            setError(null)
            setOptimizationComplete(false)
            setLoadingCtx(ctx)
            setView('loading')
          }}
          onResult={(r) => {
            setResult(r)
            setOptimizationComplete(true)
          }}
          onError={(e) => {
            setError(e)
            setView('form')
          }}
          error={error}
        />
      )}
      {view === 'loading' && (
        <LoadingState
          numTickers={loadingCtx.numTickers}
          numClasses={loadingCtx.numClasses}
          riskTolerance={loadingCtx.riskTolerance}
          isComplete={optimizationComplete}
          onViewResults={() => setView('results')}
        />
      )}
      {view === 'results' && result && (
        <ResultsDashboard
          result={result}
          onBack={() => setView('form')}
        />
      )}
    </div>
  )
}
