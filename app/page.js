'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

const MODELS = [
  { id: 'compound-beta',                  label: 'Compound Beta',  tag: 'Default' },
  { id: 'llama-3.3-70b-versatile',        label: 'Llama 3.3 70B', tag: 'Quality' },
  { id: 'llama-3.1-8b-instant',           label: 'Llama 3.1 8B',  tag: 'Fast'    },
  { id: 'mixtral-8x7b-32768',             label: 'Mixtral 8x7B',  tag: 'Long ctx'},
  { id: 'gemma2-9b-it',                   label: 'Gemma 2 9B',    tag: 'Google'  },
  { id: 'deepseek-r1-distill-llama-70b',  label: 'DeepSeek R1',   tag: 'Reasoning'},
]

const SUGGESTIONS = [
  'Write a Python web scraper',
  'Explain how neural networks learn',
  'Build a REST API in Node.js',
  'Debug my code and explain the fix',
  'Write a bash automation script',
  'Explain end-to-end encryption',
]

// ── Icons ──────────────────────────────────────────────────────────────────
const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13"/><polygon points="22,2 15,22 11,13 2,9"/>
  </svg>
)
const StopIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <rect x="5" y="5" width="14" height="14" rx="2"/>
  </svg>
)
const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
)
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
)
const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2"/>
  </svg>
)
const KeyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
  </svg>
)
const ChevronDown = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6,9 12,15 18,9"/>
  </svg>
)
const FreyaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2a10 10 0 0 1 0 20"/>
    <path d="M2 12h20"/>
    <path d="M12 2c-3 3-4 6-4 10s1 7 4 10"/>
  </svg>
)

// ── Code Block ──────────────────────────────────────────────────────────────
function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div style={{ margin: '1rem 0', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--surface2)', padding: '8px 14px',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '0.72rem', color: 'var(--text3)', letterSpacing: '0.06em' }}>
          {language || 'code'}
        </span>
        <button onClick={copy} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: copied ? '#4ade80' : 'var(--text3)',
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: '0.72rem', fontFamily: 'Geist Mono, monospace',
          transition: 'color 0.2s', padding: '2px 0',
        }}>
          {copied ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language || 'text'}
        customStyle={{
          margin: 0, borderRadius: 0,
          background: '#0d0d0d',
          fontSize: '0.84rem',
          padding: '1rem 1.25rem',
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  )
}

// ── Message ─────────────────────────────────────────────────────────────────
function Message({ msg, isStreaming }) {
  const isUser = msg.role === 'user'
  return (
    <div className="fade-up" style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 24,
      gap: 12,
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, flexShrink: 0, borderRadius: 8,
          background: 'var(--surface2)',
          border: '1px solid var(--border2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text2)', marginTop: 2,
        }}>
          <FreyaIcon />
        </div>
      )}
      <div style={{ maxWidth: isUser ? '72%' : '82%', minWidth: 0 }}>
        {isUser ? (
          <div style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: '18px 18px 4px 18px',
            padding: '11px 16px',
            fontSize: '0.9375rem',
            lineHeight: 1.65,
            color: 'var(--text)',
            whiteSpace: 'pre-wrap',
          }}>
            {msg.content}
          </div>
        ) : (
          <div className="prose">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children }) {
                  const lang = /language-(\w+)/.exec(className || '')?.[1]
                  return !inline
                    ? <CodeBlock language={lang}>{String(children).replace(/\n$/, '')}</CodeBlock>
                    : <code className={className}>{children}</code>
                }
              }}
            >
              {msg.content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="blink" style={{
                display: 'inline-block', width: 2, height: 16,
                background: 'var(--text2)', marginLeft: 2,
                borderRadius: 1, verticalAlign: 'text-bottom',
              }}/>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Thinking ────────────────────────────────────────────────────────────────
function Thinking() {
  return (
    <div className="fade-up" style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
      <div style={{
        width: 32, height: 32, flexShrink: 0, borderRadius: 8,
        background: 'var(--surface2)', border: '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)',
      }}>
        <FreyaIcon />
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '11px 16px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '4px 18px 18px 18px',
      }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--text3)',
            animation: 'pulse 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.18}s`,
          }}/>
        ))}
      </div>
    </div>
  )
}

// ── Key Setup ──────────────────────────────────────────────────────────────
function KeySetup({ onSave }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [testing, setTesting] = useState(false)

  const save = async () => {
    if (!key.startsWith('gsk_')) {
      setError('Groq keys start with gsk_ — double-check you copied it correctly')
      return
    }
    setTesting(true)
    setError('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-groq-key': key },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }], model: 'llama-3.1-8b-instant' }),
      })
      if (res.status === 401) { setError('Invalid API key — try again'); setTesting(false); return }
      localStorage.setItem('groq_key', key)
      onSave(key)
    } catch {
      setError('Connection failed — check your internet')
    }
    setTesting(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', background: 'var(--bg)',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: 'var(--surface2)',
            border: '1px solid var(--border2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text)', margin: '0 auto 1rem',
          }}>
            <FreyaIcon />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 600, color: 'var(--white)', letterSpacing: '-0.02em' }}>
            Freya AI
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text3)', marginTop: 6 }}>
            Enter your Groq API key to get started
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '1.75rem',
        }}>
          {/* Steps */}
          <div style={{ marginBottom: '1.5rem' }}>
            {[
              { n: 1, text: 'Visit', link: 'console.groq.com', href: 'https://console.groq.com' },
              { n: 2, text: 'Sign up free — no credit card needed' },
              { n: 3, text: 'Go to API Keys → Create API Key' },
              { n: 4, text: 'Paste your key below' },
            ].map((s) => (
              <div key={s.n} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'center' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  background: 'var(--surface3)', border: '1px solid var(--border2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 600, color: 'var(--text2)',
                  fontFamily: 'Geist Mono, monospace',
                }}>{s.n}</div>
                <span style={{ fontSize: '0.875rem', color: 'var(--text2)', lineHeight: 1.5 }}>
                  {s.text}{' '}
                  {s.link && <a href={s.href} target="_blank" style={{ color: 'var(--white)', textDecoration: 'underline', textUnderlineOffset: 3 }}>{s.link}</a>}
                </span>
              </div>
            ))}
          </div>

          {/* Input */}
          <div style={{
            background: 'var(--surface2)',
            border: `1px solid ${error ? 'var(--danger)' : 'var(--border2)'}`,
            borderRadius: 10, overflow: 'hidden',
            transition: 'border-color 0.2s',
            display: 'flex', alignItems: 'center', padding: '0 14px',
          }}>
            <KeyIcon />
            <input
              type="password"
              value={key}
              onChange={e => { setKey(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && save()}
              placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxx"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: 'var(--text)', fontFamily: 'Geist Mono, monospace', fontSize: '0.84rem',
                padding: '13px 10px',
              }}
            />
          </div>

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: 8, fontFamily: 'Geist Mono, monospace' }}>
              {error}
            </p>
          )}

          <button
            onClick={save}
            disabled={!key || testing}
            style={{
              width: '100%', marginTop: 12, padding: '13px',
              background: key && !testing ? 'var(--white)' : 'var(--surface3)',
              color: key && !testing ? '#000' : 'var(--text3)',
              border: 'none', borderRadius: 10, cursor: key && !testing ? 'pointer' : 'default',
              fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.01em',
              transition: 'all 0.2s',
            }}
          >
            {testing ? 'Verifying…' : 'Continue →'}
          </button>

          <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '1rem', textAlign: 'center', lineHeight: 1.6 }}>
            Your key is stored locally in your browser and never shared.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [apiKey, setApiKey]         = useState(null)
  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [streaming, setStreaming]   = useState(false)
  const [model, setModel]           = useState(MODELS[0].id)
  const [showModels, setShowModels] = useState(false)
  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)
  const abortRef    = useRef(null)

  useEffect(() => {
    const k = localStorage.getItem('groq_key')
    if (k) setApiKey(k)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  const send = useCallback(async (text) => {
    const userText = (text || input).trim()
    if (!userText || streaming) return
    setInput('')
    if (textareaRef.current) { textareaRef.current.style.height = 'auto' }

    const userMsg  = { role: 'user', content: userText }
    const newMsgs  = [...messages, userMsg]
    setMessages(newMsgs)
    setStreaming(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-groq-key': apiKey },
        body: JSON.stringify({ messages: newMsgs.map(m => ({ role: m.role, content: m.content })), model }),
      })

      if (!res.ok) {
        const err = await res.json()
        if (err.error === 'INVALID_KEY' || err.error === 'NO_KEY') {
          localStorage.removeItem('groq_key'); setApiKey(null); return
        }
        throw new Error(err.message || 'API error')
      }

      const reader  = res.body.getReader()
      const dec     = new TextDecoder()
      let buf = '', fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const { text: t, error } = JSON.parse(data)
            if (error) throw new Error(error)
            if (t) { fullText += t; setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: fullText }]) }
          } catch {}
        }
      }
    } catch (e) {
      setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: `**Error:** ${e.message}` }])
    }
    setStreaming(false)
    textareaRef.current?.focus()
  }, [input, messages, streaming, apiKey, model])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  if (!apiKey) return <KeySetup onSave={setApiKey} />

  const currentModel = MODELS.find(m => m.id === model) || MODELS[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}
      onClick={() => setShowModels(false)}>

      {/* ── Header ── */}
      <header style={{
        height: 56, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1.25rem',
        background: 'rgba(10,10,10,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        position: 'relative', zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'var(--surface2)', border: '1px solid var(--border2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)',
          }}>
            <FreyaIcon />
          </div>
          <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--white)', letterSpacing: '-0.01em' }}>
            Freya
          </span>
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Model picker */}
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowModels(!showModels)}
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 8, padding: '6px 11px',
                color: 'var(--text2)', fontSize: '0.8rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'border-color 0.2s, color 0.2s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)' }}
            >
              {currentModel.label}
              <ChevronDown />
            </button>

            {showModels && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 200,
                background: 'var(--surface)',
                border: '1px solid var(--border2)',
                borderRadius: 12, minWidth: 220, overflow: 'hidden',
                boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
              }}>
                <div style={{ padding: '6px' }}>
                  {MODELS.map(m => (
                    <button key={m.id}
                      onClick={() => { setModel(m.id); setShowModels(false) }}
                      style={{
                        width: '100%', textAlign: 'left',
                        background: m.id === model ? 'var(--surface2)' : 'none',
                        border: 'none', borderRadius: 8,
                        padding: '9px 12px', cursor: 'pointer',
                        color: m.id === model ? 'var(--white)' : 'var(--text2)',
                        fontSize: '0.85rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        transition: 'background 0.15s, color 0.15s',
                        fontFamily: 'inherit',
                      }}
                      onMouseEnter={e => { if (m.id !== model) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)' } }}
                      onMouseLeave={e => { if (m.id !== model) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text2)' } }}
                    >
                      <span>{m.label}</span>
                      <span style={{
                        fontSize: '0.68rem', background: 'var(--surface3)',
                        border: '1px solid var(--border)', padding: '2px 7px', borderRadius: 5,
                        color: 'var(--text3)', letterSpacing: '0.03em',
                      }}>{m.tag}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Clear */}
          <button
            onClick={() => setMessages([])}
            title="New chat"
            style={{
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 8px',
              color: 'var(--text3)', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)' }}
          >
            <TrashIcon />
          </button>

          {/* Change key */}
          <button
            onClick={() => { localStorage.removeItem('groq_key'); setApiKey(null) }}
            title="Change API key"
            style={{
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 8px',
              color: 'var(--text3)', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)' }}
          >
            <KeyIcon />
          </button>
        </div>
      </header>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 1rem 1rem' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="fade-in" style={{ textAlign: 'center', paddingTop: '10vh' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text2)', margin: '0 auto 1.25rem',
              }}>
                <FreyaIcon />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--white)', letterSpacing: '-0.02em', marginBottom: 8 }}>
                How can I help?
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text3)', marginBottom: '2.5rem' }}>
                Freya AI — powered by Groq
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 8, maxWidth: 620, margin: '0 auto',
              }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)} style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 10, padding: '11px 14px',
                    color: 'var(--text2)', fontSize: '0.84rem', cursor: 'pointer',
                    textAlign: 'left', lineHeight: 1.5,
                    transition: 'border-color 0.2s, color 0.2s, background 0.2s',
                    fontFamily: 'inherit',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface2)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.background = 'var(--surface)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <Message
              key={i}
              msg={msg}
              isStreaming={streaming && i === messages.length - 1 && msg.role === 'assistant'}
            />
          ))}
          {streaming && messages[messages.length - 1]?.content === '' && <Thinking />}
          <div ref={bottomRef} style={{ height: 8 }} />
        </div>
      </div>

      {/* ── Input ── */}
      <div style={{ padding: '0.75rem 1rem 1.25rem', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 10,
            background: 'var(--surface)',
            border: '1px solid var(--border2)',
            borderRadius: 14, padding: '10px 10px 10px 16px',
            transition: 'border-color 0.2s',
            boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
          }}
            onFocus={() => {}}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px'
              }}
              onKeyDown={handleKey}
              placeholder="Message Freya…"
              rows={1}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: 'var(--text)', fontSize: '0.9375rem', resize: 'none',
                lineHeight: 1.6, fontFamily: 'inherit',
                maxHeight: 180, overflowY: 'auto', paddingTop: 2,
              }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || streaming}
              style={{
                width: 36, height: 36, flexShrink: 0, borderRadius: 9,
                background: input.trim() && !streaming ? 'var(--white)' : 'var(--surface3)',
                border: 'none',
                color: input.trim() && !streaming ? '#000' : 'var(--text3)',
                cursor: input.trim() && !streaming ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              {streaming ? <StopIcon /> : <SendIcon />}
            </button>
          </div>
          <p style={{ textAlign: 'center', marginTop: 8, fontSize: '0.7rem', color: 'var(--text3)' }}>
            Freya can make mistakes — verify important info
          </p>
        </div>
      </div>
    </div>
  )
}
