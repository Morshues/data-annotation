import { useState } from 'react'

// Runs an async action while tracking its busy state and error message.
export function useSubmit<T>(action: (value: T) => Promise<void>) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(value: T) {
    setBusy(true)
    setError(null)
    try {
      await action(value)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return { busy, error, submit }
}
