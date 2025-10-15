export const MONITOR_TYPES = {
  HTTP: 'http',
  PING: 'ping',
  TCP: 'tcp',
  DNS: 'dns',
};

export const MONITOR_STATUS = {
  UP: 'up',
  DOWN: 'down',
  PAUSED: 'paused',
  PENDING: 'pending',
};

export const INTERVALS = [
  { label: '30 seconds', value: 30 },
  { label: '1 minute', value: 60 },
  { label: '2 minutes', value: 120 },
  { label: '5 minutes', value: 300 },
  { label: '10 minutes', value: 600 },
  { label: '15 minutes', value: 900 },
  { label: '30 minutes', value: 1800 },
  { label: '1 hour', value: 3600 },
];

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export const STATUS_COLORS = {
  up: {
    bg: 'bg-success-50 dark:bg-success-900/20',
    text: 'text-success-700 dark:text-success-400',
    border: 'border-success-500',
    ring: 'ring-success-500',
  },
  down: {
    bg: 'bg-danger-50 dark:bg-danger-900/20',
    text: 'text-danger-700 dark:text-danger-400',
    border: 'border-danger-500',
    ring: 'ring-danger-500',
  },
  paused: {
    bg: 'bg-neutral-100 dark:bg-neutral-800',
    text: 'text-neutral-600 dark:text-neutral-400',
    border: 'border-neutral-400',
    ring: 'ring-neutral-400',
  },
  pending: {
    bg: 'bg-warning-50 dark:bg-warning-900/20',
    text: 'text-warning-700 dark:text-warning-400',
    border: 'border-warning-500',
    ring: 'ring-warning-500',
  },
};

