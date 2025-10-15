import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);

    // Auto-lock after 30 minutes of inactivity
    let lockTimer;
    const resetLockTimer = () => {
      clearTimeout(lockTimer);
      if (currentUser && !isLocked) {
        lockTimer = setTimeout(() => {
          setIsLocked(true);
        }, 30 * 60 * 1000); // 30 minutes
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetLockTimer);
    });

    resetLockTimer();

    return () => {
      clearTimeout(lockTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetLockTimer);
      });
    };
  }, [isLocked]);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    setUser(data.user);
    setIsLocked(false);
    return data;
  };

  const register = async (email, password, name) => {
    const data = await authService.register(email, password, name);
    setUser(data.user);
    setIsLocked(false);
    return data;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsLocked(false);
  };

  const unlock = async (password) => {
    if (!user) return false;
    try {
      await authService.login(user.email, password);
      setIsLocked(false);
      return true;
    } catch (error) {
      return false;
    }
  };

  const lock = () => {
    setIsLocked(true);
  };

  const value = {
    user,
    loading,
    isLocked,
    login,
    register,
    logout,
    unlock,
    lock,
    isAuthenticated: !!user && !isLocked,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

