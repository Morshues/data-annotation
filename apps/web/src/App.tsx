import { useEffect, useState } from 'react'

type Health = {
  status: string
  database: string
}

function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json() as Promise<Health>)
      .then(setHealth)
      .catch((err: unknown) => setError(String(err)))
  }, [])

  return (
    <main>
      <h1>Corpus Analysis</h1>
      <h2>System Status</h2>
      {error && <p>API: error ({error})</p>}
      {!error && !health && <p>Loading...</p>}
      {health && (
        <ul>
          <li>API: {health.status}</li>
          <li>Database: {health.database}</li>
        </ul>
      )}
    </main>
  )
}

export default App
