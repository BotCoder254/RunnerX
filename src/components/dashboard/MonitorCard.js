import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Activity,
  Signal,
  MoreVertical,
  Pause,
  Play,
  Edit2,
  Trash2,
  TrendingUp,
  Clock,
} from 'lucide-react';
import WaterEffect from './WaterEffect';
import MiniChart from './MiniChart';
import { monitorService } from '../../services/monitorService';
import StatusBar from './StatusBar';
import { STATUS_COLORS } from '../../utils/constants';
import { formatLatency, formatUptime, formatDate } from '../../utils/formatters';
import { useToggleMonitor, useDeleteMonitor, useMonitorHistory } from '../../hooks/useMonitors';

const MonitorCard = ({ monitor, onEdit, onViewDetails, displayMode = 'grid' }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showWater, setShowWater] = useState(false);
  const [statusAnimation, setStatusAnimation] = useState(false);
  const toggleMonitor = useToggleMonitor();
  const deleteMonitor = useDeleteMonitor();
  const { data: history } = useMonitorHistory(monitor.id, 1);
  const [forecast, setForecast] = useState([]);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [showForecast, setShowForecast] = useState(() => {
    const pref = localStorage.getItem('show_forecast');
    return pref ? pref === 'true' : true;
  });

  useEffect(() => {
    let isMounted = true;
    monitorService.getMonitorForecast(monitor.id, 24).then((data) => {
      if (isMounted) setForecast(data || []);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [monitor.id]);

  const openSnapshot = async (e) => {
    e.stopPropagation();
    try {
      const data = await monitorService.getSnapshot(monitor.id);
      setSnapshot(data);
      setSnapshotOpen(true);
    } catch {}
  };

  // Listen for status change events
  useEffect(() => {
    const handleStatusChange = (event) => {
      if (event.detail.monitor_id === monitor.id) {
        setStatusAnimation(true);
        setTimeout(() => setStatusAnimation(false), 2000);
      }
    };

    window.addEventListener('monitor:status_change', handleStatusChange);
    return () => window.removeEventListener('monitor:status_change', handleStatusChange);
  }, [monitor.id]);

  const getIcon = () => {
    switch (monitor.type) {
      case 'http':
        return Globe;
      case 'ping':
        return Signal;
      case 'tcp':
        return Activity;
      default:
        return Activity;
    }
  };

  const Icon = getIcon();
  const statusColor = STATUS_COLORS[monitor.status] || STATUS_COLORS.pending;

  const handleToggle = () => {
    toggleMonitor.mutate({ id: monitor.id, enabled: !monitor.enabled });
    setShowMenu(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${monitor.name}"?`)) {
      deleteMonitor.mutate(monitor.id);
    }
    setShowMenu(false);
  };

  const handleEdit = () => {
    onEdit(monitor);
    setShowMenu(false);
  };

  // Get real history data from API
  const sparklineData = history?.map(check => check.latency_ms || 0).reverse() || [];

  // Detect reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const isCompact = displayMode === 'compact';
  const isList = displayMode === 'list';

  const handleCardClick = () => {
    if (snapshotOpen || showMenu) return; // prevent drawer when modal/menu open
    onViewDetails && onViewDetails(monitor);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: 1, 
        scale: statusAnimation && !prefersReducedMotion ? [1, 1.02, 1] : 1 
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
      onHoverStart={() => setShowWater(true)}
      onHoverEnd={() => setShowWater(false)}
      onClick={handleCardClick}
      transition={{ duration: 0.3 }}
      className={`relative bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden transition-all hover:shadow-xl cursor-pointer ${
        displayMode === 'masonry' ? 'break-inside-avoid mb-6' : ''
      }`}
    >
      {/* Status Bar (Uptime Kuma style) */}
      <StatusBar history={history || []} status={monitor.status} />
      {/* Water Effect Layer */}
      <WaterEffect status={monitor.status} isActive={showWater} />

      {/* Content */}
      <div className={`relative z-10 ${isCompact ? 'p-3' : isList ? 'p-4' : 'p-6'}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg ${statusColor.bg}`}>
              <Icon className={`w-5 h-5 ${statusColor.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-neutral-900 dark:text-white truncate">
                {monitor.name}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                {monitor.endpoint}
              </p>
            </div>
          </div>

          {/* Action Menu */}
          <div className="relative">
            <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition"
                >
                  <MoreVertical className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-700 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-600 overflow-hidden z-50"
                >
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggle(); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-600 transition text-sm"
                  >
                    {monitor.enabled ? (
                      <>
                        <Pause className="w-4 h-4" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Resume
                      </>
                    )}
                  </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleEdit(); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-600 transition text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </motion.div>
              </>
            )}
          </div>
        </div>

        {/* Status Ring */}
        {!isCompact && !isList && (
          <div className="flex items-center justify-center my-6">
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`w-24 h-24 rounded-full ${statusColor.bg} flex items-center justify-center`}
            >
              <div className={`w-20 h-20 rounded-full bg-white dark:bg-neutral-800 flex items-center justify-center border-4 ${statusColor.border}`}>
                <span className={`text-2xl font-bold ${statusColor.text}`}>
                  {monitor.status === 'up' ? '✓' : monitor.status === 'down' ? '✕' : '−'}
                </span>
              </div>
            </motion.div>
          </div>
        </div>
        )}

        {/* Meta Information */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-neutral-400" />
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Last Check</p>
              <p className="text-sm font-medium text-neutral-900 dark:text-white">
                {formatDate(monitor.last_check_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-neutral-400" />
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Latency</p>
              <p className="text-sm font-medium text-neutral-900 dark:text-white">
                {formatLatency(monitor.last_latency_ms)}
              </p>
            </div>
          </div>
        </div>

        {/* Uptime Badge */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            Uptime
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
            monitor.uptime_percent >= 99 
              ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
              : monitor.uptime_percent >= 95
              ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400'
              : 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400'
          }`}>
            {formatUptime(monitor.uptime_percent)}
          </span>
        </div>

        {/* Mini Sparkline */}
        {!isCompact && sparklineData.length > 0 && (
          <div className="h-16 mb-3 flex items-center gap-3">
            <div className="flex-1 h-full">
              <MiniChart data={sparklineData} status={monitor.status} />
            </div>
            {/* Snapshot button removed; accessible in Drawer tab */}
          </div>
        )}

        {/* Health Forecast Bar */}
        {!isCompact && showForecast && forecast.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Next 24h forecast</span>
              <button
                onClick={(e) => { e.stopPropagation(); const v = !showForecast; setShowForecast(v); localStorage.setItem('show_forecast', String(v)); }}
                className="text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                {showForecast ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="grid grid-cols-24 gap-0.5">
              {forecast.slice(0,24).reverse().map((f, idx) => {
                const risk = Math.max(0, Math.min(100, f.risk_score || 0));
                const color = risk < 25 ? 'bg-neutral-300 dark:bg-neutral-600' : risk < 50 ? 'bg-warning-400' : risk < 75 ? 'bg-orange-500' : 'bg-danger-600';
                const pulse = risk >= 50 ? { opacity: [0.7, 1, 0.7] } : {};
                return (
                  <motion.div key={idx} className={`h-3 rounded-sm ${color}`} animate={pulse} transition={{ duration: 2, repeat: Infinity }} title={`Risk ${Math.round(risk)}% — Based on the last 7 days of response times and downtime patterns.`} />
                );
              })}
            </div>
          </div>
        )}

        {/* Tags */}
        {monitor.tags && monitor.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {monitor.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      {/* Snapshot Modal */}
      <AnimatePresence>
        {snapshotOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={(e) => { e.stopPropagation(); setSnapshotOpen(false); setSnapshot(null); }} />
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="relative z-10 w-[96vw] md:w-[90vw] max-w-4xl max-h-[85vh] bg-white dark:bg-neutral-900 rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                <div className="text-sm text-neutral-600 dark:text-neutral-300">
                  {snapshot?.status_code ? `HTTP ${snapshot.status_code}` : ''} · {snapshot?.latency_ms ? `${snapshot.latency_ms}ms` : ''}
                </div>
                <button onClick={(e) => { e.stopPropagation(); setSnapshotOpen(false); setSnapshot(null); }} className="p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Close snapshot">
                  ×
                </button>
              </div>
              <div className="grid md:grid-cols-3 gap-0">
                <div className="p-3 border-r border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-300 hidden md:block">
                  <div className="font-semibold mb-2">Headers</div>
                  <pre className="whitespace-pre-wrap break-words">{JSON.stringify(snapshot?.headers || {}, null, 2)}</pre>
                </div>
                <div className="md:col-span-2 p-3">
                  <div className="h-[70vh] md:h-[60vh] overflow-auto bg-neutral-50 dark:bg-neutral-800 rounded">
                    <iframe title="snapshot" sandbox="allow-same-origin" className="w-full h-full" srcDoc={snapshot?.body_preview || '<pre>No snapshot</pre>'} />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MonitorCard;

