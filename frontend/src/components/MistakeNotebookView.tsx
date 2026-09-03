import React, { useState, useEffect } from 'react'

interface Mistake {
  id: number
  question: string
  user_answer: string
  correct_answer: string
  category: string
  improvement_suggestion?: string
  tags: string[]
}

const CATEGORY_COLORS: Record<string, string> = {
  '①計算・表記ミス': '#d97706',
  '②問題文の読み飛ばし・勘違い': '#ea580c',
  '③知識の欠落（単純な暗記不足）': '#2563eb',
  '④概念の根本誤解（理解不足）': '#dc2626',
}

const MistakeNotebookView: React.FC = () => {
  const [mistakes, setMistakes] = useState<Mistake[]>([])

  const fetchMistakes = async () => {
    try {
      const res = await fetch('/api/mistakes')
      if (res.ok) setMistakes(await res.json())
    } catch { }
  }
  useEffect(() => { fetchMistakes() }, [])

  return (
    <div className="panel-card">
      <div className="panel-header">
        📓 ミス分析ノート
        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{mistakes.length}件の未克服</span>
      </div>
      <div className="panel-body">
        {mistakes.map(m => (
          <div key={m.id} className="mistake-item" style={{ borderLeftColor: CATEGORY_COLORS[m.category] || '#d97706' }}>
            <div className="mistake-category">{m.category}</div>
            <p style={{ marginTop: '4px', fontSize: '0.85rem' }}><b>問題:</b> {m.question}</p>
            <p style={{ fontSize: '0.8rem', color: '#6b7280' }}><b>あなたの答え:</b> {m.user_answer}</p>
            <p style={{ fontSize: '0.8rem', color: '#4a7c59' }}><b>正解:</b> {m.correct_answer}</p>
            {m.improvement_suggestion && <p style={{ marginTop: '4px', fontSize: '0.8rem', color: '#7c3aed' }}>💡 {m.improvement_suggestion}</p>}
          </div>
        ))}
        {mistakes.length === 0 && <p style={{ color: '#9ca3af', textAlign: 'center', padding: '24px' }}>ミス記録がありません。間違えた問題を教えてください。</p>}
      </div>
    </div>
  )
}

export default MistakeNotebookView
