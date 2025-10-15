import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { toast } from "react-toastify";
import { wsService } from "../services/websocketService";

// Track WebSocket connection status
let isWebSocketConnected = false;

// Listen to WebSocket connection status
if (typeof window !== "undefined") {
  wsService.subscribe("connection:open", () => {
    isWebSocketConnected = true;
  });

  wsService.subscribe("connection:close", () => {
    isWebSocketConnected = false;
  });
}

export const useNotifications = () => {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await api.get("/notifications");
      return response.data;
    },
    // Reduce polling when WebSocket is connected
    refetchInterval: () => {
      return isWebSocketConnected ? 60000 : 15000; // 1min if WS connected, 15s if not
    },
    refetchIntervalInBackground: false,
    // Don't refetch on window focus if WebSocket is connected
    refetchOnWindowFocus: !isWebSocketConnected,
    staleTime: 10000, // Consider data fresh for 10 seconds
    cacheTime: 5 * 60 * 1000, // Cache for 5 minutes
    // Retry on failure but with backoff
    retry: (failureCount, error) => {
      if (error.response?.status === 429) {
        // Don't retry on rate limit
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useUnreadNotificationsCount = () => {
  return useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: async () => {
      const response = await api.get("/notifications/unread");
      return response.data;
    },
    // Check unread count less frequently
    refetchInterval: () => {
      return isWebSocketConnected ? 120000 : 30000; // 2min if WS connected, 30s if not
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    cacheTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.response?.status === 429) return false;
      return failureCount < 2;
    },
  });
};

export const useMarkNotificationSeen = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const response = await api.put(`/notification/${id}/mark_seen`);
      return response.data;
    },
    onMutate: async (id) => {
      // Optimistically update the cache
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousNotifications = queryClient.getQueryData(["notifications"]);

      queryClient.setQueryData(["notifications"], (old) => {
        return old?.map((notification) =>
          notification.id === id
            ? { ...notification, seen: true }
            : notification,
        );
      });

      return { previousNotifications };
    },
    onError: (err, id, context) => {
      // Revert optimistic update on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ["notifications"],
          context.previousNotifications,
        );
      }
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to mark notification as seen";
      toast.error(message);
    },
    onSuccess: () => {
      // Update unread count
      queryClient.invalidateQueries({
        queryKey: ["notifications", "unread"],
        refetchType: "inactive",
      });
    },
  });
};

export const useMarkAllNotificationsSeen = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.put("/notifications/mark_all_seen");
      return response.data;
    },
    onMutate: async () => {
      // Optimistically update all notifications as seen
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousNotifications = queryClient.getQueryData(["notifications"]);

      queryClient.setQueryData(["notifications"], (old) => {
        return old?.map((notification) => ({ ...notification, seen: true }));
      });

      return { previousNotifications };
    },
    onError: (err, variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ["notifications"],
          context.previousNotifications,
        );
      }
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to mark all notifications as seen";
      toast.error(message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", "unread"],
        refetchType: "inactive",
      });
      toast.success("All notifications marked as seen");
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/notification/${id}`);
      return response.data;
    },
    onMutate: async (id) => {
      // Optimistically remove from cache
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousNotifications = queryClient.getQueryData(["notifications"]);

      queryClient.setQueryData(["notifications"], (old) => {
        return old?.filter((notification) => notification.id !== id);
      });

      return { previousNotifications, deletedId: id };
    },
    onError: (err, id, context) => {
      // Revert optimistic update on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ["notifications"],
          context.previousNotifications,
        );
      }
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to delete notification";
      toast.error(message);
    },
    onSuccess: (data, deletedId) => {
      // Update unread count
      queryClient.invalidateQueries({
        queryKey: ["notifications", "unread"],
        refetchType: "inactive",
      });
      toast.success("Notification deleted");
    },
  });
};
