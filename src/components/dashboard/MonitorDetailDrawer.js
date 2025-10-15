import React, { useState, useEffect, useMemo } from "react";
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
import { logsService } from "../../services/logsService";
import { wsService } from "../../services/websocketService";
import { screenshotsService } from "../../services/screenshotsService";
import { snapshotsService } from "../../services/snapshotsService";
import { incidentsService } from "../../services/incidentsService";

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
  const [activeTab, setActiveTab] = useState("performance");
  const [snapshot, setSnapshot] = useState(null);
  useEffect(() => {
    if (!monitor || activeTab !== "snapshot") return;
    let mounted = true;
    monitorService
      .getSnapshot(monitor.id)
      .then((data) => {
        if (mounted) setSnapshot(data);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [monitor, activeTab]);
  const [rootCause, setRootCause] = useState({
    items: [],
    summary: { trend: "inconclusive" },
  });

  useEffect(() => {
    if (!monitor || !isOpen) return;
    let isMounted = true;
    monitorService
      .getRootCauseTimeline(monitor.id, "24h")
      .then((data) => {
        if (isMounted)
          setRootCause(
            data || { items: [], summary: { trend: "inconclusive" } },
          );
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [monitor, isOpen]);

  // Log Insights state
  const [incidentId, setIncidentId] = useState("");
  const [insights, setInsights] = useState([]);
  const [insightsQuery, setInsightsQuery] = useState("");
  const [selectedHashes, setSelectedHashes] = useState({});
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [screenshotPulse, setScreenshotPulse] = useState(false);
  const [hourlySnaps, setHourlySnaps] = useState([]);
  const [timeline, setTimeline] = useState([]);

  // Derive an incident id from monitor context (simple mapping per monitor)
  useEffect(() => {
    if (!monitor) return;
    setIncidentId(`monitor-${monitor.id}`);
  }, [monitor]);

  // Fetch insights when tab active or query changes
  useEffect(() => {
    if (!monitor || activeTab !== "logs") return;
    let mounted = true;
    logsService
      .getInsights(incidentId, insightsQuery)
      .then((data) => {
        if (mounted) setInsights(data || []);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [monitor, activeTab, incidentId, insightsQuery]);

  // Realtime updates via websocket
  useEffect(() => {
    if (!monitor) return;
    const unsub = wsService.subscribe("logs:insight", (evt) => {
      if (!evt || evt.incident_id !== incidentId) return;
      if (activeTab !== "logs") return;
      const item = evt.insight;
      setInsights((prev) => {
        const idx = prev.findIndex((x) => x.pattern_hash === item.pattern_hash);
        if (idx >= 0) {
          const copy = prev.slice();
          copy[idx] = item;
          return copy;
        }
        return [item, ...prev];
      });
    });
    return () => unsub();
  }, [monitor, incidentId, activeTab]);

  // Load hourly performance snapshots when performance tab active
  useEffect(() => {
    if (!monitor || activeTab !== "performance") return;
    let mounted = true;
    snapshotsService.getRecent(monitor.id).then((data) => {
      if (mounted) setHourlySnaps(data || []);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [monitor, activeTab]);

  // Load incidents when timeline tab active
  useEffect(() => {
    if (!monitor || activeTab !== "timeline") return;
    let mounted = true;
    incidentsService.listForMonitor(monitor.id).then((items) => {
      if (mounted) setTimeline(items || []);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [monitor, activeTab]);

  // Listen for screenshot updates
  useEffect(() => {
    const unsub = wsService.subscribe("incident:screenshot", (evt) => {
      if (evt?.incident_id === incidentId) {
        setScreenshotUrl(`/api/screenshots/${encodeURIComponent(incidentId)}?t=${Date.now()}`);
        setScreenshotPulse(true);
        setTimeout(() => setScreenshotPulse(false), 1500);
      }
    });
    return () => unsub();
  }, [incidentId]);

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

            {/* Tabs */}
            <div className="px-6 pt-4">
              <div className="flex gap-2">
                {["performance", "snapshot", "logs", "timeline"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium ${activeTab === t ? "bg-primary-600 text-white" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"}`}
                  >
                    {t === "performance" ? "Performance" : t === "snapshot" ? "Snapshot" : t === "logs" ? "Log Insights" : "Timeline"}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {activeTab === "performance" && (
                <>
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
                            STATUS_COLORS[check.status] ||
                            STATUS_COLORS.pending;
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

                  {/* Hourly Snapshot Cards */}
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">Hourly Snapshots</h3>
                    <div className="flex gap-3 overflow-x-auto snap-x pb-2">
                      {hourlySnaps.map((s, idx) => (
                        <div key={idx} className="min-w-[220px] snap-start bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 transition-transform hover:scale-[1.02]">
                          <div className="text-xs text-neutral-500">{new Date(s.created_at).toLocaleString()}</div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div>
                              <div className="text-[11px] text-neutral-500">Uptime</div>
                              <div className="text-lg font-bold text-emerald-500">{(s.uptime_percent || 0).toFixed(1)}%</div>
                            </div>
                            <div>
                              <div className="text-[11px] text-neutral-500">Avg Lat.</div>
                              <div className="text-lg font-bold text-neutral-200">{Math.round(s.avg_latency_ms || 0)}ms</div>
                            </div>
                            <div>
                              <div className="text-[11px] text-neutral-500">P50</div>
                              <div className="text-sm font-semibold">{Math.round(s.p50_latency_ms || 0)}ms</div>
                            </div>
                            <div>
                              <div className="text-[11px] text-neutral-500">P95</div>
                              <div className="text-sm font-semibold text-yellow-400">{Math.round(s.p95_latency_ms || 0)}ms</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {hourlySnaps.length === 0 && (
                        <div className="text-sm text-neutral-500">No snapshots yet</div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {activeTab === "snapshot" && (
                <div>
                  <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4">
                    <div className="text-sm text-neutral-600 dark:text-neutral-300 mb-3">
                      {snapshot?.status_code
                        ? `HTTP ${snapshot.status_code}`
                        : ""}{" "}
                      · {snapshot?.latency_ms ? `${snapshot.latency_ms}ms` : ""}
                    </div>
                    <div className="h-[60vh] overflow-auto rounded bg-white dark:bg-neutral-900">
                      <iframe
                        title="snapshot"
                        sandbox="allow-same-origin"
                        className="w-full h-full"
                        srcDoc={
                          snapshot?.body_preview ||
                          '<pre class="p-4 text-neutral-500">No snapshot</pre>'
                        }
                      />
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={async () => {
                          try {
                            const blob = await screenshotsService.getLatestBlob(incidentId);
                            const url = URL.createObjectURL(blob);
                            setScreenshotUrl(url);
                            setScreenshotPulse(true);
                            setTimeout(() => setScreenshotPulse(false), 1500);
                          } catch (e) {
                            // If no screenshot yet, trigger capture and retry after a brief delay
                            try {
                              await screenshotsService.triggerCapture(incidentId);
                              setTimeout(async () => {
                                try {
                                  const blob2 = await screenshotsService.getLatestBlob(incidentId);
                                  const url2 = URL.createObjectURL(blob2);
                                  setScreenshotUrl(url2);
                                  setScreenshotPulse(true);
                                  setTimeout(() => setScreenshotPulse(false), 1500);
                                } catch {}
                              }, 1500);
                            } catch {}
                          }
                        }}
                        className="px-3 py-2 rounded-md bg-neutral-900 text-neutral-100 hover:bg-neutral-800 flex items-center gap-2"
                        title="Load latest downtime screenshot"
                      >
                        <svg className={`w-4 h-4 ${screenshotPulse ? 'animate-pulse text-primary-500' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h8l2 3h3a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                        Screenshot
                      </button>
                      {screenshotUrl && (
                        <span className="text-xs text-neutral-500">Latest captured image below</span>
                      )}
                    </div>
                    {screenshotUrl && (
                      <div className="mt-3 overflow-hidden rounded-lg">
                        <img
                          key={screenshotUrl}
                          src={screenshotUrl}
                          alt="Downtime screenshot"
                          className="w-full max-h-[60vh] object-contain opacity-0 animate-[fadein_400ms_ease_forwards]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "logs" && (
                <div>
                  <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                      <input
                        className="flex-1 px-3 py-2 rounded bg-neutral-800 text-neutral-100 font-mono"
                        placeholder="Search summarized logs..."
                        value={insightsQuery}
                        onChange={(e) => setInsightsQuery(e.target.value)}
                      />
                      <div className="text-xs text-neutral-500">{insights.length} groups</div>
                    </div>
                    <div className="space-y-2">
                      {insights.map((it, idx) => {
                        const checked = !!selectedHashes[it.pattern_hash];
                        return (
                          <details key={it.pattern_hash} className="group bg-neutral-900 rounded-lg overflow-hidden">
                            <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                className="accent-primary-600"
                                checked={checked}
                                onChange={(e) =>
                                  setSelectedHashes((s) => ({ ...s, [it.pattern_hash]: e.target.checked }))
                                }
                              />
                              {/* monitor logo placeholder circle */}
                              <div className="w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center text-xs">
                                {(monitor.name || "").charAt(0).toUpperCase()}
                              </div>
                              <span className={`text-xs uppercase ${it.level === "error" ? "text-danger-400" : it.level === "warn" ? "text-yellow-400" : "text-emerald-400"}`}>
                                {String(it.level || "info").toUpperCase()}
                              </span>
                              <span className="text-neutral-100 font-mono text-sm truncate flex-1">{it.pattern}</span>
                              <span className="text-neutral-400 text-xs">×{it.count}</span>
                            </summary>
                            <div className="px-4 pb-4">
                              <pre className="font-mono text-sm whitespace-pre-wrap text-neutral-300">{it.example}</pre>
                            </div>
                          </details>
                        );
                      })}
                      {insights.length === 0 && (
                        <div className="text-center py-10 text-neutral-500">
                          No insights yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Root Cause Timeline */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                  Root Cause Timeline
                </h3>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {rootCause.items && rootCause.items.length > 0 ? (
                    rootCause.items.map((it, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                      >
                        <div className="w-2 h-2 mt-2 rounded-full bg-danger-500" />
                        <div className="flex-1">
                          <p className="text-sm text-neutral-900 dark:text-white">
                            {new Date(it.timestamp).toLocaleTimeString()} —{" "}
                            {String(it.cause_type || "unknown").replace(
                              "_",
                              " ",
                            )}{" "}
                            {it.status_code ? `(HTTP ${it.status_code})` : ""}
                          </p>
                          {it.detail && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              {it.detail}
                            </p>
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
                <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                  Trend: {rootCause?.summary?.trend || "inconclusive"}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MonitorDetailDrawer;
