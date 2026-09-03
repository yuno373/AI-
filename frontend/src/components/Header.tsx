import React from 'react'
import { ModeType } from '../types'

const MODE_NAMES: Record<ModeType, string> = {
  super_agent: 'スーパーエージェント',
  yuru_sparta: 'ゆるスパルタ',
  mental_care: 'メンタルケア',
  ultra_fast: '爆速・要点',
}

const MODE_ICONS: Record<ModeType, string> = {
  super_agent: '🤖',
  yuru_sparta: '🦩',
  mental_care: '💬',
  ultra_fast: '⚡',
}

interface Props {
  mode: ModeType
  onModeChange: (mode: ModeType) => void
}

const Header: React.FC<Props> = ({ mode, onModeChange }) => {
  return (
    <div className="app-header">
      <div className="header-left">
        <div className="header-logo">🎓</div>
        <div className="header-title">
          <h1>
            StudyAutonomous AI
            <span className="badge">生徒専用</span>
          </h1>
          <span className="subtitle">自律型AI学習マネージャー（プリントOCR・ミス分析・スケジュール逆算）</span>
        </div>
      </div>
      <div className="mode-switcher">
        {(Object.keys(MODE_NAMES) as ModeType[]).map(m => (
          <button
            key={m}
            className={`mode-btn ${mode === m ? 'active' : ''}`}
            onClick={() => onModeChange(m)}
          >
            {MODE_ICONS[m]} {MODE_NAMES[m]}
          </button>
        ))}
      </div>
    </div>
  )
}

export default Header
