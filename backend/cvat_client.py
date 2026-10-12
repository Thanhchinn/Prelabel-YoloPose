import os
import sys
import requests
import json
from pathlib import Path
from typing import List, Dict, Any, Optional

# Đảm bảo thư mục backend nằm trong sys.path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from config import CVAT_HOST, CVAT_USER, CVAT_PASS
from converter import AnnotationConverter

class CVATClient:
    def __init__(self, host: str = CVAT_HOST, username: str = CVAT_USER, password: str = CVAT_PASS):
        self.host = host.rstrip("/")
        self.username = username
        self.password = password
        self.session = requests.Session()
        self.auth_token: Optional[str] = None
        self.is_connected = False

    def check_connection(self) -> Dict[str, Any]:
        """Kiểm tra xem CVAT Local có đang hoạt động hay không."""
        try:
            res = requests.get(f"{self.host}/api/server/about", timeout=1)
            if res.status_code == 200:
                self.is_connected = True
                return {"online": True, "details": res.json()}
        except Exception as e:
            self.is_connected = False
            return {"online": False, "error": str(e)}
        return {"online": False, "error": "Unknown status"}

    def authenticate(self) -> bool:
        """Đăng nhập vào CVAT để lấy Session hoặc Token."""
        try:
            login_url = f"{self.host}/api/auth/login"
            payload = {"username": self.username, "password": self.password}
            headers = {"Content-Type": "application/json"}
            res = self.session.post(login_url, json=payload, headers=headers, timeout=5)

            if res.status_code in (200, 201):
                data = res.json()
                self.auth_token = data.get("key")
                if self.auth_token:
                    self.session.headers.update({"Authorization": f"Token {self.auth_token}"})
                self.is_connected = True
                return True
            else:
                print(f"[CVAT Client] Login failed: {res.status_code} - {res.text}")
                return False
        except Exception as e:
            print(f"[CVAT Client] Connection error during auth: {e}")
            return False

    def create_task(self, task_name: str) -> Optional[int]:
        """Tạo mới một Task trên CVAT với cấu trúc Skeleton 17 điểm COCO."""
        if not self.is_connected:
            self.authenticate()

        labels = AnnotationConverter.get_cvat_skeleton_spec()
        payload = {
            "name": task_name,
            "labels": labels,
            "project_id": None
        }

        try:
            url = f"{self.host}/api/tasks"
            res = self.session.post(url, json=payload, timeout=10)
            if res.status_code in (200, 201):
                task_data = res.json()
                return task_data.get("id")
            else:
                print(f"[CVAT Client] Create task failed: {res.status_code} - {res.text}")
                return None
        except Exception as e:
            print(f"[CVAT Client] Error creating task: {e}")
            return None

    def upload_task_data(self, task_id: int, image_paths: List[Path]) -> bool:
        """Tải các file ảnh lên Task của CVAT."""
        if not self.is_connected:
            self.authenticate()

        try:
            url = f"{self.host}/api/tasks/{task_id}/data"
            files = []
            for img_p in image_paths:
                files.append(("client_files", (img_p.name, open(str(img_p), "rb"), "image/jpeg")))

            data = {
                "image_quality": 85,
                "use_zip_chunks": False
            }

            res = self.session.post(url, data=data, files=files, timeout=60)
            # Đóng các file handlers
            for _, f_tuple, _ in files:
                f_tuple[1].close()

            return res.status_code in (200, 201, 202)
        except Exception as e:
            print(f"[CVAT Client] Error uploading image files to task: {e}")
            return False

    def upload_annotations(self, task_id: int, annotations_data: Dict[str, Any]) -> bool:
        """Đẩy nhãn pre-label vào Task của CVAT."""
        if not self.is_connected:
            self.authenticate()

        try:
            url = f"{self.host}/api/tasks/{task_id}/annotations"
            params = {"action": "create"}
            res = self.session.patch(url, params=params, json=annotations_data, timeout=30)
            return res.status_code in (200, 201, 202)
        except Exception as e:
            print(f"[CVAT Client] Error pushing annotations to task: {e}")
            return False

    def get_task_annotations(self, task_id: int) -> Optional[Dict[str, Any]]:
        """Lấy toàn bộ annotations hiện tại của Task (dùng khi annotator đã sửa xong)."""
        if not self.is_connected:
            self.authenticate()

        try:
            url = f"{self.host}/api/tasks/{task_id}/annotations"
            res = self.session.get(url, timeout=15)
            if res.status_code == 200:
                return res.json()
            return None
        except Exception as e:
            print(f"[CVAT Client] Error getting annotations from task: {e}")
            return None

    def list_tasks(self) -> List[Dict[str, Any]]:
        """Lấy danh sách các tasks gần đây trên CVAT."""
        if not self.is_connected:
            self.authenticate()

        try:
            url = f"{self.host}/api/tasks"
            res = self.session.get(url, params={"page_size": 20}, timeout=10)
            if res.status_code == 200:
                data = res.json()
                return data.get("results", [])
            return []
        except Exception as e:
            print(f"[CVAT Client] Error listing tasks: {e}")
            return []

cvat_client = CVATClient()
