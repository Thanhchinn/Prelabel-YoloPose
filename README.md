# POSEFLOW AI - NỀN TẢNG TIỀN GÁN NHÃN MULTI-MODEL POSE 17 KEYPOINTS & CVAT LOCAL

> Hệ thống tự động tiền gán nhãn khung xương người (17 điểm COCO) hỗ trợ đồng thời 3 kiến trúc mô hình hàng đầu: **YOLO 26 Pose**, **RTMPose-m (OpenMMLab)** và **ViTPose-Base (Vision Transformer)**, tích hợp 2 chiều với **CVAT Local** và vòng lặp huấn luyện lại tự động (Active Learning).

---

## 🚀 CÁC TÍNH NĂNG CHÍNH

1. **Pre-label Studio (Xưởng Gán Nhãn Đa Mô Hình)**:
   - Cho phép chuyển đổi nhanh 1-click giữa 3 mô hình:
     - ⚡ **YOLO 26 Pose**: Tốc độ siêu nhanh (~15-30ms), tối ưu cho hàng loạt và camera thời gian thực.
     - 🚀 **RTMPose-m (OpenMMLab)**: SOTA 2023-2024 SimCC, cân bằng tối ưu giữa tốc độ và độ chuẩn xác (75.8 mAP), giảm ~40% công sức sửa tay.
     - 🧠 **ViTPose-Base (Vision Transformer)**: Độ chuẩn xác cao nhất (77.4+ mAP), tự tin xử lý các góc khuất và tư thế khó.
   - **Interactive Canvas**: Xem trước ảnh vẽ bounding box, khung xương 17 điểm với màu sắc COCO trực quan, hiển thị badge model và layer toggles.

2. **CVAT Task Hub (Đồng Bộ 2 Chiều Với CVAT Local)**:
   - 1-click tạo Task trên CVAT Local với cấu trúc **Skeleton shape 17 điểm**.
   - Tải ảnh và nạp sẵn nhãn dự đoán từ AI vào CVAT.
   - Kéo nhãn đã sửa (bao gồm cờ che khuất **Occluded**) từ CVAT về Web Studio.

3. **Quality & Metrics (Đo Lường Độ Chuẩn Xác & Công Sức Gán Nhãn)**:
   - Đo lường khách quan chất lượng nhãn dự đoán so với nhãn annotator đã sửa trên CVAT.
   - Chỉ số **PCK@0.2** (Percentage of Correct Keypoints) và **NME** (Normalized Mean Error).
   - **Human Correction Rate**: Thống kê tỷ lệ sửa đổi trên từng khớp xương (cổ tay, đầu gối, mắt cá chân,...).

4. **Model Benchmark (Ma Trận So Sánh & Thử Nghiệm 3 Models)**:
   - Bảng đối chiếu định lượng kỹ thuật (Decision Matrix): Latency, mAP, Params, Occlusion Robustness, Retrain Complexity.
   - **Playground Benchmark 1-Click**: Chạy thử nghiệm đồng thời cả 3 mô hình trên cùng 1 ảnh để đo lường độ trễ thực tế và độ tin cậy.

5. **Active Learning & Retraining Pipeline**:
   - Nút **`📦 Xuất Dataset Retrain`**: Kéo nhãn Ground Truth annotator đã sửa xong từ CVAT về, tự động chia `train/` (80%), `val/` (20%) và sinh file cấu hình `data.yaml`.
   - Script `backend/train_yolo26.py` để fine-tune lại model YOLO 26.

---

## 🛠️ HƯỚNG DẪN DÀNH CHO ĐỒNG ĐỘI KHI PULL VỀ (QUICK START)

### 1. Cài đặt môi trường Python
```bash
pip install -r requirements.txt
```

### 2. Tải và xác thực trọng số các mô hình (Chạy 1 lần)
Chạy script tự động tải sẵn toàn bộ checkpoints của 3 mô hình về máy để có thể chạy offline hoàn toàn:
```bash
python backend/download_models.py
```

### 3. Thiết lập biến môi trường
```bash
cp .env.example .env   # (hoặc copy .env.example thành .env trên Windows)
```

### 4. Khởi động Backend (FastAPI)
```bash
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```
* **Swagger UI API Docs**: Truy cập [http://localhost:8000/docs](http://localhost:8000/docs).

### 5. Khởi động Frontend (React + Vite + Tailwind)
```bash
cd frontend
npm install
npm run dev
```
* **Giao diện Web**: Truy cập [http://localhost:5173](http://localhost:5173).

---

## 🔄 CÁCH HUẤN LUYỆN LẠI MODEL (RETRAINING)

1. Sau khi Annotator kiểm tra và sửa nhãn xong trên CVAT Local:
2. Trên Web vào tab **CVAT Task Hub** $\rightarrow$ Bấm nút **`📦 Xuất Retrain`**.
3. Chạy lệnh fine-tune:
   ```bash
   python backend/train_yolo26.py --task-id 101 --epochs 50 --batch 16
   ```
4. Trọng số mới sẽ được tối ưu và sẵn sàng thay thế vào `backend/weights/yolo26-pose.pt` cho các đợt tiền gán nhãn tiếp theo.
