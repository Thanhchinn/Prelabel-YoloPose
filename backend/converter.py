import os
import sys
import json
from typing import List, Dict, Any, Optional
from pathlib import Path

# Đảm bảo thư mục backend nằm trong sys.path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

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
        """Sinh chuỗi SVG cấu hình liên kết xương và các node khớp theo đúng chuẩn CVAT."""
        lines = [
            '<line x1="43" y1="68" x2="42" y2="52" data-type="edge" data-node-from="16" data-node-to="14"></line>',
            '<line x1="42" y1="52" x2="42" y2="36" data-type="edge" data-node-from="14" data-node-to="12"></line>',
            '<line x1="57" y1="68" x2="58" y2="52" data-type="edge" data-node-from="17" data-node-to="15"></line>',
            '<line x1="58" y1="52" x2="58" y2="36" data-type="edge" data-node-from="15" data-node-to="13"></line>',
            '<line x1="42" y1="36" x2="58" y2="36" data-type="edge" data-node-from="12" data-node-to="13"></line>',
            '<line x1="40" y1="20" x2="42" y2="36" data-type="edge" data-node-from="6" data-node-to="12"></line>',
            '<line x1="60" y1="20" x2="58" y2="36" data-type="edge" data-node-from="7" data-node-to="13"></line>',
            '<line x1="40" y1="20" x2="60" y2="20" data-type="edge" data-node-from="6" data-node-to="7"></line>',
            '<line x1="40" y1="20" x2="30" y2="32" data-type="edge" data-node-from="6" data-node-to="8"></line>',
            '<line x1="60" y1="20" x2="70" y2="32" data-type="edge" data-node-from="7" data-node-to="9"></line>',
            '<line x1="30" y1="32" x2="22" y2="44" data-type="edge" data-node-from="8" data-node-to="10"></line>',
            '<line x1="70" y1="32" x2="78" y2="44" data-type="edge" data-node-from="9" data-node-to="11"></line>',
            '<line x1="47" y1="9" x2="53" y2="9" data-type="edge" data-node-from="2" data-node-to="3"></line>',
            '<line x1="50" y1="12" x2="47" y2="9" data-type="edge" data-node-from="1" data-node-to="2"></line>',
            '<line x1="50" y1="12" x2="53" y2="9" data-type="edge" data-node-from="1" data-node-to="3"></line>',
            '<line x1="47" y1="9" x2="43" y2="10" data-type="edge" data-node-from="2" data-node-to="4"></line>',
            '<line x1="53" y1="9" x2="57" y2="10" data-type="edge" data-node-from="3" data-node-to="5"></line>',
            '<line x1="43" y1="10" x2="40" y2="20" data-type="edge" data-node-from="4" data-node-to="6"></line>',
            '<line x1="57" y1="10" x2="60" y2="20" data-type="edge" data-node-from="5" data-node-to="7"></line>',
        ]
        circles = [
            (1, 50, 12, 1.5),
            (2, 47, 9, 1.5),
            (3, 53, 9, 1.5),
            (4, 43, 10, 1.5),
            (5, 57, 10, 1.5),
            (6, 40, 20, 0.75),
            (7, 60, 20, 1.5),
            (8, 30, 32, 1.5),
            (9, 70, 32, 1.5),
            (10, 22, 44, 1.5),
            (11, 78, 44, 1.5),
            (12, 42, 36, 1.5),
            (13, 58, 36, 1.5),
            (14, 42, 52, 1.5),
            (15, 58, 52, 1.5),
            (16, 43, 68, 1.5),
            (17, 57, 68, 1.5),
        ]
        circle_tags = [
            f'<circle r="{r}" cx="{cx}" cy="{cy}" data-type="element node" data-element-id="{nid}" data-node-id="{nid}" data-label-name="{COCO_KEYPOINTS[nid - 1]}"></circle>'
            for nid, cx, cy, r in circles
        ]
        return "\n".join(lines + circle_tags)

    @staticmethod
    def to_cvat_annotations_json(
        prediction_results: List[ImagePredictionResult],
        task_frame_map: Dict[str, int],
        label_id_map: Optional[Dict[str, int]] = None
    ) -> Dict[str, Any]:
        """
        Chuyển đổi kết quả YOLO 26 sang định dạng CVAT Annotation REST API payload.
        task_frame_map: Ánh xạ từ image_name sang frame_number trên CVAT (0, 1, 2,...)
        label_id_map: Ánh xạ từ tên label/sublabel sang label_id số nguyên trên CVAT
        """
        shapes = []
        person_label_id = label_id_map.get("person") if label_id_map else None

        for res in prediction_results:
            frame_id = task_frame_map.get(res.image_name, 0)

            for person in res.predictions:
                elements = []
                for kpt in person.keypoints:
                    elem = {
                        "type": "points",
                        "frame": frame_id,
                        "points": [kpt.x, kpt.y],
                        "occluded": (kpt.visible == 1),
                        "outside": (kpt.visible == 0)
                    }
                    if label_id_map and kpt.name in label_id_map:
                        elem["label_id"] = label_id_map[kpt.name]
                    else:
                        elem["label_name"] = kpt.name
                    elements.append(elem)

                shape_item = {
                    "type": "skeleton",
                    "frame": frame_id,
                    "occluded": False,
                    "outside": False,
                    "points": [],  # Chuẩn CVAT: Skeleton shape có points rỗng []
                    "elements": elements
                }
                if person_label_id:
                    shape_item["label_id"] = person_label_id
                else:
                    shape_item["label_name"] = "person"

                shapes.append(shape_item)

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

    @staticmethod
    def from_cvat_annotations(
        annotations_json: Dict[str, Any],
        frame_number: int,
        label_id_to_name: Dict[int, str]
    ) -> List[PersonPose]:
        """
        Chuyển đổi các shape skeleton ở frame_number từ CVAT annotations về danh sách PersonPose.
        Hỗ trợ đọc trạng thái occluded và outside từ CVAT:
        - outside == True -> visible = 0 (ngoài ảnh / ẩn)
        - occluded == True -> visible = 1 (bị che khuất)
        - bình thường -> visible = 2 (nhìn rõ)
        """
        from schemas import KeypointItem

        shapes = annotations_json.get("shapes", [])
        persons: List[PersonPose] = []

        person_idx = 1
        for s in shapes:
            if s.get("frame") != frame_number or s.get("type") != "skeleton":
                continue

            elements = s.get("elements", [])
            kpt_dict = {}

            for elem in elements:
                lid = elem.get("label_id")
                kpt_name = label_id_to_name.get(lid)
                if not kpt_name or kpt_name not in COCO_KEYPOINTS:
                    continue

                pts = elem.get("points", [0.0, 0.0])
                px = float(pts[0]) if len(pts) > 0 else 0.0
                py = float(pts[1]) if len(pts) > 1 else 0.0

                if elem.get("outside", False):
                    vis = 0
                elif elem.get("occluded", False):
                    vis = 1
                else:
                    vis = 2

                kpt_idx = COCO_KEYPOINTS.index(kpt_name)
                kpt_dict[kpt_idx] = KeypointItem(
                    id=kpt_idx,
                    name=kpt_name,
                    x=round(px, 2),
                    y=round(py, 2),
                    conf=1.0,
                    visible=vis
                )

            kpt_list: List[KeypointItem] = []
            for idx, name in enumerate(COCO_KEYPOINTS):
                if idx in kpt_dict:
                    kpt_list.append(kpt_dict[idx])
                else:
                    kpt_list.append(KeypointItem(id=idx, name=name, x=0.0, y=0.0, conf=0.0, visible=0))

            valid_pts = [(k.x, k.y) for k in kpt_list if k.visible > 0]
            if valid_pts:
                xs = [p[0] for p in valid_pts]
                ys = [p[1] for p in valid_pts]
                bbox = [
                    round(max(0.0, min(xs) - 15), 2),
                    round(max(0.0, min(ys) - 15), 2),
                    round(max(xs) + 15, 2),
                    round(max(ys) + 15, 2)
                ]
            else:
                bbox = [0.0, 0.0, 0.0, 0.0]

            persons.append(
                PersonPose(
                    person_id=person_idx,
                    bbox=bbox,
                    score=1.0,
                    keypoints=kpt_list
                )
            )
            person_idx += 1

        return persons
