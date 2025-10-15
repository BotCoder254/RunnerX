import api from './api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

// Command Service
export const commandService = {
  // Execute a command
  executeCommand: async (type, target, monitorId = null) => {
    try {
      const response = await api.post('/commands/execute', {
        type: type,
        target: target,
        monitor_id: monitorId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to execute command:', error);
      throw error;
    }
  },

  // Get command history
  getCommandHistory: async (limit = 50) => {
    try {
      const response = await api.get(`/commands/history?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get command history:', error);
      throw error;
    }
  },

  // Get available commands
  getAvailableCommands: async () => {
    try {
      const response = await api.get('/commands/available');
      return response.data;
    } catch (error) {
      console.error('Failed to get available commands:', error);
      throw error;
    }
  }
};
