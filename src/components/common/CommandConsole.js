import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, 
  Play, 
  History, 
  X, 
  Maximize2, 
  Minimize2,
  Clock,
  CheckCircle,
  XCircle,
  Loader
} from 'lucide-react';
import { commandService } from '../../services/commandService';
import { useWebSocket } from '../../hooks/useWebSocket';

const CommandConsole = ({ isMobile = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!isMobile);
  const [command, setCommand] = useState('');
  const [commandType, setCommandType] = useState('ping');
  const [target, setTarget] = useState('');
  const [history, setHistory] = useState([]);
  const [availableCommands, setAvailableCommands] = useState([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentExecution, setCurrentExecution] = useState(null);
  const inputRef = useRef(null);
  const historyRef = useRef(null);

  // Initialize WebSocket for real-time updates
  useWebSocket();

  useEffect(() => {
    loadAvailableCommands();
    loadCommandHistory();
  }, []);

  useEffect(() => {
    // Listen for command results via WebSocket
    const handleCommandResult = (event) => {
      const data = event.detail;
      if (data.type === 'command:result') {
        setCurrentExecution(data);
        setIsExecuting(false);
        
        // Update history
        loadCommandHistory();
      }
    };

    window.addEventListener('command:result', handleCommandResult);
    return () => window.removeEventListener('command:result', handleCommandResult);
  }, []);

  const loadAvailableCommands = async () => {
    try {
      const commands = await commandService.getAvailableCommands();
      setAvailableCommands(commands);
    } catch (error) {
      console.error('Failed to load available commands:', error);
    }
  };

  const loadCommandHistory = async () => {
    try {
      const historyData = await commandService.getCommandHistory(20);
      setHistory(historyData);
    } catch (error) {
      console.error('Failed to load command history:', error);
    }
  };

  const executeCommand = async () => {
    if (!target.trim() || isExecuting) return;

    setIsExecuting(true);
    setCurrentExecution(null);

    try {
      const result = await commandService.executeCommand(commandType, target.trim());
      setCurrentExecution(result);
    } catch (error) {
      console.error('Command execution failed:', error);
      setIsExecuting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCommand();
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-neutral-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'text-blue-500';
      case 'completed':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-neutral-400';
    }
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const selectedCommand = availableCommands.find(cmd => cmd.type === commandType);

  return (
    <>
      {/* Mobile Modal */}
      {isMobile && (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div 
                className="absolute inset-0 bg-black/50" 
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-xl shadow-2xl"
              >
                <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                      Command Console
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
                  >
                    <X className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </button>
                </div>
                <div className="p-4">
                  <CommandConsoleContent
                    commandType={commandType}
                    setCommandType={setCommandType}
                    target={target}
                    setTarget={setTarget}
                    executeCommand={executeCommand}
                    isExecuting={isExecuting}
                    currentExecution={currentExecution}
                    history={history}
                    availableCommands={availableCommands}
                    handleKeyPress={handleKeyPress}
                    getStatusIcon={getStatusIcon}
                    getStatusColor={getStatusColor}
                    formatDuration={formatDuration}
                    selectedCommand={selectedCommand}
                    isMobile={true}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Desktop Card */}
      {!isMobile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Command Console
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg"
              >
                {isExpanded ? (
                  <Minimize2 className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                )}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="p-4"
              >
                <CommandConsoleContent
                  commandType={commandType}
                  setCommandType={setCommandType}
                  target={target}
                  setTarget={setTarget}
                  executeCommand={executeCommand}
                  isExecuting={isExecuting}
                  currentExecution={currentExecution}
                  history={history}
                  availableCommands={availableCommands}
                  handleKeyPress={handleKeyPress}
                  getStatusIcon={getStatusIcon}
                  getStatusColor={getStatusColor}
                  formatDuration={formatDuration}
                  selectedCommand={selectedCommand}
                  isMobile={false}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Mobile Trigger Button */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg z-40"
        >
          <Terminal className="w-6 h-6" />
        </button>
      )}
    </>
  );
};

const CommandConsoleContent = ({
  commandType,
  setCommandType,
  target,
  setTarget,
  executeCommand,
  isExecuting,
  currentExecution,
  history,
  availableCommands,
  handleKeyPress,
  getStatusIcon,
  getStatusColor,
  formatDuration,
  selectedCommand,
  isMobile
}) => {
  return (
    <div className="space-y-4">
      {/* Command Selection */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Command Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {availableCommands.map((cmd) => (
            <button
              key={cmd.type}
              onClick={() => setCommandType(cmd.type)}
              className={`p-3 rounded-lg border text-left transition ${
                commandType === cmd.type
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{cmd.icon}</span>
                <div>
                  <div className="font-medium text-sm">{cmd.name}</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    {cmd.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Target Input */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Target
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={selectedCommand?.example || 'Enter target...'}
            className="flex-1 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={executeCommand}
            disabled={!target.trim() || isExecuting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-400 text-white rounded-lg transition flex items-center gap-2"
          >
            {isExecuting ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Execute
          </button>
        </div>
      </div>

      {/* Current Execution */}
      {currentExecution && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            {getStatusIcon(currentExecution.status)}
            <span className={`font-medium ${getStatusColor(currentExecution.status)}`}>
              {currentExecution.status.charAt(0).toUpperCase() + currentExecution.status.slice(1)}
            </span>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {formatDuration(currentExecution.duration)}
            </span>
          </div>
          <div className="text-sm text-neutral-700 dark:text-neutral-300">
            <strong>{currentExecution.type}</strong> {currentExecution.target}
          </div>
          {currentExecution.output && (
            <pre className="mt-2 text-xs bg-neutral-100 dark:bg-neutral-800 p-2 rounded overflow-x-auto">
              {currentExecution.output}
            </pre>
          )}
          {currentExecution.error && (
            <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
              {currentExecution.error}
            </div>
          )}
        </motion.div>
      )}

      {/* Command History */}
      {history.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <History className="w-4 h-4 text-neutral-500" />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Recent Commands
            </span>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {history.slice(0, 5).map((cmd) => (
              <div
                key={cmd.id}
                className="flex items-center gap-2 p-2 bg-neutral-50 dark:bg-neutral-700 rounded text-xs"
              >
                {getStatusIcon(cmd.status)}
                <span className="font-medium">{cmd.type}</span>
                <span className="text-neutral-500 dark:text-neutral-400">{cmd.target}</span>
                <span className="text-neutral-400 dark:text-neutral-500 ml-auto">
                  {formatDuration(cmd.duration)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandConsole;
