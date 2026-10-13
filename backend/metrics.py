import os
import sys
import math
from pathlib import Path
from typing import List, Dict, Any, Optional

# Đảm bảo thư mục backend nằm trong sys.path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from config import COCO_KEYPOINTS
from schemas import MetricsResponse, KeypointMetricDetail

class MetricsCalculator:
    @staticmethod
    def compute_iou(box1: List[float], box2: List[float]) -> float:
        """Tính Intersection over Union (IoU) giữa 2 bounding box [x1, y1, x2, y2]."""
        x1 = max(box1[0], box2[0])
        y1 = max(box1[1], box2[1])
        x2 = min(box1[2], box2[2])
        y2 = min(box1[3], box2[3])
        inter_w = max(0.0, x2 - x1)
        inter_h = max(0.0, y2 - y1)
        inter_area = inter_w * inter_h
        area1 = max(0.0, box1[2] - box1[0]) * max(0.0, box1[3] - box1[1])
        area2 = max(0.0, box2[2] - box2[0]) * max(0.0, box2[3] - box2[1])
        union_area = area1 + area2 - inter_area
        if union_area <= 0:
            return 0.0
        return inter_area / union_area

    @staticmethod
    def match_frame_persons(preds: List[Dict[str, Any]], gts: List[Dict[str, Any]]) -> List[tuple]:
        """
        Ghép cặp người trong cùng 1 frame theo độ trùng khớp Bounding Box (IoU hoặc khoảng cách tâm).
        Ưu tiên cặp có IoU cao nhất, tránh so sánh chéo người khi có nhiều đối tượng.
        """
        if not preds or not gts:
            return []
        used_gts = set()
        pairs = []
        for p in preds:
            best_gt_idx = -1
            best_score = -1.0
            p_box = p.get("bbox", [0, 0, 100, 100])
            pcx = (p_box[0] + p_box[2]) / 2.0
            pcy = (p_box[1] + p_box[3]) / 2.0

            for g_idx, g in enumerate(gts):
                if g_idx in used_gts:
                    continue
                g_box = g.get("bbox", [0, 0, 100, 100])
                iou = MetricsCalculator.compute_iou(p_box, g_box)
                gcx = (g_box[0] + g_box[2]) / 2.0
                gcy = (g_box[1] + g_box[3]) / 2.0
                center_dist = math.sqrt((pcx - gcx) ** 2 + (pcy - gcy) ** 2)
                # Điểm số kết hợp IoU và khoảng cách
                score = iou - (center_dist / 2000.0)

                if score > best_score:
                    best_score = score
                    best_gt_idx = g_idx

            if best_gt_idx >= 0:
                used_gts.add(best_gt_idx)
                pairs.append((p, gts[best_gt_idx]))
        return pairs

    @staticmethod
    def calculate_metrics(
        predictions: List[Dict[str, Any]],
        ground_truths: List[Dict[str, Any]],
        task_id: int = 1,
        alpha_pck: float = 0.2,
        correction_threshold_px: float = 5.0,
        model_name: str = "YOLO 26 Pose",
        model_type: str = "yolo"
    ) -> MetricsResponse:
        """
        Tính toán PCK, NME và Human Correction Rate.
        predictions: Danh sách các skeleton do model đoán.
        ground_truths: Danh sách các skeleton do annotator hoàn thành.
        """
        total_kpts = 0
        correct_kpts = 0
        corrected_by_human = 0
        total_normalized_error = 0.0

        # Thống kê chi tiết theo 17 khớp
        kpt_stats: Dict[str, Dict[str, Any]] = {
            name: {"total": 0, "correct": 0, "corrected": 0, "error_sum": 0.0}
            for name in COCO_KEYPOINTS
        }

        # Duyệt qua các cặp skeleton (1-1)
        pair_count = min(len(predictions), len(ground_truths))

        if pair_count == 0:
            details = [
                KeypointMetricDetail(name=k, pck=0.0, correction_rate=0.0, mean_error_px=0.0)
                for k in COCO_KEYPOINTS
            ]
            return MetricsResponse(
                task_id=task_id,
                model_name=model_name,
                model_type=model_type,
                total_skeletons=0,
                pck_overall=0.0,
                nme_overall=0.0,
                correction_rate_overall=0.0,
                details=details
            )

        for i in range(pair_count):
            pred_person = predictions[i]
            gt_person = ground_truths[i]

            pred_box = pred_person.get("bbox", [0, 0, 100, 100])
            w = max(1.0, pred_box[2] - pred_box[0])
            h = max(1.0, pred_box[3] - pred_box[1])
            bbox_diag = math.sqrt(w * w + h * h)
            pck_tolerance = alpha_pck * bbox_diag

            pred_kpts = {k["name"]: k for k in pred_person.get("keypoints", [])}
            gt_kpts = {k["name"]: k for k in gt_person.get("keypoints", [])}

            for name in COCO_KEYPOINTS:
                if name in pred_kpts and name in gt_kpts:
                    pk = pred_kpts[name]
                    gk = gt_kpts[name]

                    # Bỏ qua nếu điểm này annotator đánh dấu là không nhìn thấy
                    if gk.get("visible", 2) == 0:
                        continue

                    dx = pk["x"] - gk["x"]
                    dy = pk["y"] - gk["y"]
                    dist = math.sqrt(dx * dx + dy * dy)
                    norm_err = dist / bbox_diag

                    total_kpts += 1
                    total_normalized_error += norm_err

                    kpt_stats[name]["total"] += 1
                    kpt_stats[name]["error_sum"] += dist

                    # Kiểm tra PCK
                    if dist <= pck_tolerance:
                        correct_kpts += 1
                        kpt_stats[name]["correct"] += 1

                    # Kiểm tra Correction Rate (con người có phải can thiệp kéo điểm này không)
                    if dist > correction_threshold_px or pk.get("visible") != gk.get("visible"):
                        corrected_by_human += 1
                        kpt_stats[name]["corrected"] += 1

        overall_pck = round((correct_kpts / total_kpts * 100.0) if total_kpts > 0 else 0.0, 2)
        overall_nme = round((total_normalized_error / total_kpts) if total_kpts > 0 else 0.0, 4)
        overall_correction_rate = round((corrected_by_human / total_kpts * 100.0) if total_kpts > 0 else 0.0, 2)

        details = []
        for name in COCO_KEYPOINTS:
            st = kpt_stats[name]
            tot = st["total"]
            pck_val = round((st["correct"] / tot * 100.0) if tot > 0 else 0.0, 2)
            corr_val = round((st["corrected"] / tot * 100.0) if tot > 0 else 0.0, 2)
            mean_err = round((st["error_sum"] / tot) if tot > 0 else 0.0, 2)
            details.append(
                KeypointMetricDetail(
                    name=name,
                    pck=pck_val,
                    correction_rate=corr_val,
                    mean_error_px=mean_err
                )
            )

        return MetricsResponse(
            task_id=task_id,
            model_name=model_name,
            model_type=model_type,
            total_skeletons=pair_count,
            pck_overall=overall_pck,
            nme_overall=overall_nme,
            correction_rate_overall=overall_correction_rate,
            details=details
        )
