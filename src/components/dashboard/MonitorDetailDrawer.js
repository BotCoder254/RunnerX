import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  Activity,
  Info,
} from "lucide-react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { useMonitorHistory, useMonitorStats } from "../../hooks/useMonitors";
import { monitorService } from "../../services/monitorService";
import {
  formatLatency,
  formatDateTime,
  getStatusLabel,
} from "../../utils/formatters";
import { STATUS_COLORS } from "../../utils/constants";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const MonitorDetailDrawer = ({ monitor, isOpen, onClose }) => {
  const [timeRange, setTimeRange] = useState("24h");
  const { data: history, isLoading: historyLoading } = useMonitorHistory(
    monitor?.id,
    timeRange === "24h" ? 1 : timeRange === "7d" ? 7 : 30,
  );
  const { data: stats } = useMonitorStats(monitor?.id);
  const [rootCause, setRootCause] = useState({ items: [], summary: { trend: "inconclusive" } });

  useEffect(() => {
    if (!monitor || !isOpen) return;
    let isMounted = true;
    monitorService
      .getRootCauseTimeline(monitor.id, "24h")
      .then((data) => {
        if (isMounted) setRootCause(data || { items: [], summary: { trend: "inconclusive" } });
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [monitor, isOpen]);

  if (!monitor) return null;

  const timeRanges = [
    { label: "24 Hours", value: "24h" },
    { label: "7 Days", value: "7d" },
    { label: "30 Days", value: "30d" },
  ];

  // Prepare chart data
  const chartData = {
    labels:
      history?.map((check) =>
        new Date(check.created_at).toLocaleTimeString(),
      ) || [],
    datasets: [
      {
        label: "Latency (ms)",
        data: history?.map((check) => check.latency_ms) || [],
        borderColor:
          monitor.status === "up" ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)",
        backgroundColor:
          monitor.status === "up"
            ? "rgba(34, 197, 94, 0.1)"
            : "rgba(239, 68, 68, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.parsed.y}ms`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          callback: (value) => `${value}ms`,
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
  };

  const statusColor = STATUS_COLORS[monitor.status] || STATUS_COLORS.pending;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white dark:bg-neutral-900 shadow-2xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1 truncate">
                    {monitor.name}
                  </h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                    {monitor.endpoint}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition ml-4"
                >
                  <X className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
                </button>
              </div>

              {/* Status Badge */}
              <div className="mt-4">
                <span
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${statusColor.bg} ${statusColor.text}`}
                >
                  {monitor.status === "up" ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : monitor.status === "down" ? (
                    <XCircle className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  <span className="font-semibold">
                    {getStatusLabel(monitor.status)}
                  </span>
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-neutral-500" />
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      Uptime
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {monitor.uptime_percent?.toFixed(2) || 0}%
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
                    <Info className="w-3 h-3" />
                    <span>Based on {stats?.total_checks || 0} checks</span>
                  </div>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-neutral-500" />
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      Latency
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {formatLatency(monitor.last_latency_ms)}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    Last check
                  </div>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-success-500" />
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      Success
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {stats?.successful_checks || 0}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    Total checks
                  </div>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-neutral-500" />
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      Interval
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {monitor.interval_seconds}s
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    Check frequency
                  </div>
                </div>
              </div>

              {/* Time Range Selector */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Performance History
                  </h3>
                  <div className="flex gap-2">
                    {timeRanges.map((range) => (
                      <button
                        key={range.value}
                        onClick={() => setTimeRange(range.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                          timeRange === range.value
                            ? "bg-primary-600 text-white"
                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chart */}
                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 h-64 md:h-80">
                  {historyLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
                    </div>
                  ) : history && history.length > 0 ? (
                    <Line data={chartData} options={chartOptions} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-neutral-500">
                      <div className="text-center">
                        <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No history data available</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Checks */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                  Recent Checks
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {history && history.length > 0 ? (
                    history.slice(0, 20).map((check, index) => {
                      const checkColor =
                        STATUS_COLORS[check.status] || STATUS_COLORS.pending;
                      return (
                        <motion.div
                          key={check.id || index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="flex items-center gap-4 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${checkColor.bg}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-medium ${checkColor.text}`}
                              >
                                {getStatusLabel(check.status)}
                              </span>
                              {check.status_code && (
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                  HTTP {check.status_code}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                              {formatDateTime(check.created_at)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-neutral-900 dark:text-white">
                              {formatLatency(check.latency_ms)}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-neutral-500">
                      <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No checks recorded yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Root Cause Timeline */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                  Root Cause Timeline
                </h3>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {rootCause.items && rootCause.items.length > 0 ? (
                    rootCause.items.map((it, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                        <div className="w-2 h-2 mt-2 rounded-full bg-danger-500" />
                        <div className="flex-1">
                          <p className="text-sm text-neutral-900 dark:text-white">
                            {new Date(it.timestamp).toLocaleTimeString()} — {String(it.cause_type || 'unknown').replace('_',' ')} {it.status_code ? `(HTTP ${it.status_code})` : ''}
                          </p>
                          {it.detail && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">{it.detail}</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-neutral-500">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No failures in selected range.</p>
                    </div>
                  )}
                </div>
                <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">Trend: {rootCause?.summary?.trend || 'inconclusive'}</div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MonitorDetailDrawer;
