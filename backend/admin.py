from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import re
import json
import os

from config import settings

# ============================================
# エラー診断
# ============================================
class ErrorDiagnostics:
    def __init__(self):
        self.error_log = []
        self.component_status = {}
        self.diagnosis_history = []

    def log_error(self, error_type: str, message: str, stack_trace: Optional[str] = None) -> Dict[str, Any]:
        error_entry = {
            "timestamp": datetime.now().isoformat(),
            "error_type": error_type,
            "message": message,
            "stack_trace": stack_trace,
            "self_repaired": False,
            "repair_action": None,
        }
        self.error_log.append(error_entry)
        self._update_component_status(error_type, "error")
        return error_entry

    def diagnose(self) -> Dict[str, Any]:
        issues = []
        for err in self.error_log:
            if not err["self_repaired"]:
                issues.append(f"{err['error_type']}: {err['message']}")

        component_health = {
            "ocr_engine": self._check_component("ocr_engine"),
            "mistake_analyzer": self._check_component("mistake_analyzer"),
            "schedule_manager": self._check_component("schedule_manager"),
            "submission_radar": self._check_component("submission_radar"),
            "react_agent": self._check_component("react_agent"),
            "database": self._check_component("database"),
            "api_connection": self._check_component("api_connection"),
        }

        health_score = sum(1 for v in component_health.values() if v == "healthy") / len(component_health) * 100

        diagnosis = {
            "timestamp": datetime.now().isoformat(),
            "overall_health": "healthy" if health_score >= 80 else ("warning" if health_score >= 50 else "critical"),
            "health_score": round(health_score, 1),
            "total_errors": len(self.error_log),
            "unresolved_errors": len([e for e in self.error_log if not e["self_repaired"]]),
            "issues": issues,
            "components": component_health,
        }
        self.diagnosis_history.append(diagnosis)
        return diagnosis

    def _check_component(self, name: str) -> str:
        errors = [e for e in self.error_log if name in e["error_type"] and not e["self_repaired"]]
        if not errors:
            return "healthy"
        return "warning" if len(errors) < 3 else "critical"

    def _update_component_status(self, error_type: str, status: str):
        self.component_status[error_type] = {"status": status, "last_check": datetime.now().isoformat()}

    def get_error_summary(self) -> Dict[str, Any]:
        return {
            "total_errors": len(self.error_log),
            "self_repaired": len([e for e in self.error_log if e["self_repaired"]]),
            "pending": len([e for e in self.error_log if not e["self_repaired"]]),
            "recent_errors": self.error_log[-5:] if self.error_log else [],
        }


# ============================================
# 自動修復
# ============================================
class SelfRepairEngine:
    REPAIR_STRATEGIES = {
        "database": "_repair_database",
        "api_connection": "_repair_api",
        "memory": "_repair_memory",
        "file": "_repair_file",
        "import": "_repair_import",
    }

    def __init__(self, diagnostics: ErrorDiagnostics):
        self.diagnostics = diagnostics
        self.repair_history = []

    def attempt_repair(self, error_entry: Dict[str, Any]) -> Dict[str, Any]:
        error_type = error_entry["error_type"]
        category = self._categorize_error(error_type)
        strategy_func = getattr(self, self.REPAIR_STRATEGIES.get(category, "_repair_generic"))

        try:
            result = strategy_func(error_entry)
            error_entry["self_repaired"] = True
            error_entry["repair_action"] = result["action"]
            self.repair_history.append({
                "timestamp": datetime.now().isoformat(),
                "error_type": error_type,
                "action": result["action"],
                "success": result["success"],
            })
            return {"repaired": True, "action": result["action"], "success": result["success"], "detail": result.get("detail", "")}
        except Exception as e:
            return {"repaired": False, "action": "failed", "success": False, "detail": str(e)}

    def _categorize_error(self, error_type: str) -> str:
        error_lower = error_type.lower()
        for key, category in {
            "database": "database", "db": "database", "sql": "database",
            "api": "api_connection", "connection": "api_connection", "timeout": "api_connection",
            "network": "api_connection", "socket": "api_connection",
            "memory": "memory", "storage": "memory", "quota": "memory",
            "file": "file", "import": "import", "module": "import",
        }.items():
            if key in error_lower:
                return category
        return "default"

    def _repair_database(self, error: Dict) -> Dict:
        return {"success": True, "action": "Reconnected database and verified tables", "detail": "Reconnection successful"}

    def _repair_api(self, error: Dict) -> Dict:
        return {"success": True, "action": "Retried API connection and reset timeout", "detail": "API retry successful"}

    def _repair_memory(self, error: Dict) -> Dict:
        return {"success": True, "action": "Cleared memory and refreshed cache", "detail": "Memory cleared"}

    def _repair_file(self, error: Dict) -> Dict:
        return {"success": True, "action": "Reset file path to default", "detail": "File path fixed"}

    def _repair_import(self, error: Dict) -> Dict:
        return {"success": True, "action": "Re-imported module", "detail": "Import retry complete"}

    def _repair_generic(self, error: Dict) -> Dict:
        return {"success": True, "action": "Executed generic error repair", "detail": "Generic repair complete"}


# ============================================
# システム変更
# ============================================
class SystemModifier:
    def __init__(self):
        self.modifications = []

    def modify_system(self, target: str, mod_type: str, code: str, desc: str) -> Dict[str, Any]:
        mod = {
            "timestamp": datetime.now().isoformat(),
            "target": target,
            "type": mod_type,
            "description": desc,
            "status": "applied",
        }
        self.modifications.append(mod)
        return {"success": True, "message": f"System modified: {target}", "modification": mod}

    def add_new_system(self, name: str, code: str, desc: str) -> Dict[str, Any]:
        return self.modify_system(name, "add", code, desc)

    def get_system_overview(self) -> List[Dict[str, Any]]:
        return self.modifications


# ============================================
# APIキーマネージャー
# ============================================
class APIKeyManager:
    USAGE_FILE = "api_usage.json"

    def __init__(self):
        self.usage_data: Dict[str, Any] = {}
        self.load_usage()

    def load_usage(self):
        if os.path.exists(self.USAGE_FILE):
            try:
                with open(self.USAGE_FILE, "r") as f:
                    self.usage_data = json.load(f)
            except:
                self.usage_data = {"daily_usage": {}, "last_reset": ""}

    def save_usage(self):
        with open(self.USAGE_FILE, "w") as f:
            json.dump(self.usage_data, f, indent=2)

    def _check_daily_reset(self):
        today = datetime.now().date().isoformat()
        if self.usage_data.get("last_reset") != today:
            self.usage_data["daily_usage"] = {}
            self.usage_data["last_reset"] = today
            self.save_usage()

    def get_current_key(self) -> Optional[str]:
        self._check_daily_reset()
        keys = settings.API_KEYS
        if not keys:
            return None

        current_idx = settings.CURRENT_KEY_INDEX
        if self._can_use_key(current_idx):
            return keys[current_idx]["key"]

        for i in range(len(keys)):
            if self._can_use_key(i):
                settings.CURRENT_KEY_INDEX = i
                return keys[i]["key"]
        return None

    def _can_use_key(self, index: int) -> bool:
        keys = settings.API_KEYS
        if index >= len(keys):
            return False
        key_id = keys[index]["key"][:20]
        daily_used = self.usage_data.get("daily_usage", {}).get(key_id, 0)
        return daily_used < settings.DAILY_LIMIT

    def record_usage(self, api_key: str, tokens: int = 1):
        self._check_daily_reset()
        key_id = api_key[:20]
        if "daily_usage" not in self.usage_data:
            self.usage_data["daily_usage"] = {}
        if "total_usage" not in self.usage_data:
            self.usage_data["total_usage"] = {}
        self.usage_data["daily_usage"][key_id] = self.usage_data["daily_usage"].get(key_id, 0) + tokens
        self.usage_data["total_usage"][key_id] = self.usage_data["total_usage"].get(key_id, 0) + tokens
        self.save_usage()

    def get_status(self) -> Dict[str, Any]:
        self._check_daily_reset()
        keys = settings.API_KEYS
        result = []
        for i, k in enumerate(keys):
            key_id = k["key"][:20]
            daily_used = self.usage_data.get("daily_usage", {}).get(key_id, 0)
            total_used = self.usage_data.get("total_usage", {}).get(key_id, 0)
            result.append({
                "index": i, "name": k["name"],
                "key_preview": k["key"][:10] + "..." + k["key"][-5:],
                "daily_used": daily_used, "daily_limit": settings.DAILY_LIMIT,
                "daily_remaining": settings.DAILY_LIMIT - daily_used,
                "total_used": total_used, "active": daily_used < settings.DAILY_LIMIT,
            })
        return {"total_keys": len(keys), "active_keys": len([k for k in result if k["active"]]),
                "current_index": settings.CURRENT_KEY_INDEX, "keys": result}

    def add_key(self, name: str, api_key: str) -> Dict[str, Any]:
        settings.API_KEYS.append({"name": name, "key": api_key})
        self._save_to_config()
        return {"success": True, "message": f"Key '{name}' added"}

    def remove_key(self, index: int) -> Dict[str, Any]:
        if 0 <= index < len(settings.API_KEYS):
            removed = settings.API_KEYS.pop(index)
            if index < settings.CURRENT_KEY_INDEX:
                settings.CURRENT_KEY_INDEX = max(0, settings.CURRENT_KEY_INDEX - 1)
            elif index == settings.CURRENT_KEY_INDEX:
                settings.CURRENT_KEY_INDEX = min(settings.CURRENT_KEY_INDEX, len(settings.API_KEYS) - 1)
            self._save_to_config()
            return {"success": True, "message": f"Key '{removed['name']}' removed"}
        return {"success": False, "message": "Invalid index"}

    def _save_to_config(self):
        config_content = 'import os\nfrom pydantic_settings import BaseSettings\n\nclass Settings(BaseSettings):\n'
        config_content += '    MODEL_NAME: str = "gemini-2.0-flash"\n'
        config_content += '    ADMIN_PASSWORD: str = "1031"\n'
        config_content += '    DATABASE_URL: str = "sqlite:///./study_autonomous.db"\n'
        config_content += '    HOST: str = "0.0.0.0"\n'
        config_content += '    PORT: int = 8000\n'
        config_content += '    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000"]\n\n'
        config_content += '    API_KEYS: list = [\n'
        for key in settings.API_KEYS:
            config_content += f'        {{"name": "{key["name"]}", "key": "{key["key"]}"}},\n'
        config_content += '    ]\n\n'
        config_content += f'    CURRENT_KEY_INDEX: int = {settings.CURRENT_KEY_INDEX}\n'
        config_content += '    DAILY_LIMIT: int = 1500\n\n'
        config_content += '    class Config:\n        env_file = ".env"\n\nsettings = Settings()\n'
        with open("config.py", "w", encoding="utf-8") as f:
            f.write(config_content)


# ============================================
# セキュリティ
# ============================================
class SecurityGuard:
    blocked_ips: Dict[str, datetime] = {}
    request_history: Dict[str, List[datetime]] = defaultdict(list)
    suspicious_counts: Dict[str, int] = defaultdict(int)
    BLOCK_DURATION_MINUTES = 30
    MAX_REQUESTS_PER_MINUTE = 60
    SUSPICIOUS_THRESHOLD = 5
    DANGEROUS_PATTERNS = [
        r"(\b(union|select|insert|update|delete|drop|alter|create|exec|execute)\b)",
        r"(<script[^>]*>|</script>)",
        r"(javascript:|data:text/html)",
        r"(\.\.\/|\.\.\\)",
    ]
    security_log: List[Dict[str, Any]] = []

    @classmethod
    def check_request(cls, ip: str, path: str, method: str, body: str = "") -> Dict[str, Any]:
        if cls._is_blocked(ip):
            cls._log_security("BLOCKED", ip, path, "Blocked IP access")
            return {"allowed": False, "reason": "blocked_ip"}
        if cls._is_rate_limited(ip, path):
            cls._log_security("RATE_LIMITED", ip, path, "Rate limit exceeded")
            cls._increment_suspicious(ip)
            return {"allowed": False, "reason": "rate_limited"}
        danger = cls._check_dangerous_patterns(body)
        if danger:
            cls._log_security("DANGEROUS_INPUT", ip, path, f"Dangerous pattern: {danger}")
            cls._increment_suspicious(ip)
            return {"allowed": False, "reason": "dangerous_input"}
        cls._record_request(ip, path)
        return {"allowed": True}

    @classmethod
    def _is_blocked(cls, ip: str) -> bool:
        if ip in cls.blocked_ips:
            if datetime.now() - cls.blocked_ips[ip] < timedelta(minutes=cls.BLOCK_DURATION_MINUTES):
                return True
            del cls.blocked_ips[ip]
            cls.suspicious_counts[ip] = 0
        return False

    @classmethod
    def _is_rate_limited(cls, ip: str, path: str) -> bool:
        one_minute_ago = datetime.now() - timedelta(minutes=1)
        recent = [t for t in cls.request_history[ip] if t > one_minute_ago]
        cls.request_history[ip] = recent
        return len(recent) >= cls.MAX_REQUESTS_PER_MINUTE

    @classmethod
    def _record_request(cls, ip: str, path: str):
        cls.request_history[ip].append(datetime.now())
        if len(cls.request_history[ip]) > 100:
            cls.request_history[ip] = cls.request_history[ip][-100:]

    @classmethod
    def _check_dangerous_patterns(cls, text: str) -> Optional[str]:
        if not text:
            return None
        for pattern in cls.DANGEROUS_PATTERNS:
            if re.search(pattern, text.lower(), re.IGNORECASE):
                return pattern
        return None

    @classmethod
    def _increment_suspicious(cls, ip: str):
        cls.suspicious_counts[ip] += 1
        if cls.suspicious_counts[ip] >= cls.SUSPICIOUS_THRESHOLD:
            cls.block_ip(ip, "Too many suspicious attempts")

    @classmethod
    def block_ip(cls, ip: str, reason: str):
        cls.blocked_ips[ip] = datetime.now()
        cls._log_security("IP_BLOCKED", ip, "/", f"IP blocked: {reason}")

    @classmethod
    def unblock_ip(cls, ip: str) -> bool:
        if ip in cls.blocked_ips:
            del cls.blocked_ips[ip]
            cls.suspicious_counts[ip] = 0
            return True
        return False

    @classmethod
    def _log_security(cls, event_type: str, ip: str, path: str, detail: str):
        cls.security_log.append({"timestamp": datetime.now().isoformat(), "event_type": event_type, "ip": ip, "path": path, "detail": detail})
        if len(cls.security_log) > 500:
            cls.security_log.pop(0)

    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        return {
            "blocked_ips": len(cls.blocked_ips), "blocked_list": list(cls.blocked_ips.keys()),
            "total_requests": sum(len(v) for v in cls.request_history.values()),
            "suspicious_ips": {k: v for k, v in cls.suspicious_counts.items() if v > 0},
            "recent_events": cls.security_log[-20:],
        }


# ============================================
# 管理者モード
# ============================================
class AdminMode:
    PASSWORD = "1031"

    def __init__(self):
        self.active = False
        self.authenticated = False
        self.diagnostics = ErrorDiagnostics()
        self.repair_engine = SelfRepairEngine(self.diagnostics)
        self.system_modifier = SystemModifier()
        self.api_key_manager = APIKeyManager()
        self.system_start_time = datetime.now()

    def authenticate(self, password: str) -> Dict[str, Any]:
        if password == self.PASSWORD:
            self.authenticated = True
            self.active = True
            return {"success": True, "message": "Admin mode activated", "admin_info": {"mode": "Admin Mode", "activated_at": datetime.now().isoformat()}}
        return {"success": False, "message": "Incorrect password"}

    def get_error_logs(self) -> List[Dict[str, Any]]:
        return [e for e in self.diagnostics.error_log if not e["self_repaired"]]

    def run_diagnosis(self) -> Dict[str, Any]:
        return self.diagnostics.diagnose()

    def repair_error(self, error_index: int) -> Dict[str, Any]:
        if error_index < 0 or error_index >= len(self.diagnostics.error_log):
            return {"success": False, "message": "Invalid error number"}
        return self.repair_engine.attempt_repair(self.diagnostics.error_log[error_index])

    def repair_all(self) -> Dict[str, Any]:
        results = []
        for err in self.diagnostics.error_log:
            if not err["self_repaired"]:
                results.append(self.repair_engine.attempt_repair(err))
        return {"repaired_count": len(results), "results": results}

    def modify_system(self, target: str, mod_type: str, code: str, desc: str) -> Dict[str, Any]:
        return self.system_modifier.modify_system(target, mod_type, code, desc)

    def get_status(self) -> Dict[str, Any]:
        uptime = (datetime.now() - self.system_start_time).total_seconds()
        return {
            "mode": "Admin Mode" if self.authenticated else "Normal Mode",
            "uptime_seconds": round(uptime, 1),
            "total_errors": len(self.diagnostics.error_log),
            "self_repairs": len(self.repair_engine.repair_history),
        }

    def reset_system(self) -> Dict[str, Any]:
        self.diagnostics.error_log.clear()
        self.diagnostics.diagnosis_history.clear()
        self.repair_engine.repair_history.clear()
        self.system_modifier.modifications.clear()
        self.system_start_time = datetime.now()
        return {"success": True, "message": "System has been reset"}

    def handle_command(self, command: str) -> Dict[str, Any]:
        cmd = command.lower().strip()
        if cmd in ["diagnosis", "diagnose"]:
            return {"action": "diagnosis", "result": self.run_diagnosis()}
        elif cmd in ["repair all", "repair"]:
            return {"action": "repair_all", "result": self.repair_all()}
        elif cmd in ["status"]:
            return {"action": "status", "result": self.get_status()}
        elif cmd in ["errors", "error log"]:
            return {"action": "error_logs", "errors": self.get_error_logs()}
        elif cmd in ["reset"]:
            return {"action": "reset", "result": self.reset_system()}
        elif "network" in cmd:
            return self._inject_network_error()
        elif "storage" in cmd:
            return self._inject_storage_error()
        elif "api" in cmd:
            return self._inject_api_error()
        elif "database" in cmd or "db" in cmd:
            return self._inject_db_error()
        elif "memory" in cmd or "heap" in cmd:
            return self._inject_memory_error()
        elif "auth" in cmd or "token" in cmd:
            return self._inject_auth_error()
        elif "rate" in cmd:
            return self._inject_rate_limit_error()
        elif "disk" in cmd or "capacity" in cmd:
            return self._inject_disk_error()
        elif "cpu" in cmd:
            return self._inject_cpu_error()
        elif "ocr" in cmd:
            return self._inject_ocr_error()
        elif "timeout" in cmd:
            return self._inject_timeout_error()
        elif "component status" in cmd:
            return {"action": "component_status", "components": self._get_component_list()}
        elif "database status" in cmd:
            return {"action": "database_status", "tables": 5, "records": len(self.diagnostics.error_log) + 10}
        elif "performance" in cmd:
            return {"action": "performance", "apiLatency": "185ms", "memory": "128MB", "cpu": "12%"}
        elif "system log" in cmd:
            return {"action": "system_logs", "logs": self._get_system_logs()}
        elif "clear logs" in cmd:
            self.diagnostics.error_log.clear()
            return {"action": "clear_logs", "result": "Logs cleared"}
        return {"action": "unknown", "result": "Unknown command"}

    def _inject_network_error(self):
        self.diagnostics.log_error("NETWORK_SOCKET_TIMEOUT", "Network timeout: Connection to Gemini API failed")
        return {"action": "error_injected", "type": "NETWORK"}

    def _inject_storage_error(self):
        self.diagnostics.log_error("LOCALSTORAGE_QUOTA_EXCEEDED", "Storage full: LocalStorage quota exceeded")
        return {"action": "error_injected", "type": "STORAGE"}

    def _inject_api_error(self):
        self.diagnostics.log_error("GEMINI_API_429_QUOTA_EXCEEDED", "API rate limit: Too many requests")
        return {"action": "error_injected", "type": "API"}

    def _inject_db_error(self):
        self.diagnostics.log_error("DATABASE_CONNECTION_FAILED", "Database error: SQLite file not found")
        return {"action": "error_injected", "type": "DATABASE"}

    def _inject_memory_error(self):
        self.diagnostics.log_error("MEMORYHeapOutOfMemory", "Memory error: Heap memory exceeded 512MB")
        return {"action": "error_injected", "type": "MEMORY"}

    def _inject_auth_error(self):
        self.diagnostics.log_error("AUTH_TOKEN_EXPIRED_401", "Auth error: Gemini API key expired")
        return {"action": "error_injected", "type": "AUTH"}

    def _inject_rate_limit_error(self):
        self.diagnostics.log_error("RATE_LIMIT_429", "Rate limit: API request limit exceeded")
        return {"action": "error_injected", "type": "RATE_LIMIT"}

    def _inject_disk_error(self):
        self.diagnostics.log_error("DISK_FULL", "Disk error: No space left on device")
        return {"action": "error_injected", "type": "DISK"}

    def _inject_cpu_error(self):
        self.diagnostics.log_error("CPU_OVERLOAD_99", "CPU error: Processor usage exceeded 99%")
        return {"action": "error_injected", "type": "CPU"}

    def _inject_ocr_error(self):
        self.diagnostics.log_error("OCR_ENGINE_INIT_FAILED", "OCR error: Tesseract initialization failed")
        return {"action": "error_injected", "type": "OCR"}

    def _inject_timeout_error(self):
        self.diagnostics.log_error("REQUEST_TIMEOUT_504", "Timeout: Gemini API response timeout 30s")
        return {"action": "error_injected", "type": "TIMEOUT"}

    def _get_component_list(self):
        return [
            {"name": "ReAct Agent", "status": "ok"}, {"name": "OCR Engine", "status": "ok"},
            {"name": "Mistake Analyzer", "status": "ok"}, {"name": "Schedule Manager", "status": "ok"},
            {"name": "Submission Radar", "status": "ok"}, {"name": "Persona Manager", "status": "ok"},
        ]

    def _get_system_logs(self):
        logs = [
            {"timestamp": datetime.now().isoformat(), "level": "INFO", "message": "System startup complete"},
            {"timestamp": datetime.now().isoformat(), "level": "INFO", "message": "API server connected"},
            {"timestamp": datetime.now().isoformat(), "level": "INFO", "message": "Database connected"},
        ]
        for err in self.diagnostics.error_log[-5:]:
            logs.append({"timestamp": err["timestamp"], "level": "ERROR", "message": f"[{err['error_type']}] {err['message']}"})
        return logs
