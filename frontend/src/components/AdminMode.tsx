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
  const [diagnosis, setDiagnosis] = useState<any>(null)
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
        if (data.action === 'dice') response = `🎲 サイコロ: ${data.result}`
        else if (data.action === 'system_added') response = `✅ 追加完了\n\n名前: ${data.name}\n${data.message}`
        else if (data.action === 'system_modified') response = `🔧 変更完了\n\n対象: ${data.target}\n変更内容: ${data.change}\n${data.message}`
        else if (data.action === 'system_optimized') response = `⚡ 最適化完了\n\n対象: ${data.target}\n変更内容: ${data.change}\n${data.message}`
        else if (data.action === 'system_list') response = data.systems?.map((s: any) => `• ${s.name} [${s.status}] - ${s.desc}`).join('\n') || 'システムはありません'
        else if (data.action === 'error_logs') response = `${(data.errors || []).length}件のエラーが見つかりました`
        else if (data.action === 'repair_all') response = `修復完了: ${data.result?.repaired_count || 0}件`
        else if (data.action === 'help') response = data.message || ''
        else if (data.action === 'response') response = data.message || ''
        else if (data.action === 'unknown') response = `${data.result || '処理しました'}`
        else if (data.result) response = JSON.stringify(data.result, null, 2)
        else response = JSON.stringify(data, null, 2)
        setSystemModChat(prev => [...prev, { role: 'assistant', content: response }])
      }
    } catch {
      setSystemModChat(prev => [...prev, { role: 'assistant', content: '❌ エラーが発生しました' }])
    }
    fetchData()
  }

  const repairAll = async () => {
    try {
      const res = await fetch('/api/admin/repair', { method: 'POST' })
      if (res.ok) { const d = await res.json(); alert(`修復完了: ${d.repaired_count}件`); fetchData() }
    } catch { }
  }

  const runDiagnosis = async () => {
    try {
      const res = await fetch('/api/admin/diagnosis', { method: 'POST' })
      if (res.ok) { const d = await res.json(); setDiagnosis(d); setActiveSection('diagnosis') }
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
    if (!confirm(`${table}テーブルを削除しますか？`)) return
    try {
      const res = await fetch(`/api/admin/db/clear?table=${table}`, { method: 'POST' })
      if (res.ok) { alert('削除しました'); fetchData() }
    } catch { }
  }

  const createBackup = async () => {
    try {
      const res = await fetch('/api/admin/backup', { method: 'POST' })
      if (res.ok) { const d = await res.json(); alert(`バックアップ作成: ${d.backup}`) }
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
    { id: 'architect', icon: '⚙️', label: 'システム追加' },
    { id: 'guest', icon: '🎲', label: 'ゲストアクセス' },
    { id: 'analytics', icon: '📈', label: '学習分析' },
    { id: 'plugins', icon: '🧩', label: 'プラグイン管理' },
    { id: 'errors', icon: '🐛', label: 'エラー一覧', badge: errorLog.length },
    { id: 'security', icon: '🔒', label: 'セキュリティ' },
    { id: 'keys', icon: '🔑', label: 'APIキー' },
    { id: 'monitoring', icon: '🛡️', label: '24時間監視' },
    { id: 'db', icon: '🗄️', label: 'DB管理' },
    { id: 'config', icon: '⚙️', label: 'システム設定' },
    { id: 'performance', icon: '💻', label: 'パフォーマンス' },
    { id: 'backup', icon: '💾', label: 'バックアップ' },
    { id: 'test', icon: '🧪', label: 'エラーテスト' },
    { id: 'logs', icon: '📋', label: 'システムログ' },
  ]

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '1.3rem' }}>📊 ダッシュボード</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'ステータス', value: status?.mode || '---', icon: '🤖', color: '#22c55e' },
                { label: '稼働時間', value: status?.uptime_seconds ? `${Math.floor(status.uptime_seconds / 60)}分` : '0分', icon: '⏱️', color: '#3b82f6' },
                { label: 'エラー数', value: `${errorLog.length}件`, icon: '🐛', color: errorLog.length > 0 ? '#ef4444' : '#22c55e' },
                { label: '修復回数', value: `${status?.self_repairs || 0}回`, icon: '🔧', color: '#8b5cf6' },
              ].map((card, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e5e1d8' }}>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>{card.icon} {card.label}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: card.color }}>{card.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <button onClick={repairAll} style={{ padding: '20px', borderRadius: '12px', border: '2px solid #22c55e', background: '#f0fdf4', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🔧</div>
                <div style={{ fontWeight: 700, color: '#16a34a' }}>全修復</div>
              </button>
              <button onClick={runDiagnosis} style={{ padding: '20px', borderRadius: '12px', border: '2px solid #3b82f6', background: '#eff6ff', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🔬</div>
                <div style={{ fontWeight: 700, color: '#2563eb' }}>診断実行</div>
              </button>
              <button onClick={() => setActiveSection('architect')} style={{ padding: '20px', borderRadius: '12px', border: '2px solid #8b5cf6', background: '#f5f3ff', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🤖</div>
                <div style={{ fontWeight: 700, color: '#7c3aed' }}>アーキテクトAI</div>
              </button>
              <button onClick={exportData} style={{ padding: '20px', borderRadius: '12px', border: '2px solid #f59e0b', background: '#fefce8', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📤</div>
                <div style={{ fontWeight: 700, color: '#d97706' }}>データ出力</div>
              </button>
            </div>
            {diagnosis && (
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '16px' }}>
                <h3 style={{ marginBottom: '12px' }}>🔬 診断結果</h3>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ padding: '8px 16px', borderRadius: '8px', background: diagnosis.overall_health === 'healthy' ? '#dcfce7' : '#fef2f2', fontWeight: 600 }}>
                    {diagnosis.overall_health === 'healthy' ? '✅ 正常' : '⚠️ 問題あり'}
                  </div>
                  <div style={{ padding: '8px 16px', borderRadius: '8px', background: '#f5f2eb' }}>
                    健康スコア: {diagnosis.health_score}%
                  </div>
                </div>
                {diagnosis.issues?.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '8px' }}>問題:</div>
                    {diagnosis.issues.map((issue: string, i: number) => (
                      <div key={i} style={{ padding: '6px 12px', background: '#fef2f2', borderRadius: '6px', marginBottom: '4px', fontSize: '0.85rem' }}>{issue}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )

      case 'architect':
        return (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.3rem', marginBottom: '4px' }}>⚙️ システム追加</h2>
              <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>テキストで入力してシステムを追加・変更できます</p>
            </div>

            {/* クイックアクション */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '16px' }}>
              {[
                { label: 'ポモドーロ追加', cmd: 'ポモドーロタイマーを追加して', icon: '⏱️' },
                { label: '偏差値予測追加', cmd: '模試偏差値予測AIを入れて', icon: '📈' },
                { label: 'LINE通知追加', cmd: '親御さんLINE通知システムを作って', icon: '📱' },
                { label: '習慣トラッカー追加', cmd: '習慣トラッカーを追加して', icon: '📋' },
                { label: '復習スケジューラー追加', cmd: '復習スケジューラーを入れて', icon: '🔄' },
              ].map((action, i) => (
                <button key={i} onClick={() => sendCommand(action.cmd)} style={{
                  padding: '12px', borderRadius: '8px', border: '1px solid #e5e1d8',
                  background: '#fff', cursor: 'pointer', textAlign: 'left', fontSize: '0.8rem'
                }}>
                  <div style={{ marginBottom: '4px' }}>{action.icon}</div>
                  <div style={{ fontWeight: 600 }}>{action.label}</div>
                </button>
              ))}
            </div>

            {/* チャット履歴 */}
            <div style={{ flex: 1, background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '16px', overflowY: 'auto', marginBottom: '16px', minHeight: '300px' }}>
              {systemModChat.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '12px' }}>💬</div>
                  <div style={{ fontSize: '1rem', marginBottom: '8px' }}>追加したいシステムを入力してください</div>
                  <div style={{ fontSize: '0.85rem' }}>例: 「ポモドーロタイマーを追加して」「習慣トラッカーを入れて」</div>
                </div>
              ) : (
                systemModChat.map((msg, i) => (
                  <div key={i} style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: msg.role === 'user' ? '#3b82f6' : '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.8rem', flexShrink: 0 }}>
                        {msg.role === 'user' ? '👤' : '✓'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '4px' }}>{msg.role === 'user' ? 'あなた' : 'システム'}</div>
                        <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', whiteSpace: 'pre-wrap',
                          background: msg.role === 'user' ? '#e8f0ea' : '#f9fafb', border: '1px solid #e5e1d8'
                        }}>{msg.content}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 入力欄 */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={systemModInput} onChange={(e) => setSystemModInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) sendCommand(systemModInput) }}
                placeholder="例: 「ポモドーロタイマーを追加して」「習慣トラッカーを入れて」"
                style={{ flex: 1, padding: '14px 18px', borderRadius: '10px', border: '1px solid #d1d5db', fontSize: '0.95rem' }} />
              <button onClick={() => sendCommand(systemModInput)} style={{
                padding: '14px 28px', borderRadius: '10px', border: 'none',
                background: '#1a1a1a', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem'
              }}>送信</button>
            </div>
          </div>
        )

      case 'guest':
        return (
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '1.3rem' }}>🎲 ゲストアクセス</h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '20px' }}>6桁の数字コードを生成して、1時間だけ誰でもサイコロを使えます</p>

            {/* コード生成 */}
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '20px', marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '12px', fontSize: '1rem' }}>新しいコードを生成</h3>
              <button onClick={generateGuestCode} style={{
                padding: '12px 24px', borderRadius: '8px', border: 'none',
                background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem'
              }}>コードを生成</button>
            </div>

            {/* アクティブなコード一覧 */}
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '20px' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>有効なコード</h3>
              {guestCodes.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '30px' }}>コードがありません</div>
              ) : (
                guestCodes.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', marginBottom: '12px', borderRadius: '8px', background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.2em', color: '#1a1a1a' }}>{c.code}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>使用回数: {c.used_count}回 | 期限: {c.expires_at?.split('T')[1]?.split('.')[0]}</div>
                    </div>
                    <button onClick={() => revokeGuestCode(c.code)} style={{
                      padding: '8px 16px', borderRadius: '6px', border: '1px solid #fecaca',
                      background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem'
                    }}>ブロック</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )

      case 'analytics':
        return (
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '1.3rem' }}>📈 学習分析</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'フラッシュカード', value: analytics?.flashcards?.total || 0, icon: '🃏', color: '#3b82f6' },
                { label: '苦手分析', value: analytics?.mistakes?.total || 0, icon: '📝', color: '#ef4444' },
                { label: '学習タスク', value: analytics?.tasks?.total || 0, icon: '📋', color: '#22c55e' },
                { label: '提出物', value: analytics?.submissions?.total || 0, icon: '📤', color: '#f59e0b' },
              ].map((card, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e1d8', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{card.icon}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: card.color }}>{card.value}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>{card.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '20px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>📋 タスク進捗</h3>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ flex: 1, padding: '12px', background: '#dcfce7', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#16a34a' }}>{analytics?.tasks?.completed || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>完了</div>
                  </div>
                  <div style={{ flex: 1, padding: '12px', background: '#fef3c7', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#d97706' }}>{analytics?.tasks?.pending || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>保留中</div>
                  </div>
                </div>
                {analytics?.tasks?.total > 0 && (
                  <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px' }}>
                    <div style={{ width: `${((analytics.tasks.completed || 0) / analytics.tasks.total) * 100}%`, height: '100%', background: '#22c55e', borderRadius: '4px' }}></div>
                  </div>
                )}
              </div>
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '20px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>📊 学習統計</h3>
                <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>フラッシュカード復習率</span>
                    <span style={{ fontWeight: 600 }}>85%</span>
                  </div>
                </div>
                <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>苦手克服率</span>
                    <span style={{ fontWeight: 600 }}>62%</span>
                  </div>
                </div>
                <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>提出期限遵守率</span>
                    <span style={{ fontWeight: 600 }}>94%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'plugins':
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.3rem' }}>🧩 プラグイン管理</h2>
              <button onClick={() => setActiveSection('architect')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#1a1a1a', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>+ チャットで追加</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {[
                { name: '学習用・高精度サイコロ&意思決定エンジン', version: 'v1.0.0', desc: '学習項目のランダム選択や、判断に迷った際の意思決定をサポート', features: ['乱数生成', 'ランダム抽出', 'リフレッシュルーレット'], runs: 3, category: 'learning' },
                { name: '25分集中・超回復ポモドーロタイマー', version: 'v2.1.0', desc: '25分間の学習と5分間のリフレッシュを自動管理', features: ['カウントダウン', 'タスク消化連動', '音声シグナル'], runs: 14, timer: true, category: 'learning' },
                { name: 'Gemini AI コアエンジン', version: 'v3.0.0', desc: 'Gemini APIを活用した高度な自然言語処理・推論エンジン', features: ['ReAct推論', 'マルチモーダル', 'プロンプト最適化'], runs: 156, category: 'ai' },
                { name: '模試偏差値予測AI', version: 'v1.0.0', desc: '過去の模試スコアから将来の偏差値を予測するAIエンジン', features: ['トレンド分析', '偏差値予測', '弱点特定'], runs: 8, category: 'analysis' },
                { name: '親御さんLINE通知システム', version: 'v1.0.0', desc: '学習状況を保護者にLINEで通知するシステム', features: ['学習完了通知', '成績レポート', 'スケジュール共有'], runs: 22, category: 'webhook' },
              ].map((plugin, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '20px' }}>
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
                  <p style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '12px', lineHeight: 1.5 }}>{plugin.desc}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                    {plugin.features.map((f, j) => (
                      <span key={j} style={{ fontSize: '0.7rem', padding: '3px 8px', background: '#f5f2eb', borderRadius: '4px' }}>✓ {f}</span>
                    ))}
                  </div>
                  {plugin.timer && (
                    <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>⏱ ライブ集中タイマー</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>25:00</div>
                      </div>
                      <button style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#4a7c59', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>▶ スタート</button>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5e1d8', background: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>▶ テスト</button>
                    <button style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5e1d8', background: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>⚙ 改造</button>
                    <button style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem' }}>🗑</button>
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
              <h2 style={{ fontSize: '1.3rem' }}>🐛 エラー一覧</h2>
              <button onClick={repairAll} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>🔧 全修復</button>
            </div>
            {errorLog.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
                <div style={{ color: '#6b7280' }}>エラーはありません</div>
              </div>
            ) : (
              errorLog.map((err, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #fecaca', padding: '16px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
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
            <h2 style={{ marginBottom: '20px', fontSize: '1.3rem' }}>🔒 セキュリティ</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e5e1d8' }}>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>🚫 ブロック中IP</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{security?.blocked_ips || 0}件</div>
              </div>
              <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e5e1d8' }}>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>🔍 総リクエスト</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{security?.total_requests || 0}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e5e1d8' }}>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>⚠️ 不審IP</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{Object.keys(security?.suspicious_ips || {}).length}件</div>
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '16px' }}>
              <h3 style={{ marginBottom: '12px' }}>📋 セキュリティイベント</h3>
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
            <h2 style={{ marginBottom: '20px', fontSize: '1.3rem' }}>🔑 APIキー管理</h2>
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '16px', marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '12px', fontSize: '1rem' }}>➕ キー追加</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="キー名" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.85rem' }} />
                <input value={newKeyValue} onChange={(e) => setNewKeyValue(e.target.value)} placeholder="APIキー" style={{ flex: 2, padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.85rem' }} />
                <button onClick={addApiKey} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>追加</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e5e1d8' }}>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>🔑 総キー数</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{keyStatus?.total_keys || 0}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e5e1d8' }}>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>✅ アクティブ</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#22c55e' }}>{keyStatus?.active_keys || 0}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e5e1d8' }}>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>🔄 自動切替</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#22c55e' }}>ON</div>
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '16px' }}>
              {(keyStatus?.keys || []).length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>キーが登録されていません</div>
              ) : (
                (keyStatus?.keys || []).map((k: any) => (
                  <div key={k.index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', marginBottom: '8px', borderRadius: '8px', background: k.index === keyStatus.current_index ? '#f0fdf4' : '#f9fafb', border: `1px solid ${k.index === keyStatus.current_index ? '#bbf7d0' : '#e5e7eb'}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600 }}>{k.name}</span>
                        {k.index === keyStatus.current_index && <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: '#22c55e', color: '#fff', borderRadius: '4px' }}>使用中</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>{k.key_preview} | 本日: {k.daily_used}/{k.daily_limit}</div>
                    </div>
                    <button onClick={() => removeKey(k.index)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: '0.75rem' }}>削除</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )

      case 'monitoring':
        return (
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '1.3rem' }}>🛡️ 24時間監視</h2>
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: monitoring?.active ? '#22c55e' : '#ef4444' }}></span>
                <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{monitoring?.active ? '稼働中' : '停止中'}</span>
              </div>
              <div style={{ color: '#6b7280' }}>5分ごとに自動チェック & 修復</div>
              <div style={{ color: '#6b7280' }}>チェック回数: {monitoring?.total_checks || 0}回</div>
            </div>
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '16px' }}>
              <h3 style={{ marginBottom: '12px' }}>📋 監視ログ</h3>
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
            <h2 style={{ marginBottom: '20px', fontSize: '1.3rem' }}>🗄️ DB管理</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {[
                { name: 'フラッシュカード', table: 'flashcards', count: dbInfo?.counts?.flashcards || 0, icon: '🃏', color: '#3b82f6' },
                { name: '苦手記録', table: 'mistakes', count: dbInfo?.counts?.mistakes || 0, icon: '📝', color: '#ef4444' },
                { name: 'スケジュール', table: 'tasks', count: dbInfo?.counts?.tasks || 0, icon: '📋', color: '#22c55e' },
                { name: '提出物', table: 'submissions', count: dbInfo?.counts?.submissions || 0, icon: '📤', color: '#f59e0b' },
                { name: 'エラーログ', table: 'errors', count: dbInfo?.counts?.errors || 0, icon: '🐛', color: '#8b5cf6' },
              ].map((table, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e5e1d8', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{table.icon}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: table.color }}>{table.count}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '12px' }}>{table.name}</div>
                  <button onClick={() => clearTable(table.table)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: '0.75rem' }}>🗑 削除</button>
                </div>
              ))}
            </div>
          </div>
        )

      case 'config':
        return (
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '1.3rem' }}>⚙️ システム設定</h2>
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                {[
                  { key: 'model', label: 'AIモデル', value: config?.model || '---' },
                  { key: 'temperature', label: 'Temperature', value: config?.temperature || '---' },
                  { key: 'max_tokens', label: '最大トークン数', value: config?.max_tokens || '---' },
                  { key: 'daily_limit', label: '日次リクエスト上限', value: config?.daily_limit || '---' },
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
            <h2 style={{ marginBottom: '20px', fontSize: '1.3rem' }}>💻 パフォーマンス</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'CPU', value: performance?.cpu || 0, icon: '🖥️', color: '#3b82f6' },
                { label: 'メモリ', value: performance?.memory || 0, icon: '🧠', color: '#8b5cf6' },
                { label: 'ディスク', value: performance?.disk || 0, icon: '💾', color: '#22c55e' },
              ].map((item, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e1d8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.icon} {item.label}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: item.value > 80 ? '#dc2626' : item.value > 60 ? '#d97706' : '#16a34a' }}>{item.value}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px' }}>
                    <div style={{ width: `${item.value}%`, height: '100%', borderRadius: '4px', background: item.value > 80 ? '#dc2626' : item.value > 60 ? '#d97706' : '#22c55e' }}></div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '16px' }}>
              <h3 style={{ marginBottom: '12px' }}>🔧 修復履歴</h3>
              {(performance?.repair_history || []).length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>修復履歴なし</div>
              ) : (
                (performance?.repair_history || []).map((h: any, i: number) => (
                  <div key={i} style={{ padding: '8px', borderBottom: '1px solid #f3f4f6', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600 }}>{h.error_type}</span>
                    <span style={{ color: '#6b7280', marginLeft: '8px' }}>{h.action}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )

      case 'backup':
        return (
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '1.3rem' }}>💾 バックアップ</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📤</div>
                <h3 style={{ marginBottom: '8px' }}>データ出力</h3>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '16px' }}>全データをJSONファイルとしてダウンロード</p>
                <button onClick={exportData} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>📥 出力する</button>
              </div>
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>💿</div>
                <h3 style={{ marginBottom: '8px' }}>バックアップ作成</h3>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '16px' }}>データベースのバックアップを作成</p>
                <button onClick={createBackup} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>💿 バックアップ</button>
              </div>
            </div>
          </div>
        )

      case 'test':
        return (
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '1.3rem' }}>🧪 エラーテスト</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { icon: '💥', label: 'ネットワーク', cmd: 'ネットワークエラー', color: '#dc2626', bg: '#fef2f2' },
                { icon: '💾', label: 'ストレージ', cmd: 'ストレージエラー', color: '#d97706', bg: '#fefce8' },
                { icon: '🤖', label: 'API', cmd: 'APIエラー', color: '#7c3aed', bg: '#f3e8ff' },
                { icon: '🗄️', label: 'データベース', cmd: 'データベースエラー', color: '#2563eb', bg: '#eff6ff' },
                { icon: '🧠', label: 'メモリ', cmd: 'メモリエラー', color: '#ea580c', bg: '#fff7ed' },
                { icon: '🔑', label: '認証', cmd: '認証エラー', color: '#be123c', bg: '#fff1f2' },
                { icon: '🚦', label: 'レート制限', cmd: 'レート制限エラー', color: '#9333ea', bg: '#faf5ff' },
                { icon: '💿', label: 'ディスク', cmd: 'ディスクエラー', color: '#0f766e', bg: '#f0fdfa' },
                { icon: '🔥', label: 'CPU', cmd: 'CPUエラー', color: '#dc2626', bg: '#fef2f2' },
                { icon: '👁️', label: 'OCR', cmd: 'OCRエラー', color: '#c2410c', bg: '#fff7ed' },
                { icon: '⏳', label: 'タイムアウト', cmd: 'タイムアウトエラー', color: '#4338ca', bg: '#eef2ff' },
              ].map((test, i) => (
                <button key={i} onClick={() => sendCommand(test.cmd)} style={{
                  padding: '16px', borderRadius: '10px', border: `1px solid ${test.bg}`, background: test.bg,
                  cursor: 'pointer', textAlign: 'left'
                }}>
                  <div style={{ fontSize: '1.3rem', marginBottom: '4px' }}>{test.icon}</div>
                  <div style={{ fontWeight: 600, color: test.color }}>{test.label}</div>
                </button>
              ))}
            </div>
          </div>
        )

      case 'logs':
        return (
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '1.3rem' }}>📋 システムログ</h2>
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '16px', maxHeight: '500px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.8rem' }}>
              {systemLogs.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px', fontFamily: 'sans-serif' }}>ログはありません</div>
              ) : (
                systemLogs.map((log, i) => (
                  <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #f5f2eb', display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#9ca3af', minWidth: '60px' }}>{log.timestamp?.split('T')[1]?.split('.')[0]}</span>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                      background: log.event_type === 'blocked' ? '#fef2f2' : log.event_type === 'suspicious' ? '#fefce8' : '#dcfce7',
                      color: log.event_type === 'blocked' ? '#dc2626' : log.event_type === 'suspicious' ? '#d97706' : '#16a34a',
                    }}>{log.event_type}</span>
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
      <div style={{ width: '240px', background: '#1a1a1a', color: '#fff', padding: '20px 0', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🛡️</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>管理者モード</div>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>System Architect</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: errorLog.length === 0 ? '#22c55e' : '#ef4444' }}></span>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              {errorLog.length === 0 ? '正常稼働中' : `${errorLog.length}件の問題`}
            </span>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {menuItems.map(item => (
            <button key={item.id} onClick={() => setActiveSection(item.id)} style={{
              width: '100%', padding: '12px 20px', border: 'none', cursor: 'pointer', textAlign: 'left',
              background: activeSection === item.id ? '#2d2d2d' : 'transparent',
              color: activeSection === item.id ? '#fff' : '#9ca3af',
              display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem',
              borderLeft: activeSection === item.id ? '3px solid #22c55e' : '3px solid transparent',
              transition: 'all 0.2s'
            }}>
              <span>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#ef4444', color: '#fff', borderRadius: '8px' }}>{item.badge}</span>
              )}
            </button>
          ))}
        </div>
        <div style={{ padding: '16px 20px', borderTop: '1px solid #333' }}>
          <button onClick={onBack} style={{
            width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #444',
            background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: '0.85rem'
          }}>← 生徒画面に戻る</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {renderSection()}
      </div>
    </div>
  )
}

export default AdminMode
