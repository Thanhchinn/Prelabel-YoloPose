from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class KeypointItem(BaseModel):
    id: int
    name: str
    x: float
    y: float
    conf: float
    visible: int = Field(default=2, description="0: hidden, 1: occluded, 2: visible")

class PersonPose(BaseModel):
    person_id: int
    bbox: List[float] = Field(description="[x1, y1, x2, y2]")
    score: float
    keypoints: List[KeypointItem]

class ImagePredictionResult(BaseModel):
    image_name: str
    image_url: str
    width: int
    height: int
    person_count: int
    model_name: Optional[str] = "YOLO 26 Pose"
    model_type: Optional[str] = "yolo"
    predictions: List[PersonPose]

class BatchPredictResponse(BaseModel):
    total_images: int
    model_type: Optional[str] = "yolo"
    results: List[ImagePredictionResult]

class PredictConfig(BaseModel):
    conf_threshold: Optional[float] = 0.5
    kpt_conf_threshold: Optional[float] = 0.5
    model_type: Optional[str] = "yolo"  # "yolo" | "rtmpose" | "vitpose"
    image_names: Optional[List[str]] = None

class ModelInfo(BaseModel):
    id: str
    name: str
    family: str
    speed: str
    ap_score: str
    badge: str
    description: str

class CVATTaskCreateRequest(BaseModel):
    task_name: str
    image_names: Optional[List[str]] = None
    include_prelabels: bool = True
    model_type: Optional[str] = "yolo"

class CVATTaskResponse(BaseModel):
    task_id: int
    task_name: str
    cvat_url: str
    image_count: int
    status: str
    message: str

class KeypointMetricDetail(BaseModel):
    name: str
    pck: float
    correction_rate: float
    mean_error_px: float

class MetricsRequest(BaseModel):
    task_id: int
    model_type: Optional[str] = "yolo"

class MetricsResponse(BaseModel):
    task_id: int
    model_name: Optional[str] = "YOLO 26 Pose"
    model_type: Optional[str] = "yolo"
    total_skeletons: int
    pck_overall: float
    nme_overall: float
    correction_rate_overall: float
    details: List[KeypointMetricDetail]

class RetrainExportRequest(BaseModel):
    task_id: int
    dataset_name: Optional[str] = "yolo26_dataset"
    val_ratio: Optional[float] = 0.2

class RetrainExportResponse(BaseModel):
    success: bool
    dataset_name: str
    dataset_path: str
    yaml_path: str
    train_samples: int
    val_samples: int
    message: str

class WorkspaceResetRequest(BaseModel):
    is_viewing_task: bool = False
    task_id: Optional[int] = None
    task_name: Optional[str] = None

class CVATConfigRequest(BaseModel):
    host: str = "http://localhost:8080"
    username: str
    password: Optional[str] = None

class CVATConfigResponse(BaseModel):
    host: str
    username: str
    is_authenticated: bool
    server_online: bool
    server_version: Optional[str] = None
    last_error: Optional[str] = None

