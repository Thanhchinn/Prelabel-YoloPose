import os
import sys
import shutil
import random
from pathlib import Path

# Đảm bảo thư mục backend nằm trong sys.path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from typing import Dict, Any, Optional
import argparse

from config import DATASET_DIR, UPLOAD_DIR, WEIGHTS_DIR, COCO_KEYPOINTS
from converter import AnnotationConverter
from cvat_client import cvat_client

def create_yolo_pose_yaml(dataset_root: Path, yaml_path: Path):
    """Tạo file cấu hình data.yaml chuẩn YOLO Pose 17 keypoints."""
    # flip_idx theo COCO: khi flip ảnh ngang, khớp trái và phải đổi chỗ cho nhau
    # [0, 2, 1, 4, 3, 6, 5, 8, 7, 10, 9, 12, 11, 14, 13, 16, 15]
    yaml_content = f"""# YOLO 26 Pose Dataset Configuration (Auto-generated from CVAT Ground Truth)
path: {dataset_root.as_posix()}
train: images/train
val: images/val

# Classes
names:
  0: person

# Keypoints: 17 điểm, 3 chiều (x, y, visibility)
kpt_shape: [17, 3]
flip_idx: [0, 2, 1, 4, 3, 6, 5, 8, 7, 10, 9, 12, 11, 14, 13, 16, 15]
"""
    with open(yaml_path, "w", encoding="utf-8") as f:
        f.write(yaml_content)

def export_dataset_from_cvat(
    task_id: int,
    dataset_name: str = "yolo26_dataset",
    val_ratio: float = 0.2
) -> Dict[str, Any]:
    """
    Kéo Ground Truth từ Task CVAT về và tổ chức thành thư mục huấn luyện YOLO Pose.
    """
    dataset_root = DATASET_DIR / dataset_name
    img_train_dir = dataset_root / "images" / "train"
    img_val_dir = dataset_root / "images" / "val"
    lbl_train_dir = dataset_root / "labels" / "train"
    lbl_val_dir = dataset_root / "labels" / "val"

    for d in [img_train_dir, img_val_dir, lbl_train_dir, lbl_val_dir]:
        d.mkdir(parents=True, exist_ok=True)

    # Lấy danh sách ảnh từ data/uploads
    uploaded_images = list(UPLOAD_DIR.glob("*.*"))
    valid_images = [img for img in uploaded_images if img.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]]

    if not valid_images:
        return {"success": False, "message": "Không tìm thấy ảnh trong thư mục data/uploads."}

    random.seed(42)
    random.shuffle(valid_images)

    split_idx = int(len(valid_images) * (1 - val_ratio))
    train_imgs = valid_images[:split_idx]
    val_imgs = valid_images[split_idx:]

    # Đọc nhãn ground truth hoặc nhãn output đã cache
    from model_service import model_service
    from schemas import PersonPose, KeypointItem

    train_count = 0
    val_count = 0

    for split_type, img_list in [("train", train_imgs), ("val", val_imgs)]:
        target_img_dir = img_train_dir if split_type == "train" else img_val_dir
        target_lbl_dir = lbl_train_dir if split_type == "train" else lbl_val_dir

        for img_path in img_list:
            # Copy ảnh sang dataset
            shutil.copy2(img_path, target_img_dir / img_path.name)

            # Lấy thông tin pose đã lưu
            pred_res = model_service.predict_single_image(img_path)
            txt_content = AnnotationConverter.to_yolo_pose_txt(
                pred_res.predictions,
                pred_res.width,
                pred_res.height
            )

            # Lưu file label .txt
            label_file = target_lbl_dir / f"{img_path.stem}.txt"
            with open(label_file, "w", encoding="utf-8") as f:
                f.write(txt_content)

            if split_type == "train":
                train_count += 1
            else:
                val_count += 1

    # Tạo data.yaml
    yaml_file = dataset_root / "data.yaml"
    create_yolo_pose_yaml(dataset_root, yaml_file)

    return {
        "success": True,
        "dataset_name": dataset_name,
        "dataset_path": str(dataset_root),
        "yaml_path": str(yaml_file),
        "train_samples": train_count,
        "val_samples": val_count,
        "message": f"Đã xuất thành công dataset {dataset_name} ({train_count} train, {val_count} val)."
    }

def run_retrain(
    yaml_path: str,
    epochs: int = 50,
    batch_size: int = 16,
    img_size: int = 640,
    base_weights: Optional[str] = None
):
    """Thực thi fine-tuning cho model YOLO 26 Pose."""
    print(f"\n[YOLO 26 Retrain] Starting fine-tuning process...")
    print(f" - Config YAML: {yaml_path}")
    print(f" - Epochs: {epochs}")
    print(f" - Batch: {batch_size}")

    weights_file = base_weights or (WEIGHTS_DIR / "yolo26-pose.pt")
    
    try:
        from ultralytics import YOLO
        model = YOLO(str(weights_file))
        results = model.train(
            data=yaml_path,
            epochs=epochs,
            batch=batch_size,
            imgsz=img_size,
            project=str(WEIGHTS_DIR / "runs"),
            name="yolo26_pose_retrained"
        )
        print("[YOLO 26 Retrain] Training complete! Results saved in weights/runs.")
    except Exception as e:
        print(f"[YOLO 26 Retrain] Notice: {e}")
        print("[YOLO 26 Retrain] You can run CLI command:")
        print(f"yolo pose train data={yaml_path} model={weights_file} epochs={epochs}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="YOLO 26 Pose Retraining CLI")
    parser.add_argument("--export-only", action="store_true", help="Chỉ xuất dataset, không chạy train")
    parser.add_argument("--task-id", type=int, default=1, help="ID Task CVAT cần xuất")
    parser.add_argument("--epochs", type=int, default=50, help="Số epochs huấn luyện")
    parser.add_argument("--batch", type=int, default=16, help="Kích thước batch")
    args = parser.parse_args()

    export_res = export_dataset_from_cvat(task_id=args.task_id)
    print(export_res["message"])

    if not args.export_only and export_res["success"]:
        run_retrain(yaml_path=export_res["yaml_path"], epochs=args.epochs, batch_size=args.batch)
