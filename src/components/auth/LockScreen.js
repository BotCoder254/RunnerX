import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Activity } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const LockScreen = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { unlock, user, logout } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const success = await unlock(password);
      if (success) {
        toast.success('Unlocked successfully!');
      } else {
        toast.error('Invalid password');
      }
    } catch (error) {
      toast.error('Failed to unlock');
    } finally {
      setLoading(false);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 to-neutral-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-neutral-800 rounded-2xl mb-6 shadow-2xl"
          >
            <Lock className="w-10 h-10 text-neutral-400" strokeWidth={2} />
          </motion.div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Activity className="w-6 h-6 text-primary-500" />
            <h1 className="text-3xl font-bold text-white">RunnerX</h1>
          </div>
          <p className="text-neutral-400">Screen Locked</p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-neutral-800 rounded-2xl shadow-2xl p-8 border border-neutral-700"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-neutral-700 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-white">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-white">{user?.name || 'User'}</h2>
            <p className="text-sm text-neutral-400">{user?.email || ''}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition text-white placeholder-neutral-500"
                  placeholder="Enter your password"
                  autoFocus
                  required
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Unlocking...' : 'Unlock'}
            </motion.button>
          </form>

          <button
            onClick={logout}
            className="w-full mt-4 text-neutral-400 hover:text-white text-sm transition"
          >
            Sign out
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LockScreen;

