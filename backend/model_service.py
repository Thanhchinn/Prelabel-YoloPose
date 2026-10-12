import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
import cv2
import numpy as np
from PIL import Image

from config import (
    MODEL_WEIGHTS_PATH,
    WEIGHTS_DIR,
    OUTPUT_DIR,
    COCO_KEYPOINTS,
    CONF_THRESHOLD,
    KPT_CONF_THRESHOLD,
)
from schemas import KeypointItem, PersonPose, ImagePredictionResult

class YOLO26PoseService:
    def __init__(self, weights_path: Optional[str] = None):
        self.weights_path = Path(weights_path or MODEL_WEIGHTS_PATH)
        self.model = None
        self.is_loaded = False
        self._initialize_model()

    def _initialize_model(self):
        """Khởi tạo mô hình YOLO 26 Pose nếu có file weights."""
        if self.weights_path.exists():
            try:
                from ultralytics import YOLO
                print(f"[YOLO26 Service] Loading weights from: {self.weights_path}")
                self.model = YOLO(str(self.weights_path))
                self.is_loaded = True
                print("[YOLO26 Service] YOLO 26 Pose model loaded successfully.")
            except Exception as e:
                print(f"[YOLO26 Service] Error loading weights: {e}")
                self.is_loaded = False
        else:
            print(f"[YOLO26 Service] Model file {self.weights_path} not found. Running in Standby/Simulation mode.")
            self.is_loaded = False

    def predict_single_image(
        self,
        image_path: Path,
        conf_thresh: float = CONF_THRESHOLD,
        kpt_conf_thresh: float = KPT_CONF_THRESHOLD,
    ) -> ImagePredictionResult:
        """Thực hiện suy luận 1 ảnh, trả về 17 keypoints theo chuẩn COCO."""
        if not image_path.exists():
            raise FileNotFoundError(f"Không tìm thấy file ảnh: {image_path}")

        # Đọc thông tin kích thước ảnh
        img = cv2.imread(str(image_path))
        if img is None:
            # Fallback đọc bằng PIL nếu opencv gặp vấn đề path Unicode
            pil_img = Image.open(str(image_path))
            width, height = pil_img.size
        else:
            height, width = img.shape[:2]

        persons: List[PersonPose] = []

        if self.is_loaded and self.model is not None:
            # Chạy inference qua model YOLO 26 thực tế
            results = self.model(str(image_path), conf=conf_thresh, verbose=False)
            for res_idx, r in enumerate(results):
                boxes = r.boxes
                keypoints_data = r.keypoints

                if boxes is not None and keypoints_data is not None:
                    xyxy = boxes.xyxy.cpu().numpy()
                    scores = boxes.conf.cpu().numpy()
                    kpts_xy = keypoints_data.xy.cpu().numpy()  # [N, 17, 2]
                    kpts_conf = (
                        keypoints_data.conf.cpu().numpy()
                        if keypoints_data.conf is not None
                        else np.ones((len(boxes), 17))
                    )

                    for p_idx in range(len(boxes)):
                        box = [float(c) for c in xyxy[p_idx]]
                        box_score = float(scores[p_idx])
                        kpt_list: List[KeypointItem] = []

                        for k_idx in range(17):
                            name = COCO_KEYPOINTS[k_idx]
                            kx, ky = float(kpts_xy[p_idx][k_idx][0]), float(kpts_xy[p_idx][k_idx][1])
                            kc = float(kpts_conf[p_idx][k_idx])

                            # Phân loại visibility flag (0: hide, 1: occluded, 2: visible)
                            if kc < 0.2:
                                vis = 0
                            elif kc < kpt_conf_thresh:
                                vis = 1
                            else:
                                vis = 2

                            kpt_list.append(
                                KeypointItem(
                                    id=k_idx,
                                    name=name,
                                    x=round(kx, 2),
                                    y=round(ky, 2),
                                    conf=round(kc, 3),
                                    visible=vis,
                                )
                            )

                        persons.append(
                            PersonPose(
                                person_id=p_idx + 1,
                                bbox=[round(b, 2) for b in box],
                                score=round(box_score, 3),
                                keypoints=kpt_list,
                            )
                        )
        else:
            # Fallback mô phỏng dự đoán người ở trung tâm (khi chưa đặt file weights)
            # Giúp UI và kết nối CVAT hoạt động mượt mà ngay trong quá trình dựng hệ thống
            persons = self._generate_simulated_pose(width, height, conf_thresh, kpt_conf_thresh)

        result = ImagePredictionResult(
            image_name=image_path.name,
            image_url=f"/api/images/uploads/{image_path.name}",
            width=width,
            height=height,
            person_count=len(persons),
            predictions=persons,
        )

        # Lưu cache output JSON
        output_json_path = OUTPUT_DIR / f"{image_path.stem}.json"
        with open(output_json_path, "w", encoding="utf-8") as f:
            json.dump(result.model_dump(), f, indent=2, ensure_ascii=False)

        return result

    def _generate_simulated_pose(
        self, width: int, height: int, conf_thresh: float, kpt_conf_thresh: float
    ) -> List[PersonPose]:
        """Tạo pose giả lập chuẩn tỉ lệ cơ thể người để phục vụ test UI/CVAT."""
        cx = width / 2.0
        cy = height / 2.0
        bw = width * 0.35
        bh = height * 0.75
        x1 = max(0.0, cx - bw / 2.0)
        y1 = max(0.0, cy - bh / 2.0)
        x2 = min(float(width), cx + bw / 2.0)
        y2 = min(float(height), cy + bh / 2.0)

        # Điểm tọa độ ước lượng theo tỉ lệ cơ thể
        coords = [
            (cx, y1 + bh * 0.1),            # 0: nose
            (cx - bw * 0.08, y1 + bh * 0.08),  # 1: left_eye
            (cx + bw * 0.08, y1 + bh * 0.08),  # 2: right_eye
            (cx - bw * 0.16, y1 + bh * 0.1),  # 3: left_ear
            (cx + bw * 0.16, y1 + bh * 0.1),  # 4: right_ear
            (cx - bw * 0.3, y1 + bh * 0.22),  # 5: left_shoulder
            (cx + bw * 0.3, y1 + bh * 0.22),  # 6: right_shoulder
            (cx - bw * 0.38, y1 + bh * 0.42), # 7: left_elbow
            (cx + bw * 0.38, y1 + bh * 0.42), # 8: right_elbow
            (cx - bw * 0.44, y1 + bh * 0.62), # 9: left_wrist
            (cx + bw * 0.44, y1 + bh * 0.62), # 10: right_wrist
            (cx - bw * 0.2, y1 + bh * 0.52),  # 11: left_hip
            (cx + bw * 0.2, y1 + bh * 0.52),  # 12: right_hip
            (cx - bw * 0.22, y1 + bh * 0.74), # 13: left_knee
            (cx + bw * 0.22, y1 + bh * 0.74), # 14: right_knee
            (cx - bw * 0.24, y1 + bh * 0.95), # 15: left_ankle
            (cx + bw * 0.24, y1 + bh * 0.95), # 16: right_ankle
        ]

        kpts = []
        for i, (px, py) in enumerate(coords):
            kpts.append(
                KeypointItem(
                    id=i,
                    name=COCO_KEYPOINTS[i],
                    x=round(px, 2),
                    y=round(py, 2),
                    conf=0.92,
                    visible=2,
                )
            )

        return [
            PersonPose(
                person_id=1,
                bbox=[round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2)],
                score=0.94,
                keypoints=kpts,
            )
        ]

# Khởi tạo singleton instance
model_service = YOLO26PoseService()
