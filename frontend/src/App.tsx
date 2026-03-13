import { useState } from 'react'
import { OptimizeResult } from './types'
import HomePage from './components/HomePage'
import InputForm from './components/InputForm'
import LoadingState from './components/LoadingState'
import ResultsDashboard from './components/ResultsDashboard'

type View = 'home' | 'form' | 'loading' | 'results'

export default function App() {
  const [view, setView] = useState<View>('home')
  const [result, setResult] = useState<OptimizeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-bg-primary">
      {view === 'home' && <HomePage onStart={() => setView('form')} />}
      {view === 'form' && (
        <InputForm
          onLoading={() => {
            setError(null)
            setView('loading')
          }}
          onResult={(r) => {
            setResult(r)
            setView('results')
          }}
          onError={(e) => {
            setError(e)
            setView('form')
          }}
          error={error}
        />
      )}
      {view === 'loading' && <LoadingState />}
      {view === 'results' && result && (
        <ResultsDashboard
          result={result}
          onBack={() => setView('form')}
        />
      )}
    </div>
  )
}
