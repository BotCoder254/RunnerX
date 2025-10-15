import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'react-toastify';

export const useUserPreferences = () => {
  return useQuery({
    queryKey: ['userPreferences'],
    queryFn: async () => {
      try {
        const response = await api.get('/user/preferences');
        return response.data;
      } catch (error) {
        // Return defaults if not found
        return {
          display_mode: 'grid',
          default_interval: 60,
          timezone: 'UTC',
          animation_pref: true,
          show_forecast: true,
        };
      }
    },
  });
};

export const useUpdateUserPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences) => {
      const response = await api.put('/user/preferences', preferences);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPreferences'] });
      toast.success('Preferences saved');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save preferences');
    },
  });
};

