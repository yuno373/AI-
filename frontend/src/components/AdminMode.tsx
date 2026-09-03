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

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, errorRes, logsRes, keysRes, secRes, monRes] = await Promise.all([
        fetch('/api/admin/status'),
        fetch('/api/admin/command?command=errors', { method: 'POST' }),
        fetch('/api/admin/command?command=system log', { method: 'POST' }),
        fetch('/api/admin/keys'),
        fetch('/api/admin/security'),
        fetch('/api/admin/monitoring'),
      ])
      if (statusRes.ok) setStatus(await statusRes.json())
      if (errorRes.ok) { const d = await errorRes.json(); setErrorLog(d.errors || []) }
      if (logsRes.ok) { const d = await logsRes.json(); setSystemLogs(d.logs || []) }
      if (keysRes.ok) setKeyStatus(await keysRes.json())
      if (secRes.ok) setSecurity(await secRes.json())
      if (monRes.ok) setMonitoring(await monRes.json())
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
        if (data.action === 'system_added') response = `✅ 追加完了: ${data.message}`
        else if (data.action === 'system_modified') response = `🔧 変更完了: ${data.message}`
        else if (data.action === 'system_optimized') response = `⚡ 最適化完了: ${data.message}`
        else if (data.action === 'system_list') response = data.systems?.map((s: any) => `• ${s.name} [${s.status}]`).join('\n') || ''
        else if (data.action === 'error_logs') response = `${(data.errors || []).length}件のエラーが見つかりました`
        else if (data.action === 'repair_all') response = `修復完了: ${data.result?.repaired_count || 0}件`
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

  const menuItems = [
    { id: 'dashboard', icon: '📊', label: 'ダッシュボード' },
    { id: 'architect', icon: '🤖', label: 'アーキテクトAI' },
    { id: 'plugins', icon: '🧩', label: 'プラグイン管理' },
    { id: 'errors', icon: '🐛', label: 'エラー一覧', badge: errorLog.length },
    { id: 'security', icon: '🔒', label: 'セキュリティ' },
    { id: 'keys', icon: '🔑', label: 'APIキー' },
    { id: 'monitoring', icon: '🛡️', label: '24時間監視' },
    { id: 'test', icon: '🧪', label: 'エラーテスト' },
    { id: 'logs', icon: '📋', label: 'システムログ' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f5f2eb' }}>
      {/* Sidebar */}
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
              display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem',
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

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {/* Dashboard */}
        {activeSection === 'dashboard' && (
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{card.icon} {card.label}</span>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: card.color }}>{card.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <button onClick={repairAll} style={{ padding: '20px', borderRadius: '12px', border: '2px solid #22c55e', background: '#f0fdf4', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🔧</div>
                <div style={{ fontWeight: 700, color: '#16a34a' }}>全修復</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>すべての問題を自動修復</div>
              </button>
              <button onClick={runDiagnosis} style={{ padding: '20px', borderRadius: '12px', border: '2px solid #3b82f6', background: '#eff6ff', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🔬</div>
                <div style={{ fontWeight: 700, color: '#2563eb' }}>診断実行</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>システム全体をチェック</div>
              </button>
              <button onClick={() => setActiveSection('architect')} style={{ padding: '20px', borderRadius: '12px', border: '2px solid #8b5cf6', background: '#f5f3ff', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🤖</div>
                <div style={{ fontWeight: 700, color: '#7c3aed' }}>アーキテクトAI</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>自然言語でシステム改造</div>
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
        )}

        {/* Architect AI */}
        {activeSection === 'architect' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.3rem', marginBottom: '4px' }}>🤖 システムコア・アーキテクトAI</h2>
              <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>自然言語でシステム改造を実行できます</p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {[
                'ポモドーロタイマーを追加して', '模試偏差値予測AIを入れて', '親御さんLINE通知システムを作って',
                'ReAct推論ステップを8に拡張して', 'Geminiのプロンプトをチューニングして', 'スケジュール分散ロジックを改造して',
                'APIレスポンスを高速化して', '画像OCRの認識率を改善して', 'キャッシュを徹底最適化して', 'システム一覧を見せて',
              ].map((cmd, i) => (
                <button key={i} onClick={() => sendCommand(cmd)} style={{
                  padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5e1d8',
                  background: '#fff', cursor: 'pointer', fontSize: '0.8rem'
                }}>{cmd}</button>
              ))}
            </div>

            <div style={{ flex: 1, background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '16px', overflowY: 'auto', marginBottom: '16px' }}>
              {systemModChat.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>コマンドを入力してください</div>
              ) : (
                systemModChat.map((msg, i) => (
                  <div key={i} style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '4px' }}>{msg.role === 'user' ? '👤 あなた' : '🤖 AI'}</div>
                    <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', whiteSpace: 'pre-wrap',
                      background: msg.role === 'user' ? '#e8f0ea' : '#f9fafb', border: '1px solid #e5e1d8'
                    }}>{msg.content}</div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={systemModInput} onChange={(e) => setSystemModInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendCommand(systemModInput) }}
                placeholder="コマンドを入力..."
                style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem' }} />
              <button onClick={() => sendCommand(systemModInput)} style={{
                padding: '12px 24px', borderRadius: '8px', border: 'none',
                background: '#1a1a1a', color: '#fff', cursor: 'pointer', fontWeight: 600
              }}>実行</button>
            </div>
          </div>
        )}

        {/* Plugins */}
        {activeSection === 'plugins' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.3rem' }}>🧩 プラグイン管理</h2>
              <button onClick={() => setActiveSection('architect')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#1a1a1a', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>+ チャットで追加</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {[
                { name: '学習用・高精度サイコロ&意思決定エンジン', version: 'v1.0.0', author: 'System Core Architect', desc: '学習項目のランダム選択や、判断に迷った際の意思決定をサポートする高精度確率シミュレーター。', features: ['乱数生成による意思決定', '学習タスクのランダム抽出', '気分転換用リフレッシュルーレット'], runs: 3, category: 'learning' },
                { name: '25分集中・超回復ポモドーロタイマー', version: 'v2.1.0', author: 'AI Core Architect', desc: '25分間の学習と5分間のリフレッシュを自動管理し、完了時に今日のスケジュールタスク消化と自動連動する集中拡張プラグイン。', features: ['リアルタイムカウントダウン', 'タスク消化連動', '音声・バイブレーションシグナル'], runs: 14, timer: true, category: 'learning' },
                { name: 'Gemini AI コアエンジン', version: 'v3.0.0', author: 'StudyAutonomous', desc: 'Gemini APIを活用した高度な自然言語処理・推論エンジン。', features: ['ReAct推論', 'マルチモーダル対応', 'プロンプト最適化'], runs: 156, category: 'ai' },
                { name: '模試偏差値予測AI', version: 'v1.0.0', author: 'StudyAutonomous', desc: '過去の模試スコアから将来の偏差値を予測するAIエンジン。', features: ['トレンド分析', '偏差値予測', '弱点特定'], runs: 8, category: 'analysis' },
                { name: '親御さんLINE通知システム', version: 'v1.0.0', author: 'StudyAutonomous', desc: '学習状況を保護者にLINEで通知するシステム。', features: ['学習完了通知', '成績レポート送信', 'スケジュール共有'], runs: 22, category: 'webhook' },
              ].map((plugin, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700 }}>{plugin.name}</span>
                        <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: '#e5e7eb', borderRadius: '4px' }}>{plugin.version}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{plugin.author} • {plugin.runs}回実行</div>
                    </div>
                    <span style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '6px', background: '#dcfce7', color: '#16a34a', fontWeight: 600 }}>⑆ 稼働中</span>
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
        )}

        {/* Errors */}
        {activeSection === 'errors' && (
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
        )}

        {/* Security */}
        {activeSection === 'security' && (
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
        )}

        {/* API Keys */}
        {activeSection === 'keys' && (
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '1.3rem' }}>🔑 APIキー管理</h2>
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
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600 }}>{k.name}</span>
                        {k.index === keyStatus.current_index && <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: '#22c55e', color: '#fff', borderRadius: '4px' }}>使用中</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>{k.key_preview} | 本日: {k.daily_used}/{k.daily_limit}</div>
                      <div style={{ width: '200px', height: '4px', background: '#e5e7eb', borderRadius: '2px', marginTop: '4px' }}>
                        <div style={{ width: `${Math.min(100, (k.daily_used / k.daily_limit) * 100)}%`, height: '100%', borderRadius: '2px', background: k.daily_used / k.daily_limit > 0.8 ? '#dc2626' : '#22c55e' }}></div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Monitoring */}
        {activeSection === 'monitoring' && (
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
        )}

        {/* Error Test */}
        {activeSection === 'test' && (
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
        )}

        {/* Logs */}
        {activeSection === 'logs' && (
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '1.3rem' }}>📋 システムログ</h2>
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '16px', maxHeight: '500px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.8rem' }}>
              {systemLogs.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px', fontFamily: 'sans-serif' }}>ログはありません</div>
              ) : (
                systemLogs.map((log, i) => (
                  <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #f5f2eb' }}>
                    <span style={{ color: '#9ca3af' }}>{log.timestamp?.split('T')[1]?.split('.')[0]}</span>
                    <span style={{ margin: '0 8px', padding: '2px 6px', borderRadius: '4px',
                      background: log.level === 'ERROR' ? '#fef2f2' : log.level === 'WARN' ? '#fefce8' : '#dcfce7',
                      color: log.level === 'ERROR' ? '#dc2626' : log.level === 'WARN' ? '#d97706' : '#16a34a',
                      fontSize: '0.7rem', fontWeight: 600
                    }}>{log.level}</span>
                    <span>{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminMode
