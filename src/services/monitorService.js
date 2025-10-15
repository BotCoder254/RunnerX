import api from './api';

export const monitorService = {
  async getMonitors() {
    const response = await api.get('/monitors');
    return response.data;
  },

  async getMonitor(id) {
    const response = await api.get(`/monitor/${id}`);
    return response.data;
  },

  async createMonitor(monitorData) {
    const response = await api.post('/monitor', monitorData);
    return response.data;
  },

  async updateMonitor(id, monitorData) {
    const response = await api.put(`/monitor/${id}`, monitorData);
    return response.data;
  },

  async deleteMonitor(id) {
    const response = await api.delete(`/monitor/${id}`);
    return response.data;
  },

  async toggleMonitor(id, enabled) {
    const response = await api.patch(`/monitor/${id}/toggle`, { enabled });
    return response.data;
  },

  async getMonitorStats(id) {
    const response = await api.get(`/monitor/${id}/stats`);
    return response.data;
  },

  async getMonitorHistory(id, days = 7) {
    const response = await api.get(`/monitor/${id}/history?days=${days}`);
    return response.data;
  },

  async testMonitor(monitorData) {
    const response = await api.post('/monitor/test', monitorData);
    return response.data;
  },

  // Save draft to localStorage
  saveDraft(draft) {
    localStorage.setItem('monitor_draft', JSON.stringify(draft));
  },

  // Load draft from localStorage
  loadDraft() {
    const draft = localStorage.getItem('monitor_draft');
    return draft ? JSON.parse(draft) : null;
  },

  // Clear draft
  clearDraft() {
    localStorage.removeItem('monitor_draft');
  },
};
