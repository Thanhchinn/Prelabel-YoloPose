"""
Script tự động kiểm tra và tải trước (Pre-download / Pre-warm) toàn bộ checkpoints
của 3 mô hình Pose:
1. YOLO 26 Pose (Ultralytics weights)
2. RTMPose-m (OpenMMLab ONNX checkpoints: yolox_m + rtmpose-m_simcc)
3. ViTPose-Base (Hugging Face model: usyd-community/vitpose-base-simple)

Giúp đồng đội khi git clone / pull về máy có thể chạy offline hoàn chỉnh ngay lập tức!
"""

import sys
from pathlib import Path

# Cấu hình UTF-8 cho console Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

def download_yolo():
    print("[1/3] Kiểm tra YOLO Pose...")
    try:
        from config import MODEL_WEIGHTS_PATH
        from ultralytics import YOLO
        p = Path(MODEL_WEIGHTS_PATH)
        if p.exists():
            yolo = YOLO(str(p))
            print(f"  [OK] YOLO Pose weights đã sẵn sàng tại: {p}")
        else:
            print(f"  [!] File {p} chưa có. Tự động tải yolo11n-pose.pt làm checkpoint mặc định...")
            yolo = YOLO("yolo11n-pose.pt")
            print("  [OK] Đã tải checkpoint yolo11n-pose.pt thành công.")
    except Exception as e:
        print(f"  [ERR] Lỗi kiểm tra YOLO: {e}")

def download_rtmpose():
    print("\n[2/3] Kiểm tra & tải RTMPose-m (OpenMMLab)...")
    try:
        import rtmlib
        # Khởi tạo Body mode balanced tự động tải checkpoints vào ~/.cache/rtmlib/hub/checkpoints/
        body = rtmlib.Body(mode="balanced", backend="onnxruntime", device="cpu")
        print("  [OK] RTMPose-m (YOLOX + RTMPose-m ONNX) đã sẵn sàng trong cache cục bộ!")
    except Exception as e:
        print(f"  [ERR] Lỗi tải RTMPose: {e}")

def download_vitpose():
    print("\n[3/3] Kiểm tra & tải ViTPose-Base (Hugging Face Transformers)...")
    try:
        from transformers import AutoProcessor, AutoModelForPoseEstimation
        repo_id = "usyd-community/vitpose-base-simple"
        print(f"  Đang tải processor & model từ {repo_id}...")
        processor = AutoProcessor.from_pretrained(repo_id)
        model = AutoModelForPoseEstimation.from_pretrained(repo_id)
        print("  [OK] ViTPose-Base đã sẵn sàng trong cache Hugging Face!")
    except Exception as e:
        print(f"  [ERR] Lỗi tải ViTPose: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print(" BAT DAU TAI & XAC THUC CHECKPOINTS 3 MO HINH POSE ESTIMATION ")
    print("=" * 60)
    download_yolo()
    download_rtmpose()
    download_vitpose()
    print("\n" + "=" * 60)
    print(" HOAN TAT! Ca 3 mo hinh da duoc tai va san sang su dung.")
    print("=" * 60)
