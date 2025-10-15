import React from 'react';
import { motion } from 'framer-motion';
import { Grid, List, LayoutGrid, Square } from 'lucide-react';

const DisplayModeToggle = ({ currentMode, onChange }) => {
  const modes = [
    { value: 'grid', label: 'Grid', icon: Grid },
    { value: 'list', label: 'List', icon: List },
    { value: 'compact', label: 'Compact', icon: Square },
    { value: 'masonry', label: 'Masonry', icon: LayoutGrid },
  ];

  return (
    <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
      {modes.map((mode) => {
        const Icon = mode.icon;
        return (
          <motion.button
            key={mode.value}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(mode.value)}
            className={`relative px-3 py-2 rounded-md transition ${
              currentMode === mode.value
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
            title={mode.label}
          >
            {currentMode === mode.value && (
              <motion.div
                layoutId="activeMode"
                className="absolute inset-0 bg-white dark:bg-neutral-700 rounded-md shadow"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
            <Icon className="w-5 h-5 relative z-10" />
          </motion.button>
        );
      })}
    </div>
  );
};

export default DisplayModeToggle;

