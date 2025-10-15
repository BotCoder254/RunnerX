import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Header from "./Header";
import Sidebar from "./Sidebar";
import MonitorCard from "./MonitorCard";
import MonitorModal from "./MonitorModal";
import MonitorDetailDrawer from "./MonitorDetailDrawer";
import StatsOverview from "./StatsOverview";
import NotificationCenter from "../notifications/NotificationCenter";
import { useMonitors } from "../../hooks/useMonitors";
import { useWebSocket } from "../../hooks/useWebSocket";
import {
  useUserPreferences,
  useUpdateUserPreferences,
} from "../../hooks/useUserPreferences";
import { Activity, AlertCircle } from "lucide-react";

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState(null);
  const [selectedMonitor, setSelectedMonitor] = useState(null);
  const [filters, setFilters] = useState({ status: "all", tags: [] });

  const { data: monitors, isLoading, error } = useMonitors();
  const { data: preferences } = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();

  // Initialize WebSocket for real-time updates
  useWebSocket();

  const [displayMode, setDisplayMode] = useState("grid");

  // Lightweight global background that reacts to system mood websocket
  const [systemMood, setSystemMood] = useState(0);

  useEffect(() => {
    if (preferences?.display_mode) {
      setDisplayMode(preferences.display_mode);
    }
  }, [preferences]);

  useEffect(() => {
    const handler = (e) => {
      const { mood } = e.detail || {};
      if (typeof mood === "number") setSystemMood(mood);
    };
    window.addEventListener("system_mood_update", handler);
    return () => window.removeEventListener("system_mood_update", handler);
  }, []);

  const handleDisplayModeChange = (mode) => {
    setDisplayMode(mode);
    updatePreferences.mutate({ display_mode: mode });
    // Also save to localStorage for instant access
    localStorage.setItem("display_mode", mode);
  };

  const handleAddMonitor = () => {
    setEditingMonitor(null);
    setModalOpen(true);
  };

  const handleEditMonitor = (monitor) => {
    setEditingMonitor(monitor);
    setModalOpen(true);
  };

  const handleViewDetails = (monitor) => {
    setSelectedMonitor(monitor);
    setDetailOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingMonitor(null);
  };

  const getGridClass = () => {
    switch (displayMode) {
      case "grid":
        return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6";
      case "list":
        return "grid grid-cols-1 gap-4";
      case "compact":
        return "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3";
      case "masonry":
        return "columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6";
      default:
        return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6";
    }
  };

  const filteredMonitors =
    monitors?.filter((monitor) => {
      // Filter by status
      if (filters.status !== "all" && monitor.status !== filters.status) {
        return false;
      }

      // Filter by tags
      if (filters.tags && filters.tags.length > 0) {
        if (!monitor.tags || !Array.isArray(monitor.tags)) {
          return false;
        }
        // Check if monitor has ALL selected tags (AND logic)
        // Change to ANY logic by using .some() instead of .every()
        return filters.tags.every((filterTag) =>
          monitor.tags.some(
            (monitorTag) => monitorTag.trim() === filterTag.trim(),
          ),
        );
      }

      return true;
    }) || [];

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-danger-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            Failed to load monitors
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            {error.message || "Please check your connection and try again"}
          </p>
        </div>
      </div>
    );
  }

  const moodOpacity =
    ["opacity-20", "opacity-30", "opacity-50", "opacity-70"][systemMood] ||
    "opacity-20";

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 relative">
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-0 z-0 transition-all duration-700 ${moodOpacity}`}
        style={{
          background:
            systemMood === 3
              ? "radial-gradient(1200px 600px at 50% -200px, rgba(220,38,38,0.25), transparent), radial-gradient(800px 400px at 10% 120%, rgba(220,38,38,0.2), transparent)"
              : systemMood === 2
                ? "radial-gradient(1000px 500px at 50% -200px, rgba(245,158,11,0.20), transparent), radial-gradient(700px 350px at 90% 120%, rgba(245,158,11,0.18), transparent)"
                : systemMood === 1
                  ? "radial-gradient(900px 450px at 50% -200px, rgba(59,130,246,0.18), transparent)"
                  : "radial-gradient(900px 450px at 50% -200px, rgba(16,185,129,0.15), transparent)",
        }}
      />
      <Header
        onAddMonitor={handleAddMonitor}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onToggleNotifications={() => setNotificationOpen(!notificationOpen)}
        displayMode={displayMode}
        onDisplayModeChange={handleDisplayModeChange}
      />

      <div className="flex">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          filters={filters}
          onFilterChange={setFilters}
          monitors={monitors}
        />

        <main className="flex-1 p-4 lg:p-6 relative z-10">
          {/* Stats Overview */}
          <StatsOverview monitors={monitors || []} />

          {/* Monitors Grid */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                  {filters.status === "all"
                    ? "All Monitors"
                    : `${filters.status.charAt(0).toUpperCase() + filters.status.slice(1)} Monitors`}
                  <span className="ml-2 text-sm text-neutral-500 dark:text-neutral-400">
                    ({filteredMonitors.length})
                  </span>
                </h2>
                {filters.tags && filters.tags.length > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                      Filtered by tags:
                    </span>
                    <div className="flex gap-1">
                      {filters.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="h-96 bg-white dark:bg-neutral-800 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : filteredMonitors.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20"
              >
                <Activity className="w-16 h-16 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                  {filters.tags && filters.tags.length > 0
                    ? "No monitors match your filters"
                    : "No monitors yet"}
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                  {filters.tags && filters.tags.length > 0
                    ? "Try adjusting your filters or create a new monitor with these tags"
                    : "Get started by adding your first monitor"}
                </p>
                <button
                  onClick={handleAddMonitor}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition font-medium shadow-lg shadow-primary-500/30"
                >
                  Add Your First Monitor
                </button>
              </motion.div>
            ) : (
              <motion.div
                layout
                className={displayMode === "masonry" ? getGridClass() : ""}
              >
                <div
                  className={displayMode !== "masonry" ? getGridClass() : ""}
                >
                  {filteredMonitors.map((monitor) => (
                    <MonitorCard
                      key={monitor.id}
                      monitor={monitor}
                      onEdit={handleEditMonitor}
                      onViewDetails={handleViewDetails}
                      displayMode={displayMode}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </div>

      {/* Add/Edit Modal */}
      <MonitorModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        monitor={editingMonitor}
      />

      {/* Detail Drawer */}
      <MonitorDetailDrawer
        monitor={selectedMonitor}
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedMonitor(null);
        }}
      />

      {/* Notification Center */}
      <NotificationCenter
        isOpen={notificationOpen}
        onClose={() => setNotificationOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
