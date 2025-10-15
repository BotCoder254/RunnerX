import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { wsService } from "../services/websocketService";
import { authService } from "../services/authService";
import { toast } from "react-toastify";

export const useWebSocket = () => {
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef(null);
  const isConnectedRef = useRef(false);

  useEffect(() => {
    const token = authService.getToken();
    if (!token) return;

    let isCleanedUp = false;

    // Connect WebSocket
    const connect = () => {
      if (isCleanedUp) return;
      wsService.connect(token);
    };

    connect();

    // Subscribe to connection events
    const unsubscribeConnection = wsService.subscribe("connection:open", () => {
      console.log("WebSocket connected successfully");
      isConnectedRef.current = true;
      // Clear any reconnection attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Refresh data once when reconnected to sync state
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
    });

    const unsubscribeDisconnection = wsService.subscribe(
      "connection:close",
      () => {
        console.log("WebSocket disconnected");
        isConnectedRef.current = false;

        // Attempt reconnection with exponential backoff
        if (!isCleanedUp) {
          const reconnectDelay = Math.min(
            5000,
            1000 * Math.pow(2, wsService.reconnectAttempts || 0),
          );
          reconnectTimeoutRef.current = setTimeout(connect, reconnectDelay);
        }
      },
    );

    // Subscribe to monitor updates with debouncing
    const monitorUpdateBuffer = new Map();
    let updateTimeout = null;

    const flushUpdates = () => {
      if (monitorUpdateBuffer.size === 0) return;

      // Apply all buffered updates at once
      queryClient.setQueryData(["monitors"], (old) => {
        if (!old) return old;
        return old.map((monitor) => {
          const update = monitorUpdateBuffer.get(monitor.id);
          return update ? { ...monitor, ...update } : monitor;
        });
      });

      // Apply individual monitor updates
      monitorUpdateBuffer.forEach((update, monitorId) => {
        queryClient.setQueryData(["monitor", monitorId], (old) => {
          return old ? { ...old, ...update } : old;
        });
      });

      monitorUpdateBuffer.clear();
    };

    const unsubscribeMonitorUpdate = wsService.subscribe(
      "monitor:update",
      (data) => {
        const {
          monitor_id,
          status,
          last_check_at,
          last_latency_ms,
          uptime_percent,
          total_checks,
          successful_checks,
        } = data;

        // Buffer the update
        monitorUpdateBuffer.set(monitor_id, {
          status,
          last_check_at,
          last_latency_ms,
          uptime_percent,
          total_checks,
          successful_checks,
        });

        // Debounce updates to avoid rapid cache updates
        if (updateTimeout) clearTimeout(updateTimeout);
        updateTimeout = setTimeout(flushUpdates, 100);
      },
    );

    // Subscribe to status changes for animations with throttling
    let lastStatusChange = 0;
    const unsubscribeStatusChange = wsService.subscribe(
      "monitor:status_change",
      (data) => {
        const now = Date.now();
        if (now - lastStatusChange < 1000) return; // Throttle to max 1 per second
        lastStatusChange = now;

        console.log("Status changed:", data);

        // Trigger animation via custom event
        window.dispatchEvent(
          new CustomEvent("monitor:status_change", { detail: data }),
        );
      },
    );

    // Subscribe to notifications with rate limiting
    let lastNotification = 0;
    const unsubscribeNotification = wsService.subscribe(
      "notification",
      (data) => {
        const now = Date.now();

        // Update notifications cache
        queryClient.invalidateQueries({
          queryKey: ["notifications"],
          refetchType: "inactive", // Only refetch if currently inactive
        });

        // Rate limit toast notifications to avoid spam
        if (now - lastNotification < 2000) return;
        lastNotification = now;

        // Show toast for new notifications
        if (data.type === "down") {
          toast.error(data.message || "Monitor is down", {
            autoClose: 5000,
            position: "top-right",
            toastId: `down-${data.monitor_id}`, // Prevent duplicate toasts
          });
        } else if (data.type === "up") {
          toast.success(data.message || "Monitor is back up", {
            autoClose: 3000,
            position: "top-right",
            toastId: `up-${data.monitor_id}`,
          });
        }
      },
    );

    // Subscribe to heartbeat/ping responses
    const unsubscribePing = wsService.subscribe("pong", () => {
      // Keep connection alive, no action needed
    });

    // Handle connection errors
    const unsubscribeError = wsService.subscribe("error", (error) => {
      console.error("WebSocket error:", error);
      if (!isCleanedUp && !isConnectedRef.current) {
        // Try to reconnect after error
        setTimeout(connect, 3000);
      }
    });

    // Cleanup function
    return () => {
      isCleanedUp = true;
      isConnectedRef.current = false;

      // Clear any pending timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }

      // Unsubscribe from all events
      unsubscribeConnection();
      unsubscribeDisconnection();
      unsubscribeMonitorUpdate();
      unsubscribeStatusChange();
      unsubscribeNotification();
      unsubscribePing();
      unsubscribeError();

      // Flush any remaining updates
      flushUpdates();

      // Disconnect WebSocket
      wsService.disconnect();
    };
  }, [queryClient]);

  // Return connection status for other components to use
  return {
    isConnected: isConnectedRef.current,
  };
};
