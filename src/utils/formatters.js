export const formatLatency = (ms) => {
  if (ms === null || ms === undefined) return 'N/A';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export const formatUptime = (percentage) => {
  if (percentage === null || percentage === undefined) return 'N/A';
  return `${percentage.toFixed(2)}%`;
};

export const formatDate = (dateString) => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
};

export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString();
};

export const getStatusLabel = (status) => {
  const labels = {
    up: 'Online',
    down: 'Offline',
    paused: 'Paused',
    pending: 'Pending',
  };
  return labels[status] || 'Unknown';
};

export const truncateUrl = (url, maxLength = 40) => {
  if (!url || url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
};

