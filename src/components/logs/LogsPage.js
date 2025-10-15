import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { wsService } from '../../services/websocketService';
import Header from '../dashboard/Header';
import Sidebar from '../dashboard/Sidebar';
import { useMonitors } from '../../hooks/useMonitors';
import AISummary from '../common/AISummary';
import CommandConsole from '../common/CommandConsole';
import { monitorService } from '../../services/monitorService';

const levelColors = {
  info: 'text-emerald-400',
  error: 'text-red-400',
  warn: 'text-yellow-400',
};

const LogsPage = () => {
  const { data: monitors } = useMonitors();
  const [logs, setLogs] = useState([]);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('all');
  const [selected, setSelected] = useState({});
  const endRef = useRef(null);
  const [incidents, setIncidents] = useState([]);
  const [showAISummaries, setShowAISummaries] = useState(false);

  useEffect(() => {
    const unsub = wsService.subscribe('logs:event', (evt) => {
      setLogs((prev) => [...prev, { ts: Date.now(), ...evt }].slice(-1000));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Fetch incidents for AI summaries
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const allIncidents = [];
        for (const monitor of monitors || []) {
          try {
            const monitorIncidents = await monitorService.getIncidents(monitor.id);
            allIncidents.push(...(monitorIncidents || []));
          } catch (error) {
            console.error(`Failed to fetch incidents for monitor ${monitor.id}:`, error);
          }
        }
        setIncidents(allIncidents.slice(0, 10)); // Limit to 10 most recent
      } catch (error) {
        console.error('Failed to fetch incidents:', error);
      }
    };

    if (monitors && monitors.length > 0) {
      fetchIncidents();
    }
  }, [monitors]);

  const filtered = useMemo(() => logs.filter(l => {
    const matchLevel = level === 'all' || String(l.level).toLowerCase() === level;
    const q = query.trim().toLowerCase();
    const matchQuery = !q || JSON.stringify(l).toLowerCase().includes(q);
    const hasSelection = Object.values(selected).some(Boolean);
    const matchMonitor = !hasSelection || (l.monitor_id && selected[String(l.monitor_id)]);
    return matchLevel && matchQuery && matchMonitor;
  }), [logs, query, level, selected]);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSelect = (monitorId, checked) => {
    setSelected((s) => ({ ...s, [String(monitorId)]: checked }));
  };

  const monitorMap = useMemo(() => {
    const m = {};
    (monitors || []).forEach((mm) => { m[String(mm.id)] = mm; });
    return m;
  }, [monitors]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Header
        onAddMonitor={() => {}}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onToggleNotifications={() => {}}
        displayMode={'grid'}
        onDisplayModeChange={() => {}}
      />
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} filters={{status:'all',tags:[]}} onFilterChange={() => {}} monitors={monitors || []} />
        <main className="flex-1 p-0 lg:p-0">
          {/* Command Console for Logs Page */}
          <div className="p-4 bg-neutral-800 border-b border-neutral-700">
            <CommandConsole isMobile={false} />
          </div>
      <div className="sticky top-16 z-10 bg-neutral-900 border-b border-neutral-800 px-4 py-3 flex items-center gap-3">
        <input className="flex-1 px-3 py-2 rounded bg-neutral-800 text-neutral-100" placeholder="Search logs..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="px-3 py-2 rounded bg-neutral-800" value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="all">All</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>
      </div>
      <div className="font-mono text-sm p-4 space-y-2 text-neutral-100 bg-neutral-950 min-h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="flex flex-wrap gap-2 mb-2">
          <label className={`flex items-center gap-2 px-2 py-1 rounded-md ${Object.values(selected).some(Boolean) ? 'bg-neutral-800 text-neutral-200' : 'bg-primary-600 text-white'}`}>
            <input type="checkbox" className="accent-primary-600" checked={!Object.values(selected).some(Boolean)} onChange={() => setSelected({})} />
            <div className="w-5 h-5 rounded-full bg-neutral-700 flex items-center justify-center text-[10px]">A</div>
            <span className="text-xs truncate max-w-[140px]">All Monitors</span>
          </label>
          {(monitors || []).map((m) => {
            const checked = !!selected[String(m.id)];
            return (
              <label key={m.id} className={`flex items-center gap-2 px-2 py-1 rounded-md ${checked ? 'bg-primary-600 text-white' : 'bg-neutral-800 text-neutral-200'}`}>
                <input type="checkbox" className="accent-primary-600" checked={checked} onChange={(e) => toggleSelect(m.id, e.target.checked)} />
                <div className="w-5 h-5 rounded-full bg-neutral-700 flex items-center justify-center text-[10px]">
                  {(m.name || '').charAt(0).toUpperCase()}
                </div>
                <span className="text-xs truncate max-w-[140px]">{m.name}</span>
              </label>
            );
          })}
        </div>
        {filtered.map((l, i) => {
          const m = l.monitor_id ? monitorMap[String(l.monitor_id)] : null;
          return (
            <div key={i} className="whitespace-pre-wrap break-words flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] mt-0.5">
                {(m?.name || '').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <span className="text-neutral-500">[{new Date(l.ts).toLocaleTimeString()}]</span>{' '}
                <span className={levelColors[String(l.level)] || 'text-neutral-300'}>{String(l.level).toUpperCase()}</span>{' '}
                <span>{l.message}</span>
                {l.monitor_id ? <span className="text-neutral-500"> · monitor {l.monitor_id}</span> : null}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
        
        {/* AI Summaries Section */}
        {incidents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-4 bg-neutral-800 rounded-lg border border-neutral-700"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-100">AI Incident Summaries</h3>
              <button
                onClick={() => setShowAISummaries(!showAISummaries)}
                className="text-sm text-neutral-400 hover:text-neutral-200 underline"
              >
                {showAISummaries ? 'Hide' : 'Show'} Summaries
              </button>
            </div>
            
            {showAISummaries && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                {incidents.map((incident) => {
                  const monitor = monitorMap[String(incident.monitor_id)];
                  return (
                    <div key={incident.id} className="bg-neutral-900 rounded-lg p-4 border border-neutral-700">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center text-[10px]">
                          {(monitor?.name || '').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-neutral-200">
                          {monitor?.name || `Monitor ${incident.monitor_id}`}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {new Date(incident.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <AISummary incidentId={incident.id} isMobile={false} />
                    </div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
        </main>
      </div>
    </div>
  );
};

export default LogsPage;


