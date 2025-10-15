import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsService } from '../services/websocketService';
import { authService } from '../services/authService';
import { toast } from 'react-toastify';

export const useWebSocket = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = authService.getToken();
    if (!token) return;

    // Connect WebSocket
    wsService.connect(token);

    // Subscribe to monitor updates
    const unsubscribeMonitorUpdate = wsService.subscribe('monitor:update', (data) => {
      const { monitor_id, status, last_check_at, last_latency_ms, uptime_percent } = data;

      // Update individual monitor cache
      queryClient.setQueryData(['monitor', monitor_id], (old) => {
        if (!old) return old;
        return {
          ...old,
          status,
          last_check_at,
          last_latency_ms,
          uptime_percent,
        };
      });

      // Update monitors list cache
      queryClient.setQueryData(['monitors'], (old) => {
        if (!old) return old;
        return old.map((monitor) =>
          monitor.id === monitor_id
            ? { ...monitor, status, last_check_at, last_latency_ms, uptime_percent }
            : monitor
        );
      });
    });

    // Subscribe to status changes for animations
    const unsubscribeStatusChange = wsService.subscribe('monitor:status_change', (data) => {
      console.log('Status changed:', data);
      // Trigger animation via custom event
      window.dispatchEvent(
        new CustomEvent('monitor:status_change', { detail: data })
      );
    });

    // Subscribe to notifications
    const unsubscribeNotification = wsService.subscribe('notification', (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      // Show toast for new notifications
      if (data.type === 'down') {
        toast.error(data.message, {
          autoClose: 5000,
          position: 'top-right',
        });
      } else if (data.type === 'up') {
        toast.success(data.message, {
          autoClose: 3000,
          position: 'top-right',
        });
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribeMonitorUpdate();
      unsubscribeStatusChange();
      unsubscribeNotification();
    };
  }, [queryClient]);
};

