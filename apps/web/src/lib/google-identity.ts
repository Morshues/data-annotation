// Minimal typings for the parts of Google Identity Services used here
// https://developers.google.com/identity/gsi/web/reference/js-reference
type GoogleId = {
  initialize: (config: {
    client_id: string
    callback: (response: { credential: string }) => void
  }) => void
  renderButton: (
    parent: HTMLElement,
    options: Record<string, string | number>,
  ) => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } }
  }
}

const SCRIPT_URL = 'https://accounts.google.com/gsi/client'

let loading: Promise<GoogleId> | null = null

// Loads the Google sign-in script once
export function loadGoogleIdentity(): Promise<GoogleId> {
  loading ??= new Promise<GoogleId>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () =>
      window.google
        ? resolve(window.google.accounts.id)
        : reject(new Error('Google 登入元件載入失敗'))
    script.onerror = () => {
      loading = null
      script.remove()
      reject(new Error('無法載入 Google 登入元件，請檢查網路連線'))
    }
    document.head.append(script)
  })
  return loading
}
