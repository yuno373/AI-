import React, { useState, useRef, useEffect } from 'react'
import { ModeType } from '../types'

interface Props {
  mode: ModeType
}

const MODE_LABELS: Record<ModeType, string> = {
  super_agent: 'スーパーエージェント',
  yuru_sparta: 'ゆるスパルタ',
  mental_care: 'メンタルケア',
  ultra_fast: '爆速・要点',
}

const QUICK_QUESTIONS = [
  { icon: '📸', text: 'プリント撮影・OCR' },
  { icon: '🏃', text: '部活でできなかった（自動再調整）' },
  { icon: '🔢', text: '因数分解のヒントくれ' },
  { icon: '📝', text: 'テスト勉強の順番教えて' },
  { icon: '📢', text: '提出物の締切は？' },
]

interface Message {
  role: 'user' | 'agent' | 'system'
  content: string
  timestamp?: string
  reactSteps?: any[]
}

const ChatView: React.FC<Props> = ({ mode }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'agent',
      content: `StudyAutonomous AIへようこそ！校内専属AI学習マネージャーです。\n\nプリントや黒板・テスト用紙の写真を送るだけで：\n1. 一問一答暗記カード&予想問題を即時生成\n2. 提出物（保護者サインや集金）の締切を自動判定してリマインド\n\n何か質問してください！`,
      timestamp: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showReactLog, setShowReactLog] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content: msg, mode, timestamp: new Date().toISOString() }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'agent',
        content: data.message,
        timestamp: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        reactSteps: data.react_steps,
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'agent', content: '接続エラーが発生しました。管理者モードで確認してください。' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chat-section">
      {/* Quick Questions */}
      <div className="quick-questions">
        <span className="label">✨ かんたん質問例：</span>
        {QUICK_QUESTIONS.map((q, i) => (
          <button key={i} className="quick-btn" onClick={() => sendMessage(q.text)}>
            {q.icon} {q.text}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            {msg.role === 'agent' && (
              <div className="message agent">
                <div className="avatar">🤖</div>
                <div className="content">
                  <div className="meta">
                    <span className="name">StudyAutonomous AI</span>
                    <span className="mode-badge">{MODE_LABELS[mode]}</span>
                    {msg.timestamp && <span className="time">{msg.timestamp}</span>}
                  </div>
                  <div className="bubble" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                  {msg.reactSteps && msg.reactSteps.length > 0 && (
                    <div className="react-log">
                      <div className="react-log-header" onClick={() => setShowReactLog(showReactLog === i ? null : i)}>
                        <div className="left">
                          <span>🔄 ReAct 自律推論ログ（Reasoning + Acting Loop）</span>
                          <span className="tool-badge">Tool: {msg.reactSteps[0]?.action || 'check_study_status'}</span>
                        </div>
                        <span className="toggle">{showReactLog === i ? '▲' : '▼'} 推論過程を表示</span>
                      </div>
                      {showReactLog === i && (
                        <div className="react-steps">
                          {msg.reactSteps.map((step: any, j: number) => (
                            <div key={j} className="react-step">
                              <span className="phase">{step.phase}</span>
                              <div className="thought">{step.thought}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="action-buttons">
                    <button className="action-btn">📸 写真から暗記カードを作る →</button>
                    <button className="action-btn">📝 今日の復習タスクを開始 →</button>
                    <button className="action-btn">🔄 部活で遅れたので再計算して！ →</button>
                  </div>
                </div>
              </div>
            )}
            {msg.role === 'user' && (
              <div className="bubble">{msg.content}</div>
            )}
            {msg.role === 'system' && (
              <div className="bubble">{msg.content}</div>
            )}
          </div>
        ))}
        {loading && (
          <div className="message agent">
            <div className="avatar">🤖</div>
            <div className="content">
              <div className="bubble">思考中...</div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage()}
          placeholder="メッセージを入力..."
          disabled={loading}
        />
        <button onClick={() => sendMessage()} disabled={loading}>送信</button>
      </div>
    </div>
  )
}

export default ChatView
