import React, { useState, useEffect } from 'react'

interface Flashcard {
  id: number
  question: string
  answer: string
  subject?: string
  tags: string[]
  is_mastered: boolean
}

const FlashcardsView: React.FC = () => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [subject, setSubject] = useState('')

  const fetchFlashcards = async () => {
    try {
      const res = await fetch('/api/flashcards')
      if (res.ok) setFlashcards(await res.json())
    } catch { }
  }
  useEffect(() => { fetchFlashcards() }, [])

  const addFlashcard = async () => {
    if (!question.trim()) return
    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ question, answer, subject, tags: [subject] }]),
      })
      if (res.ok) {
        setQuestion(''); setAnswer(''); setSubject('')
        fetchFlashcards()
      }
    } catch { }
  }

  return (
    <div className="panel-card">
      <div className="panel-header">
        📝 暗記カード&予想問題
        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{flashcards.length}問</span>
      </div>
      <div className="panel-body">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <input placeholder="質問" value={question} onChange={(e) => setQuestion(e.target.value)} style={{ flex: 1, minWidth: '120px', padding: '8px', borderRadius: '8px', border: '1px solid #e5e1d8', background: '#f5f2eb', color: '#1a1a1a', fontSize: '0.85rem' }} />
          <input placeholder="答え" value={answer} onChange={(e) => setAnswer(e.target.value)} style={{ flex: 1, minWidth: '120px', padding: '8px', borderRadius: '8px', border: '1px solid #e5e1d8', background: '#f5f2eb', color: '#1a1a1a', fontSize: '0.85rem' }} />
          <input placeholder="科目" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ flex: 1, minWidth: '120px', padding: '8px', borderRadius: '8px', border: '1px solid #e5e1d8', background: '#f5f2eb', color: '#1a1a1a', fontSize: '0.85rem' }} />
          <button onClick={addFlashcard} className="send-btn">追加</button>
        </div>
        {flashcards.map(fc => (
          <div key={fc.id} className="flashcard-item">
            <div className="flashcard-question">❓ {fc.question}</div>
            <div className="flashcard-answer">✅ {fc.answer}</div>
            {fc.subject && <span className="submission-badge badge-learning" style={{ marginTop: '4px' }}>{fc.subject}</span>}
          </div>
        ))}
        {flashcards.length === 0 && <p style={{ color: '#9ca3af', textAlign: 'center', padding: '24px' }}>暗記カードがありません。プリントを撮影するか、手動で追加してください。</p>}
      </div>
    </div>
  )
}

export default FlashcardsView
