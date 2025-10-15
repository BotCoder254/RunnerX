import api from './api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

// AI Summary Service
export const aiSummaryService = {
  // Generate AI summary for an incident
  generateSummary: async (incidentId) => {
    try {
      const response = await api.post('/incidents/summary', {
        incident_id: incidentId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to generate AI summary:', error);
      throw error;
    }
  },

  // Get existing AI summary for an incident
  getSummary: async (incidentId) => {
    try {
      const response = await api.post('/incidents/summary', {
        incident_id: incidentId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get AI summary:', error);
      throw error;
    }
  }
};

// SLA Service
export const slaService = {
  // Get SLA reports for user
  getSLAReports: async (days = 30) => {
    try {
      const response = await api.get(`/sla?days=${days}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get SLA reports:', error);
      throw error;
    }
  },

  // Get SLA reports for specific monitor
  getMonitorSLAReports: async (monitorId, days = 30) => {
    try {
      const response = await api.get(`/sla/${monitorId}?days=${days}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get monitor SLA reports:', error);
      throw error;
    }
  },

  // Generate SLA reports manually
  generateSLAReports: async (monitorId = null, days = 1) => {
    try {
      const response = await api.post('/sla/generate', {
        monitor_id: monitorId,
        days: days
      });
      return response.data;
    } catch (error) {
      console.error('Failed to generate SLA reports:', error);
      throw error;
    }
  }
};
