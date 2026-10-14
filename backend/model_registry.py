import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional

from config import WEIGHTS_DIR, BASE_DIR

REGISTRY_FILE = WEIGHTS_DIR / "model_registry.json"
CHECKPOINTS_DIR = WEIGHTS_DIR / "checkpoints"

CHECKPOINTS_DIR.mkdir(parents=True, exist_ok=True)
for sub in ["yolo", "rtmpose", "vitpose"]:
    (CHECKPOINTS_DIR / sub).mkdir(parents=True, exist_ok=True)

DEFAULT_REGISTRY: Dict[str, Any] = {
    "yolo": {
        "active_version": "v0_base",
        "total_train_runs": 0,
        "versions": [
            {
                "version": "v0_base",
                "display_name": "YOLO 26 Pose (Gốc Pretrained)",
                "checkpoint": "backend/weights/yolo26-pose.pt",
                "created_at": "2026-10-01T00:00:00",
                "is_baseline": True,
                "epochs": 0,
                "train_samples": 0,
                "val_samples": 0,
                "dataset_sources": ["COCO-Keypoints Baseline"],
                "metrics": {
                    "pck05": 74.2,
                    "pck20": 87.5,
                    "nme": 0.062,
                    "correction_rate": 28.5
                }
            }
        ]
    },
    "rtmpose": {
        "active_version": "v0_base",
        "total_train_runs": 0,
        "versions": [
            {
                "version": "v0_base",
                "display_name": "RTMPose-m (Gốc Balanced ONNX)",
                "checkpoint": "backend/weights/checkpoints/rtmpose/rtmpose-m_simcc-body7.onnx",
                "created_at": "2026-10-01T00:00:00",
                "is_baseline": True,
                "epochs": 0,
                "train_samples": 0,
                "val_samples": 0,
                "dataset_sources": ["OpenMMLab SimCC Baseline"],
                "metrics": {
                    "pck05": 75.8,
                    "pck20": 89.1,
                    "nme": 0.058,
                    "correction_rate": 25.2
                }
            }
        ]
    },
    "vitpose": {
        "active_version": "v0_base",
        "total_train_runs": 0,
        "versions": [
            {
                "version": "v0_base",
                "display_name": "ViTPose-Base (Gốc Transformer)",
                "checkpoint": "usyd-community/vitpose-base-simple",
                "created_at": "2026-10-01T00:00:00",
                "is_baseline": True,
                "epochs": 0,
                "train_samples": 0,
                "val_samples": 0,
                "dataset_sources": ["HuggingFace Baseline"],
                "metrics": {
                    "pck05": 77.4,
                    "pck20": 90.8,
                    "nme": 0.051,
                    "correction_rate": 21.8
                }
            }
        ]
    }
}

def load_registry() -> Dict[str, Any]:
    """Đọc registry file, nếu chưa có thì tạo mới."""
    if not REGISTRY_FILE.exists():
        save_registry(DEFAULT_REGISTRY)
        return DEFAULT_REGISTRY

    try:
        with open(REGISTRY_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Bổ sung các key thiếu nếu có
        for m in ["yolo", "rtmpose", "vitpose"]:
            if m not in data:
                data[m] = DEFAULT_REGISTRY[m]
        return data
    except Exception as e:
        print(f"[ModelRegistry] Error loading registry, using default: {e}")
        return DEFAULT_REGISTRY

def save_registry(data: Dict[str, Any]):
    """Ghi dữ liệu vào registry file."""
    try:
        with open(REGISTRY_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[ModelRegistry] Failed to save registry: {e}")

def get_active_checkpoint(model_type: str) -> Optional[str]:
    """Trả về checkpoint path của version đang active."""
    m_type = (model_type or "yolo").lower().strip()
    reg = load_registry()
    if m_type not in reg:
        return None

    active_v = reg[m_type].get("active_version", "v0_base")
    for v_item in reg[m_type].get("versions", []):
        if v_item["version"] == active_v:
            ckpt = v_item.get("checkpoint")
            return ckpt
    return None

def set_active_version(model_type: str, version_id: str) -> Dict[str, Any]:
    """Chuyển đổi version đang phục vụ trên Studio."""
    m_type = (model_type or "yolo").lower().strip()
    reg = load_registry()
    if m_type not in reg:
        return {"success": False, "message": f"Không tìm thấy model {m_type}"}

    found = any(v["version"] == version_id for v in reg[m_type].get("versions", []))
    if not found:
        return {"success": False, "message": f"Không tìm thấy phiên bản {version_id} trong model {m_type}"}

    reg[m_type]["active_version"] = version_id
    save_registry(reg)

    return {
        "success": True,
        "model_type": m_type,
        "active_version": version_id,
        "message": f"Đã kích hoạt phiên bản {version_id} cho mô hình {m_type.upper()}."
    }

def register_new_version(
    model_type: str,
    checkpoint_rel_path: str,
    epochs: int,
    train_samples: int,
    val_samples: int,
    dataset_sources: List[str],
    metrics_pre: Dict[str, float],
    metrics_post: Dict[str, float],
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Lưu lại một phiên bản model sau khi train hoàn tất (v1, v2, v3...).
    Tự động tăng total_train_runs và đặt làm active_version.
    """
    m_type = (model_type or "yolo").lower().strip()
    reg = load_registry()
    if m_type not in reg:
        reg[m_type] = {"active_version": "v0_base", "total_train_runs": 0, "versions": []}

    total_runs = reg[m_type].get("total_train_runs", 0) + 1
    new_version_id = f"v{total_runs}"
    timestamp = datetime.now().isoformat()

    version_record = {
        "version": new_version_id,
        "display_name": f"{m_type.upper()} Retrained ({new_version_id})",
        "checkpoint": checkpoint_rel_path,
        "parent_version": reg[m_type].get("active_version", "v0_base"),
        "created_at": timestamp,
        "is_baseline": False,
        "epochs": epochs,
        "train_samples": train_samples,
        "val_samples": val_samples,
        "dataset_sources": dataset_sources,
        "metrics_pre": metrics_pre,
        "metrics": metrics_post,
        "delta": {
            "pck05": round(metrics_post.get("pck05", 0) - metrics_pre.get("pck05", 0), 2),
            "pck20": round(metrics_post.get("pck20", 0) - metrics_pre.get("pck20", 0), 2),
            "nme": round(metrics_post.get("nme", 0) - metrics_pre.get("nme", 0), 3),
            "correction_rate": round(metrics_post.get("correction_rate", 0) - metrics_pre.get("correction_rate", 0), 2),
        },
        "notes": notes or f"Huấn luyện thành công {epochs} epochs trên {train_samples} mẫu."
    }

    reg[m_type]["total_train_runs"] = total_runs
    reg[m_type]["active_version"] = new_version_id
    reg[m_type]["versions"].append(version_record)

    save_registry(reg)
    return version_record

if __name__ == "__main__":
    r = load_registry()
    print("Loaded registry:", list(r.keys()))
