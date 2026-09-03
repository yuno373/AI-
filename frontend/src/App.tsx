import React, { useState } from 'react'
import { ModeType } from './types'
import Header from './components/Header'
import ChatView from './components/ChatView'
import FlashcardsView from './components/FlashcardsView'
import MistakeNotebookView from './components/MistakeNotebookView'
import ScheduleManagerView from './components/ScheduleManagerView'
import SubmissionsRadarView from './components/SubmissionsRadarView'
import AdminMode from './components/AdminMode'

type TabType = 'chat' | 'flashcards' | 'mistakes' | 'schedule' | 'submissions' | 'admin'

const TAB_CONFIG: { id: TabType; label: string; icon: string; count?: number }[] = [
  { id: 'chat', label: 'AI自律エージェント', icon: '🤖' },
  { id: 'flashcards', label: '暗記カード & 予想問題', icon: '📝', count: 5 },
  { id: 'mistakes', label: 'ミス分析ノート', icon: '📓', count: 2 },
  { id: 'schedule', label: '自律スケジュール', icon: '📅', count: 7 },
  { id: 'submissions', label: '提出物レーダー', icon: '📢', count: 3 },
  { id: 'admin', label: '管理者モード', icon: '🔧' },
]

const App: React.FC = () => {
  const [mode, setMode] = useState<ModeType>('super_agent')
  const [activeTab, setActiveTab] = useState<TabType>('chat')
  const [showWelcome, setShowWelcome] = useState(true)

  return (
    <div>
      {/* Top Banner */}
      <div className="top-banner">
        <div className="left">
          <span className="status-dot"></span>
          <span>ReAct自律思考エンジン：稼働中</span>
        </div>
        <div className="right">
          <span className="status-badge">⏰ 高校2学期 中間考査：あと5日</span>
          <span className="status-badge">📋 未提出 3件</span>
          <span className="status-badge" style={{ cursor: 'pointer' }}>📖 はじめてガイド</span>
        </div>
      </div>

      {/* Header */}
      <Header mode={mode} onModeChange={setMode} />

      {/* Welcome Banner */}
      {showWelcome && activeTab !== 'admin' && (
        <div className="welcome-banner">
          <div className="left">
            <span className="icon">💡</span>
            <span>
              <strong>はじめての方へ：</strong> プリントをスマホ撮影するか、チャットで「今日の予定教えて」「因数分解のコツ」などと話しかけるだけAIが自動サポートします！
            </span>
          </div>
          <div>
            <button className="guide-btn">30秒ガイドを見る</button>
            <button className="close-btn" onClick={() => setShowWelcome(false)}>×</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {TAB_CONFIG.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
            {tab.count !== undefined && <span className="count">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="main-layout">
        {activeTab === 'chat' && <ChatView mode={mode} />}
        {activeTab === 'flashcards' && <FlashcardsView />}
        {activeTab === 'mistakes' && <MistakeNotebookView />}
        {activeTab === 'schedule' && <ScheduleManagerView />}
        {activeTab === 'submissions' && <SubmissionsRadarView />}
        {activeTab === 'admin' && <AdminMode onBack={() => setActiveTab('chat')} />}
      </div>
    </div>
  )
}

export default App
