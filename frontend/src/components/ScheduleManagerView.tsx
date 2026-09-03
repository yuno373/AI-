import React, { useState } from 'react'

const ScheduleManagerView: React.FC = () => {
  const [testDate, setTestDate] = useState('')
  const [schedule, setSchedule] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const createSchedule = async () => {
    setLoading(true)
    try {
      const subjectList = ['数学', '英語', '歴史'].map(s => ({ name: s, pages: 20 }))
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_date: testDate, subjects: subjectList, weak_points: [] }),
      })
      if (res.ok) {
        const data = await res.json()
        setSchedule(data.plan.tasks || [])
      }
    } catch { }
    setLoading(false)
  }

  const retrySchedule = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/schedule/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unfinished_tasks: [], new_mistakes: [] }),
      })
      if (res.ok) {
        const data = await res.json()
        setSchedule(data.plan.tasks || [])
      }
    } catch { }
    setLoading(false)
  }

  return (
    <div className="panel-card">
      <div className="panel-header">
        📅 自律スケジュール
        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{schedule.length}タスク</span>
      </div>
      <div className="panel-body">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e5e1d8', background: '#f5f2eb', color: '#1a1a1a', fontSize: '0.85rem' }} />
          <button onClick={createSchedule} className="send-btn" disabled={loading}>スケジュール作成</button>
          <button onClick={retrySchedule} className="send-btn" style={{ background: '#d97706' }} disabled={loading}>リトライ</button>
        </div>
        {schedule.map((task, i) => (
          <div key={i} className={`schedule-item priority-${['low','medium','high'][task.priority - 1] || 'low'}`}>
            <div>
              <b>{task.subject}</b>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{task.task}</div>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{task.start_date?.slice(0, 10)} 〜 {task.end_date?.slice(0, 10)}</div>
            </div>
            <span className={`submission-badge ${task.status === 'pending' ? 'badge-learning' : 'badge-submission'}`}>{task.status}</span>
          </div>
        ))}
        {schedule.length === 0 && <p style={{ color: '#9ca3af', textAlign: 'center', padding: '24px' }}>スケジュールがありません。テスト日を入力して作成してください。</p>}
      </div>
    </div>
  )
}

export default ScheduleManagerView
