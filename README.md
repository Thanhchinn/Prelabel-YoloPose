# POSEFLOW AI - NỀN TẢNG TIỀN GÁN NHÃN POSE 17 KEYPOINTS VÀ TÍCH HỢP CVAT LOCAL

> Tự động tiền gán nhãn khung xương người (17 điểm COCO) bằng mô hình **YOLO 26 Pose**, đồng bộ trực tiếp sang **CVAT Local** và cung cấp vòng lặp huấn luyện lại tự động (Active Learning).

---

## 🚀 CÁC TÍNH NĂNG CHÍNH

1. **Pre-label Studio**:
   - Tải lên ảnh / thư mục ảnh (JPG, PNG, WEBP).
   - Tinh chỉnh tham số độ nhạy: *Bbox Confidence* và *Keypoint Confidence*.
   - Khởi chạy mô hình **YOLO 26 Pose** để trích xuất 17 điểm giải phẫu chuẩn COCO.
   - **Interactive Canvas**: Xem trước ảnh có vẽ bounding box và khung xương 17 điểm với màu sắc COCO trực quan (Zoom in/out, Bật/tắt nhãn tên khớp).
2. **CVAT Task Hub**:
   - 1-click tạo Task trên CVAT Local với cấu trúc **Skeleton shape 17 điểm**.
   - Tải ảnh và nạp sẵn nhãn dự đoán từ YOLO 26 vào CVAT.
   - Nút bấm trực tiếp mở thẳng task trên CVAT: `http://localhost:8080/tasks/{id}`.
3. **Active Learning & Retraining Pipeline**:
   - Nút **`📦 Xuất Dataset Retrain`**: Kéo nhãn Ground Truth annotator đã sửa xong từ CVAT về, tự động chia `train/` (80%), `val/` (20%) và sinh file cấu hình `data.yaml`.
   - Script `backend/train_yolo26.py` 1-click để fine-tune lại model YOLO 26.
4. **Quality & Analytics Dashboard**:
   - Thống kê chỉ số **PCK@0.2** (Percentage of Correct Keypoints).
   - Thống kê **Human Correction Rate** (% điểm annotator phải can thiệp sửa đổi).
   - Phân tích chi tiết độ khó của từng khớp trong 17 điểm (khớp nào hay bị che khuất nhất).

---

## 🛠️ HƯỚNG DẪN KHỞI CHẠY (QUICK START)

### 1. Khởi động Backend (FastAPI)
Mở một cửa sổ Terminal tại thư mục gốc dự án:
```bash
# Khởi động Backend server tại cổng 8000
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```
* **Swagger UI API Docs**: Truy cập [http://localhost:8000/docs](http://localhost:8000/docs) để test độc lập các API.

### 2. Khởi động Frontend (React + Vite + Tailwind)
Mở một cửa sổ Terminal thứ hai:
```bash
cd frontend
npm run dev
```
* **Giao diện Web**: Truy cập [http://localhost:3000](http://localhost:3000) hoặc link hiển thị trên terminal.

---

## 🧠 CÁCH NẠP FILE TRỌNG SỐ YOLO 26

* Đặt file checkpoint model YOLO 26 của bạn vào:
  ```
  backend/weights/yolo26-pose.pt
  ```
* Hệ thống sẽ tự động nhận diện và chuyển từ chế độ Standby sang chế độ **Live Inference**.

---

## 🔄 CÁCH HUẤN LUYỆN LẠI MODEL (RETRAINING)

1. Sau khi Annotator kiểm tra và sửa nhãn xong trên CVAT Local:
2. Trên Web vào tab **CVAT Task Hub** $\rightarrow$ Bấm nút **`📦 Xuất Retrain`**.
3. Chạy lệnh fine-tune:
   ```bash
   python backend/train_yolo26.py --task-id 101 --epochs 50 --batch 16
   ```
4. Trọng số mới sẽ được tối ưu và sẵn sàng thay thế vào `backend/weights/yolo26-pose.pt` cho các đợt tiền gán nhãn tiếp theo.
