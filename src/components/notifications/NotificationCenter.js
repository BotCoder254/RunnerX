import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, CheckCircle, XCircle, AlertCircle, Trash2 } from 'lucide-react';
import { useNotifications, useMarkNotificationSeen, useDeleteNotification } from '../../hooks/useNotifications';
import { formatDate } from '../../utils/formatters';

const NotificationCenter = ({ isOpen, onClose }) => {
  const { data: notifications, isLoading } = useNotifications();
  const markSeen = useMarkNotificationSeen();
  const deleteNotification = useDeleteNotification();

  const unreadCount = notifications?.filter(n => !n.seen_at).length || 0;

  const handleMarkSeen = (id) => {
    markSeen.mutate(id);
  };

  const handleDelete = (id) => {
    deleteNotification.mutate(id);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'down':
        return <XCircle className="w-5 h-5 text-danger-500" />;
      case 'up':
        return <CheckCircle className="w-5 h-5 text-success-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-warning-500" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'down':
        return 'bg-danger-50 dark:bg-danger-900/20 border-danger-200 dark:border-danger-900/50';
      case 'up':
        return 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-900/50';
      default:
        return 'bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-900/50';
    }
  };

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

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white dark:bg-neutral-900 shadow-2xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    Notifications
                  </h2>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-primary-600 text-white text-xs font-bold rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
                </div>
              ) : notifications && notifications.length > 0 ? (
                notifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`border rounded-lg p-4 ${
                      notification.seen_at
                        ? 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
                        : getNotificationColor(notification.type)
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                          {notification.message}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          {formatDate(notification.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {!notification.seen_at && (
                          <button
                            onClick={() => handleMarkSeen(notification.id)}
                            className="p-1.5 hover:bg-white dark:hover:bg-neutral-700 rounded transition"
                            title="Mark as read"
                          >
                            <CheckCircle className="w-4 h-4 text-neutral-500" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="p-1.5 hover:bg-white dark:hover:bg-neutral-700 rounded transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-neutral-500" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-neutral-300 dark:text-neutral-700" />
                  <p className="text-neutral-500 dark:text-neutral-400">
                    No notifications yet
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationCenter;

