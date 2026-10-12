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
    def calculate_metrics(
        predictions: List[Dict[str, Any]],
        ground_truths: List[Dict[str, Any]],
        task_id: int = 1,
        alpha_pck: float = 0.2,
        correction_threshold_px: float = 5.0
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

        # Duyệt qua các cặp skeleton (giả định 1-1 hoặc ghép cặp theo bbox)
        pair_count = min(len(predictions), len(ground_truths))

        if pair_count == 0:
            # Fallback nếu chưa có ground truth
            details = [
                KeypointMetricDetail(name=k, pck=0.0, correction_rate=0.0, mean_error_px=0.0)
                for k in COCO_KEYPOINTS
            ]
            return MetricsResponse(
                task_id=task_id,
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
            total_skeletons=pair_count,
            pck_overall=overall_pck,
            nme_overall=overall_nme,
            correction_rate_overall=overall_correction_rate,
            details=details
        )
