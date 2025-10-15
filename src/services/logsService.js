import api from './api';

export const logsService = {
  async getInsights(incidentId, q = '') {
    const params = {};
    if (q && q.trim()) params.q = q.trim();
    const res = await api.get(`/logs/${encodeURIComponent(incidentId)}`, { params });
    return res.data;
  }
};


