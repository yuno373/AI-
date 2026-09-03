from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import json

from config import settings

try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

# ============================================
# ペルソナ管理
# ============================================
PERSONAS = {
    "super_agent": {"name": "スーパーエージェント", "desc": "全能力を発動"},
    "yuru_sparta": {"name": "ゆるスパルタ", "desc": "優しく严格"},
    "mental_care": {"name": "メンタルケア", "desc": "心理サポート"},
    "ultra_fast": {"name": "超速回答", "desc": "最短回答"},
}

def get_persona(mode: str) -> Dict[str, Any]:
    return PERSONAS.get(mode, PERSONAS["super_agent"])

def get_available_modes() -> List[str]:
    return list(PERSONAS.keys())

def get_mode_display_names() -> Dict[str, str]:
    return {k: v["name"] for k, v in PERSONAS.items()}

def get_system_prompt(mode: str) -> str:
    prompts = {
        "super_agent": "あなたはStudyAutonomous AIです。生徒の学習を全力でサポートします。",
        "yuru_sparta": "あなたはゆるスパルタメンターです。優しく励ましながら严格に指導します。",
        "mental_care": "あなたはメンタルケアアシスタントです。生徒の心をケアします。",
        "ultra_fast": "あなたは超速回答AIです。簡潔に答えてください。",
    }
    return prompts.get(mode, prompts["super_agent"])


# ============================================
# OCRエンジン
# ============================================
class OCREngine:
    def extract_text(self, image_data: str) -> str:
        return "OCRテキスト解析結果（ダミー）"


# ============================================
# ミス分析
# ============================================
class MistakeAnalyzer:
    def analyze(self, question: str, user_answer: str, correct_answer: str) -> Dict[str, Any]:
        return {"category": "計算ミス", "severity": "medium", "suggestion": "もう一度計算してみて"}


# ============================================
# スケジュール管理
# ============================================
class ScheduleManager:
    def get_tasks(self) -> List[Dict[str, Any]]:
        return []


# ============================================
# 提出物レーダー
# ============================================
class SubmissionRadar:
    def scan(self) -> List[Dict[str, Any]]:
        return []


# ============================================
# ReActエージェント
# ============================================
@dataclass
class ReActAgent:
    mode: str = "super_agent"
    max_iterations: int = 5
    iteration: int = 0
    steps: list = field(default_factory=list)

    def run(self, user_message: str, image_data: Optional[str], context: Dict[str, Any]) -> Dict[str, Any]:
        api_key = settings.GOOGLE_API_KEY

        if api_key and GENAI_AVAILABLE:
            feedback = self._call_gemini(user_message, image_data, context, api_key)
        else:
            feedback = self._template_response(user_message, context)

        return {
            "response": feedback,
            "steps": [{"step": 1, "phase": "Response", "thought": "Generating response", "observation": feedback[:100]}],
            "mode": self.mode,
        }

    def _call_gemini(self, user_message: str, image_data: Optional[str], context: Dict[str, Any], api_key: str) -> str:
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(settings.MODEL_NAME)
            system_prompt = get_system_prompt(self.mode)
            full_prompt = f"{system_prompt}\n\nUser: {user_message}"
            response = model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            return f"AI error: {str(e)}"

    def _template_response(self, msg: str, context: Dict[str, Any]) -> str:
        msg_lower = msg.lower()
        if any(w in msg_lower for w in ["hello", "hi", "こんにちは"]):
            return "こんにちは！StudyAutonomous AIです！"
        elif any(w in msg_lower for w in ["study", "勉強", "学習"]):
            return "効率的な学習方法：Pomodoroテクニックを試してみましょう！"
        elif any(w in msg_lower for w in ["schedule", "スケジュール"]):
            return "スケジュール管理をしましょう！"
        elif any(w in msg_lower for w in ["mistake", "ミス", "間違い"]):
            return "ミスノートを作成しましょう！"
        elif any(w in msg_lower for w in ["tired", "疲れた", "やる気"]):
            return "お疲れさまです！少し休憩しましょう！"
        else:
            return "もっと詳しく教えてください！"
