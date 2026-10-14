import sys
import subprocess
import shutil
from pathlib import Path
from typing import Dict, Any

try:
    import torch
except ImportError:
    torch = None

def get_hardware_info() -> Dict[str, Any]:
    """
    Tự động phát hiện cấu hình phần cứng:
    - GPU NVIDIA (CUDA) nếu có PyTorch CUDA.
    - Phát hiện GPU rời qua nvidia-smi nếu PyTorch chưa cài bản CUDA.
    - CPU info và bộ nhớ RAM.
    - Đưa ra khuyến nghị thông số training tối ưu (Safe Batch, ImgSize, Epochs).
    """
    info = {
        "cuda_available": False,
        "device": "cpu",
        "device_name": "CPU",
        "vram_gb": 0.0,
        "has_nvidia_gpu": False,
        "nvidia_gpu_name": None,
        "nvidia_smi_vram_gb": 0.0,
        "tier": "cpu", # 'high' (>=6GB), 'medium' (4-6GB), 'cpu'
        "cuda_torch_installed": False,
        "recommendations": {
            "preset": "fast",
            "epochs": 20,
            "yolo_batch": 4,
            "rtm_batch": 4,
            "vit_batch": 2,
            "imgsz": 512,
            "workers": 0,
            "mixed_precision": False,
            "note": "Hệ thống đang chạy chế độ CPU tối ưu nhẹ nhàng, không gây lag máy."
        }
    }

    # 1. Kiểm tra qua PyTorch CUDA
    if torch is not None and torch.cuda.is_available():
        info["cuda_available"] = True
        info["cuda_torch_installed"] = True
        info["device"] = "cuda"
        dev_name = torch.cuda.get_device_name(0)
        vram = round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 2)
        info["device_name"] = dev_name
        info["vram_gb"] = vram
        info["has_nvidia_gpu"] = True
        info["nvidia_gpu_name"] = dev_name

        if vram >= 6.0:
            info["tier"] = "high"
            info["recommendations"] = {
                "preset": "balanced",
                "epochs": 30,
                "yolo_batch": 8,
                "rtm_batch": 8,
                "vit_batch": 4,
                "imgsz": 640,
                "workers": 2,
                "mixed_precision": True,
                "note": f"GPU {dev_name} ({vram}GB VRAM) rất mạnh, tự động bật tăng tốc CUDA FP16."
            }
        elif vram >= 3.5:
            info["tier"] = "medium"
            info["recommendations"] = {
                "preset": "balanced",
                "epochs": 25,
                "yolo_batch": 4,
                "rtm_batch": 4,
                "vit_batch": 2,
                "imgsz": 512,
                "workers": 2,
                "mixed_precision": True,
                "note": f"GPU {dev_name} ({vram}GB VRAM), thiết lập batch=4 để tránh tràn VRAM."
            }
        return info

    # 2. Kiểm tra phần cứng card rời qua nvidia-smi (kể cả khi torch cài bản CPU)
    if shutil.which("nvidia-smi"):
        try:
            res = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=3
            )
            if res.returncode == 0 and res.stdout.strip():
                line = res.stdout.strip().split("\n")[0]
                parts = line.split(",")
                if len(parts) >= 2:
                    gpu_name = parts[0].strip()
                    total_mb = float(parts[1].strip())
                    total_gb = round(total_mb / 1024.0, 2)
                    info["has_nvidia_gpu"] = True
                    info["nvidia_gpu_name"] = gpu_name
                    info["nvidia_smi_vram_gb"] = total_gb
                    info["device_name"] = f"CPU (Phát hiện phần cứng {gpu_name} {total_gb}GB)"
        except Exception:
            pass

    # Khuyến nghị an toàn cho môi trường CPU
    info["recommendations"] = {
        "preset": "fast",
        "epochs": 20,
        "yolo_batch": 4,
        "rtm_batch": 4,
        "vit_batch": 2,
        "imgsz": 512,
        "workers": 0,
        "mixed_precision": False,
        "note": "Hệ thống chạy trên CPU với cấu hình nhẹ (20 epochs, batch 4), hoàn thành nhanh trong vài phút."
    }
    return info

if __name__ == "__main__":
    import json
    print(json.dumps(get_hardware_info(), indent=2, ensure_ascii=False))
