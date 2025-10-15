import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Pause,
  Clock,
  Filter,
  Tag,
  X,
  Radio,
} from "lucide-react";

const Sidebar = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  monitors = [],
}) => {
  const filterOptions = [
    {
      value: "all",
      label: "All Monitors",
      icon: Activity,
      color: "text-neutral-600 dark:text-neutral-400",
    },
    {
      value: "up",
      label: "Online",
      icon: CheckCircle2,
      color: "text-success-600 dark:text-success-400",
    },
    {
      value: "down",
      label: "Offline",
      icon: XCircle,
      color: "text-danger-600 dark:text-danger-400",
    },
    {
      value: "paused",
      label: "Paused",
      icon: Pause,
      color: "text-neutral-600 dark:text-neutral-400",
    },
    {
      value: "pending",
      label: "Pending",
      icon: Clock,
      color: "text-warning-600 dark:text-warning-400",
    },
  ];

  // Extract all unique tags from monitors and count their usage
  const availableTags = useMemo(() => {
    const tagMap = {};

    monitors.forEach((monitor) => {
      if (monitor.tags && Array.isArray(monitor.tags)) {
        monitor.tags.forEach((tag) => {
          if (tag && tag.trim()) {
            const tagName = tag.trim();
            if (tagMap[tagName]) {
              tagMap[tagName].count += 1;
              // Track status distribution for each tag
              if (tagMap[tagName].statuses[monitor.status]) {
                tagMap[tagName].statuses[monitor.status] += 1;
              } else {
                tagMap[tagName].statuses[monitor.status] = 1;
              }
            } else {
              tagMap[tagName] = {
                name: tagName,
                count: 1,
                statuses: { [monitor.status]: 1 },
              };
            }
          }
        });
      }
    });

    return Object.values(tagMap).sort((a, b) => b.count - a.count);
  }, [monitors]);

  const handleTagClick = (tagName) => {
    const currentTags = filters.tags || [];
    const isSelected = currentTags.includes(tagName);

    let newTags;
    if (isSelected) {
      // Remove tag from filter
      newTags = currentTags.filter((tag) => tag !== tagName);
    } else {
      // Add tag to filter
      newTags = [...currentTags, tagName];
    }

    onFilterChange({ ...filters, tags: newTags });
  };

  const clearTagFilters = () => {
    onFilterChange({ ...filters, tags: [] });
  };

  const getTagStatusColor = (tag) => {
    const upCount = tag.statuses.up || 0;
    const downCount = tag.statuses.down || 0;
    const totalCount = tag.count;

    if (downCount === 0) {
      return "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400 border-success-200 dark:border-success-800";
    } else if (upCount === 0) {
      return "bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400 border-danger-200 dark:border-danger-800";
    } else if (upCount / totalCount >= 0.8) {
      return "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400 border-warning-200 dark:border-warning-800";
    } else {
      return "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700";
    }
  };

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
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed lg:sticky top-0 left-0 h-screen w-72 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 z-50"
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

              {/* Navigation */}
              <div className="space-y-2 mb-6">
                <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">Navigate</h3>
                <a href="/dashboard" className="block px-4 py-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800">Dashboard</a>
                <a href="/logs" className="block px-4 py-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800">Logs</a>
                {/* <a href="/dashboard?section=automation" className="block px-4 py-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800">Automation</a> */}
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
                      onClick={() =>
                        onFilterChange({ ...filters, status: option.value })
                      }
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                        isActive
                          ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400"
                          : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${isActive ? "text-primary-600 dark:text-primary-400" : option.color}`}
                      />
                      <span className="font-medium">{option.label}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Tags Section */}
              <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Tags
                    {availableTags.length > 0 && (
                      <span className="bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 text-xs px-2 py-1 rounded-full">
                        {availableTags.length}
                      </span>
                    )}
                  </h3>
                  {filters.tags && filters.tags.length > 0 && (
                    <button
                      onClick={clearTagFilters}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {availableTags.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <Tag className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mb-2" />
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      No tags yet
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                      Add tags to monitors to organize them
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableTags.map((tag) => {
                      const isSelected =
                        filters.tags && filters.tags.includes(tag.name);
                      const tagColorClass = getTagStatusColor(tag);

                      return (
                        <motion.button
                          key={tag.name}
                          whileHover={{ x: 4 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleTagClick(tag.name)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition group ${
                            isSelected
                              ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 border-primary-200 dark:border-primary-800"
                              : `hover:bg-neutral-50 dark:hover:bg-neutral-800 ${tagColorClass}`
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                isSelected
                                  ? "bg-primary-500 dark:bg-primary-400"
                                  : tag.statuses.down > 0
                                    ? "bg-danger-500"
                                    : "bg-success-500"
                              }`}
                            />
                            <span className="text-sm font-medium truncate">
                              {tag.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                isSelected
                                  ? "bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300"
                                  : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400"
                              }`}
                            >
                              {tag.count}
                            </span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {/* Active Tag Filters Display */}
                {filters.tags && filters.tags.length > 0 && (
                  <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Filter className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                        Active Filters
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {filters.tags.map((tagName) => (
                        <motion.span
                          key={tagName}
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300 rounded text-xs font-medium"
                        >
                          {tagName}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTagClick(tagName);
                            }}
                            className="ml-1 hover:bg-primary-200 dark:hover:bg-primary-700 rounded-full p-0.5 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
