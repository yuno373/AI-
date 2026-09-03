import React, { useState, useEffect, useCallback } from 'react'

interface AdminProps {
  onBack: () => void
}

const AdminMode: React.FC<AdminProps> = ({ onBack }) => {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [status, setStatus] = useState<any>(null)
  const [errorLog, setErrorLog] = useState<any[]>([])
  const [systemLogs, setSystemLogs] = useState<any[]>([])
  const [keyStatus, setKeyStatus] = useState<any>(null)
  const [security, setSecurity] = useState<any>(null)
  const [monitoring, setMonitoring] = useState<any>(null)
  const [systemModInput, setSystemModInput] = useState('')
  const [systemModChat, setSystemModChat] = useState<{role: string, content: string}[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [dbInfo, setDbInfo] = useState<any>(null)
  const [config, setConfig] = useState<any>(null)
  const [performance, setPerformance] = useState<any>(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [guestCodes, setGuestCodes] = useState<any[]>([])

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, errorRes, logsRes, keysRes, secRes, monRes, analyticsRes, dbRes, configRes, perfRes, guestRes] = await Promise.all([
        fetch('/api/admin/status'),
        fetch('/api/admin/command?command=errors', { method: 'POST' }),
        fetch('/api/admin/logs'),
        fetch('/api/admin/keys'),
        fetch('/api/admin/security'),
        fetch('/api/admin/monitoring'),
        fetch('/api/admin/analytics'),
        fetch('/api/admin/db'),
        fetch('/api/admin/config'),
        fetch('/api/admin/performance'),
        fetch('/api/admin/guest/list'),
      ])
      if (statusRes.ok) setStatus(await statusRes.json())
      if (errorRes.ok) { const d = await errorRes.json(); setErrorLog(d.errors || []) }
      if (logsRes.ok) { const d = await logsRes.json(); setSystemLogs(d.logs || []) }
      if (keysRes.ok) setKeyStatus(await keysRes.json())
      if (secRes.ok) setSecurity(await secRes.json())
      if (monRes.ok) setMonitoring(await monRes.json())
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json())
      if (dbRes.ok) setDbInfo(await dbRes.json())
      if (configRes.ok) setConfig(await configRes.json())
      if (perfRes.ok) setPerformance(await perfRes.json())
      if (guestRes.ok) { const d = await guestRes.json(); setGuestCodes(d.codes || []) }
    } catch { }
  }, [])

  useEffect(() => {
    fetch('/api/admin/authenticate?password=1031', { method: 'POST' }).catch(() => {})
    fetchData()
  }, [fetchData])

  const sendCommand = async (cmd: string) => {
    if (!cmd.trim()) return
    setSystemModChat(prev => [...prev, { role: 'user', content: cmd }])
    setSystemModInput('')
    try {
      const res = await fetch(`/api/admin/command?command=${encodeURIComponent(cmd)}`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        let response = ''
        if (data.action === 'dice') response = `🎲 ${data.result}`
        else if (data.action === 'system_added') response = `追加しました: ${data.name}`
        else if (data.action === 'system_modified') response = `変更しました: ${data.target} - ${data.change}`
        else if (data.action === 'system_optimized') response = `最適化しました: ${data.target} - ${data.change}`
        else if (data.action === 'system_list') response = data.systems?.map((s: any) => `• ${s.name} [${s.status}]`).join('\n') || 'システムはありません'
        else if (data.action === 'error_logs') response = `${(data.errors || []).length}件のエラー`
        else if (data.action === 'repair_all') response = `修復完了: ${data.result?.repaired_count || 0}件`
        else if (data.action === 'help') response = data.message || ''
        else if (data.action === 'response') response = data.message || ''
        else if (data.result) response = JSON.stringify(data.result, null, 2)
        else response = JSON.stringify(data, null, 2)
        setSystemModChat(prev => [...prev, { role: 'assistant', content: response }])
      }
    } catch {
      setSystemModChat(prev => [...prev, { role: 'assistant', content: 'エラーが発生しました' }])
    }
    fetchData()
  }

  const repairAll = async () => {
    try {
      const res = await fetch('/api/admin/repair', { method: 'POST' })
      if (res.ok) { const d = await res.json(); alert(`修復完了: ${d.repaired_count}件`); fetchData() }
    } catch { }
  }

  const addApiKey = async () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) return
    try {
      const res = await fetch(`/api/admin/keys/add?name=${encodeURIComponent(newKeyName)}&api_key=${encodeURIComponent(newKeyValue)}`, { method: 'POST' })
      if (res.ok) { setNewKeyName(''); setNewKeyValue(''); fetchData() }
    } catch { }
  }

  const removeKey = async (index: number) => {
    try {
      const res = await fetch(`/api/admin/keys/remove?index=${index}`, { method: 'POST' })
      if (res.ok) fetchData()
    } catch { }
  }

  const clearTable = async (table: string) => {
    if (!confirm(`${table}を削除しますか？`)) return
    try {
      const res = await fetch(`/api/admin/db/clear?table=${table}`, { method: 'POST' })
      if (res.ok) { alert('削除しました'); fetchData() }
    } catch { }
  }

  const exportData = async () => {
    try {
      const res = await fetch('/api/admin/export')
      if (res.ok) {
        const data = await res.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `export_${new Date().toISOString().split('T')[0]}.json`
        a.click()
      }
    } catch { }
  }

  const generateGuestCode = async () => {
    try {
      const res = await fetch('/api/admin/guest/generate', { method: 'POST' })
      if (res.ok) { const d = await res.json(); alert(`コード: ${d.code}\n有効期限: ${d.expires_in}`); fetchData() }
    } catch { }
  }

  const revokeGuestCode = async (code: string) => {
    try {
      const res = await fetch(`/api/admin/guest/revoke?code=${code}`, { method: 'POST' })
      if (res.ok) { alert('ブロックしました'); fetchData() }
    } catch { }
  }

  const menuItems = [
    { id: 'dashboard', icon: '📊', label: 'ダッシュボード' },
    { id: 'system', icon: '⚙️', label: 'システム追加' },
    { id: 'guest', icon: '🎲', label: 'ゲストアクセス' },
    { id: 'analytics', icon: '📈', label: '学習分析' },
    { id: 'plugins', icon: '🧩', label: 'プラグイン' },
    { id: 'errors', icon: '🐛', label: 'エラー', badge: errorLog.length },
    { id: 'security', icon: '🔒', label: 'セキュリティ' },
    { id: 'keys', icon: '🔑', label: 'APIキー' },
    { id: 'monitoring', icon: '🛡️', label: '監視' },
    { id: 'db', icon: '🗄️', label: 'DB管理' },
    { id: 'config', icon: '⚙️', label: '設定' },
    { id: 'performance', icon: '💻', label: 'パフォーマンス' },
    { id: 'test', icon: '🧪', label: 'テスト' },
    { id: 'logs', icon: '📋', label: 'ログ' },
  ]

  const s = {
    card: { background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '16px' },
    btn: { padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 as const, fontSize: '0.85rem' },
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' },
    grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' },
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div>
            <h2 style={{ marginBottom: '20px' }}>ダッシュボード</h2>
            <div style={s.grid4}>
              <div style={s.card}>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>ステータス</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#22c55e' }}>{status?.mode || '---'}</div>
              </div>
              <div style={s.card}>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>稼働時間</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{status?.uptime_seconds ? `${Math.floor(status.uptime_seconds / 60)}分` : '0分'}</div>
              </div>
              <div style={s.card}>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>エラー</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: errorLog.length > 0 ? '#ef4444' : '#22c55e' }}>{errorLog.length}件</div>
              </div>
              <div style={s.card}>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>修復</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{status?.self_repairs || 0}回</div>
              </div>
            </div>
            <div style={{ ...s.grid3, marginTop: '16px' }}>
              <button onClick={repairAll} style={{ ...s.btn, background: '#22c55e', color: '#fff' }}>全修復</button>
              <button onClick={exportData} style={{ ...s.btn, background: '#3b82f6', color: '#fff' }}>データ出力</button>
              <button onClick={() => setActiveSection('system')} style={{ ...s.btn, background: '#8b5cf6', color: '#fff' }}>システム追加</button>
            </div>
          </div>
        )

      case 'system':
        return (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ marginBottom: '16px' }}>システム追加</h2>
            <div style={s.grid3}>
              {[
                { label: 'ポモドーロ', cmd: 'ポモドーロ', icon: '⏱️' },
                { label: '偏差値予測', cmd: '偏差値', icon: '📈' },
                { label: 'LINE通知', cmd: 'LINE通知', icon: '📱' },
                { label: '習慣トラッカー', cmd: '習慣', icon: '📋' },
                { label: '復習スケジューラー', cmd: '復習', icon: '🔄' },
                { label: 'クイズ', cmd: 'クイズ', icon: '❓' },
                { label: '計算', cmd: '計算', icon: '🧮' },
                { label: 'レポート', cmd: 'レポート', icon: '📄' },
                { label: '目標管理', cmd: '目標', icon: '🎯' },
              ].map((action, i) => (
                <button key={i} onClick={() => sendCommand(action.cmd)} style={{ ...s.btn, background: '#fff', border: '1px solid #e5e1d8', textAlign: 'left', padding: '12px' }}>
                  <div>{action.icon} {action.label}</div>
                </button>
              ))}
            </div>
            <div style={{ flex: 1, background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '16px', overflowY: 'auto', margin: '16px 0', minHeight: '250px' }}>
              {systemModChat.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>追加したいシステムを選択または入力してください</div>
              ) : (
                systemModChat.map((msg, i) => (
                  <div key={i} style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '4px' }}>{msg.role === 'user' ? 'あなた' : 'システム'}</div>
                    <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', whiteSpace: 'pre-wrap', background: msg.role === 'user' ? '#e8f0ea' : '#f9fafb', border: '1px solid #e5e1d8' }}>{msg.content}</div>
                  </div>
                ))
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={systemModInput} onChange={(e) => setSystemModInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) sendCommand(systemModInput) }}
                placeholder="例: ポモドーロ、習慣、復習、クイズ、計算..."
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
              <button onClick={() => sendCommand(systemModInput)} style={{ ...s.btn, background: '#1a1a1a', color: '#fff' }}>送信</button>
            </div>
          </div>
        )

      case 'guest':
        return (
          <div>
            <h2 style={{ marginBottom: '20px' }}>ゲストアクセス</h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '20px' }}>6桁のコードで1時間サイコロを使えます</p>
            <button onClick={generateGuestCode} style={{ ...s.btn, background: '#3b82f6', color: '#fff', marginBottom: '20px' }}>コードを生成</button>
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '20px' }}>
              <h3 style={{ marginBottom: '16px' }}>有効なコード</h3>
              {guestCodes.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '30px' }}>コードがありません</div>
              ) : (
                guestCodes.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', marginBottom: '12px', borderRadius: '8px', background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.2em' }}>{c.code}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>使用: {c.used_count}回 | 期限: {c.expires_at?.split('T')[1]?.split('.')[0]}</div>
                    </div>
                    <button onClick={() => revokeGuestCode(c.code)} style={{ ...s.btn, background: '#fff', border: '1px solid #fecaca', color: '#dc2626' }}>ブロック</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )

      case 'analytics':
        return (
          <div>
            <h2 style={{ marginBottom: '20px' }}>学習分析</h2>
            <div style={s.grid4}>
              {[
                { label: 'フラッシュカード', value: analytics?.flashcards?.total || 0, icon: '🃏' },
                { label: '苦手分析', value: analytics?.mistakes?.total || 0, icon: '📝' },
                { label: 'タスク', value: analytics?.tasks?.total || 0, icon: '📋' },
                { label: '提出物', value: analytics?.submissions?.total || 0, icon: '📤' },
              ].map((card, i) => (
                <div key={i} style={{ ...s.card, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{card.icon}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{card.value}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{card.label}</div>
                </div>
              ))}
            </div>
            <div style={{ ...s.grid2, marginTop: '16px' }}>
              <div style={s.card}>
                <h3 style={{ marginBottom: '12px' }}>タスク進捗</h3>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ flex: 1, padding: '12px', background: '#dcfce7', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#16a34a' }}>{analytics?.tasks?.completed || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>完了</div>
                  </div>
                  <div style={{ flex: 1, padding: '12px', background: '#fef3c7', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#d97706' }}>{analytics?.tasks?.pending || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>保留</div>
                  </div>
                </div>
                {analytics?.tasks?.total > 0 && (
                  <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px' }}>
                    <div style={{ width: `${((analytics.tasks.completed || 0) / analytics.tasks.total) * 100}%`, height: '100%', background: '#22c55e', borderRadius: '4px' }}></div>
                  </div>
                )}
              </div>
              <div style={s.card}>
                <h3 style={{ marginBottom: '12px' }}>学習統計</h3>
                {[
                  { label: '復習率', value: '85%' },
                  { label: '苦手克服率', value: '62%' },
                  { label: '提出遵守率', value: '94%' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f9fafb', borderRadius: '8px', marginBottom: '8px', fontSize: '0.85rem' }}>
                    <span>{item.label}</span>
                    <span style={{ fontWeight: 600 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'plugins':
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>プラグイン</h2>
              <button onClick={() => setActiveSection('system')} style={{ ...s.btn, background: '#1a1a1a', color: '#fff' }}>+ 追加</button>
            </div>
            <div style={s.grid2}>
              {[
                { name: 'サイコロ&意思決定', version: 'v1.0.0', desc: 'ランダム選択や意思決定をサポート', features: ['乱数生成', 'ランダム抽出'], runs: 3, cmd: 'サイコロ' },
                { name: 'ポモドーロタイマー', version: 'v2.1.0', desc: '25分集中と5分休憩を自動管理', features: ['カウントダウン', 'タスク連動'], runs: 14, timer: true, cmd: 'ポモドーロ' },
                { name: 'Geminiエンジン', version: 'v3.0.0', desc: 'Gemini APIを使った自然言語処理', features: ['ReAct推論', 'プロンプト最適化'], runs: 156, cmd: 'プロンプト' },
                { name: '偏差値予測', version: 'v1.0.0', desc: '模試スコアから偏差値を予測', features: ['トレンド分析', '弱点特定'], runs: 8, cmd: '偏差値' },
                { name: 'LINE通知', version: 'v1.0.0', desc: '学習状況を保護者にLINE通知', features: ['学習完了通知', '成績レポート'], runs: 22, cmd: 'LINE通知' },
              ].map((plugin, i) => (
                <div key={i} style={s.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700 }}>{plugin.name}</span>
                        <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: '#e5e7eb', borderRadius: '4px' }}>{plugin.version}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{plugin.runs}回実行</div>
                    </div>
                    <span style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '6px', background: '#dcfce7', color: '#16a34a', fontWeight: 600 }}>稼働中</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '12px' }}>{plugin.desc}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                    {plugin.features.map((f, j) => (
                      <span key={j} style={{ fontSize: '0.7rem', padding: '3px 8px', background: '#f5f2eb', borderRadius: '4px' }}>✓ {f}</span>
                    ))}
                  </div>
                  {plugin.timer && (
                    <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>⏱ 集中タイマー</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>25:00</div>
                      </div>
                      <button onClick={() => sendCommand(plugin.cmd)} style={{ ...s.btn, background: '#4a7c59', color: '#fff' }}>▶ スタート</button>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => sendCommand(plugin.cmd)} style={{ ...s.btn, background: '#fff', border: '1px solid #e5e1d8' }}>▶ テスト</button>
                    <button onClick={() => sendCommand(`${plugin.cmd}を改造して`)} style={{ ...s.btn, background: '#fff', border: '1px solid #e5e1d8' }}>⚙ 改造</button>
                    <button onClick={() => { if(confirm('削除しますか？')) sendCommand(`${plugin.cmd}を削除して`) }} style={{ ...s.btn, background: '#fff', border: '1px solid #fecaca', color: '#dc2626' }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'errors':
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>エラー</h2>
              <button onClick={repairAll} style={{ ...s.btn, background: '#22c55e', color: '#fff' }}>全修復</button>
            </div>
            {errorLog.length === 0 ? (
              <div style={{ ...s.card, padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
                <div style={{ color: '#6b7280' }}>エラーはありません</div>
              </div>
            ) : (
              errorLog.map((err, i) => (
                <div key={i} style={{ ...s.card, border: '1px solid #fecaca', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#dc2626' }}>{err.error_type}</span>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{err.timestamp}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#374151' }}>{err.message}</div>
                </div>
              ))
            )}
          </div>
        )

      case 'security':
        return (
          <div>
            <h2 style={{ marginBottom: '20px' }}>セキュリティ</h2>
            <div style={s.grid3}>
              <div style={s.card}>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>ブロック中IP</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{security?.blocked_ips || 0}件</div>
              </div>
              <div style={s.card}>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>総リクエスト</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{security?.total_requests || 0}</div>
              </div>
              <div style={s.card}>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>不審IP</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{Object.keys(security?.suspicious_ips || {}).length}件</div>
              </div>
            </div>
            <div style={{ ...s.card, marginTop: '16px' }}>
              <h3 style={{ marginBottom: '12px' }}>イベント</h3>
              {(security?.recent_events || []).length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>イベントなし</div>
              ) : (
                (security?.recent_events || []).map((e: any, i: number) => (
                  <div key={i} style={{ padding: '8px', borderBottom: '1px solid #f3f4f6', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600, marginRight: '8px' }}>{e.event_type}</span>
                    <span style={{ color: '#6b7280' }}>{e.detail}</span>
                    <span style={{ float: 'right', color: '#9ca3af', fontSize: '0.75rem' }}>{e.ip}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )

      case 'keys':
        return (
          <div>
            <h2 style={{ marginBottom: '20px' }}>APIキー</h2>
            <div style={{ ...s.card, marginBottom: '16px' }}>
              <h3 style={{ marginBottom: '12px' }}>キー追加</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="名前" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                <input value={newKeyValue} onChange={(e) => setNewKeyValue(e.target.value)} placeholder="APIキー" style={{ flex: 2, padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                <button onClick={addApiKey} style={{ ...s.btn, background: '#22c55e', color: '#fff' }}>追加</button>
              </div>
            </div>
            <div style={{ ...s.card }}>
              {(keyStatus?.keys || []).length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>キーがありません</div>
              ) : (
                (keyStatus?.keys || []).map((k: any) => (
                  <div key={k.index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', marginBottom: '8px', borderRadius: '8px', background: k.index === keyStatus.current_index ? '#f0fdf4' : '#f9fafb', border: `1px solid ${k.index === keyStatus.current_index ? '#bbf7d0' : '#e5e7eb'}` }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600 }}>{k.name}</span>
                        {k.index === keyStatus.current_index && <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: '#22c55e', color: '#fff', borderRadius: '4px' }}>使用中</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>{k.key_preview} | 本日: {k.daily_used}/{k.daily_limit}</div>
                    </div>
                    <button onClick={() => removeKey(k.index)} style={{ ...s.btn, background: '#fff', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.75rem' }}>削除</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )

      case 'monitoring':
        return (
          <div>
            <h2 style={{ marginBottom: '20px' }}>監視</h2>
            <div style={{ ...s.card, marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: monitoring?.active ? '#22c55e' : '#ef4444' }}></span>
                <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{monitoring?.active ? '稼働中' : '停止中'}</span>
              </div>
              <div style={{ color: '#6b7280' }}>5分ごとに自動チェック</div>
              <div style={{ color: '#6b7280' }}>チェック回数: {monitoring?.total_checks || 0}回</div>
            </div>
            <div style={s.card}>
              <h3 style={{ marginBottom: '12px' }}>監視ログ</h3>
              {(monitoring?.recent_logs || []).length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>ログなし</div>
              ) : (
                (monitoring?.recent_logs || []).map((log: any, i: number) => (
                  <div key={i} style={{ padding: '8px', borderBottom: '1px solid #f3f4f6', fontSize: '0.85rem' }}>
                    <span style={{ color: '#9ca3af', marginRight: '8px' }}>{log.timestamp?.split('T')[1]?.split('.')[0]}</span>
                    <span style={{ fontWeight: 600 }}>{log.action}</span>
                    {log.repaired_count !== undefined && <span> - {log.repaired_count}件修復</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        )

      case 'db':
        return (
          <div>
            <h2 style={{ marginBottom: '20px' }}>DB管理</h2>
            <div style={s.grid3}>
              {[
                { name: 'フラッシュカード', table: 'flashcards', count: dbInfo?.counts?.flashcards || 0, icon: '🃏' },
                { name: '苦手記録', table: 'mistakes', count: dbInfo?.counts?.mistakes || 0, icon: '📝' },
                { name: 'スケジュール', table: 'tasks', count: dbInfo?.counts?.tasks || 0, icon: '📋' },
                { name: '提出物', table: 'submissions', count: dbInfo?.counts?.submissions || 0, icon: '📤' },
                { name: 'エラーログ', table: 'errors', count: dbInfo?.counts?.errors || 0, icon: '🐛' },
              ].map((table, i) => (
                <div key={i} style={{ ...s.card, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{table.icon}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{table.count}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '12px' }}>{table.name}</div>
                  <button onClick={() => clearTable(table.table)} style={{ ...s.btn, background: '#fff', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.75rem' }}>削除</button>
                </div>
              ))}
            </div>
          </div>
        )

      case 'config':
        return (
          <div>
            <h2 style={{ marginBottom: '20px' }}>設定</h2>
            <div style={s.card}>
              <div style={s.grid2}>
                {[
                  { label: 'AIモデル', value: config?.model || '---' },
                  { label: 'Temperature', value: config?.temperature || '---' },
                  { label: '最大トークン数', value: config?.max_tokens || '---' },
                  { label: '日次リクエスト上限', value: config?.daily_limit || '---' },
                ].map((item, i) => (
                  <div key={i} style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px' }}>{item.label}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 600 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'performance':
        return (
          <div>
            <h2 style={{ marginBottom: '20px' }}>パフォーマンス</h2>
            <div style={s.grid3}>
              {[
                { label: 'CPU', value: performance?.cpu || 0, icon: '🖥️' },
                { label: 'メモリ', value: performance?.memory || 0, icon: '🧠' },
                { label: 'ディスク', value: performance?.disk || 0, icon: '💾' },
              ].map((item, i) => (
                <div key={i} style={s.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 600 }}>{item.icon} {item.label}</span>
                    <span style={{ fontWeight: 700, color: item.value > 80 ? '#dc2626' : item.value > 60 ? '#d97706' : '#16a34a' }}>{item.value}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px' }}>
                    <div style={{ width: `${item.value}%`, height: '100%', borderRadius: '4px', background: item.value > 80 ? '#dc2626' : item.value > 60 ? '#d97706' : '#22c55e' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'test':
        return (
          <div>
            <h2 style={{ marginBottom: '20px' }}>テスト</h2>
            <div style={s.grid3}>
              {[
                { icon: '💥', label: 'ネットワーク', cmd: 'ネットワークエラー', bg: '#fef2f2' },
                { icon: '💾', label: 'ストレージ', cmd: 'ストレージエラー', bg: '#fefce8' },
                { icon: '🤖', label: 'API', cmd: 'APIエラー', bg: '#f3e8ff' },
                { icon: '🗄️', label: 'DB', cmd: 'データベースエラー', bg: '#eff6ff' },
                { icon: '🧠', label: 'メモリ', cmd: 'メモリエラー', bg: '#fff7ed' },
                { icon: '🔑', label: '認証', cmd: '認証エラー', bg: '#fff1f2' },
                { icon: '🚦', label: 'レート制限', cmd: 'レート制限エラー', bg: '#faf5ff' },
                { icon: '💿', label: 'ディスク', cmd: 'ディスクエラー', bg: '#f0fdfa' },
                { icon: '🔥', label: 'CPU', cmd: 'CPUエラー', bg: '#fef2f2' },
                { icon: '👁️', label: 'OCR', cmd: 'OCRエラー', bg: '#fff7ed' },
                { icon: '⏳', label: 'タイムアウト', cmd: 'タイムアウトエラー', bg: '#eef2ff' },
              ].map((test, i) => (
                <button key={i} onClick={() => sendCommand(test.cmd)} style={{ ...s.btn, background: test.bg, border: `1px solid ${test.bg}`, textAlign: 'left', padding: '12px' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{test.icon}</div>
                  <div>{test.label}</div>
                </button>
              ))}
            </div>
          </div>
        )

      case 'logs':
        return (
          <div>
            <h2 style={{ marginBottom: '20px' }}>ログ</h2>
            <div style={{ ...s.card, maxHeight: '500px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.8rem' }}>
              {systemLogs.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px', fontFamily: 'sans-serif' }}>ログはありません</div>
              ) : (
                systemLogs.map((log, i) => (
                  <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #f5f2eb', display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#9ca3af', minWidth: '60px' }}>{log.timestamp?.split('T')[1]?.split('.')[0]}</span>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, background: log.event_type === 'blocked' ? '#fef2f2' : log.event_type === 'suspicious' ? '#fefce8' : '#dcfce7', color: log.event_type === 'blocked' ? '#dc2626' : log.event_type === 'suspicious' ? '#d97706' : '#16a34a' }}>{log.event_type}</span>
                    <span style={{ flex: 1 }}>{log.detail}</span>
                    <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{log.ip}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f5f2eb' }}>
      <div style={{ width: '200px', background: '#1a1a1a', color: '#fff', padding: '16px 0', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 16px', marginBottom: '20px' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>管理画面</div>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: errorLog.length === 0 ? '#22c55e' : '#ef4444' }}></span>
            {errorLog.length === 0 ? '正常' : `${errorLog.length}件の問題`}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {menuItems.map(item => (
            <button key={item.id} onClick={() => setActiveSection(item.id)} style={{
              width: '100%', padding: '10px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
              background: activeSection === item.id ? '#2d2d2d' : 'transparent',
              color: activeSection === item.id ? '#fff' : '#9ca3af',
              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem',
              borderLeft: activeSection === item.id ? '3px solid #22c55e' : '3px solid transparent',
            }}>
              <span>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#ef4444', color: '#fff', borderRadius: '8px' }}>{item.badge}</span>
              )}
            </button>
          ))}
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid #333' }}>
          <button onClick={onBack} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #444', background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: '0.8rem' }}>← 戻る</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {renderSection()}
      </div>
    </div>
  )
}

export default AdminMode
