# KẾ HOẠCH KIẾN TRÚC & TRIỂN KHAI: HUẤN LUYỆN LẠI ĐA MÔ HÌNH (YOLO 26, RTMPOSE, VITPOSE) & ACTIVE LEARNING

> **Tài liệu Kỹ thuật Cấp Senior AI / System Architect**  
> **Dự án**: PoseFlow AI Studio  
> **Vị trí lưu file**: Ngay tại thư mục gốc của dự án (`KE_HOACH_RETRAIN_MULTI_MODEL.md`)  
> **Trạng thái**: Đang trong giai đoạn thảo luận — Chờ hiệu lệnh *"bắt đầu làm"* từ bạn.

---

## 1. TRẢ LỜI CỐT LÕI: CÓ TRAIN ĐƯỢC 2 MÔ HÌNH CÒN LẠI KHÔNG?

👉 **CÂU TRẢ LỜI: HOÀN TOÀN ĐƯỢC 100%! CẢ 3 MÔ HÌNH ĐỀU CÓ THỂ HUẤN LUYỆN LẠI (RETRAIN / FINE-TUNE).**

Dưới đây là cơ chế kỹ thuật cụ thể cho từng mô hình:

### 1.1. YOLO 26 Pose
* **Cách thức**: Sử dụng thư viện `ultralytics`.
* **Quy trình**: Đưa dữ liệu nhãn `labels/` chuẩn YOLO Pose và file `data.yaml` vào hàm `model.train()`.
* **Kết quả**: Xuất file trọng số PyTorch mới `weights/checkpoints/yolo_v{n}.pt`.

### 1.2. RTMPose-m (OpenMMLab) — Hoàn toàn train được!
* **Đặc thù hiện tại**: Web Studio đang đọc file ONNX (`rtmpose-m_simcc-body7.onnx`) thông qua `rtmlib`. File ONNX chỉ dùng để chạy suy luận (inference), không thể train trực tiếp trên ONNX.
* **Cách thức huấn luyện chuẩn Senior**:
  1. Chúng ta xây dựng module huấn luyện PyTorch sử dụng kiến trúc **SimCC (Coordinate Classification)** của RTMPose.
  2. Nạp trọng số PyTorch nền tảng của RTMPose-m, sau đó fine-tune trên tập dữ liệu mới (từ CVAT + Ground Truth ngoài).
  3. **Bước then chốt tự động**: Ngay khi train xong, hệ thống tự động chạy lệnh **Export ONNX** (`torch.onnx.export`) để xuất ra file `.onnx` mới (ví dụ: `rtmpose_v2.onnx`).
  4. **Kết quả**: Bộ đọc `rtmlib` hiện tại trên Web Studio có thể nạp ngay file `.onnx` mới này để chạy siêu mượt mà không cần sửa đổi bất kỳ dòng code giao diện nào!

### 1.3. ViTPose-Base (Vision Transformer) — Hoàn toàn train được!
* **Cách thức**: ViTPose trong dự án được tải từ HuggingFace Transformers (`usyd-community/vitpose-base-simple`).
* **Quy trình huấn luyện**:
  1. Sử dụng PyTorch nạp kiến trúc ViTPose.
  2. Áp dụng kỹ thuật **Freeze Backbone** (giữ cố định các tầng Transformer đầu để tiết kiệm VRAM và tránh hiện tượng "quên kiến thức cũ"), chỉ mở khóa (unfreeze) và fine-tune các tầng cuối và Pose Head với Learning Rate nhỏ ($1e-4$).
  3. **Kết quả**: Xuất checkpoint weights mới vào `weights/checkpoints/vitpose_v{n}/`. Web Studio chỉ việc nạp checkpoint này vào `AutoModelForPoseEstimation`.

---

## 2. NẠP GROUND TRUTH NGOÀI + GHÉP VỚI CVAT + ĐẾM SỐ LẦN TRAIN

### 2.1. Nạp Ground Truth có sẵn từ bên ngoài
* Giao diện sẽ có nút **"Nạp Ground Truth ngoài"**: Cho phép bạn tải lên file `.zip` chứa ảnh và file nhãn có sẵn (chuẩn COCO Keypoints JSON hoặc YOLO `.txt`).
* Backend tự động phân tích cú pháp (parse) và xác thực đủ 17 khớp chuẩn COCO.

### 2.2. Bộ Hợp Nhất Dữ Liệu (Dataset Merger Hub)
* Có nút **"Hợp nhất Dataset"**:
  * Gom toàn bộ ảnh/nhãn vừa xuất từ CVAT (đã được bạn hoặc đồng đội sửa chuẩn) + tập Ground Truth ngoài nạp vào.
  * **Tự động khử trùng lặp (De-duplication)**: Sử dụng mã băm SHA-256 của từng bức ảnh. Nếu cùng 1 bức ảnh xuất hiện ở cả 2 nguồn, hệ thống sẽ **ưu tiên lấy nhãn từ CVAT** (vì đây là nhãn mới nhất do con người vừa hiệu chỉnh).
  * Tự động phân chia ngẫu nhiên: **80% tập Train** và **20% tập Validation (Kiểm định độc lập)**.

### 2.3. Theo dõi số lần huấn luyện & Lịch sử phiên bản (Model Lineage)
Để bạn luôn biết mô hình đã train bao nhiêu lần, hệ thống sử dụng file siêu dữ liệu trung tâm:
`backend/weights/model_registry.json`

```json
{
  "yolo": {
    "active_version": "v2",
    "total_train_runs": 2,
    "history": [
      {
        "version": "v1",
        "created_at": "2026-10-14 20:00",
        "trained_on": ["CVAT Task #61 (45 ảnh)"],
        "epochs": 30,
        "checkpoint_file": "weights/checkpoints/yolo_v1.pt",
        "metrics_pre": { "pck": 76.5, "nme": 0.058 },
        "metrics_post": { "pck": 83.2, "nme": 0.045 }
      },
      {
        "version": "v2",
        "created_at": "2026-10-15 09:30",
        "trained_on": ["CVAT Task #61", "Ground Truth Ngoài (120 ảnh)"],
        "epochs": 50,
        "checkpoint_file": "weights/checkpoints/yolo_v2.pt",
        "metrics_pre": { "pck": 83.2, "nme": 0.045 },
        "metrics_post": { "pck": 89.4, "nme": 0.036 }
      }
    ]
  },
  "rtmpose": {
    "active_version": "v1",
    "total_train_runs": 1,
    "history": [ "..." ]
  },
  "vitpose": {
    "active_version": "v1",
    "total_train_runs": 1,
    "history": [ "..." ]
  }
}
```

* **Trên Web UI**:
  * Huy hiệu trạng thái: `YOLO 26 [v2 - Đã retrain 2 lần]`
  * Menu Dropdown cho phép: Xem lại lịch sử các lần train, chuyển đổi qua lại giữa bản gốc `v0`, bản `v1`, bản `v2`, hoặc Rollback quay về nếu bản mới không ưng ý.

---

## 3. ĐO LƯỜNG & SO SÁNH ĐỘ CHÍNH XÁC TRƯỚC VÀ SAU KHI TRAIN

Hệ thống sẽ giữ lại **Tập Validation Set độc lập** (mô hình chưa từng nhìn thấy trong lúc học) để làm trọng tài chấm điểm công tâm.

### 3.1. Bảng Ma trận So sánh Trực quan

| Tiêu chí Đánh giá | Trước Train (Bản Base) | Sau Train (Bản Retrained) | Độ Cải thiện ($\Delta$) | Ý nghĩa thực tế |
| :--- | :---: | :---: | :---: | :--- |
| **PCK@0.05** | 76.2% | **86.4%** | <span style="color:green">**+10.2%**</span> | Khớp dự đoán chuẩn xác vào tâm điểm giải phẫu |
| **PCK@0.20** | 88.5% | **95.1%** | <span style="color:green">**+6.6%**</span> | Bao phủ toàn diện các tư thế khó, tay chân co gập |
| **NME (Sai số khoảng cách)** | 0.058 | **0.037** | <span style="color:green">**-36.2%**</span> | Độ lệch điểm xương giảm đáng kể |
| **Tỷ lệ Người phải Sửa Nhãn** | 28.4% | **11.5%** | <span style="color:green">**-16.9%**</span> | **Tiết kiệm gần 60% thời gian annotator phải kéo chuột sửa** |
| **Tốc độ suy luận (Latency)** | 22 ms | 22 ms | 0 ms | Tốc độ vẫn duy trì cực nhanh |

### 3.2. Visual So Sánh Trực Quan trên Ảnh
* Vẽ 3 bộ khung xương đè lên ảnh test:
  * Khung màu **Cam nhạt**: Khớp xương dự đoán Trước khi train.
  * Khung màu **Xanh lá**: Khớp xương dự đoán Sau khi train (thấy rõ được nắn chuẩn).
  * Khung màu **Xanh dương nét đứt**: Khớp xương Ground Truth thực tế.

---

## 4. BỐ TRÍ GIAO DIỆN NGƯỜI DÙNG (UI/UX)

* **Vị trí**: Tạo một Tab mới chuyên dụng trên Sidebar tên là **"Active Learning & Retrain"**.
* **Các khu vực chính**:
  1. **Khu vực 1: Chuẩn bị Dữ liệu (Data Hub)**:
     - Nút nạp Ground Truth ngoài (`.zip`).
     - Danh sách các Task CVAT có sẵn với checkbox để chọn gộp.
     - Nút "Hợp nhất & Tạo Dataset".
  2. **Khu vực 2: Phòng Điều khiển Huấn luyện (Training Control)**:
     - Chọn mô hình muốn train: `[x] YOLO 26 Pose`, `[x] RTMPose-m`, `[x] ViTPose-Base` hoặc nút "Train Toàn Bộ Cả 3".
     - Tùy chỉnh: Số Epochs (mặc định 30-50), Batch size, Learning rate.
     - Nút "Bắt đầu Huấn luyện" + Thanh tiến trình hiển thị realtime (Epoch hiện tại, Loss, Thời gian còn lại).
  3. **Khu vực 3: Lịch sử Phiên bản (Model Lineage)**:
     - Bảng ghi rõ: Model nào, Version mấy, Đã train mấy lần, Ngày nào, Trọng số lưu ở đâu.
     - Nút "Đặt làm mô hình hoạt động chính trên Studio".
  4. **Khu vực 4: Bảng So Sánh Trước & Sau (Pre vs Post Benchmark)**:
     - Bảng ma trận so sánh các chỉ số PCK, NME, Correction Rate và độ cải thiện $\Delta$.

---

## 5. TÓM TẮT QUY TRÌNH THỰC HIỆN

```text
[Bạn nạp GT ngoài] + [Bạn kéo Task CVAT]
         │
         ▼
[Dataset Merger: Khử trùng, chia 80/20]
         │
         ▼
[Chạy Đo lường Baseline Trước Train]
         │
         ▼
[Huấn luyện: YOLO (.pt) | RTMPose (-> ONNX) | ViTPose (HF)]
         │
         ▼
[Chạy Đo lường Sau Train trên cùng tập Test]
         │
         ▼
[Cập nhật model_registry.json (đếm v1, v2,...)]
         │
         ▼
[Hiển thị Bảng So sánh Trước/Sau & Chọn Active Version]
```

---
*Tài liệu này đã được lưu trực tiếp tại thư mục làm việc của bạn để tiện mở đọc. Khi nào bạn xem xong và sẵn sàng, hãy nói **"bắt đầu làm"**, tôi sẽ bắt tay vào lập trình từng phần!*
