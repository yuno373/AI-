import React, { useState } from 'react'

const SubmissionsRadarView: React.FC = () => {
  const [textContent, setTextContent] = useState('')
  const [submissions, setSubmissions] = useState<any[]>([])

  const classifyAndSave = async () => {
    if (!textContent.trim()) return
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text_content: textContent, image_path: '' }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setSubmissions(prev => [...prev, data.data])
          setTextContent('')
        }
      }
    } catch { }
  }

  return (
    <div className="panel-card">
      <div className="panel-header">
        📢 提出物レーダー
        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{submissions.length}件</span>
      </div>
      <div className="panel-body">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input placeholder="プリント内容を入力..." value={textContent} onChange={(e) => setTextContent(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #e5e1d8', background: '#f5f2eb', color: '#1a1a1a', fontSize: '0.85rem' }} />
          <button onClick={classifyAndSave} className="send-btn">分類する</button>
        </div>
        {submissions.map((sub, i) => (
          <div key={i} className="submission-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b>{sub.title}</b>
              <span className={`submission-badge ${sub.is_submission ? 'badge-submission' : 'badge-learning'}`}>
                {sub.type}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
              {sub.needs_parent_signature && <span className="submission-badge badge-signature">✍️ サイン要</span>}
              {sub.needs_payment && <span className="submission-badge badge-payment">💰 {sub.payment_amount}円</span>}
              {sub.deadline && <span className="submission-badge badge-submission">📅 {sub.deadline?.slice(0, 10)}</span>}
            </div>
          </div>
        ))}
        {submissions.length === 0 && <p style={{ color: '#9ca3af', textAlign: 'center', padding: '24px' }}>提出物がありません。プリントの内容を入力してください。</p>}
      </div>
    </div>
  )
}

export default SubmissionsRadarView
