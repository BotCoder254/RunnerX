import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { monitorService } from '../services/monitorService';
import { toast } from 'react-toastify';

export const useMonitors = () => {
  return useQuery({
    queryKey: ['monitors'],
    queryFn: monitorService.getMonitors,
    refetchInterval: 5000, // Real-time updates every 5 seconds
  });
};

export const useMonitor = (id) => {
  return useQuery({
    queryKey: ['monitor', id],
    queryFn: () => monitorService.getMonitor(id),
    enabled: !!id,
    refetchInterval: 5000,
  });
};

export const useMonitorStats = (id) => {
  return useQuery({
    queryKey: ['monitor', id, 'stats'],
    queryFn: () => monitorService.getMonitorStats(id),
    enabled: !!id,
    refetchInterval: 10000,
  });
};

export const useMonitorHistory = (id, days = 7) => {
  return useQuery({
    queryKey: ['monitor', id, 'history', days],
    queryFn: () => monitorService.getMonitorHistory(id, days),
    enabled: !!id,
  });
};

export const useCreateMonitor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: monitorService.createMonitor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
      toast.success('Monitor created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create monitor');
    },
  });
};

export const useUpdateMonitor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => monitorService.updateMonitor(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
      queryClient.invalidateQueries({ queryKey: ['monitor', variables.id] });
      toast.success('Monitor updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update monitor');
    },
  });
};

export const useDeleteMonitor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: monitorService.deleteMonitor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
      toast.success('Monitor deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete monitor');
    },
  });
};

export const useToggleMonitor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, enabled }) => monitorService.toggleMonitor(id, enabled),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
      queryClient.invalidateQueries({ queryKey: ['monitor', variables.id] });
      toast.success(`Monitor ${variables.enabled ? 'enabled' : 'paused'}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to toggle monitor');
    },
  });
};

