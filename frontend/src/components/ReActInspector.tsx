import React, { useState } from 'react'

const ReActInspector: React.FC = () => {
  const [visible, setVisible] = useState(false)

  return (
    <div className="panel-card">
      <div className="panel-header" style={{ cursor: 'pointer' }} onClick={() => setVisible(!visible)}>
        🔍 ReActインスペクター
        <span>{visible ? '▲' : '▼'}</span>
      </div>
      {visible && (
        <div className="panel-body">
          <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>AIの思考プロセスを確認できます。</p>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>チャットを開始するとReActステップが表示されます。</p>
        </div>
      )}
    </div>
  )
}

export default ReActInspector
