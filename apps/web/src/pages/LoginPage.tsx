import { useEffect, useRef, useState } from 'react'
import type { User } from '../api'
import { api } from '../api'
import { loadGoogleIdentity } from '../lib/google-identity'

export function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const buttonRef = useRef<HTMLDivElement>(null)
  // undefined while loading; null when the server has no client id
  const [clientId, setClientId] = useState<string | null | undefined>()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getAuthConfig().then(
      (config) => setClientId(config.googleClientId),
      (err: unknown) =>
        setError(err instanceof Error ? err.message : String(err)),
    )
  }, [])

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    loadGoogleIdentity().then(
      (googleId) => {
        if (cancelled || !buttonRef.current) return
        googleId.initialize({
          client_id: clientId,
          callback: ({ credential }) => {
            setError(null)
            api
              .loginWithGoogle(credential)
              .then(onLogin, (err: unknown) =>
                setError(err instanceof Error ? err.message : String(err)),
              )
          },
        })
        googleId.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          locale: 'zh-TW',
        })
      },
      (err: unknown) =>
        setError(err instanceof Error ? err.message : String(err)),
    )
    return () => {
      cancelled = true
    }
  }, [clientId, onLogin])

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>Corpus Analysis</h1>
        <p className="muted">
          請用 Google 帳號登入，登入後會看到你有權限的專案。
        </p>
        {clientId === null ? (
          <p className="error">
            尚未設定 Google 登入：請在後端的環境變數設定 GOOGLE_CLIENT_ID，詳見
            README 的「Google 登入設定」。
          </p>
        ) : (
          <div ref={buttonRef} className="google-button" />
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  )
}
