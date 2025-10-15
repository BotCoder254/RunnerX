import React from 'react';
import { motion } from 'framer-motion';

const SLAProgressRing = ({ 
  uptimePercent, 
  size = 120, 
  strokeWidth = 8, 
  isMobile = false,
  showTooltip = true 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (uptimePercent / 100) * circumference;

  const getStatusColor = (percent) => {
    if (percent >= 99.9) return '#10b981'; // green
    if (percent >= 99.5) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getStatusText = (percent) => {
    if (percent >= 99.9) return 'Excellent';
    if (percent >= 99.5) return 'Good';
    if (percent >= 99.0) return 'Warning';
    return 'Critical';
  };

  const color = getStatusColor(uptimePercent);
  const statusText = getStatusText(uptimePercent);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-neutral-200 dark:text-neutral-700"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="drop-shadow-sm"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-center"
        >
          {isMobile ? (
            <div className="text-lg font-bold" style={{ color }}>
              {uptimePercent.toFixed(1)}%
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold" style={{ color }}>
                {uptimePercent.toFixed(1)}%
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {statusText}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Tooltip */}
      {showTooltip && !isMobile && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.3 }}
          className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-3 py-2 rounded-lg text-xs whitespace-nowrap shadow-lg z-10"
        >
          <div className="font-medium">SLA Status: {statusText}</div>
          <div className="text-neutral-300 dark:text-neutral-600">
            Uptime: {uptimePercent.toFixed(3)}%
          </div>
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-neutral-900 dark:bg-neutral-100 rotate-45"></div>
        </motion.div>
      )}
    </div>
  );
};

export default SLAProgressRing;
