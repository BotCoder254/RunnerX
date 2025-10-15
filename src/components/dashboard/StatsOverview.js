import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Pause, TrendingUp } from 'lucide-react';

const StatsOverview = ({ monitors }) => {
  const stats = {
    total: monitors.length,
    up: monitors.filter(m => m.status === 'up').length,
    down: monitors.filter(m => m.status === 'down').length,
    paused: monitors.filter(m => m.status === 'paused').length,
    avgUptime: monitors.length > 0
      ? (monitors.reduce((sum, m) => sum + (m.uptime_percent || 0), 0) / monitors.length).toFixed(2)
      : 0,
  };

  const statCards = [
    {
      label: 'Online',
      value: stats.up,
      icon: CheckCircle2,
      color: 'text-success-600 dark:text-success-400',
      bg: 'bg-success-50 dark:bg-success-900/20',
      border: 'border-success-200 dark:border-success-900/50',
    },
    {
      label: 'Offline',
      value: stats.down,
      icon: XCircle,
      color: 'text-danger-600 dark:text-danger-400',
      bg: 'bg-danger-50 dark:bg-danger-900/20',
      border: 'border-danger-200 dark:border-danger-900/50',
    },
    {
      label: 'Paused',
      value: stats.paused,
      icon: Pause,
      color: 'text-neutral-600 dark:text-neutral-400',
      bg: 'bg-neutral-100 dark:bg-neutral-800',
      border: 'border-neutral-200 dark:border-neutral-700',
    },
    {
      label: 'Avg Uptime',
      value: `${stats.avgUptime}%`,
      icon: TrendingUp,
      color: 'text-primary-600 dark:text-primary-400',
      bg: 'bg-primary-50 dark:bg-primary-900/20',
      border: 'border-primary-200 dark:border-primary-900/50',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -4 }}
            className={`${stat.bg} ${stat.border} border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between mb-3">
              <Icon className={`w-6 h-6 ${stat.color}`} strokeWidth={2} />
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                {stat.label}
              </span>
            </div>
            <div className={`text-3xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default StatsOverview;

