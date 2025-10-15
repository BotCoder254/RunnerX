import React from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Plus, 
  Settings, 
  Moon, 
  Sun, 
  Menu,
  LogOut,
  Lock,
  Bell
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import DisplayModeToggle from './DisplayModeToggle';

const Header = ({ onAddMonitor, onToggleSidebar, onToggleNotifications, displayMode, onDisplayModeChange }) => {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout, lock } = useAuth();
  const { data: notifications } = useNotifications();
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  const unreadCount = notifications?.filter(n => !n.seen_at).length || 0;

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-lg border-b border-neutral-200 dark:border-neutral-800">
      <div className="px-4 lg:px-6 h-16 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition lg:block"
          >
            <Menu className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
          </button>
          
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
              className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30"
            >
              <Activity className="w-6 h-6 text-white" strokeWidth={2.5} />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                RunnerX
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:block">
                Service Monitor
              </p>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAddMonitor}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition shadow-lg shadow-primary-500/30"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline font-medium">Add Monitor</span>
          </motion.button>

          {/* Display Mode Toggle */}
          <div className="hidden lg:block">
            <DisplayModeToggle currentMode={displayMode} onChange={onDisplayModeChange} />
          </div>

          {/* Notifications */}
          <button
            onClick={onToggleNotifications}
            className="relative p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-danger-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            ) : (
              <Moon className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            )}
          </button>

          <button
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition hidden md:block"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center hover:ring-2 hover:ring-primary-500 transition"
            >
              <span className="text-sm font-semibold text-primary-700 dark:text-primary-400">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden z-50"
                >
                  <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                      {user?.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {user?.email}
                    </p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => {
                        lock();
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition text-sm"
                    >
                      <Lock className="w-4 h-4" />
                      Lock Screen
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded transition text-sm"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

