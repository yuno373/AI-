from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from typing import Optional, List
import asyncio
import os

from config import settings
from models import init_db, get_db, Flashcard, MistakeRecord, ScheduleTask, Submission, ErrorLog, ChatMessage, ChatResponse, FlashcardCreate, FlashcardResponse, MistakeRecordSchema, SubmissionSchema, SystemStatus, SystemModification, ErrorLogSchema
from agents import ReActAgent, OCREngine, MistakeAnalyzer, ScheduleManager, SubmissionRadar, get_persona, get_available_modes, get_mode_display_names
from admin import AdminMode, SecurityGuard

app = FastAPI(title="StudyAutonomous AI API", version="1.0.0")

# ============================================
# 静的ファイル配信（Renderデプロイ用）
# ============================================
def find_frontend_dir():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(backend_dir, "static"),
        os.path.join(backend_dir, "..", "frontend", "dist"),
        os.path.join(os.getcwd(), "static"),
        os.path.join(os.getcwd(), "frontend", "dist"),
        os.path.join(os.getcwd(), "..", "frontend", "dist"),
        "/opt/render/project/src/backend/static",
        "/opt/render/project/src/frontend/dist",
    ]
    for path in candidates:
        abs_path = os.path.abspath(path)
        if os.path.isdir(abs_path):
            return abs_path
    return os.path.abspath(candidates[0])

FRONTEND_DIR = find_frontend_dir()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def security_middleware(request: Request, call_next):
    ip = request.client.host if request.client else "unknown"
    path = request.url.path
    method = request.method

    body = ""
    if method in ["POST", "PUT", "PATCH"]:
        try:
            body_bytes = await request.body()
            body = body_bytes.decode("utf-8", errors="ignore")
        except:
            pass

    check = SecurityGuard.check_request(ip, path, method, body)
    if not check["allowed"]:
        return JSONResponse(
            status_code=403,
            content={"error": "Access denied", "reason": check["reason"]}
        )

    response = await call_next(request)
    return response

ocr_engine = OCREngine()
mistake_analyzer = MistakeAnalyzer()
schedule_manager = ScheduleManager()
submission_radar = SubmissionRadar()
admin_mode = AdminMode()
init_db()

monitoring_active = True
monitoring_log = []

async def background_monitor():
    """24時間バックグラウンド監視 - エラーを検知して自動修復"""
    while monitoring_active:
        try:
            await asyncio.sleep(300)  # 5分ごとにチェック
            unresolved = [e for e in admin_mode.diagnostics.error_log if not e["self_repaired"]]
            if unresolved:
                result = admin_mode.repair_all()
                monitoring_log.append({
                    "timestamp": datetime.now().isoformat(),
                    "action": "auto_repair",
                    "repaired_count": result["repaired_count"],
                })
            else:
                monitoring_log.append({
                    "timestamp": datetime.now().isoformat(),
                    "action": "check",
                    "status": "all_clear",
                })
            if len(monitoring_log) > 100:
                monitoring_log.pop(0)
        except Exception as e:
            monitoring_log.append({
                "timestamp": datetime.now().isoformat(),
                "action": "error",
                "message": str(e),
            })

@app.on_event("startup")
async def startup():
    init_db()
    asyncio.create_task(background_monitor())

@app.get("/")
async def root():
    for d in [FRONTEND_DIR, os.path.join(os.getcwd(), "backend", "static"), os.path.join(os.getcwd(), "static")]:
        index = os.path.join(d, "index.html")
        if os.path.isfile(index):
            return FileResponse(index)
    return {"message": "StudyAutonomous AI API", "version": "1.0.0", "status": "running"}

@app.post("/api/chat", response_model=ChatResponse)
async def chat(message: ChatMessage, db=Depends(get_db)):
    try:
        agent = ReActAgent(mode=message.mode)
        context = {
            "tasks": _get_pending_tasks(db),
            "mistakes": _get_recent_mistakes(db),
            "submissions": _get_submissions(db),
        }

        response = agent.run(message.content, None, context)

        _save_flashcards_from_chat(response, db)
        _save_mistake_analysis(response, db)

        return response
    except Exception as e:
        error_log = ErrorLog(
            timestamp=datetime.now(),
            error_type="ChatError",
            message=str(e),
            stack_trace=traceback.format_exc(),
            self_repaired=False,
        )
        db.add(error_log)
        db.commit()
        admin_mode.diagnostics.log_error("ChatError", str(e), traceback.format_exc())
        repair_result = admin_mode.repair_engine.attempt_repair(error_log)
        return ChatResponse(
            message=f"⚠️ エラーが発生しましたが、自動修復しました。{repair_result.get('detail', '')}",
            mode=message.mode,
            react_steps=[],
        )

@app.post("/api/ocr", response_model=dict)
async def ocr_parse(image_path: str, image_data: Optional[str] = None):
    try:
        result = ocr_engine.parse_print(image_path, image_data)
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/flashcards", response_model=list[FlashcardResponse])
async def save_flashcards(flashcards: list[FlashcardCreate], db=Depends(get_db)):
    saved = []
    for fc in flashcards:
        db_fc = Flashcard(**fc.dict())
        db.add(db_fc)
        saved.append(db_fc)
    db.commit()
    return [FlashcardResponse(**fc.to_dict()) for fc in saved]

@app.get("/api/flashcards", response_model=list[FlashcardResponse])
async def get_flashcards(db=Depends(get_db)):
    flashcards = db.query(Flashcard).all()
    return [FlashcardResponse(**fc.to_dict()) for fc in flashcards]

@app.post("/api/mistakes", response_model=dict)
async def analyze_mistake(
    question: str, user_answer: str, correct_answer: str, db=Depends(get_db)
):
    analysis = mistake_analyzer.analyze(question, user_answer, correct_answer)
    mistake = MistakeRecord(
        question=analysis["question"],
        user_answer=analysis["user_answer"],
        correct_answer=analysis["correct_answer"],
        category=analysis["category"],
        tags=str(analysis["tags"]),
    )
    db.add(mistake)
    db.commit()
    return {"success": True, "analysis": analysis}

@app.get("/api/mistakes", response_model=list[dict])
async def get_mistakes(db=Depends(get_db)):
    mistakes = db.query(MistakeRecord).all()
    return [m.to_dict() for m in mistakes]

@app.post("/api/schedule", response_model=dict)
async def create_schedule(
    test_date: str,
    subjects: List[dict],
    weak_points: list[str] = [],
    daily_study_time: int = 3,
    db=Depends(get_db),
):
    plan = schedule_manager.create_schedule(test_date, subjects, daily_study_time, weak_points)
    for task_data in plan["tasks"]:
        db_task = ScheduleTask(**task_data)
        db.add(db_task)
    db.commit()
    return {"success": True, "plan": plan}

@app.post("/api/schedule/retry", response_model=dict)
async def retry_schedule(
    unfinished_tasks: list[dict],
    new_mistakes: list[dict] = [],
    db=Depends(get_db),
):
    original = _get_schedule(db)
    plan = schedule_manager.retry_schedule(original, unfinished_tasks, new_mistakes)
    return {"success": True, "plan": plan}

@app.post("/api/submissions", response_model=dict)
async def classify_submission(text_content: str, image_path: str = ""):
    result = submission_radar.classify_image(text_content, image_path)
    return {"success": True, "data": result}

@app.get("/api/submissions", response_model=list[dict])
async def get_submissions(db=Depends(get_db)):
    submissions = db.query(Submission).all()
    return [s.to_dict() for s in submissions]

@app.get("/api/notifications", response_model=list[str])
async def get_notifications(db=Depends(get_db)):
    submissions = _get_submissions(db)
    return submission_radar.generate_notifications(submissions)

@app.post("/api/admin/authenticate")
async def admin_auth(password: str):
    result = admin_mode.authenticate(password)
    if not result["success"]:
        raise HTTPException(status_code=403, detail=result["message"])
    return result

@app.get("/api/admin/status")
async def admin_status():
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    return admin_mode.get_status()

@app.post("/api/admin/diagnosis")
async def admin_diagnosis():
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    return admin_mode.run_diagnosis()

@app.post("/api/admin/repair")
async def admin_repair(error_index: int = -1):
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    if error_index == -1:
        return admin_mode.repair_all()
    return admin_mode.repair_error(error_index)

@app.post("/api/admin/modify")
async def admin_modify(target: str, mod_type: str, code: str, desc: str):
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    return admin_mode.modify_system(target, mod_type, code, desc)

@app.post("/api/admin/command")
async def admin_command(command: str):
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    return admin_mode.handle_command(command)

@app.get("/api/admin/monitoring")
async def get_monitoring_status():
    return {
        "active": monitoring_active,
        "interval_minutes": 5,
        "total_checks": len(monitoring_log),
        "recent_logs": monitoring_log[-10:],
    }

@app.post("/api/admin/monitoring/toggle")
async def toggle_monitoring():
    global monitoring_active
    monitoring_active = not monitoring_active
    if monitoring_active:
        asyncio.create_task(background_monitor())
    return {"active": monitoring_active}

@app.get("/api/admin/security")
async def get_security_status():
    return SecurityGuard.get_status()

@app.get("/api/admin/security/log")
async def get_security_log(limit: int = 50):
    return {"events": SecurityGuard.get_security_log(limit)}

@app.post("/api/admin/security/block")
async def block_ip(ip: str):
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    SecurityGuard.block_ip(ip, "手動ブロック")
    return {"success": True, "message": f"IP {ip} をブロックしました"}

@app.post("/api/admin/security/unblock")
async def unblock_ip(ip: str):
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    result = SecurityGuard.unblock_ip(ip)
    if result:
        return {"success": True, "message": f"IP {ip} のブロックを解除しました"}
    return {"success": False, "message": "ブロックされていないIPです"}

@app.post("/api/admin/apikey")
async def set_api_key(api_key: str):
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    settings.GOOGLE_API_KEY = api_key
    with open(".env", "w") as f:
        f.write(f"GOOGLE_API_KEY={api_key}\n")
    return {"success": True, "message": "APIキーを設定しました"}

@app.get("/api/admin/apikey_status")
async def apikey_status():
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    has_key = bool(settings.GOOGLE_API_KEY)
    return {"configured": has_key, "model": settings.MODEL_NAME}

@app.get("/api/admin/keys")
async def get_keys():
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    return admin_mode.api_key_manager.get_status()

@app.post("/api/admin/keys/add")
async def add_key(name: str, api_key: str):
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    return admin_mode.api_key_manager.add_key(name, api_key)

@app.post("/api/admin/keys/remove")
async def remove_key(index: int):
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    return admin_mode.api_key_manager.remove_key(index)

@app.post("/api/admin/keys/toggle")
async def toggle_key(index: int):
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    return admin_mode.api_key_manager.toggle_key(index)

@app.post("/api/admin/keys/block")
async def block_key(index: int):
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    return admin_mode.api_key_manager.block_key(index)

@app.post("/api/admin/keys/unblock")
async def unblock_key(index: int):
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    return admin_mode.api_key_manager.unblock_key(index)

@app.get("/api/modes")
async def get_modes():
    return {"modes": get_available_modes(), "display_names": get_mode_display_names()}

@app.get("/api/admin/analytics")
async def get_analytics(db=Depends(get_db)):
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    flashcards = db.query(Flashcard).all()
    mistakes = db.query(MistakeRecord).all()
    tasks = db.query(ScheduleTask).all()
    submissions = db.query(Submission).all()
    return {
        "flashcards": {"total": len(flashcards), "by_subject": {}},
        "mistakes": {"total": len(mistakes), "by_category": {}},
        "tasks": {"total": len(tasks), "completed": len([t for t in tasks if t.status == "completed"]), "pending": len([t for t in tasks if t.status != "completed"])},
        "submissions": {"total": len(submissions), "by_type": {}},
    }

@app.get("/api/admin/db")
async def get_db_info(db=Depends(get_db)):
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    return {
        "tables": ["flashcards", "mistake_records", "schedule_tasks", "submissions", "error_logs", "chat_messages"],
        "counts": {
            "flashcards": db.query(Flashcard).count(),
            "mistakes": db.query(MistakeRecord).count(),
            "tasks": db.query(ScheduleTask).count(),
            "submissions": db.query(Submission).count(),
            "errors": db.query(ErrorLog).count(),
        }
    }

@app.post("/api/admin/db/clear")
async def clear_db(table: str, db=Depends(get_db)):
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    model_map = {"flashcards": Flashcard, "mistakes": MistakeRecord, "tasks": ScheduleTask, "submissions": Submission, "errors": ErrorLog}
    if table not in model_map:
        raise HTTPException(status_code=400, detail="Invalid table name")
    count = db.query(model_map[table]).count()
    db.query(model_map[table]).delete()
    db.commit()
    return {"success": True, "deleted": count, "table": table}

@app.get("/api/admin/config")
async def get_config():
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    return {
        "model": settings.MODEL_NAME,
        "temperature": settings.TEMPERATURE,
        "max_tokens": settings.MAX_TOKENS,
        "daily_limit": settings.DAILY_LIMIT,
        "cors_origins": settings.CORS_ORIGINS,
    }

@app.post("/api/admin/config")
async def update_config(key: str, value: str):
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    if hasattr(settings, key):
        setattr(settings, key, type(getattr(settings, key))(value))
        return {"success": True, "message": f"{key}を{value}に更新しました"}
    return {"success": False, "message": "無効な設定キーです"}

@app.get("/api/admin/export")
async def export_data(db=Depends(get_db)):
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    return {
        "flashcards": [fc.to_dict() for fc in db.query(Flashcard).all()],
        "mistakes": [m.to_dict() for m in db.query(MistakeRecord).all()],
        "tasks": [t.to_dict() for t in db.query(ScheduleTask).all()],
        "submissions": [s.to_dict() for s in db.query(Submission).all()],
    }

@app.post("/api/admin/backup")
async def create_backup():
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    import shutil
    import time
    backup_name = f"backup_{int(time.time())}.db"
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    if os.path.exists(db_path):
        shutil.copy2(db_path, f"backups/{backup_name}")
        return {"success": True, "backup": backup_name}
    return {"success": False, "message": "データベースファイルが見つかりません"}

@app.post("/api/admin/guest/generate")
async def generate_guest_code():
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    return admin_mode.guest_access.generate_code()

@app.get("/api/admin/guest/list")
async def list_guest_codes():
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    return {"codes": admin_mode.guest_access.get_active_codes()}

@app.post("/api/admin/guest/revoke")
async def revoke_guest_code(code: str):
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    success = admin_mode.guest_access.revoke_code(code)
    return {"success": success, "message": "ブロックしました" if success else "コードが見つかりません"}

@app.post("/api/guest/validate")
async def validate_guest_code(code: str):
    return admin_mode.guest_access.validate_code(code)

@app.get("/api/guest/dice")
async def guest_dice(code: str):
    validation = admin_mode.guest_access.validate_code(code)
    if not validation["valid"]:
        raise HTTPException(status_code=403, detail=validation["message"])
    import random
    dice = random.randint(1, 6)
    return {"dice": dice, "remaining": validation["remaining"]}

@app.get("/api/admin/performance")
async def get_performance():
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    import psutil
    try:
        cpu = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory().percent
        disk = psutil.disk_usage('/').percent
    except:
        cpu, memory, disk = 0, 0, 0
    return {
        "cpu": cpu, "memory": memory, "disk": disk,
        "repair_history": admin_mode.repair_engine.repair_history[-10:],
        "security_events": len(SecurityGuard.get_security_log(100)),
    }

@app.get("/api/admin/logs")
async def get_logs(limit: int = 100):
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    logs = SecurityGuard.get_security_log(limit)
    return {"logs": logs, "total": len(logs)}

@app.get("/api/admin/system_status")
async def get_system_status():
    if not admin_mode.authenticated:
        raise HTTPException(status_code=403, detail="管理者モードに認証してください")
    return admin_mode.get_status()

@app.get("/api/system_status", response_model=SystemStatus)
async def system_status():
    error_logs = _get_error_logs(db)
    return SystemStatus(
        status="running",
        uptime_seconds=0,
        error_count=len(error_logs),
        self_repairs_performed=len(admin_mode.repair_engine.repair_history),
        last_diagnosis=None,
        known_issues=[e["message"] for e in error_logs if not e["self_repaired"]],
        components={},
    )

def _get_pending_tasks(db):
    tasks = db.query(ScheduleTask).filter(ScheduleTask.status != "completed").all()
    return [t.to_dict() for t in tasks]

def _get_recent_mistakes(db, limit=10):
    mistakes = db.query(MistakeRecord).order_by(MistakeRecord.created_at.desc()).limit(limit).all()
    return [m.to_dict() for m in mistakes]

def _get_submissions(db):
    submissions = db.query(Submission).all()
    return [s.to_dict() for s in submissions]

def _get_schedule(db):
    tasks = db.query(ScheduleTask).all()
    return {"tasks": [t.to_dict() for t in tasks]}

def _get_error_logs(db):
    errors = db.query(ErrorLog).all()
    return [{"timestamp": e.timestamp.isoformat(), "error_type": e.error_type, "message": e.message, "self_repaired": e.self_repaired} for e in errors]

def _save_flashcards_from_chat(response: ChatResponse, db):
    pass

def _save_mistake_analysis(response: ChatResponse, db):
    pass

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    if full_path.startswith("api/"):
        return {"message": "StudyAutonomous AI API", "version": "1.0.0", "status": "running"}
    for d in [FRONTEND_DIR, os.path.join(os.getcwd(), "backend", "static"), os.path.join(os.getcwd(), "static")]:
        file_path = os.path.join(d, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
    for d in [FRONTEND_DIR, os.path.join(os.getcwd(), "backend", "static"), os.path.join(os.getcwd(), "static")]:
        index_path = os.path.join(d, "index.html")
        if os.path.isfile(index_path):
            return FileResponse(index_path)
    return {"message": "StudyAutonomous AI API", "version": "1.0.0", "status": "running"}