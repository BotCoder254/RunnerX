import api from './api';

export const snapshotsService = {
  async getRecent(monitorId) {
    const res = await api.get(`/snapshots/${monitorId}`);
    return res.data || [];
  }
};


