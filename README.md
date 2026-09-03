# StudyAutonomous AI 🎓

校内専属AI学習エージェント「StudyAutonomous AI」のプロトタイプ

## 機能一覧

- **🤖 スーパーエージェントモード** - 自律的な学習管理
- **🦩 ゆるスパルタ・家庭教師モード** - 段階的ヒント提示
- **💬 雑談・メンタルケアモード** - 共感とモチベーション回復
- **⚡ 爆速・要点モード** - 最速で結論を提示
- **🔧 管理者モード** - パスワード「1031」で起動

## 管理者モード機能

- **🔬 自動診断** - システムの健康状態を確認
- **🔧 自己修復** - エラー発生時の自動復旧
- **📋 エラー一覧** - エラーログの表示
- **🎨 システム改造** - チャットからシステム変更・新機能追加

## セットアップ

### バックエンド
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### フロントエンド
```bash
cd frontend
npm install
npm run dev
```

## APIエンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | / | APIステータス |
| POST | /api/chat | チャットメッセージ |
| POST | /api/ocr | OCR解析 |
| POST | /api/flashcards | 暗記カード保存 |
| GET | /api/flashcards | 暗記カード一覧 |
| POST | /api/mistakes | ミス分析 |
| GET | /api/mistakes | ミス一覧 |
| POST | /api/schedule | スケジュール作成 |
| POST | /api/schedule/retry | スケジュールリトライ |
| POST | /api/submissions | 提出物分類 |
| GET | /api/submissions | 提出物一覧 |
| GET | /api/notifications | 通知一覧 |
| POST | /api/admin/authenticate | 管理者認証 |
| GET | /api/admin/status | 管理者ステータス |
| POST | /api/admin/diagnosis | 自動診断 |
| POST | /api/admin/repair | 自己修復 |
| POST | /api/admin/modify | システム変更 |
| POST | /api/admin/command | 管理者コマンド |
| GET | /api/modes | 利用可能モード |