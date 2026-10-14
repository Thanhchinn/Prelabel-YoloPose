const API_BASE = "http://localhost:8000/api";

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error("Backend connection failed");
    return res.json();
  },

  async getConfig() {
    const res = await fetch(`${API_BASE}/config`);
    if (!res.ok) throw new Error("Failed to fetch system config");
    return res.json();
  },

  async getModels() {
    const res = await fetch(`${API_BASE}/models`);
    if (!res.ok) throw new Error("Failed to fetch available models");
    return res.json();
  },

  async uploadImages(files) {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    const res = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  },

  async listImages() {
    const res = await fetch(`${API_BASE}/images`);
    if (!res.ok) throw new Error("Failed to load images");
    return res.json();
  },

  async resetWorkspace(payload = {}) {
    const res = await fetch(`${API_BASE}/workspace/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to reset workspace");
    return res.json();
  },

  async getImagePrediction(imageName) {
    const res = await fetch(`${API_BASE}/images/${encodeURIComponent(imageName)}/prediction`);
    if (!res.ok) return null;
    return res.json();
  },

  async predict(config = {}) {
    const res = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error("Inference failed");
    return res.json();
  },

  async syncToCVAT(payload) {
    const res = await fetch(`${API_BASE}/cvat/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "CVAT sync failed");
    }
    return res.json();
  },

  async getCVATConfig() {
    const res = await fetch(`${API_BASE}/cvat/config`);
    if (!res.ok) throw new Error("Failed to fetch CVAT config");
    return res.json();
  },

  async updateCVATConfig(payload) {
    const res = await fetch(`${API_BASE}/cvat/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || data.message || "Cập nhật cấu hình CVAT thất bại");
    }
    return data;
  },

  async listCVATTasks(filter = "studio") {
    const res = await fetch(`${API_BASE}/cvat/tasks?filter=${filter}`);
    if (!res.ok) throw new Error("Failed to fetch CVAT tasks");
    return res.json();
  },

  async pullFromCVAT(taskId) {
    const res = await fetch(`${API_BASE}/cvat/tasks/${taskId}/pull`, {
      method: "POST",
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Không thể kéo nhãn từ CVAT Task");
    }
    return res.json();
  },

  async evaluateMetrics(taskId = 1, modelType = "yolo") {
    const res = await fetch(`${API_BASE}/metrics/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: taskId, model_type: modelType }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Metrics evaluation failed");
    }
    return res.json();
  },

  async exportDataset(taskId = 1, datasetName = "yolo26_dataset", valRatio = 0.2) {
    const res = await fetch(`${API_BASE}/dataset/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task_id: taskId,
        dataset_name: datasetName,
        val_ratio: valRatio,
      }),
    });
    if (!res.ok) throw new Error("Dataset export failed");
    return res.json();
  },
};
