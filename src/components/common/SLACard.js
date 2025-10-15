import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  ChevronDown,
  ChevronUp,
  BarChart3
} from 'lucide-react';
import SLAProgressRing from './SLAProgressRing';
import { slaService } from '../../services/aiSummaryService';

const SLACard = ({ monitorId, monitorName, isMobile = false }) => {
  const [slaData, setSlaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(!isMobile);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (monitorId) {
      loadSLAData();
    }
  }, [monitorId]);

  const loadSLAData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await slaService.getMonitorSLAReports(monitorId, 30);
      if (data && data.length > 0) {
        // Get the most recent report
        const latestReport = data[0];
        setSlaData(latestReport);
      } else {
        setError('No SLA data available');
      }
    } catch (err) {
      setError('Failed to load SLA data');
      console.error('SLA Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'compliant':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'violation':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-neutral-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'compliant':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'violation':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-neutral-600 dark:text-neutral-400';
    }
  };

  const formatDowntime = (minutes) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700"
      >
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-neutral-400" />
          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
            SLA Status
          </span>
        </div>
        <div className="flex items-center justify-center h-24">
          <div className="w-8 h-8 border-2 border-neutral-300 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700"
      >
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-red-500" />
          <span className="text-sm font-medium text-red-600 dark:text-red-400">
            SLA Error
          </span>
        </div>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={loadSLAData}
          className="mt-2 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
        >
          Try again
        </button>
      </motion.div>
    );
  }

  if (!slaData) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            SLA Status
          </span>
          {getStatusIcon(slaData.status)}
        </div>
        
        {isMobile && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            )}
          </button>
        )}
      </div>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="px-4 pb-4"
          >
            {/* Progress Ring */}
            <div className="flex justify-center mb-4">
              <SLAProgressRing
                uptimePercent={slaData.uptime_percent}
                size={isMobile ? 100 : 120}
                strokeWidth={isMobile ? 6 : 8}
                isMobile={isMobile}
                showTooltip={!isMobile}
              />
            </div>

            {/* Status */}
            <div className="text-center mb-4">
              <div className={`text-sm font-medium ${getStatusColor(slaData.status)}`}>
                {slaData.status?.charAt(0).toUpperCase() + slaData.status?.slice(1)} SLA
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Target: {slaData.sla_threshold}%
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-3">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-neutral-500 dark:text-neutral-400">Uptime</span>
                </div>
                <div className="font-semibold text-neutral-700 dark:text-neutral-300">
                  {slaData.uptime_percent.toFixed(3)}%
                </div>
              </div>
              
              <div className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-3">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingDown className="w-3 h-3 text-red-500" />
                  <span className="text-neutral-500 dark:text-neutral-400">Downtime</span>
                </div>
                <div className="font-semibold text-neutral-700 dark:text-neutral-300">
                  {formatDowntime(slaData.downtime_minutes)}
                </div>
              </div>
            </div>

            {/* Violations */}
            {slaData.sla_violations > 0 && (
              <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-2 text-xs">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  <span className="text-red-600 dark:text-red-400">
                    {slaData.sla_violations} SLA violation{slaData.sla_violations !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )}

            {/* Details Toggle */}
            <div className="mt-3 text-center">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
            </div>

            {/* Additional Details */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700"
                >
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 space-y-1">
                    <div>Report Date: {new Date(slaData.report_date).toLocaleDateString()}</div>
                    <div>Monitor: {monitorName}</div>
                    <div>Threshold: {slaData.sla_threshold}%</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SLACard;
