import os
import sys
import json
from pathlib import Path

# Đảm bảo thư mục backend nằm trong sys.path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

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
from schemas import KeypointItem, PersonPose, ImagePredictionResult, ModelInfo

# Danh mục các mô hình hỗ trợ
AVAILABLE_MODELS: List[Dict[str, str]] = [
    {
        "id": "yolo",
        "name": "YOLO 26 Pose",
        "family": "YOLO",
        "speed": "⚡ Rất nhanh (~15-30ms)",
        "ap_score": "70-74 mAP",
        "badge": "YOLO 26 (Fast)",
        "description": "Mô hình YOLO Pose mặc định tối ưu thời gian thực, rất nhanh cho pre-label hàng loạt.",
    },
    {
        "id": "rtmpose",
        "name": "RTMPose-m (OpenMMLab)",
        "family": "RTMPose",
        "speed": "🚀 Nhanh (~35-65ms)",
        "ap_score": "75.8 mAP",
        "badge": "RTMPose-m (Balanced)",
        "description": "Mô hình Real-Time Pose SOTA từ OpenMMLab/MMPose. Cân bằng tối ưu giữa tốc độ và độ chính xác.",
    },
    {
        "id": "vitpose",
        "name": "ViTPose-Base (Vision Transformer)",
        "family": "ViTPose",
        "speed": "🧠 Trung bình (~120-250ms)",
        "ap_score": "77.4+ mAP",
        "badge": "ViTPose-B (High Precision)",
        "description": "Mô hình kiến trúc Vision Transformer cho độ chuẩn xác cao nhất, xử lý vượt trội các tư thế khó và che khuất.",
    },
]

class MultiModelPoseService:
    def __init__(self, weights_path: Optional[str] = None):
        self.weights_path = Path(weights_path or MODEL_WEIGHTS_PATH)
        self.model = None
        self.is_loaded = False
        
        # Lazy loaded instances cho RTMPose và ViTPose
        self.rtmpose_model = None
        self.vitpose_processor = None
        self.vitpose_model = None

        self._initialize_yolo()

    def _initialize_yolo(self):
        """Khởi tạo mô hình YOLO Pose nếu có file weights."""
        if not self.weights_path.is_absolute():
            from config import BASE_DIR, WEIGHTS_DIR
            if (BASE_DIR / self.weights_path).exists():
                self.weights_path = (BASE_DIR / self.weights_path).resolve()
            elif (WEIGHTS_DIR / self.weights_path.name).exists():
                self.weights_path = (WEIGHTS_DIR / self.weights_path.name).resolve()

        if self.weights_path.exists():
            try:
                from ultralytics import YOLO
                print(f"[YOLO26 Service] Loading weights from: {self.weights_path}")
                self.model = YOLO(str(self.weights_path))
                self.is_loaded = True
                print("[YOLO26 Service] YOLO Pose model loaded successfully.")
            except Exception as e:
                print(f"[YOLO26 Service] Error loading weights: {e}")
                self.is_loaded = False
        else:
            print(f"[YOLO26 Service] Model file {self.weights_path} not found. Running in Standby/Simulation mode.")
            self.is_loaded = False

    def _ensure_rtmpose_loaded(self):
        """Lazy load RTMPose model khi người dùng chọn rtmpose."""
        if self.rtmpose_model is None:
            try:
                import rtmlib
                print("[PoseService] Loading RTMPose (mode='balanced', backend='onnxruntime')...")
                self.rtmpose_model = rtmlib.Body(mode="balanced", backend="onnxruntime", device="cpu")
                print("[PoseService] RTMPose loaded successfully.")
            except Exception as e:
                print(f"[PoseService] Failed to load RTMPose: {e}")
                self.rtmpose_model = None

    def _ensure_vitpose_loaded(self):
        """Lazy load ViTPose model khi người dùng chọn vitpose."""
        if self.vitpose_model is None or self.vitpose_processor is None:
            try:
                from transformers import AutoProcessor, AutoModelForPoseEstimation
                print("[PoseService] Loading ViTPose-Base (usyd-community/vitpose-base-simple)...")
                self.vitpose_processor = AutoProcessor.from_pretrained("usyd-community/vitpose-base-simple")
                self.vitpose_model = AutoModelForPoseEstimation.from_pretrained("usyd-community/vitpose-base-simple")
                self.vitpose_model.eval()
                print("[PoseService] ViTPose loaded successfully.")
            except Exception as e:
                print(f"[PoseService] Failed to load ViTPose: {e}")
                self.vitpose_model = None
                self.vitpose_processor = None

    def get_available_models(self) -> List[Dict[str, str]]:
        return AVAILABLE_MODELS

    def predict_single_image(
        self,
        image_path: Path,
        conf_thresh: float = CONF_THRESHOLD,
        kpt_conf_thresh: float = KPT_CONF_THRESHOLD,
        model_type: str = "yolo",
    ) -> ImagePredictionResult:
        """Thực hiện suy luận 1 ảnh, trả về 17 keypoints theo chuẩn COCO với model được chỉ định."""
        if not image_path.exists():
            raise FileNotFoundError(f"Không tìm thấy file ảnh: {image_path}")

        # Đọc thông tin kích thước ảnh
        img = cv2.imread(str(image_path))
        if img is None:
            pil_img = Image.open(str(image_path))
            width, height = pil_img.size
        else:
            height, width = img.shape[:2]

        model_type_norm = (model_type or "yolo").lower().strip()
        model_meta = next(
            (m for m in AVAILABLE_MODELS if m["id"] == model_type_norm),
            AVAILABLE_MODELS[0],
        )

        try:
            if model_type_norm == "rtmpose":
                persons = self._predict_rtmpose(image_path, width, height, conf_thresh, kpt_conf_thresh)
            elif model_type_norm == "vitpose":
                persons = self._predict_vitpose(image_path, width, height, conf_thresh, kpt_conf_thresh)
            else:
                persons = self._predict_yolo(image_path, width, height, conf_thresh, kpt_conf_thresh)
        except Exception as e:
            print(f"[PoseService] Error running {model_type_norm}: {e}. Fallback to simulated pose.")
            persons = self._generate_simulated_pose(width, height, conf_thresh, kpt_conf_thresh)

        result = ImagePredictionResult(
            image_name=image_path.name,
            image_url=f"/api/images/uploads/{image_path.name}",
            width=width,
            height=height,
            person_count=len(persons),
            model_name=model_meta["name"],
            model_type=model_meta["id"],
            predictions=persons,
        )

        # Lưu cache output JSON
        output_json_path = OUTPUT_DIR / f"{image_path.stem}.json"
        with open(output_json_path, "w", encoding="utf-8") as f:
            json.dump(result.model_dump(), f, indent=2, ensure_ascii=False)

        return result

    def _predict_yolo(
        self,
        image_path: Path,
        width: int,
        height: int,
        conf_thresh: float,
        kpt_conf_thresh: float,
    ) -> List[PersonPose]:
        if not self.is_loaded or self.model is None:
            return self._generate_simulated_pose(width, height, conf_thresh, kpt_conf_thresh)

        results = self.model(str(image_path), conf=conf_thresh, verbose=False)
        persons: List[PersonPose] = []
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
        return persons

    def _predict_rtmpose(
        self,
        image_path: Path,
        width: int,
        height: int,
        conf_thresh: float,
        kpt_conf_thresh: float,
    ) -> List[PersonPose]:
        self._ensure_rtmpose_loaded()
        if self.rtmpose_model is None:
            return self._generate_simulated_pose(width, height, conf_thresh, kpt_conf_thresh)

        img_cv = cv2.imread(str(image_path))
        if img_cv is None:
            pil_img = Image.open(str(image_path))
            img_cv = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

        # 1. Phát hiện bounding box người bằng detector của rtmlib
        bboxes = self.rtmpose_model.det_model(img_cv)
        if bboxes is None or len(bboxes) == 0:
            if self.is_loaded and self.model is not None:
                try:
                    y_res = self.model(str(image_path), conf=conf_thresh, verbose=False)
                    if y_res and len(y_res) > 0 and y_res[0].boxes is not None:
                        bboxes = y_res[0].boxes.xyxy.cpu().numpy()
                except Exception:
                    pass
        if bboxes is None or len(bboxes) == 0:
            bboxes = np.array([[0.0, 0.0, float(width), float(height)]])

        # 2. Suy luận 17 điểm pose
        keypoints, scores = self.rtmpose_model.pose_model(img_cv, bboxes=bboxes)
        persons: List[PersonPose] = []
        for p_idx in range(len(keypoints)):
            kpts_xy = keypoints[p_idx]
            kpts_sc = scores[p_idx]
            mean_score = float(np.mean(kpts_sc))
            max_score = float(np.max(kpts_sc))

            if mean_score < conf_thresh * 0.4 and max_score < conf_thresh:
                continue

            kpt_list: List[KeypointItem] = []
            for k_idx in range(17):
                name = COCO_KEYPOINTS[k_idx]
                kx = float(kpts_xy[k_idx][0])
                ky = float(kpts_xy[k_idx][1])
                kc = float(kpts_sc[k_idx])

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

            # Xác định bbox của người
            if p_idx < len(bboxes) and (bboxes[p_idx][2] - bboxes[p_idx][0] < width * 0.98 or bboxes[p_idx][3] - bboxes[p_idx][1] < height * 0.98):
                box = [float(b) for b in bboxes[p_idx][:4]]
            else:
                valid_pts = [k for k in kpt_list if k.conf > 0.15]
                if len(valid_pts) >= 3:
                    xs = [k.x for k in valid_pts]
                    ys = [k.y for k in valid_pts]
                    pad_x = max(10.0, (max(xs) - min(xs)) * 0.15)
                    pad_y = max(10.0, (max(ys) - min(ys)) * 0.15)
                    box = [
                        max(0.0, min(xs) - pad_x),
                        max(0.0, min(ys) - pad_y),
                        min(float(width), max(xs) + pad_x),
                        min(float(height), max(ys) + pad_y),
                    ]
                else:
                    box = [0.0, 0.0, float(width), float(height)]

            persons.append(
                PersonPose(
                    person_id=p_idx + 1,
                    bbox=[round(b, 2) for b in box],
                    score=round(mean_score, 3),
                    keypoints=kpt_list,
                )
            )

        return persons

    def _predict_vitpose(
        self,
        image_path: Path,
        width: int,
        height: int,
        conf_thresh: float,
        kpt_conf_thresh: float,
    ) -> List[PersonPose]:
        self._ensure_vitpose_loaded()
        if self.vitpose_model is None or self.vitpose_processor is None:
            return self._generate_simulated_pose(width, height, conf_thresh, kpt_conf_thresh)

        import torch

        pil_img = Image.open(str(image_path))
        if pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")

        # 1. Thu thập bounding boxes người (qua YOLO hoặc RTMPose detector)
        bboxes = []
        if self.is_loaded and self.model is not None:
            try:
                y_res = self.model(str(image_path), conf=conf_thresh, verbose=False)
                if y_res and len(y_res) > 0 and y_res[0].boxes is not None:
                    bboxes = y_res[0].boxes.xyxy.cpu().numpy().tolist()
            except Exception:
                pass

        if not bboxes and self.rtmpose_model is not None:
            try:
                cv_img = cv2.imread(str(image_path))
                det_b = self.rtmpose_model.det_model(cv_img)
                if det_b is not None and len(det_b) > 0:
                    bboxes = [[float(x) for x in b[:4]] for b in det_b]
            except Exception:
                pass

        if not bboxes:
            bboxes = [[0.0, 0.0, float(width), float(height)]]

        formatted_boxes = [[[float(c) for c in b[:4]] for b in bboxes]]

        inputs = self.vitpose_processor(pil_img, boxes=formatted_boxes, return_tensors="pt")
        with torch.no_grad():
            outputs = self.vitpose_model(**inputs)

        pose_results = self.vitpose_processor.post_process_pose_estimation(
            outputs, boxes=formatted_boxes
        )[0]

        persons: List[PersonPose] = []
        for p_idx, item in enumerate(pose_results):
            kpts_xy = item["keypoints"].cpu().numpy()  # shape (17, 2)
            kpts_sc = item["scores"].cpu().numpy()     # shape (17,)
            mean_score = float(np.mean(kpts_sc))
            max_score = float(np.max(kpts_sc))

            if mean_score < conf_thresh * 0.4 and max_score < conf_thresh:
                continue

            kpt_list: List[KeypointItem] = []
            for k_idx in range(17):
                name = COCO_KEYPOINTS[k_idx]
                kx = float(kpts_xy[k_idx][0])
                ky = float(kpts_xy[k_idx][1])
                kc = float(kpts_sc[k_idx])

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

            if p_idx < len(bboxes) and (bboxes[p_idx][2] - bboxes[p_idx][0] < width * 0.98 or bboxes[p_idx][3] - bboxes[p_idx][1] < height * 0.98):
                box = [float(b) for b in bboxes[p_idx][:4]]
            else:
                valid_pts = [k for k in kpt_list if k.conf > 0.15]
                if len(valid_pts) >= 3:
                    xs = [k.x for k in valid_pts]
                    ys = [k.y for k in valid_pts]
                    pad_x = max(10.0, (max(xs) - min(xs)) * 0.15)
                    pad_y = max(10.0, (max(ys) - min(ys)) * 0.15)
                    box = [
                        max(0.0, min(xs) - pad_x),
                        max(0.0, min(ys) - pad_y),
                        min(float(width), max(xs) + pad_x),
                        min(float(height), max(ys) + pad_y),
                    ]
                else:
                    box = [0.0, 0.0, float(width), float(height)]

            persons.append(
                PersonPose(
                    person_id=p_idx + 1,
                    bbox=[round(b, 2) for b in box],
                    score=round(mean_score, 3),
                    keypoints=kpt_list,
                )
            )

        return persons

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

# Alias giữ tương thích ngược
YOLO26PoseService = MultiModelPoseService

# Khởi tạo singleton instance
model_service = MultiModelPoseService()
