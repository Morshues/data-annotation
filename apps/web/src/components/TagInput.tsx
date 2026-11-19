import { useId, useState } from 'react'
import type { Tag } from '../api'

type Props = {
  value: string[]
  suggestions: Tag[]
  onChange: (tags: string[]) => void
}

export function TagInput({ value, suggestions, onChange }: Props) {
  const [draft, setDraft] = useState('')
  const listId = useId()

  function add(raw: string) {
    const name = raw.trim()
    if (name && !value.includes(name)) onChange([...value, name])
    setDraft('')
  }

  return (
    <div className="tag-input">
      {value.map((name) => (
        <span key={name} className="tag">
          {name}
          <button
            type="button"
            className="tag-remove"
            aria-label={`移除標籤 ${name}`}
            onClick={() => onChange(value.filter((t) => t !== name))}
          >
            ×
          </button>
        </span>
      ))}
      <input
        list={listId}
        value={draft}
        placeholder={value.length === 0 ? '輸入標籤後按 Enter' : ''}
        onChange={(e) => {
          // Picking an option from the datalist fires a change without a key event
          const picked = suggestions.some((t) => t.name === e.target.value)
          if (picked) add(e.target.value)
          else setDraft(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add(draft)
          } else if (e.key === 'Backspace' && draft === '' && value.length) {
            onChange(value.slice(0, -1))
          }
        }}
        onBlur={() => add(draft)}
      />
      <datalist id={listId}>
        {suggestions
          .filter((t) => !value.includes(t.name))
          .map((t) => (
            <option key={t.id} value={t.name} />
          ))}
      </datalist>
    </div>
  )
}
