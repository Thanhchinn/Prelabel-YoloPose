import json
from typing import List, Dict, Any
from pathlib import Path
from config import COCO_KEYPOINTS, COCO_SKELETON_EDGES
from schemas import ImagePredictionResult, PersonPose

class AnnotationConverter:
    @staticmethod
    def get_cvat_skeleton_spec() -> List[Dict[str, Any]]:
        """Trả về cấu trúc khai báo bộ nhãn Skeleton 17 điểm COCO cho Task CVAT."""
        sublabels = []
        for idx, kpt_name in enumerate(COCO_KEYPOINTS):
            sublabels.append({
                "name": kpt_name,
                "color": "#00FF00" if "left" in kpt_name else ("#FF0000" if "right" in kpt_name else "#FFFF00"),
                "type": "points"
            })

        return [
            {
                "name": "person",
                "color": "#3388FF",
                "type": "skeleton",
                "sublabels": sublabels,
                "svg": AnnotationConverter._generate_skeleton_svg()
            }
        ]

    @staticmethod
    def _generate_skeleton_svg() -> str:
        """Sinh chuỗi SVG cấu hình liên kết xương (lines) hiển thị trên CVAT."""
        svg_lines = []
        for u, v in COCO_SKELETON_EDGES:
            name_u = COCO_KEYPOINTS[u]
            name_v = COCO_KEYPOINTS[v]
            svg_lines.append(f'<line data-type="edge" data-node-from="{name_u}" data-node-to="{name_v}" stroke="#3388FF" stroke-width="2"/>')
        return "".join(svg_lines)

    @staticmethod
    def to_cvat_annotations_json(prediction_results: List[ImagePredictionResult], task_frame_map: Dict[str, int]) -> Dict[str, Any]:
        """
        Chuyển đổi kết quả YOLO 26 sang định dạng CVAT Annotation REST API payload.
        task_frame_map: Ánh xạ từ image_name sang frame_number trên CVAT (0, 1, 2,...)
        """
        shapes = []

        for res in prediction_results:
            frame_id = task_frame_map.get(res.image_name, 0)

            for person in res.predictions:
                elements = []
                for kpt in person.keypoints:
                    elements.append({
                        "label_name": kpt.name,
                        "type": "points",
                        "frame": frame_id,
                        "points": [kpt.x, kpt.y],
                        "occluded": (kpt.visible == 1),
                        "outside": (kpt.visible == 0)
                    })

                shapes.append({
                    "label_name": "person",
                    "type": "skeleton",
                    "frame": frame_id,
                    "occluded": False,
                    "outside": False,
                    "points": person.bbox,  # [x1, y1, x2, y2]
                    "elements": elements
                })

        return {
            "version": 1,
            "shapes": shapes,
            "tracks": [],
            "tags": []
        }

    @staticmethod
    def to_yolo_pose_txt(person_poses: List[PersonPose], img_width: int, img_height: int) -> str:
        """
        Chuyển đổi sang định dạng nhãn file TXT chuẩn YOLO Pose phục vụ huấn luyện lại.
        Format: class_idx x_center y_center width height px1 py1 v1 px2 py2 v2 ... (chuẩn hóa 0-1)
        """
        lines = []
        for person in person_poses:
            x1, y1, x2, y2 = person.bbox
            bw = max(0.0, x2 - x1)
            bh = max(0.0, y2 - y1)
            cx = x1 + bw / 2.0
            cy = y1 + bh / 2.0

            # Chuẩn hóa về [0, 1]
            norm_cx = max(0.0, min(1.0, cx / img_width))
            norm_cy = max(0.0, min(1.0, cy / img_height))
            norm_bw = max(0.0, min(1.0, bw / img_width))
            norm_bh = max(0.0, min(1.0, bh / img_height))

            row = [f"0 {norm_cx:.6f} {norm_cy:.6f} {norm_bw:.6f} {norm_bh:.6f}"]

            for kpt in person.keypoints:
                kx_norm = max(0.0, min(1.0, kpt.x / img_width))
                ky_norm = max(0.0, min(1.0, kpt.y / img_height))
                v = kpt.visible
                row.append(f"{kx_norm:.6f} {ky_norm:.6f} {v}")

            lines.append(" ".join(row))

        return "\n".join(lines)
