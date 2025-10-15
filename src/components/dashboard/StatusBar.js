import React from 'react';
import { motion } from 'framer-motion';

const StatusBar = ({ history = [], status }) => {
  // Take last 50 checks for the bar
  const recentChecks = history.slice(-50);

  const getStatusColor = (checkStatus) => {
    switch (checkStatus) {
      case 'up':
        return 'bg-success-500 dark:bg-success-400';
      case 'down':
        return 'bg-danger-500 dark:bg-danger-400';
      default:
        return 'bg-neutral-300 dark:bg-neutral-600';
    }
  };

  return (
    <div className="h-1 w-full flex">
      {recentChecks.length > 0 ? (
        recentChecks.map((check, index) => (
          <motion.div
            key={`${check.id}-${index}`}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: index * 0.01, duration: 0.2 }}
            className={`flex-1 ${getStatusColor(check.status)}`}
            title={`${check.status} - ${check.latency_ms}ms`}
          />
        ))
      ) : (
        <div className={`w-full ${getStatusColor(status)}`} />
      )}
    </div>
  );
};

export default StatusBar;

