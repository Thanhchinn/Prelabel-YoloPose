import os
import sys
import time
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
        self.is_authenticated = False
        self.last_error: Optional[str] = None
        self.server_version: Optional[str] = None

    def _ensure_authenticated(self) -> bool:
        """Đảm bảo session có auth token hợp lệ."""
        if not self.auth_token or not self.is_authenticated:
            # Tải lại username/password mới nhất từ config nếu có thay đổi
            from config import CVAT_HOST, CVAT_USER, CVAT_PASS
            self.host = CVAT_HOST.rstrip("/")
            self.username = CVAT_USER
            self.password = CVAT_PASS
            return self.authenticate()
        return True

    def check_connection(self) -> Dict[str, Any]:
        """Kiểm tra xem CVAT Local có đang hoạt động hay không."""
        try:
            res = requests.get(f"{self.host}/api/server/about", timeout=2)
            if res.status_code == 200:
                data = res.json()
                self.server_version = data.get("version")
                return {"online": True, "details": data, "version": self.server_version}
        except Exception as e:
            return {"online": False, "error": str(e)}
        return {"online": False, "error": "Unknown status"}

    def authenticate(self, username: Optional[str] = None, password: Optional[str] = None, host: Optional[str] = None) -> bool:
        """Đăng nhập vào CVAT để lấy Session hoặc Token."""
        if host:
            self.host = host.rstrip("/")
        if username:
            self.username = username
        if password is not None:
            self.password = password

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
                self.is_authenticated = True
                self.last_error = None
                print(f"[CVAT Client] Authenticated successfully as '{self.username}'.")
                return True
            else:
                self.is_authenticated = False
                # Bóc tách lỗi chi tiết từ CVAT API
                err_text = res.text
                if res.status_code == 400 and ("non_field_errors" in err_text or "credentials" in err_text):
                    self.last_error = f"Sai tài khoản hoặc mật khẩu CVAT ({self.username})."
                else:
                    self.last_error = f"CVAT trả về lỗi {res.status_code}: {err_text[:120]}"
                print(f"[CVAT Client] Login failed: {self.last_error}")
                return False
        except requests.exceptions.ConnectionError:
            self.is_authenticated = False
            self.last_error = f"Không thể kết nối đến máy chủ CVAT tại {self.host}. Vui lòng kiểm tra CVAT đã bật chưa."
            print(f"[CVAT Client] Connection error: {self.last_error}")
            return False
        except Exception as e:
            self.is_authenticated = False
            self.last_error = f"Lỗi kết nối khi xác thực CVAT: {e}"
            print(f"[CVAT Client] Error during auth: {self.last_error}")
            return False

    def test_and_apply(self, host: str, username: str, password: str) -> Dict[str, Any]:
        """Kiểm tra thông tin đăng nhập mới và áp dụng ngay nếu thành công."""
        from config import update_cvat_env
        norm_host = host.strip().rstrip("/")
        norm_user = username.strip()

        # Kiểm tra máy chủ có chạy không
        try:
            chk = requests.get(f"{norm_host}/api/server/about", timeout=2)
            if chk.status_code != 200:
                return {
                    "success": False,
                    "message": f"Máy chủ CVAT tại {norm_host} phản hồi mã lỗi {chk.status_code}."
                }
        except Exception as e:
            return {
                "success": False,
                "message": f"Không thể kết nối tới máy chủ CVAT tại {norm_host}: {e}"
            }

        # Thử đăng nhập với thông tin mới
        auth_ok = self.authenticate(username=norm_user, password=password, host=norm_host)
        if not auth_ok:
            return {
                "success": False,
                "message": self.last_error or "Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu."
            }

        # Lưu vào .env và runtime
        update_cvat_env(norm_host, norm_user, password)
        return {
            "success": True,
            "message": f"Xác thực CVAT thành công với tài khoản '{norm_user}'!",
            "host": norm_host,
            "username": norm_user
        }

    def get_task_label_map(self, task_id: int) -> Dict[str, int]:
        """Lấy ánh xạ từ tên label/sublabel sang label_id trên CVAT."""
        self._ensure_authenticated()
        try:
            url = f"{self.host}/api/labels?task_id={task_id}"
            res = self.session.get(url, timeout=10)
            if res.status_code == 200:
                results = res.json().get("results", [])
                label_map = {}
                for r in results:
                    label_map[r.get("name")] = r.get("id")
                    for s in r.get("sublabels", []):
                        label_map[s.get("name")] = s.get("id")
                return label_map
        except Exception as e:
            print(f"[CVAT Client] Error fetching task label map: {e}")
        return {}

    def create_task(self, task_name: str) -> Optional[int]:
        """Tạo mới một Task trên CVAT với cấu trúc Skeleton 17 điểm COCO."""
        if not self._ensure_authenticated():
            print(f"[CVAT Client] Cannot create task: Authentication failed ({self.last_error}).")
            return None

        labels = AnnotationConverter.get_cvat_skeleton_spec()
        payload = {
            "name": task_name,
            "labels": labels,
            "project_id": None
        }

        try:
            url = f"{self.host}/api/tasks"
            res = self.session.post(url, json=payload, timeout=10)
            if res.status_code == 401:
                # Token hết hạn hoặc chưa nhận, thử login lại 1 lần
                self.authenticate()
                res = self.session.post(url, json=payload, timeout=10)

            if res.status_code in (200, 201):
                task_data = res.json()
                self.last_error = None
                return task_data.get("id")
            else:
                self.last_error = f"Lỗi tạo task ({res.status_code}): {res.text[:120]}"
                print(f"[CVAT Client] Create task failed: {self.last_error}")
                return None
        except Exception as e:
            self.last_error = f"Lỗi kết nối tạo task: {e}"
            print(f"[CVAT Client] Error creating task: {self.last_error}")
            return None

    def upload_task_data(self, task_id: int, image_paths: List[Path]) -> bool:
        """Tải các file ảnh lên Task của CVAT và chờ CVAT import xong các frames."""
        self._ensure_authenticated()

        opened_files = []
        files = []
        try:
            url = f"{self.host}/api/tasks/{task_id}/data"
            for idx, img_p in enumerate(image_paths):
                f_handle = open(str(img_p), "rb")
                opened_files.append(f_handle)
                mime = "image/png" if img_p.suffix.lower() == ".png" else "image/jpeg"
                files.append((f"client_files[{idx}]", (img_p.name, f_handle, mime)))

            data = {
                "image_quality": 85,
                "use_zip_chunks": False
            }

            res = self.session.post(url, data=data, files=files, timeout=60)
            if res.status_code not in (200, 201, 202):
                print(f"[CVAT Client] Upload data failed: {res.status_code} - {res.text}")
                return False

            # Nếu CVAT xử lý bất đồng bộ (202), chờ cho task import xong
            if res.status_code == 202:
                rq_id = res.json().get("rq_id")
                if rq_id:
                    ok = self._wait_for_request_finished(rq_id, max_seconds=30)
                    if not ok:
                        self.last_error = "CVAT xử lý import ảnh quá thời gian hoặc thất bại."
                        return False

            self.last_error = None
            return True
        except Exception as e:
            self.last_error = f"Lỗi gửi ảnh lên task CVAT: {e}"
            print(f"[CVAT Client] Error uploading image files to task: {e}")
            return False
        finally:
            for f in opened_files:
                try:
                    f.close()
                except Exception:
                    pass

    def _wait_for_request_finished(self, rq_id: str, max_seconds: int = 30) -> bool:
        """Chờ CVAT xử lý xong dữ liệu ảnh."""
        url = f"{self.host}/api/requests/{rq_id}"
        start_time = time.time()
        while time.time() - start_time < max_seconds:
            try:
                res = self.session.get(url, timeout=5)
                if res.status_code == 200:
                    status = res.json().get("status")
                    if status == "finished":
                        return True
                    elif status == "failed":
                        err_msg = res.json().get("message", "Unknown error")
                        self.last_error = f"CVAT báo lỗi import dữ liệu: {err_msg}"
                        print(f"[CVAT Client] Data processing failed: {err_msg}")
                        return False
            except Exception:
                pass
            time.sleep(1)
        self.last_error = "Hết thời gian chờ CVAT import dữ liệu ảnh."
        return False

    def upload_annotations(self, task_id: int, annotations_data: Dict[str, Any]) -> bool:
        """Đẩy nhãn pre-label vào Task của CVAT kèm cơ chế tự động thử lại nếu CVAT đang bận."""
        self._ensure_authenticated()

        url = f"{self.host}/api/tasks/{task_id}/annotations"
        params = {"action": "create"}

        for attempt in range(2):
            try:
                res = self.session.patch(url, params=params, json=annotations_data, timeout=30)
                if res.status_code in (200, 201, 202):
                    print(f"[CVAT Client] Pre-labels pushed successfully to Task {task_id}.")
                    self.last_error = None
                    return True
                else:
                    self.last_error = f"Push nhãn thất bại ({res.status_code}): {res.text[:120]}"
                    print(f"[CVAT Client] Attempt {attempt+1} push annotations failed: {self.last_error}")
                    if attempt == 0:
                        time.sleep(1.5)
            except Exception as e:
                self.last_error = f"Lỗi kết nối khi đẩy nhãn: {e}"
                print(f"[CVAT Client] Attempt {attempt+1} error pushing annotations: {e}")
                if attempt == 0:
                    time.sleep(1.5)

        return False

    def get_task_annotations(self, task_id: int) -> Optional[Dict[str, Any]]:
        """Lấy toàn bộ annotations hiện tại của Task (dùng khi annotator đã sửa xong)."""
        self._ensure_authenticated()

        try:
            url = f"{self.host}/api/tasks/{task_id}/annotations"
            res = self.session.get(url, timeout=15)
            if res.status_code == 200:
                return res.json()
            return None
        except Exception as e:
            print(f"[CVAT Client] Error getting annotations from task: {e}")
            return None

    def list_tasks(self, filter_prefix: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lấy danh sách các tasks trên CVAT. Nếu filter_prefix được chỉ định, chỉ trả về tasks có tên bắt đầu bằng prefix đó."""
        self._ensure_authenticated()

        try:
            url = f"{self.host}/api/tasks"
            params = {"page_size": 100, "sort": "-id"}
            if filter_prefix:
                params["search"] = filter_prefix
            res = self.session.get(url, params=params, timeout=10)
            if res.status_code == 200:
                data = res.json()
                results = data.get("results", [])
                if filter_prefix:
                    results = [t for t in results if t.get("name", "").startswith(filter_prefix)]
                return results
            return []
        except Exception as e:
            print(f"[CVAT Client] Error listing tasks: {e}")
            return []

    def get_task_meta(self, task_id: int) -> Optional[Dict[str, Any]]:
        """Lấy metadata các frames của Task từ CVAT."""
        self._ensure_authenticated()

        try:
            url = f"{self.host}/api/tasks/{task_id}/data/meta"
            res = self.session.get(url, timeout=10)
            if res.status_code == 200:
                return res.json()
            return None
        except Exception as e:
            print(f"[CVAT Client] Error getting task meta: {e}")
            return None

    def download_task_frame(self, task_id: int, frame_idx: int) -> Optional[bytes]:
        """Tải dữ liệu ảnh gốc của một frame cụ thể trong Task từ CVAT."""
        self._ensure_authenticated()

        try:
            url = f"{self.host}/api/tasks/{task_id}/data"
            params = {"type": "frame", "quality": "original", "number": frame_idx}
            res = self.session.get(url, params=params, timeout=20)
            if res.status_code == 200:
                return res.content
            print(f"[CVAT Client] Failed to download frame {frame_idx}: {res.status_code}")
            return None
        except Exception as e:
            print(f"[CVAT Client] Error downloading frame {frame_idx} for task {task_id}: {e}")
            return None

cvat_client = CVATClient()
