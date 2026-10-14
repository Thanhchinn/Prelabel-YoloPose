import os
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv

# Load .env từ thư mục gốc dự án
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# Thư mục lưu trữ
UPLOAD_DIR = BASE_DIR / "data" / "uploads"
OUTPUT_DIR = BASE_DIR / "data" / "outputs"
DATASET_DIR = BASE_DIR / "data" / "datasets"
WEIGHTS_DIR = BASE_DIR / "backend" / "weights"
ARCHIVE_DIR = BASE_DIR / "data" / "archives"

# Đảm bảo các thư mục tồn tại
for d in [UPLOAD_DIR, OUTPUT_DIR, DATASET_DIR, WEIGHTS_DIR, ARCHIVE_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# Cấu hình Server
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# Cấu hình CVAT Local
CVAT_HOST = os.getenv("CVAT_HOST", "http://localhost:8080").rstrip("/")
CVAT_USER = os.getenv("CVAT_USER", "admin")
CVAT_PASS = os.getenv("CVAT_PASS", "admin12345")

def update_cvat_env(host: str, username: str, password: Optional[str] = None):
    """Cập nhật biến cấu hình CVAT runtime và ghi đè vào file .env để lưu vĩnh viễn."""
    global CVAT_HOST, CVAT_USER, CVAT_PASS
    CVAT_HOST = host.rstrip("/")
    CVAT_USER = username
    if password is not None:
        CVAT_PASS = password

    os.environ["CVAT_HOST"] = CVAT_HOST
    os.environ["CVAT_USER"] = CVAT_USER
    if password is not None:
        os.environ["CVAT_PASS"] = CVAT_PASS

    env_file = BASE_DIR / ".env"
    lines = []
    found_host = False
    found_user = False
    found_pass = False

    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("CVAT_HOST="):
                    lines.append(f"CVAT_HOST={CVAT_HOST}\n")
                    found_host = True
                elif line.startswith("CVAT_USER="):
                    lines.append(f"CVAT_USER={CVAT_USER}\n")
                    found_user = True
                elif line.startswith("CVAT_PASS="):
                    if password is not None:
                        lines.append(f"CVAT_PASS={CVAT_PASS}\n")
                    else:
                        lines.append(line)
                    found_pass = True
                else:
                    lines.append(line)

    if not found_host:
        lines.append(f"CVAT_HOST={CVAT_HOST}\n")
    if not found_user:
        lines.append(f"CVAT_USER={CVAT_USER}\n")
    if not found_pass and password is not None:
        lines.append(f"CVAT_PASS={CVAT_PASS}\n")

    try:
        with open(env_file, "w", encoding="utf-8") as f:
            f.writelines(lines)
    except Exception as e:
        print(f"[Config] Failed to persist .env: {e}")

# Cấu hình Model YOLO 26 Pose
raw_weights = os.getenv("MODEL_WEIGHTS_PATH", "backend/weights/yolo26-pose.pt")
weights_candidate = Path(raw_weights)
if not weights_candidate.is_absolute():
    if (BASE_DIR / weights_candidate).exists():
        MODEL_WEIGHTS_PATH = str((BASE_DIR / weights_candidate).resolve())
    elif (WEIGHTS_DIR / weights_candidate.name).exists():
        MODEL_WEIGHTS_PATH = str((WEIGHTS_DIR / weights_candidate.name).resolve())
    elif (BASE_DIR / "yolo11n-pose.pt").exists():
        MODEL_WEIGHTS_PATH = str((BASE_DIR / "yolo11n-pose.pt").resolve())
    else:
        MODEL_WEIGHTS_PATH = str((BASE_DIR / weights_candidate).resolve())
else:
    MODEL_WEIGHTS_PATH = str(weights_candidate.resolve())

CONF_THRESHOLD = float(os.getenv("CONF_THRESHOLD", "0.5"))
KPT_CONF_THRESHOLD = float(os.getenv("KPT_CONF_THRESHOLD", "0.5"))

# Chuẩn 17 Keypoints COCO
COCO_KEYPOINTS = [
    "nose",            # 0
    "left_eye",        # 1
    "right_eye",       # 2
    "left_ear",        # 3
    "right_ear",       # 4
    "left_shoulder",   # 5
    "right_shoulder",  # 6
    "left_elbow",      # 7
    "right_elbow",     # 8
    "left_wrist",      # 9
    "right_wrist",     # 10
    "left_hip",        # 11
    "right_hip",       # 12
    "left_knee",       # 13
    "right_knee",      # 14
    "left_ankle",      # 15
    "right_ankle"      # 16
]

# Các đường nối xương (Skeleton Bones) theo chuẩn COCO (cặp index 0-16)
COCO_SKELETON_EDGES = [
    [0, 1], [0, 2], [1, 3], [2, 4],            # Mặt
    [5, 6],                                    # Nối 2 vai
    [5, 7], [7, 9],                            # Cánh tay trái
    [6, 8], [8, 10],                           # Cánh tay phải
    [5, 11], [6, 12],                          # Thân trên (vai -> hông)
    [11, 12],                                  # Nối 2 hông
    [11, 13], [13, 15],                        # Chân trái
    [12, 14], [14, 16]                         # Chân phải
]
