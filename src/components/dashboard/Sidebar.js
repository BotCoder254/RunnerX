import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Pause, 
  Clock,
  Filter,
  Tag,
  X
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose, filters, onFilterChange }) => {
  const filterOptions = [
    { value: 'all', label: 'All Monitors', icon: Activity, color: 'text-neutral-600 dark:text-neutral-400' },
    { value: 'up', label: 'Online', icon: CheckCircle2, color: 'text-success-600 dark:text-success-400' },
    { value: 'down', label: 'Offline', icon: XCircle, color: 'text-danger-600 dark:text-danger-400' },
    { value: 'paused', label: 'Paused', icon: Pause, color: 'text-neutral-600 dark:text-neutral-400' },
    { value: 'pending', label: 'Pending', icon: Clock, color: 'text-warning-600 dark:text-warning-400' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed lg:sticky top-0 left-0 h-screen w-72 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 z-50 overflow-y-auto"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    Filters
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="lg:hidden p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                </button>
              </div>

              {/* Status Filters */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
                  Status
                </h3>
                {filterOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = filters.status === option.value;
                  
                  return (
                    <motion.button
                      key={option.value}
                      whileHover={{ x: 4 }}
                      onClick={() => onFilterChange({ ...filters, status: option.value })}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                          : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : option.color}`} />
                      <span className="font-medium">{option.label}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Tags Section (placeholder for future) */}
              <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800">
                <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  No tags yet
                </p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;

