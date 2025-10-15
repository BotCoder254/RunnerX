import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Globe, Signal, Activity, AlertCircle, 
  CheckCircle, XCircle, Loader, Zap, Palette 
} from 'lucide-react';
import { MONITOR_TYPES, INTERVALS, HTTP_METHODS } from '../../utils/constants';
import { useCreateMonitor, useUpdateMonitor } from '../../hooks/useMonitors';
import { monitorService } from '../../services/monitorService';
import { toast } from 'react-toastify';

const MonitorModal = ({ isOpen, onClose, monitor = null }) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    name: '',
    type: MONITOR_TYPES.HTTP,
    endpoint: '',
    interval_seconds: 60,
    method: 'GET',
    headers: '',
    timeout: 10,
    enabled: true,
    tags: '',
  });
  const [errors, setErrors] = useState({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const createMonitor = useCreateMonitor();
  const updateMonitor = useUpdateMonitor();
  const isEdit = !!monitor;

  useEffect(() => {
    if (monitor) {
      setFormData({
        name: monitor.name || '',
        type: monitor.type || MONITOR_TYPES.HTTP,
        endpoint: monitor.endpoint || '',
        interval_seconds: monitor.interval_seconds || 60,
        method: monitor.method || 'GET',
        headers: monitor.headers_json || '',
        timeout: monitor.timeout || 10,
        enabled: monitor.enabled !== false,
        tags: monitor.tags?.join(', ') || '',
      });
      monitorService.clearDraft();
    } else {
      // Try to load draft
      const draft = monitorService.loadDraft();
      if (draft) {
        setFormData(draft);
        toast.info('Draft restored');
      }
    }
    setTestResult(null);
    setErrors({});
    setActiveTab('basic');
  }, [monitor, isOpen]);

  // Save draft on form change
  useEffect(() => {
    if (!isEdit && isOpen && formData.name) {
      const draftTimer = setTimeout(() => {
        monitorService.saveDraft(formData);
      }, 1000);
      return () => clearTimeout(draftTimer);
    }
  }, [formData, isEdit, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.endpoint.trim()) {
      newErrors.endpoint = 'Endpoint is required';
    } else {
      // URL validation for HTTP type
      if (formData.type === MONITOR_TYPES.HTTP) {
        try {
          new URL(formData.endpoint);
        } catch {
          newErrors.endpoint = 'Invalid URL format';
        }
      }
    }

    if (formData.interval_seconds < 10 || formData.interval_seconds > 86400) {
      newErrors.interval_seconds = 'Interval must be between 10s and 86400s (24h)';
    }

    if (formData.headers) {
      try {
        JSON.parse(formData.headers);
      } catch {
        newErrors.headers = 'Invalid JSON format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTest = async () => {
    if (!formData.endpoint) {
      toast.error('Please enter an endpoint to test');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const result = await monitorService.testMonitor({
        type: formData.type,
        endpoint: formData.endpoint,
        method: formData.method,
        headers_json: formData.headers,
      });

      setTestResult(result);
      toast.success(`Test successful! ${result.latency_ms}ms`);
    } catch (error) {
      setTestResult({
        status: 'error',
        error: error.response?.data?.error || error.message,
      });
      toast.error('Test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix validation errors');
      return;
    }

    const payload = {
      name: formData.name,
      type: formData.type,
      endpoint: formData.endpoint,
      interval_seconds: parseInt(formData.interval_seconds),
      method: formData.method,
      headers_json: formData.headers,
      timeout: parseInt(formData.timeout),
      enabled: formData.enabled,
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
    };

    try {
      if (isEdit) {
        await updateMonitor.mutateAsync({ id: monitor.id, data: payload });
      } else {
        await createMonitor.mutateAsync(payload);
        monitorService.clearDraft();
      }
      onClose();
    } catch (error) {
      console.error('Failed to save monitor:', error);
    }
  };

  const handleClose = () => {
    if (!isEdit && formData.name && !window.confirm('You have unsaved changes. Are you sure you want to close?')) {
      return;
    }
    onClose();
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case MONITOR_TYPES.HTTP:
        return Globe;
      case MONITOR_TYPES.PING:
        return Signal;
      case MONITOR_TYPES.TCP:
        return Activity;
      default:
        return Globe;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            {/* Modal */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-6 py-4 z-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {isEdit ? 'Edit Monitor' : 'Add New Monitor'}
                  </h2>
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition"
                  >
                    <X className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                  {[
                    { id: 'basic', label: 'Basic', icon: Activity },
                    { id: 'advanced', label: 'Advanced', icon: Zap },
                    { id: 'display', label: 'Display', icon: Palette },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                          activeTab === tab.id
                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Basic Tab */}
                {activeTab === 'basic' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Monitor Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          setErrors({ ...errors, name: '' });
                        }}
                        className={`w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border ${
                          errors.name ? 'border-danger-500' : 'border-neutral-300 dark:border-neutral-700'
                        } rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition text-neutral-900 dark:text-white`}
                        placeholder="My Website"
                        autoFocus
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">{errors.name}</p>
                      )}
                    </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Monitor Type *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.values(MONITOR_TYPES).map((type) => {
                      const Icon = getTypeIcon(type);
                      const isSelected = formData.type === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({ ...formData, type })}
                          className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition ${
                            isSelected
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600'
                          }`}
                        >
                          <Icon className={`w-6 h-6 ${isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-600 dark:text-neutral-400'}`} />
                          <span className={`text-sm font-medium ${isSelected ? 'text-primary-700 dark:text-primary-400' : 'text-neutral-700 dark:text-neutral-300'}`}>
                            {type.toUpperCase()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                    {/* Endpoint */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        {formData.type === MONITOR_TYPES.HTTP ? 'URL' : 'Endpoint'} *
                      </label>
                      <input
                        type={formData.type === MONITOR_TYPES.HTTP ? 'url' : 'text'}
                        value={formData.endpoint}
                        onChange={(e) => {
                          setFormData({ ...formData, endpoint: e.target.value });
                          setErrors({ ...errors, endpoint: '' });
                        }}
                        className={`w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border ${
                          errors.endpoint ? 'border-danger-500' : 'border-neutral-300 dark:border-neutral-700'
                        } rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition text-neutral-900 dark:text-white`}
                        placeholder={formData.type === MONITOR_TYPES.HTTP ? 'https://example.com' : '192.168.1.1'}
                      />
                      {errors.endpoint && (
                        <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">{errors.endpoint}</p>
                      )}
                      
                      {/* Test Button & Result */}
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={handleTest}
                          disabled={testing || !formData.endpoint}
                          className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {testing ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4" />
                              Test Connection
                            </>
                          )}
                        </button>

                        {testResult && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${
                              testResult.status === 'error'
                                ? 'bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-400'
                                : 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400'
                            }`}
                          >
                            {testResult.status === 'error' ? (
                              <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            ) : (
                              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {testResult.status === 'error' ? 'Test Failed' : 'Test Successful'}
                              </p>
                              <p className="text-sm mt-1">
                                {testResult.error || `Status: ${testResult.status_code}, Latency: ${testResult.latency_ms}ms`}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Advanced Tab */}
                {activeTab === 'advanced' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >

                    {/* HTTP Method (only for HTTP) */}
                    {formData.type === MONITOR_TYPES.HTTP && (
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          HTTP Method
                        </label>
                        <select
                          value={formData.method}
                          onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                          className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition text-neutral-900 dark:text-white"
                        >
                          {HTTP_METHODS.map((method) => (
                            <option key={method} value={method}>
                              {method}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Interval */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Check Interval
                      </label>
                      <select
                        value={formData.interval_seconds}
                        onChange={(e) => setFormData({ ...formData, interval_seconds: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition text-neutral-900 dark:text-white"
                      >
                        {INTERVALS.map((interval) => (
                          <option key={interval.value} value={interval.value}>
                            {interval.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        How often to check this monitor (min: 10s, max: 24h)
                      </p>
                    </div>

                    {/* Timeout */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Timeout (seconds)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="60"
                        value={formData.timeout}
                        onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition text-neutral-900 dark:text-white"
                      />
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        Maximum wait time for response (5-60 seconds)
                      </p>
                    </div>

                    {/* Headers (only for HTTP) */}
                    {formData.type === MONITOR_TYPES.HTTP && (
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Headers (JSON format)
                        </label>
                        <textarea
                          value={formData.headers}
                          onChange={(e) => {
                            setFormData({ ...formData, headers: e.target.value });
                            setErrors({ ...errors, headers: '' });
                          }}
                          className={`w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border ${
                            errors.headers ? 'border-danger-500' : 'border-neutral-300 dark:border-neutral-700'
                          } rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition text-neutral-900 dark:text-white font-mono text-sm`}
                          rows={4}
                          placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                        />
                        {errors.headers ? (
                          <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">{errors.headers}</p>
                        ) : (
                          <div className="mt-2 flex items-start gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>Optional. Use valid JSON format. Be cautious with sensitive data.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Display Tab */}
                {activeTab === 'display' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >

                    {/* Tags */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Tags (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={formData.tags}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition text-neutral-900 dark:text-white"
                        placeholder="production, web, api, frontend"
                      />
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        Add tags to organize your monitors
                      </p>
                    </div>

                    {/* Enabled Toggle */}
                    <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          Enable monitoring
                        </span>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          Start checking this monitor immediately
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
                        className={`relative w-12 h-6 rounded-full transition ${
                          formData.enabled ? 'bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-700'
                        }`}
                      >
                        <motion.div
                          animate={{ x: formData.enabled ? 24 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow"
                        />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Actions */}
                <div className="sticky bottom-0 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 px-6 py-4 flex gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-6 py-3 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMonitor.isPending || updateMonitor.isPending}
                    className="flex-1 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/30"
                  >
                    {createMonitor.isPending || updateMonitor.isPending 
                      ? 'Saving...' 
                      : isEdit 
                      ? 'Update Monitor' 
                      : 'Create Monitor'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MonitorModal;

