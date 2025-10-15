import api from './api';

export const incidentsService = {
  async listForMonitor(monitorId) {
    const res = await api.get(`/incidents/${monitorId}`);
    return res.data || [];
  }
};


