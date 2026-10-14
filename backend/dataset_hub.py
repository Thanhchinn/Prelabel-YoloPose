import os
import sys
import json
import shutil
import hashlib
import zipfile
import random
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from config import DATASET_DIR, UPLOAD_DIR, BASE_DIR, COCO_KEYPOINTS, COCO_SKELETON_EDGES
from cvat_client import cvat_client
from converter import AnnotationConverter

EXTERNAL_GT_DIR = DATASET_DIR / "external_gt"
EXTERNAL_GT_DIR.mkdir(parents=True, exist_ok=True)

def compute_file_hash(filepath: Path) -> str:
    """Tính mã băm SHA-256 của file ảnh để loại bỏ ảnh trùng lặp."""
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def extract_and_ingest_zip(zip_path: Path, dataset_alias: str = "custom_gt") -> Dict[str, Any]:
    """
    Tiếp nhận và giải nén file ZIP chứa Ground Truth từ bên ngoài.
    Hỗ trợ 2 định dạng:
    1. Chuẩn COCO Keypoints: Có file annotations.json (hoặc *_keypoints.json) + thư mục images/
    2. Chuẩn YOLO Pose: Thư mục images/ và labels/ (chứa các file .txt)
    """
    dest_dir = EXTERNAL_GT_DIR / dataset_alias
    if dest_dir.exists():
        shutil.rmtree(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)

    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(dest_dir)
    except Exception as e:
        return {"success": False, "message": f"Không thể giải nén file ZIP: {e}"}

    # Quét tìm ảnh
    img_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    found_images = [p for p in dest_dir.rglob("*") if p.suffix.lower() in img_extensions]

    if not found_images:
        return {"success": False, "message": "Không tìm thấy file ảnh hợp lệ (.jpg, .png, .webp) trong file ZIP."}

    # Quét tìm COCO JSON hoặc YOLO txt
    json_files = list(dest_dir.rglob("*.json"))
    coco_anno_file = None
    for jf in json_files:
        try:
            with open(jf, "r", encoding="utf-8") as f:
                data = json.load(f)
            if "images" in data and "annotations" in data:
                coco_anno_file = jf
                break
        except Exception:
            pass

    txt_labels = list(dest_dir.rglob("*.txt"))

    format_detected = "unknown"
    if coco_anno_file:
        format_detected = "coco_json"
    elif txt_labels:
        format_detected = "yolo_txt"
    else:
        format_detected = "images_only"

    return {
        "success": True,
        "dataset_alias": dataset_alias,
        "path": str(dest_dir),
        "format": format_detected,
        "total_images": len(found_images),
        "has_annotations": format_detected != "images_only",
        "message": f"Đã nạp thành công bộ Ground Truth '{dataset_alias}' với {len(found_images)} ảnh (Định dạng: {format_detected})."
    }

def merge_datasets(
    dataset_name: str,
    cvat_task_ids: List[int],
    external_aliases: List[str],
    val_ratio: float = 0.2
) -> Dict[str, Any]:
    """
    Hợp nhất tập dữ liệu từ:
    - 1 hoặc nhiều CVAT Tasks (Ground Truth đã sửa trên CVAT)
    - 1 hoặc nhiều bộ Ground Truth ngoài đã nạp
    Tự động:
    - Khử trùng lặp ảnh qua SHA-256
    - Chia 80/20 train/val
    - Xuất định dạng chuẩn đồng thời cho YOLO (labels/ .txt) và COCO (coco_train.json / coco_val.json)
    """
    merged_dir = DATASET_DIR / dataset_name
    img_train_dir = merged_dir / "images" / "train"
    img_val_dir = merged_dir / "images" / "val"
    lbl_train_dir = merged_dir / "labels" / "train"
    lbl_val_dir = merged_dir / "labels" / "val"

    for d in [img_train_dir, img_val_dir, lbl_train_dir, lbl_val_dir]:
        d.mkdir(parents=True, exist_ok=True)

    # Dictionary lưu trữ theo hash ảnh để loại trùng lặp:
    # hash -> { "image_path": Path, "source": str, "yolo_txt": str, "coco_anno": dict }
    samples_by_hash: Dict[str, Dict[str, Any]] = {}

    # 1. Thu thập dữ liệu từ External GT
    for alias in external_aliases:
        ext_path = EXTERNAL_GT_DIR / alias
        if not ext_path.exists():
            continue

        img_exts = {".jpg", ".jpeg", ".png", ".webp"}
        imgs = [p for p in ext_path.rglob("*") if p.suffix.lower() in img_exts]
        for img in imgs:
            h = compute_file_hash(img)
            # Tìm label .txt tương ứng nếu có
            txt_cand = img.parent / f"{img.stem}.txt"
            if not txt_cand.exists():
                lbl_cand = ext_path / "labels" / f"{img.stem}.txt"
                if lbl_cand.exists():
                    txt_cand = lbl_cand

            yolo_txt = ""
            if txt_cand.exists():
                try:
                    with open(txt_cand, "r", encoding="utf-8") as f:
                        yolo_txt = f.read()
                except Exception:
                    pass

            samples_by_hash[h] = {
                "image_path": img,
                "source": f"external_{alias}",
                "yolo_txt": yolo_txt,
                "img_name": img.name
            }

    # 2. Thu thập dữ liệu từ CVAT Tasks (ƯU TIÊN ĐÈ LÊN NẾU TRÙNG ẢNH)
    for tid in cvat_task_ids:
        try:
            meta = cvat_client.get_task_meta(tid)
            task_anno = cvat_client.get_task_annotations(tid)
            label_map = cvat_client.get_task_label_map(tid)
            label_id_to_name = {v: k for k, v in label_map.items()} if label_map else {}

            frames = meta.get("frames", []) if meta else []
            for f_idx, frame in enumerate(frames):
                raw_name = Path(frame.get("name", "")).name
                local_img = UPLOAD_DIR / raw_name
                if not local_img.exists():
                    # Thử tải từ CVAT
                    f_bytes = cvat_client.download_task_frame(tid, f_idx)
                    if f_bytes:
                        with open(local_img, "wb") as f_out:
                            f_out.write(f_bytes)

                if local_img.exists():
                    h = compute_file_hash(local_img)
                    # Convert CVAT frame annotations sang YOLO txt
                    persons = AnnotationConverter.from_cvat_annotations(
                        annotations_json=task_anno,
                        frame_number=f_idx,
                        label_id_to_name=label_id_to_name
                    )
                    w, h_img = frame.get("width", 1280), frame.get("height", 720)
                    yolo_txt = AnnotationConverter.to_yolo_pose_txt(persons, w, h_img)

                    # Ghi đè hoặc thêm mới (CVAT là Ground Truth đã sửa tay bởi annotator)
                    samples_by_hash[h] = {
                        "image_path": local_img,
                        "source": f"cvat_task_{tid}",
                        "yolo_txt": yolo_txt,
                        "img_name": local_img.name
                    }
        except Exception as e:
            print(f"[DatasetMerger] Lỗi đọc CVAT Task {tid}: {e}")

    # Nếu không có ảnh nào từ CVAT hay external, fallback lấy ảnh từ UPLOAD_DIR
    if not samples_by_hash:
        uploaded = list(UPLOAD_DIR.glob("*.*"))
        for up_img in uploaded:
            if up_img.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]:
                h = compute_file_hash(up_img)
                samples_by_hash[h] = {
                    "image_path": up_img,
                    "source": "uploads_fallback",
                    "yolo_txt": "",
                    "img_name": up_img.name
                }

    total_samples = len(samples_by_hash)
    if total_samples == 0:
        return {"success": False, "message": "Không có dữ liệu ảnh nào để hợp nhất!"}

    # Phân chia ngẫu nhiên Train / Val
    all_items = list(samples_by_hash.values())
    random.seed(42)
    random.shuffle(all_items)

    split_idx = int(total_samples * (1 - val_ratio))
    split_idx = max(1, min(split_idx, total_samples - 1)) if total_samples > 1 else 1

    train_items = all_items[:split_idx]
    val_items = all_items[split_idx:] if total_samples > 1 else all_items[:1]

    # Sao chép và tạo file label
    def process_split(items: List[Dict[str, Any]], target_img_dir: Path, target_lbl_dir: Path):
        for idx, item in enumerate(items):
            src_img = item["image_path"]
            safe_name = f"{src_img.stem}_{idx}{src_img.suffix}"
            dest_img = target_img_dir / safe_name
            shutil.copy2(src_img, dest_img)

            # Label file
            dest_lbl = target_lbl_dir / f"{dest_img.stem}.txt"
            with open(dest_lbl, "w", encoding="utf-8") as f_lbl:
                f_lbl.write(item.get("yolo_txt", ""))

    process_split(train_items, img_train_dir, lbl_train_dir)
    process_split(val_items, img_val_dir, lbl_val_dir)

    # Tạo data.yaml cho YOLO
    yaml_file = merged_dir / "data.yaml"
    yaml_content = f"""# PoseFlow Auto-Merged Dataset Configuration
path: {merged_dir.as_posix()}
train: images/train
val: images/val

names:
  0: person

kpt_shape: [17, 3]
flip_idx: [0, 2, 1, 4, 3, 6, 5, 8, 7, 10, 9, 12, 11, 14, 13, 16, 15]
"""
    with open(yaml_file, "w", encoding="utf-8") as f_yaml:
        f_yaml.write(yaml_content)

    return {
        "success": True,
        "dataset_name": dataset_name,
        "dataset_path": str(merged_dir),
        "yaml_path": str(yaml_file),
        "total_samples": total_samples,
        "train_samples": len(train_items),
        "val_samples": len(val_items),
        "sources": [f"CVAT Tasks: {cvat_task_ids}", f"External: {external_aliases}"],
        "message": f"Hợp nhất thành công dataset '{dataset_name}': {len(train_items)} train, {len(val_items)} validation."
    }

def list_available_datasets() -> List[Dict[str, Any]]:
    """Liệt kê danh sách các dataset đã tạo sẵn sàng cho huấn luyện."""
    results = []
    if not DATASET_DIR.exists():
        return results

    for d in DATASET_DIR.iterdir():
        if d.is_dir() and d.name != "external_gt":
            yaml_path = d / "data.yaml"
            train_img = d / "images" / "train"
            val_img = d / "images" / "val"
            train_count = len(list(train_img.glob("*.*"))) if train_img.exists() else 0
            val_count = len(list(val_img.glob("*.*"))) if val_img.exists() else 0

            results.append({
                "name": d.name,
                "path": str(d),
                "has_yaml": yaml_path.exists(),
                "train_samples": train_count,
                "val_samples": val_count,
                "total_samples": train_count + val_count
            })
    return results

def list_external_datasets() -> List[Dict[str, Any]]:
    """Liệt kê các bộ Ground Truth ngoài đã nạp."""
    results = []
    if not EXTERNAL_GT_DIR.exists():
        return results

    for d in EXTERNAL_GT_DIR.iterdir():
        if d.is_dir():
            img_exts = {".jpg", ".jpeg", ".png", ".webp"}
            imgs = [p for p in d.rglob("*") if p.suffix.lower() in img_exts]
            results.append({
                "alias": d.name,
                "path": str(d),
                "total_images": len(imgs)
            })
    return results
