import api from './api';

export const screenshotsService = {
  async getLatestBlob(incidentId) {
    const res = await api.get(`/screenshots/${encodeURIComponent(incidentId)}`, { responseType: 'blob' });
    return res.data; // Blob
  }
  ,
  async triggerCapture(incidentId) {
    await api.post(`/screenshots/${encodeURIComponent(incidentId)}/capture`);
  }
};


