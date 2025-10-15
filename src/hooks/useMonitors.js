import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { monitorService } from "../services/monitorService";
import { toast } from "react-toastify";
import { useState, useEffect } from "react";
import { wsService } from "../services/websocketService";

// Track if WebSocket is connected to adjust polling behavior
let isWebSocketConnected = false;

// Listen to WebSocket connection status
if (typeof window !== "undefined") {
  wsService.subscribe("*", (data) => {
    if (data.type === "connection:open") {
      isWebSocketConnected = true;
    } else if (data.type === "connection:close") {
      isWebSocketConnected = false;
    }
  });
}

export const useMonitors = () => {
  return useQuery({
    queryKey: ["monitors"],
    queryFn: monitorService.getMonitors,
    // Use longer intervals when WebSocket is connected, shorter when disconnected
    refetchInterval: () => {
      return isWebSocketConnected ? 30000 : 10000; // 30s if WS connected, 10s if not
    },
    // Reduce background refetch frequency
    refetchIntervalInBackground: false,
    // Only refetch on window focus if WebSocket is not connected
    refetchOnWindowFocus: !isWebSocketConnected,
    // Enable stale time to reduce unnecessary requests
    staleTime: 5000,
    // Keep data fresh for longer
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useMonitor = (id) => {
  return useQuery({
    queryKey: ["monitor", id],
    queryFn: () => monitorService.getMonitor(id),
    enabled: !!id,
    // Reduce refetch interval for individual monitors
    refetchInterval: () => {
      return isWebSocketConnected ? 60000 : 15000; // 1min if WS connected, 15s if not
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    staleTime: 10000,
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useMonitorStats = (id) => {
  return useQuery({
    queryKey: ["monitor", id, "stats"],
    queryFn: () => monitorService.getMonitorStats(id),
    enabled: !!id,
    // Stats don't need frequent updates
    refetchInterval: 60000, // 1 minute
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    cacheTime: 5 * 60 * 1000,
  });
};

export const useMonitorHistory = (id, days = 7) => {
  return useQuery({
    queryKey: ["monitor", id, "history", days],
    queryFn: () => monitorService.getMonitorHistory(id, days),
    enabled: !!id,
    // History changes less frequently
    refetchInterval: false, // Disable automatic refetch
    refetchOnWindowFocus: false,
    staleTime: 60000, // 1 minute
    cacheTime: 10 * 60 * 1000, // 10 minutes
    // Only refetch when explicitly needed
    refetchOnMount: "always",
  });
};

export const useCreateMonitor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: monitorService.createMonitor,
    onSuccess: () => {
      // Use more specific invalidation
      queryClient.invalidateQueries({ queryKey: ["monitors"], exact: true });
      toast.success("Monitor created successfully!");
    },
    onError: (error) => {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to create monitor";
      toast.error(message);
    },
  });
};

export const useUpdateMonitor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => monitorService.updateMonitor(id, data),
    onSuccess: (data, variables) => {
      // Update cache optimistically
      queryClient.setQueryData(["monitor", variables.id], data);
      queryClient.invalidateQueries({ queryKey: ["monitors"], exact: true });
      toast.success("Monitor updated successfully!");
    },
    onError: (error) => {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to update monitor";
      toast.error(message);
    },
  });
};

export const useDeleteMonitor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: monitorService.deleteMonitor,
    onSuccess: (_, deletedId) => {
      // Remove from cache optimistically
      queryClient.setQueryData(["monitors"], (old) => {
        return old ? old.filter((monitor) => monitor.id !== deletedId) : old;
      });
      // Remove individual monitor cache
      queryClient.removeQueries({ queryKey: ["monitor", deletedId] });
      toast.success("Monitor deleted successfully!");
    },
    onError: (error) => {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to delete monitor";
      toast.error(message);
    },
  });
};

export const useToggleMonitor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }) => monitorService.toggleMonitor(id, enabled),
    onSuccess: (data, variables) => {
      // Update cache optimistically
      queryClient.setQueryData(["monitor", variables.id], data);
      queryClient.setQueryData(["monitors"], (old) => {
        return old
          ? old.map((monitor) =>
              monitor.id === variables.id
                ? {
                    ...monitor,
                    enabled: variables.enabled,
                    status: variables.enabled ? monitor.status : "paused",
                  }
                : monitor,
            )
          : old;
      });
      toast.success(`Monitor ${variables.enabled ? "enabled" : "paused"}`);
    },
    onError: (error) => {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to toggle monitor";
      toast.error(message);
    },
  });
};
