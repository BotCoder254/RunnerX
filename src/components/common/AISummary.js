import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import TypewriterEffect from './TypewriterEffect';
import { aiSummaryService } from '../../services/aiSummaryService';

const AISummary = ({ incidentId, isMobile = false }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(!isMobile);
  const [showTypewriter, setShowTypewriter] = useState(false);

  useEffect(() => {
    if (incidentId) {
      loadSummary();
    }
  }, [incidentId]);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await aiSummaryService.getSummary(incidentId);
      setSummary(data);
      setShowTypewriter(true);
    } catch (err) {
      setError('Failed to load AI summary');
      console.error('AI Summary Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTypewriterComplete = () => {
    // Typewriter effect completed
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'text-red-500';
      case 'warn':
      case 'warning':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-neutral-500';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800"
      >
        <div className="flex items-center gap-2 mb-3">
          <Bot className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            AI Summary
          </span>
          <Sparkles className="w-3 h-3 text-blue-500 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          <span className="text-sm text-blue-600 dark:text-blue-400 ml-2">
            Generating summary...
          </span>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800"
      >
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-4 h-4 text-red-500" />
          <span className="text-sm font-medium text-red-700 dark:text-red-300">
            AI Summary Error
          </span>
        </div>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={loadSummary}
          className="mt-2 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
        >
          Try again
        </button>
      </motion.div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            AI Summary
          </span>
          <Sparkles className="w-3 h-3 text-blue-500" />
        </div>
        
        {isMobile && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            )}
          </button>
        )}
      </div>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="px-4 pb-4"
          >
            {/* Summary Text */}
            <div className="mb-3">
              {showTypewriter ? (
                <TypewriterEffect
                  text={summary.summary}
                  speed={30}
                  onComplete={handleTypewriterComplete}
                />
              ) : (
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {summary.summary}
                </p>
              )}
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap gap-3 text-xs">
              {summary.duration && (
                <div className="flex items-center gap-1">
                  <span className="text-neutral-500 dark:text-neutral-400">Duration:</span>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    {summary.duration}
                  </span>
                </div>
              )}
              
              {summary.severity && (
                <div className="flex items-center gap-1">
                  <span className="text-neutral-500 dark:text-neutral-400">Severity:</span>
                  <span className={`font-medium ${getSeverityColor(summary.severity)}`}>
                    {summary.severity}
                  </span>
                </div>
              )}
              
              {summary.confidence && (
                <div className="flex items-center gap-1">
                  <span className="text-neutral-500 dark:text-neutral-400">Confidence:</span>
                  <span className={`font-medium ${getConfidenceColor(summary.confidence)}`}>
                    {Math.round(summary.confidence * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Keywords */}
            {summary.keywords && (
              <div className="mt-3">
                <span className="text-xs text-neutral-500 dark:text-neutral-400 mb-2 block">
                  Key Terms:
                </span>
                <div className="flex flex-wrap gap-1">
                  {JSON.parse(summary.keywords || '[]').slice(0, 5).map((keyword, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AISummary;
