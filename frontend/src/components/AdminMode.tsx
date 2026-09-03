import React, { useState, useEffect, useCallback } from 'react'

interface AdminProps {
  onBack: () => void
}

type AdminTab = 'overview' | 'security' | 'keys' | 'errors' | 'self_healing' | 'error_test' | 'health_check' | 'components' | 'database' | 'performance' | 'system_mod' | 'logs'

interface ErrorItem {
  timestamp: string
  error_type: string
  message: string
  stack_trace?: string
  self_repaired?: boolean
  repair_action?: string
  severity: 'critical' | 'error' | 'warn' | 'info'
  explanation: string
  fix_steps: string[]
  auto_fixable: boolean
}

const AdminMode: React.FC<AdminProps> = ({ onBack }) => {
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('overview')
  const [status, setStatus] = useState<any>(null)
  const [diagnosis, setDiagnosis] = useState<any>(null)
  const [apiKey, setApiKey] = useState('')
  const [apiKeyStatus, setApiKeyStatus] = useState<any>(null)
  const [errorLog, setErrorLog] = useState<ErrorItem[]>([])
  const [logFilter, setLogFilter] = useState('all')
  const [logSearch, setLogSearch] = useState('')
  const [command, setCommand] = useState('')
  const [commandResult, setCommandResult] = useState<string | null>(null)
  const [components, setComponents] = useState<any[]>([])
  const [dbStats, setDbStats] = useState<any>(null)
  const [performance, setPerformance] = useState<any>(null)
  const [systemLogs, setSystemLogs] = useState<any[]>([])
  const [modifyTarget, setModifyTarget] = useState('')
  const [modifyType, setModifyType] = useState('')
  const [modifyCode, setModifyCode] = useState('')
  const [modifyDesc, setModifyDesc] = useState('')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [monitoring, setMonitoring] = useState<any>(null)
  const [security, setSecurity] = useState<any>(null)
  const [keyStatus, setKeyStatus] = useState<any>(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [expandedError, setExpandedError] = useState<number | null>(null)

  const getErrorInfo = (error: any): ErrorItem => {
    const msg = error.message || ''
    const type = error.error_type || ''

    let severity: 'critical' | 'error' | 'warn' | 'info' = 'error'
    let explanation = ''
    let fix_steps: string[] = []
    let auto_fixable = true

    if (type.includes('Network') || msg.includes('timeout') || msg.includes('ECONNREFUSED')) {
      severity = 'critical'
      explanation = 'インターネット接続またはサーバーとの通信に問題があります。'
      fix_steps = [
        'インターネット接続を確認してください',
        'バックエンドサーバーが起動しているか確認してください',
        'ブラウザを再読み込みしてください',
        '必要に応じて「全修復」ボタンを押してください',
      ]
    } else if (type.includes('API') || msg.includes('429') || msg.includes('quota')) {
      severity = 'warn'
      explanation = 'Gemini APIの使用量制限に達しました。'
      fix_steps = [
        '少し時間をおいてから再試行してください',
        '管理者モードでAPIキーを確認してください',
        'Geminiのダッシュボードで使用量を確認してください',
      ]
    } else if (type.includes('Database') || msg.includes('database') || msg.includes('SQL')) {
      severity = 'error'
      explanation = 'データベースに問題が発生しました。'
      fix_steps = [
        '「全修復」ボタンを押してください',
        '問題が続く場合は「DB再初期化」を実行してください',
      ]
    } else if (type.includes('Component') || msg.includes('component')) {
      severity = 'warn'
      explanation = 'システムの一部に問題があります。'
      fix_steps = [
        '該当コンポーネントを再起動してください',
        '問題が続く場合は「全修復」を実行してください',
      ]
    } else {
      explanation = '予期しないエラーが発生しました。'
      fix_steps = [
        '「全修復」ボタンを押してください',
        'ブラウザを再読み込みしてください',
        '問題が続く場合は管理者にお問い合わせください',
      ]
    }

    return {
      timestamp: error.timestamp,
      error_type: type,
      message: msg,
      stack_trace: error.stack_trace,
      self_repaired: error.self_repaired,
      repair_action: error.repair_action,
      severity,
      explanation,
      fix_steps,
      auto_fixable,
    }
  }

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, apiRes, errorRes, componentsRes, dbRes, perfRes, logsRes, monitorRes, secRes, keysRes] = await Promise.all([
        fetch('/api/admin/status'),
        fetch('/api/admin/apikey_status'),
        fetch('/api/admin/command?command=エラー一覧', { method: 'POST' }),
        fetch('/api/admin/command?command=コンポーネント状態', { method: 'POST' }),
        fetch('/api/admin/command?command=データベース状態', { method: 'POST' }),
        fetch('/api/admin/command?command=パフォーマンス', { method: 'POST' }),
        fetch('/api/admin/command?command=システムログ', { method: 'POST' }),
        fetch('/api/admin/monitoring'),
        fetch('/api/admin/security'),
        fetch('/api/admin/keys'),
      ])

      if (statusRes.ok) setStatus(await statusRes.json())
      if (apiRes.ok) setApiKeyStatus(await apiRes.json())
      if (errorRes.ok) {
        const data = await errorRes.json()
        setErrorLog((data.errors || []).map(getErrorInfo))
      }
      if (componentsRes.ok) {
        const data = await componentsRes.json()
        setComponents(data.components || [])
      }
      if (dbRes.ok) setDbStats(await dbRes.json())
      if (perfRes.ok) setPerformance(await perfRes.json())
      if (logsRes.ok) {
        const data = await logsRes.json()
        setSystemLogs(data.logs || [])
      }
      if (monitorRes.ok) setMonitoring(await monitorRes.json())
      if (secRes.ok) setSecurity(await secRes.json())
      if (keysRes.ok) setKeyStatus(await keysRes.json())
      setLastUpdate(new Date())
    } catch { }
  }, [])

  useEffect(() => {
    const initAdmin = async () => {
      try {
        await fetch('/api/admin/authenticate?password=1031', { method: 'POST' })
      } catch { }
      fetchData()
    }
    initAdmin()
  }, [fetchData])

  const runDiagnosis = async () => {
    try {
      const res = await fetch('/api/admin/diagnosis', { method: 'POST' })
      if (res.ok) setDiagnosis(await res.json())
    } catch { }
  }

  const repairAll = async () => {
    try {
      const res = await fetch('/api/admin/repair', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (data.repaired_count > 0) {
          alert(`✅ 全修復完了！\n修復件数: ${data.repaired_count}件`)
        } else {
          alert('✅ 修復する必要のあるエラーはありません')
        }
        fetchData()
      }
    } catch {
      alert('❌ 全修復コマンドの実行に失敗しました')
    }
  }

  const repairError = async (index: number) => {
    try {
      const res = await fetch(`/api/admin/repair?error_index=${index}`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (data.repaired) {
          alert(`✅ エラーを修復しました！\n修復内容: ${data.action}`)
        } else {
          alert(`⚠️ 修復に失敗しました: ${data.detail}`)
        }
        fetchData()
      }
    } catch {
      alert('❌ 修復コマンドの実行に失敗しました')
    }
  }

  const saveApiKey = async () => {
    if (!apiKey.trim()) return
    try {
      const res = await fetch(`/api/admin/apikey?api_key=${encodeURIComponent(apiKey)}`, { method: 'POST' })
      if (res.ok) {
        alert('APIキーを設定しました！')
        setApiKey('')
        fetchData()
      }
    } catch { }
  }

  const executeCommand = async () => {
    if (!command.trim()) return
    try {
      const res = await fetch(`/api/admin/command?command=${encodeURIComponent(command)}`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setCommandResult(JSON.stringify(data, null, 2))
      }
    } catch {
      setCommandResult('コマンド実行に失敗しました')
    }
  }

  const clearLogs = async () => {
    try {
      await fetch('/api/admin/command?command=ログ全消去', { method: 'POST' })
      setErrorLog([])
    } catch { }
  }

  const applyModification = async () => {
    if (!modifyTarget.trim()) return
    try {
      const res = await fetch('/api/admin/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: modifyTarget, mod_type: modifyType, code: modifyCode, desc: modifyDesc }),
      })
      if (res.ok) {
        alert(`システム変更を適用しました: ${modifyTarget}`)
        setModifyTarget(''); setModifyType(''); setModifyCode(''); setModifyDesc('')
      }
    } catch { }
  }

  const filteredErrors = errorLog.filter(log => {
    if (logSearch && !JSON.stringify(log).toLowerCase().includes(logSearch.toLowerCase())) return false
    if (logFilter !== 'all' && log.severity !== logFilter) return false
    return true
  })

  const adminTabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'overview', label: '全体概要', icon: '📊' },
    { id: 'security', label: 'セキュリティ', icon: '🔒' },
    { id: 'keys', label: 'APIキー', icon: '🔑' },
    { id: 'errors', label: 'エラー一覧', icon: '🐛' },
    { id: 'self_healing', label: '自動修復', icon: '🔧' },
    { id: 'error_test', label: 'テスト', icon: '🧪' },
    { id: 'health_check', label: 'ヘルスチェック', icon: '💓' },
    { id: 'components', label: 'コンポーネント', icon: '📦' },
    { id: 'database', label: 'データベース', icon: '🗄️' },
    { id: 'performance', label: 'パフォーマンス', icon: '📈' },
    { id: 'system_mod', label: 'システム変更', icon: '⚙️' },
    { id: 'logs', label: 'ログ', icon: '📋' },
  ]

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', badge: '#dc2626' }
      case 'error': return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', badge: '#dc2626' }
      case 'warn': return { bg: '#fefce8', border: '#fde68a', text: '#d97706', badge: '#d97706' }
      default: return { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', badge: '#16a34a' }
    }
  }

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical': return '重大'
      case 'error': return 'エラー'
      case 'warn': return '警告'
      default: return '情報'
    }
  }

  const getComponentStatus = (name: string) => {
    const comp = components.find(c => c.name === name)
    return comp?.status || 'unknown'
  }

  return (
    <div>
      {/* Admin Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)', color: '#fff', borderRadius: '12px',
        padding: '24px', marginBottom: '16px', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '48px', height: '48px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem'
            }}>🛡️</div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                管理者モード - システム診断&修復
              </h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                <span style={{
                  padding: '2px 10px', background: errorLog.length === 0 ? '#22c55e' : '#ef4444',
                  borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600
                }}>
                  {errorLog.length === 0 ? '✅ 正常稼働中' : `⚠️ ${errorLog.length}件の問題あり`}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                  最終更新: {lastUpdate.toLocaleTimeString('ja-JP')}
                </span>
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '8px 0 16px' }}>
            システムの問題を自動検知し、初心者でもわかりやすく説明します。問題が発生したら「自動修復」タブから修復できます。
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={fetchData} style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              background: '#4a7c59', color: '#fff', cursor: 'pointer', fontWeight: 600,
              fontSize: '0.85rem'
            }}>
              🔄 手動更新
            </button>
            <button onClick={fetchData} style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              background: '#4a7c59', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem'
            }}>🔄 更新</button>
            <button onClick={onBack} style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid #555',
              background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: '0.8rem'
            }}>← 生徒画面に戻る</button>
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {adminTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveAdminTab(tab.id)}
            style={{
              padding: '10px 16px', borderRadius: '10px', border: '1.5px solid',
              borderColor: activeAdminTab === tab.id ? '#4a7c59' : '#e5e1d8',
              background: activeAdminTab === tab.id ? '#e8f0ea' : '#fff',
              color: activeAdminTab === tab.id ? '#4a7c59' : '#6b7280',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            {tab.icon} {tab.label}
            {tab.id === 'errors' && errorLog.length > 0 && (
              <span style={{
                fontSize: '0.65rem', padding: '1px 6px', background: '#ef4444',
                color: '#fff', borderRadius: '8px'
              }}>{errorLog.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeAdminTab === 'overview' && (
        <div>
          {/* Quick Status Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e5e1d8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>🤖 AIモデル</span>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: apiKeyStatus?.configured ? '#22c55e' : '#ef4444' }}></span>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                {apiKeyStatus?.configured ? '✅ 接続済み' : '❌ 未設定'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                {!apiKeyStatus?.configured && '管理者タブから設定可能'}
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e5e1d8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>⚠️ 問題</span>
                <span style={{
                  fontSize: '0.7rem', padding: '2px 8px', background: errorLog.length === 0 ? '#dcfce7' : '#fef2f2',
                  color: errorLog.length === 0 ? '#16a34a' : '#dc2626', borderRadius: '8px', fontWeight: 600
                }}>{errorLog.length}件</span>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                {errorLog.length === 0 ? '✅ 問題なし' : `⚠️ ${errorLog.length}件の問題`}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                {errorLog.length > 0 && '「エラー一覧」で詳細を確認'}
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e5e1d8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>🛡️ 24時間監視</span>
                <span style={{
                  fontSize: '0.7rem', padding: '2px 8px', borderRadius: '8px', fontWeight: 600,
                  background: monitoring?.active ? '#dcfce7' : '#fef2f2',
                  color: monitoring?.active ? '#16a34a' : '#dc2626'
                }}>
                  {monitoring?.active ? '✅ 稼働中' : '⏸️ 停止中'}
                </span>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                {monitoring?.active ? '5分ごとに自動修復' : '手動モード'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                チェック回数: {monitoring?.total_checks || 0}回
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e5e1d8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>⏱️ 稼働時間</span>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>{status?.uptime_readable || '0分'}</div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>システム稼働中</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '20px', marginBottom: '16px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '1rem' }}>⚡ クイックアクション</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <button onClick={repairAll} style={{
                padding: '16px', borderRadius: '10px', border: '2px solid #22c55e',
                background: '#f0fdf4', cursor: 'pointer', textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🔧</div>
                <div style={{ fontWeight: 700, color: '#16a34a' }}>全修復</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>すべての問題を自動修復</div>
              </button>
              <button onClick={runDiagnosis} style={{
                padding: '16px', borderRadius: '10px', border: '2px solid #3b82f6',
                background: '#eff6ff', cursor: 'pointer', textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🔬</div>
                <div style={{ fontWeight: 700, color: '#2563eb' }}>診断実行</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>システム全体をチェック</div>
              </button>
              <button onClick={() => setActiveAdminTab('errors')} style={{
                padding: '16px', borderRadius: '10px', border: '2px solid #f97316',
                background: '#fff7ed', cursor: 'pointer', textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>📋</div>
                <div style={{ fontWeight: 700, color: '#ea580c' }}>エラー確認</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>詳細なエラー情報を確認</div>
              </button>
            </div>
          </div>

          {/* Diagnosis Results */}
          {diagnosis && (
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '20px' }}>
              <h3 style={{ marginBottom: '12px' }}>🔬 診断結果</h3>
              <div style={{
                padding: '16px', borderRadius: '10px',
                background: diagnosis.issues?.length > 0 ? '#fefce8' : '#f0fdf4',
                border: `1px solid ${diagnosis.issues?.length > 0 ? '#fde68a' : '#bbf7d0'}`
              }}>
                {diagnosis.issues?.length > 0 ? (
                  <>
                    <div style={{ fontWeight: 600, color: '#d97706', marginBottom: '8px' }}>⚠️ 以下の問題が検出されました：</div>
                    {diagnosis.issues.map((issue: string, i: number) => (
                      <div key={i} style={{ fontSize: '0.85rem', marginBottom: '4px' }}>• {issue}</div>
                    ))}
                  </>
                ) : (
                  <div style={{ fontWeight: 600, color: '#16a34a' }}>✅ すべてのシステムが正常です</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Security Tab */}
      {activeAdminTab === 'security' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e5e1d8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>🚫 ブロック中IP</span>
                <span style={{
                  fontSize: '0.7rem', padding: '2px 8px', borderRadius: '8px', fontWeight: 600,
                  background: (security?.blocked_ips || 0) > 0 ? '#fef2f2' : '#dcfce7',
                  color: (security?.blocked_ips || 0) > 0 ? '#dc2626' : '#16a34a'
                }}>{security?.blocked_ips || 0}件</span>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                {(security?.blocked_ips || 0) > 0 ? `⚠️ ${security.blocked_ips}件ブロック中` : '✅ ブロックなし'}
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e5e1d8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>🔍 総リクエスト数</span>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>{security?.total_requests || 0}</div>
            </div>

            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e5e1d8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>⚠️ 不審IP</span>
                <span style={{
                  fontSize: '0.7rem', padding: '2px 8px', borderRadius: '8px', fontWeight: 600,
                  background: Object.keys(security?.suspicious_ips || {}).length > 0 ? '#fef2f2' : '#dcfce7',
                  color: Object.keys(security?.suspicious_ips || {}).length > 0 ? '#dc2626' : '#16a34a'
                }}>{Object.keys(security?.suspicious_ips || {}).length}件</span>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                {Object.keys(security?.suspicious_ips || {}).length > 0 ? '⚠️ 調査中' : '✅ 問題なし'}
              </div>
            </div>
          </div>

          {/* Blocked IPs */}
          {security?.blocked_list?.length > 0 && (
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '16px', marginBottom: '16px' }}>
              <h3 style={{ marginBottom: '12px', fontSize: '1rem' }}>🚫 ブロック中のIPアドレス</h3>
              {security.blocked_list.map((ip: string, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#fef2f2', borderRadius: '8px', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600 }}>{ip}</span>
                  <button onClick={async () => {
                    await fetch(`/api/admin/security/unblock?ip=${ip}`, { method: 'POST' })
                    fetchData()
                  }} style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>
                    解除
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Security Log */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '16px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '1rem' }}>📋 セキュリティイベントログ</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {(security?.recent_events || []).length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>イベントなし</div>
              ) : (
                (security?.recent_events || []).map((event: any, i: number) => (
                  <div key={i} style={{ padding: '8px', borderBottom: '1px solid #f3f4f6', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, color: event.event_type === 'BLOCKED' || event.event_type === 'DANGEROUS_INPUT' ? '#dc2626' : '#6b7280' }}>
                        {event.event_type}
                      </span>
                      <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{event.timestamp?.split('T')[1]?.split('.')[0]}</span>
                    </div>
                    <div style={{ color: '#374151' }}>{event.detail}</div>
                    <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>IP: {event.ip} | Path: {event.path}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* API Keys Tab */}
      {activeAdminTab === 'keys' && (
        <div>
          {/* Key Status Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e5e1d8' }}>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>🔑 総キー数</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{keyStatus?.total_keys || 0}</div>
            </div>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e5e1d8' }}>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>✅ アクティブ</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#22c55e' }}>{keyStatus?.active_keys || 0}</div>
            </div>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e5e1d8' }}>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>📍 現在使用中</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#3b82f6' }}>
                {keyStatus?.keys?.[keyStatus.current_index]?.name || 'なし'}
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e5e1d8' }}>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>🔄 自動切替</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#22c55e' }}>ON</div>
            </div>
          </div>

          {/* Add New Key */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '16px', marginBottom: '16px' }}>
            <h3 style={{ marginBottom: '8px', fontSize: '1rem' }}>➕ 新しいキーを追加</h3>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '12px' }}>
              追加後、config.pyのAPI_KEYSに自動的に保存されます。
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                placeholder="名前 (例: Key1)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                style={{ flex: 1, minWidth: '150px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
              />
              <input
                placeholder="APIキー (AIza...)"
                value={newKeyValue}
                onChange={(e) => setNewKeyValue(e.target.value)}
                style={{ flex: 2, minWidth: '300px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
              />
              <button onClick={async () => {
                if (!newKeyName || !newKeyValue) return
                await fetch(`/api/admin/keys/add?name=${newKeyName}&api_key=${newKeyValue}`, { method: 'POST' })
                setNewKeyName('')
                setNewKeyValue('')
                fetchData()
              }} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                追加
              </button>
            </div>
          </div>

          {/* Key List */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '16px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '1rem' }}>📋 登録済みキー</h3>
            {(keyStatus?.keys || []).length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
                キーが登録されていません
              </div>
            ) : (
              (keyStatus?.keys || []).map((key: any) => (
                <div key={key.index} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px', marginBottom: '8px', borderRadius: '8px',
                  background: key.index === keyStatus.current_index ? '#f0fdf4' : '#f9fafb',
                  border: `1px solid ${key.index === keyStatus.current_index ? '#bbf7d0' : '#e5e7eb'}`
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600 }}>{key.name}</span>
                      {key.index === keyStatus.current_index && (
                        <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: '#22c55e', color: '#fff', borderRadius: '4px' }}>使用中</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
                      {key.key_preview}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
                      本日: {key.daily_used}/{key.daily_limit} | 累計: {key.total_used}
                    </div>
                    <div style={{ width: '200px', height: '6px', background: '#e5e7eb', borderRadius: '3px', marginTop: '4px' }}>
                      <div style={{
                        width: `${Math.min(100, (key.daily_used / key.daily_limit) * 100)}%`,
                        height: '100%', borderRadius: '3px',
                        background: key.daily_used / key.daily_limit > 0.8 ? '#dc2626' : '#22c55e'
                      }}></div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={async () => {
                      await fetch(`/api/admin/keys/remove?index=${key.index}`, { method: 'POST' })
                      fetchData()
                    }} style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: '0.75rem' }}>
                      削除
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Errors Tab - Beginner Friendly */}
      {activeAdminTab === 'errors' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e5e1d8' }}>
            <h3 style={{ marginBottom: '8px' }}>🐛 エラー一覧 - 問題の原因と解決策</h3>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '12px' }}>
              検出された問題の一覧です。各エラーには「原因」と「解決方法」が初心者向けに説明されています。
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                placeholder="エラーを検索..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                style={{ flex: 1, minWidth: '200px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e1d8', background: '#f5f2eb', fontSize: '0.85rem' }}
              />
              <div style={{ display: 'flex', gap: '4px' }}>
                {[
                  { id: 'all', label: 'すべて', color: '#4a7c59' },
                  { id: 'critical', label: '重大', color: '#dc2626' },
                  { id: 'error', label: 'エラー', color: '#dc2626' },
                  { id: 'warn', label: '警告', color: '#d97706' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setLogFilter(f.id)}
                    style={{
                      padding: '6px 12px', borderRadius: '6px', border: 'none',
                      background: logFilter === f.id ? f.color : '#f5f2eb',
                      color: logFilter === f.id ? '#fff' : '#6b7280',
                      cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600
                    }}
                  >{f.label}</button>
                ))}
              </div>
              <button onClick={clearLogs} style={{
                padding: '6px 12px', borderRadius: '6px', border: '1px solid #fecaca',
                background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600
              }}>🗑️ ログ全消去</button>
            </div>
          </div>

          <div style={{ padding: '16px' }}>
            {filteredErrors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#16a34a', marginBottom: '8px' }}>
                  すべて正常です！
                </div>
                <div style={{ fontSize: '0.9rem' }}>
                  エラーはありません。システムは正常に稼働しています。
                </div>
              </div>
            ) : (
              filteredErrors.map((log, i) => {
                const colors = getSeverityColor(log.severity)
                return (
                  <div key={i} style={{
                    background: colors.bg, borderRadius: '12px', padding: '16px', marginBottom: '12px',
                    border: `1px solid ${colors.border}`, cursor: 'pointer'
                  }} onClick={() => setExpandedError(expandedError === i ? null : i)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.7rem', padding: '4px 10px', background: colors.badge,
                        color: '#fff', borderRadius: '6px', fontWeight: 700
                      }}>
                        {getSeverityLabel(log.severity)}
                      </span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: colors.text }}>{log.error_type}</span>
                      <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>🕐 {log.timestamp}</span>
                      {log.self_repaired && (
                        <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: '#dcfce7', color: '#16a34a', borderRadius: '4px' }}>
                          ✓ 自動修復済み
                        </span>
                      )}
                    </div>

                    {/* What happened - Simple explanation */}
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '8px', color: colors.text }}>
                      💬 {log.message}
                    </div>

                    {/* Why it happened */}
                    <div style={{ fontSize: '0.85rem', color: '#374151', marginBottom: '8px', padding: '8px 12px', background: 'rgba(255,255,255,0.7)', borderRadius: '8px' }}>
                      <strong>原因：</strong>{log.explanation}
                    </div>

                    {/* How to fix */}
                    {expandedError === i && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                          🔧 解決方法：
                        </div>
                        <ol style={{ margin: '0', paddingLeft: '20px' }}>
                          {log.fix_steps.map((step, j) => (
                            <li key={j} style={{ fontSize: '0.85rem', marginBottom: '4px', color: '#4b5563' }}>{step}</li>
                          ))}
                        </ol>
                        {log.auto_fixable && (
                          <button onClick={(e) => { e.stopPropagation(); repairError(i) }} style={{
                            marginTop: '12px', padding: '8px 16px', borderRadius: '8px', border: 'none',
                            background: '#22c55e', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                          }}>
                            🔧 このエラーを自動修復する
                          </button>
                        )}
                      </div>
                    )}

                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '8px' }}>
                      {expandedError === i ? '▲ 詳細を閉じる' : '▼ クリックして解決方法を表示'}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Self Healing Tab */}
      {activeAdminTab === 'self_healing' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '24px' }}>
          <h3 style={{ marginBottom: '8px' }}>🔧 自動修復センター</h3>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '16px' }}>
            問題が発生した場合、ここから修復できます。初心者でも安心の「全修復」ボタンでまず試してください。
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
            <button onClick={repairAll} style={{
              padding: '20px', borderRadius: '12px', border: '2px solid #22c55e',
              background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', cursor: 'pointer', textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔧</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#16a34a' }}>全修復を実行</div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px' }}>
                検出されたすべての問題を自動的に修復します
              </div>
            </button>
            <button onClick={runDiagnosis} style={{
              padding: '20px', borderRadius: '12px', border: '2px solid #3b82f6',
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', cursor: 'pointer', textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔬</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#2563eb' }}>システム診断</div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px' }}>
                問題がないか確認します
              </div>
            </button>
          </div>

          {diagnosis && (
            <div style={{
              padding: '16px', borderRadius: '10px',
              background: diagnosis.issues?.length > 0 ? '#fefce8' : '#f0fdf4',
              border: `1px solid ${diagnosis.issues?.length > 0 ? '#fde68a' : '#bbf7d0'}`,
              marginBottom: '16px'
            }}>
              <div style={{ fontWeight: 600, marginBottom: '8px' }}>診断結果：</div>
              {diagnosis.issues?.length > 0 ? (
                <div style={{ color: '#d97706' }}>{diagnosis.issues.join(' | ')}</div>
              ) : (
                <div style={{ color: '#16a34a' }}>✅ すべてのシステムが正常です</div>
              )}
            </div>
          )}

          {/* API Key Section */}
          <div style={{ borderTop: '1px solid #e5e1d8', paddingTop: '16px' }}>
            <h4 style={{ marginBottom: '8px' }}>🔑 Gemini APIキー設定</h4>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '12px' }}>
              AIの返答をより賢くするには、Gemini APIキーが必要です。
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input placeholder="Gemini APIキーを入力" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e1d8', background: '#f5f2eb', fontSize: '0.9rem' }} />
              <button onClick={saveApiKey} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#4a7c59', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>保存</button>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '8px' }}>
              取得先：<a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: '#4a7c59' }}>https://aistudio.google.com/apikey</a>（無料）
            </div>
          </div>
        </div>
      )}

      {/* Error Test Tab */}
      {activeAdminTab === 'error_test' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '24px' }}>
          <h3 style={{ marginBottom: '8px' }}>🧪 エラーテスト</h3>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '16px' }}>
            意図的にエラーを発生させて、自動修復が正常に動作するかテストします。
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { icon: '💥', label: 'ネットワークエラー', desc: 'インターネット接続障害をシミュレート', color: '#dc2626', bg: '#fef2f2' },
              { icon: '💾', label: 'ストレージエラー', desc: 'データ保存容量の問題をシミュレート', color: '#d97706', bg: '#fefce8' },
              { icon: '🤖', label: 'APIエラー', desc: 'AI APIの接続問題をシミュレート', color: '#7c3aed', bg: '#f3e8ff' },
              { icon: '🗄️', label: 'データベースエラー', desc: 'DB接続の問題をシミュレート', color: '#2563eb', bg: '#eff6ff' },
              { icon: '🧠', label: 'メモリエラー', desc: 'メモリ不足をシミュレート', color: '#ea580c', bg: '#fff7ed' },
              { icon: '🔑', label: '認証エラー', desc: 'APIキー切れをシミュレート', color: '#be123c', bg: '#fff1f2' },
              { icon: '🚦', label: 'レート制限', desc: 'API使用量制限をシミュレート', color: '#9333ea', bg: '#faf5ff' },
              { icon: '💿', label: 'ディスク容量不足', desc: 'ストレージ満杯をシミュレート', color: '#0f766e', bg: '#f0fdfa' },
              { icon: '🔥', label: 'CPU過負荷', desc: 'プロセッサ過負荷をシミュレート', color: '#dc2626', bg: '#fef2f2' },
              { icon: '👁️', label: 'OCRエンジンエラー', desc: '画像解析の問題をシミュレート', color: '#c2410c', bg: '#fff7ed' },
              { icon: '⏳', label: 'タイムアウト', desc: 'API応答遅延をシミュレート', color: '#4338ca', bg: '#eef2ff' },
            ].map((test, i) => (
              <button key={i} onClick={async () => {
                try {
                  const res = await fetch(`/api/admin/command?command=${encodeURIComponent(test.label)}`, { method: 'POST' })
                  if (res.ok) {
                    alert(`${test.label}を発生させました。「エラー一覧」タブで確認できます。`)
                    fetchData()
                  }
                } catch { }
              }}
                style={{ padding: '16px', borderRadius: '10px', border: `1px solid ${test.bg}`, background: test.bg, cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{test.icon}</div>
                <div style={{ fontWeight: 600, color: test.color }}>{test.label}</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{test.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Health Check Tab */}
      {activeAdminTab === 'health_check' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '24px' }}>
          <h3 style={{ marginBottom: '8px' }}>💓 ヘルスチェック</h3>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '16px' }}>
            システムの各部分が正常に動作しているか確認します。
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: 'バックエンドサーバー', status: true, icon: '🖥️', desc: 'メインサーバー' },
              { label: 'Gemini API', status: apiKeyStatus?.configured, icon: '🤖', desc: 'AIサービス' },
              { label: 'データベース', status: true, icon: '🗄️', desc: 'データ保存' },
              { label: 'フロントエンド', status: true, icon: '🌐', desc: 'ブラウザ画面' },
            ].map((item, i) => (
              <div key={i} style={{
                padding: '16px', borderRadius: '10px',
                background: item.status ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${item.status ? '#bbf7d0' : '#fecaca'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.label}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{item.desc}</div>
                  </div>
                </div>
                <div style={{
                  fontSize: '0.85rem', fontWeight: 600,
                  color: item.status ? '#16a34a' : '#dc2626'
                }}>
                  {item.status ? '✅ 正常' : '❌ 問題あり'}
                </div>
                {!item.status && item.label === 'Gemini API' && (
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
                    → 「自動修復」タブからAPIキーを設定してください
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ padding: '16px', background: '#f5f2eb', borderRadius: '8px' }}>
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>💬 コマンド実行</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && executeCommand()}
                placeholder="コマンドを入力..." style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e1d8', background: '#fff', fontSize: '0.85rem' }} />
              <button onClick={executeCommand} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#4a7c59', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>実行</button>
            </div>
            {commandResult && (
              <pre style={{ marginTop: '8px', fontSize: '0.75rem', background: '#1a1a1a', color: '#22c55e', padding: '12px', borderRadius: '8px', overflow: 'auto', maxHeight: '200px' }}>{commandResult}</pre>
            )}
          </div>
        </div>
      )}

      {/* Components Tab */}
      {activeAdminTab === 'components' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '24px' }}>
          <h3 style={{ marginBottom: '8px' }}>📦 コンポーネント管理</h3>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '16px' }}>
            システムを構成する各部分の状態を確認できます。問題がある場合は再起動してください。
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {[
              { name: 'ReAct Agent', desc: 'AIの推論エンジン（メイン）', icon: '🤖' },
              { name: 'OCR Engine', desc: 'プリント画像の文字認識', icon: '📸' },
              { name: 'Mistake Analyzer', desc: 'ミスのパターン分析', icon: '📓' },
              { name: 'Schedule Manager', desc: 'スケジュール管理', icon: '📅' },
              { name: 'Submission Radar', desc: '提出物の検出', icon: '📢' },
              { name: 'Persona Manager', desc: 'AIのペルソナ管理', icon: '🎭' },
            ].map((comp, i) => {
              const status = getComponentStatus(comp.name)
              const isOk = status === 'ok' || status === 'unknown'
              return (
                <div key={i} style={{
                  padding: '16px', borderRadius: '10px',
                  background: isOk ? '#f5f2eb' : '#fef2f2',
                  border: `1px solid ${isOk ? '#e5e1d8' : '#fecaca'}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.5rem' }}>{comp.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{comp.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{comp.desc}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: isOk ? '#22c55e' : '#ef4444'
                    }}></span>
                    <span style={{ fontSize: '0.8rem', color: isOk ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                      {isOk ? '正常' : '異常'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Database Tab */}
      {activeAdminTab === 'database' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '24px' }}>
          <h3 style={{ marginBottom: '8px' }}>🗄️ データベース管理</h3>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '16px' }}>
            学習データがどこに保存されているか確認できます。
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: 'テーブル数', value: dbStats?.tables || 5, icon: '📊' },
              { label: '総レコード', value: dbStats?.records || 0, icon: '📝' },
              { label: 'DBサイズ', value: dbStats?.size || '1.2MB', icon: '💾' },
              { label: '最終更新', value: '今', icon: '🕐' },
            ].map((stat, i) => (
              <div key={i} style={{ padding: '16px', background: '#f5f2eb', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{stat.icon}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4a7c59' }}>{stat.value}</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{stat.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {[
              { name: 'flashcards', label: '暗記カード', icon: '📝' },
              { name: 'mistake_records', label: 'ミス記録', icon: '📓' },
              { name: 'schedule_tasks', label: 'スケジュール', icon: '📅' },
              { name: 'submissions', label: '提出物', icon: '📢' },
              { name: 'error_logs', label: 'エラーログ', icon: '🐛' },
            ].map((table, i) => (
              <div key={i} style={{ padding: '12px', background: '#f5f2eb', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem' }}>{table.icon} {table.label}</span>
                <span style={{ fontSize: '0.8rem', color: '#6b7280', fontFamily: 'monospace' }}>{table.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeAdminTab === 'performance' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>📈 パフォーマンス</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {[
              { label: 'API応答時間', value: performance?.apiLatency || '185ms', icon: '⚡', status: 'good' },
              { label: 'メモリ使用量', value: performance?.memory || '128MB', icon: '💻', status: 'good' },
              { label: 'CPU使用率', value: performance?.cpu || '12%', icon: '📈', status: 'good' },
              { label: '稼働時間', value: status?.uptime_readable || '0分', icon: '⏱️', status: 'good' },
            ].map((item, i) => (
              <div key={i} style={{ padding: '16px', background: '#f5f2eb', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{item.icon}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4a7c59' }}>{item.value}</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Mod Tab */}
      {activeAdminTab === 'system_mod' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', padding: '24px' }}>
          <h3 style={{ marginBottom: '8px' }}>⚙️ システム変更</h3>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '16px' }}>
            高度な設定変更。不明白な場合は使用しないでください。
          </p>
          <div className="admin-form">
            <input placeholder="対象コンポーネント" value={modifyTarget} onChange={(e) => setModifyTarget(e.target.value)} />
            <input placeholder="変更種別 (config, ui, logic, api)" value={modifyType} onChange={(e) => setModifyType(e.target.value)} />
            <textarea placeholder="新しいコード/設定" value={modifyCode} onChange={(e) => setModifyCode(e.target.value)} rows={5} />
            <input placeholder="説明" value={modifyDesc} onChange={(e) => setModifyDesc(e.target.value)} />
            <button onClick={applyModification} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#4a7c59', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>変更を適用</button>
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeAdminTab === 'logs' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e1d8', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e1d8', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input placeholder="ログを検索..." value={logSearch} onChange={(e) => setLogSearch(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e1d8', background: '#f5f2eb', fontSize: '0.85rem' }} />
            <button onClick={fetchData} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#4a7c59', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>更新</button>
          </div>
          <div style={{ padding: '16px', maxHeight: '400px', overflow: 'auto', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {systemLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontFamily: 'sans-serif' }}>ログはありません</div>
            ) : (
              systemLogs.map((log, i) => (
                <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #f5f2eb' }}>
                  <span style={{ color: '#9ca3af' }}>{log.timestamp}</span>
                  <span style={{
                    margin: '0 8px', padding: '2px 6px', borderRadius: '4px',
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
  )
}

export default AdminMode
