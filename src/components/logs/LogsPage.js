import React, { useEffect, useMemo, useRef, useState } from 'react';
import { wsService } from '../../services/websocketService';
import Header from '../dashboard/Header';
import Sidebar from '../dashboard/Sidebar';
import { useMonitors } from '../../hooks/useMonitors';

const levelColors = {
  info: 'text-emerald-400',
  error: 'text-red-400',
  warn: 'text-yellow-400',
};

const LogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('all');
  const endRef = useRef(null);

  useEffect(() => {
    const unsub = wsService.subscribe('logs:event', (evt) => {
      setLogs((prev) => [...prev, { ts: Date.now(), ...evt }].slice(-1000));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const filtered = useMemo(() => logs.filter(l => {
    const matchLevel = level === 'all' || String(l.level).toLowerCase() === level;
    const q = query.trim().toLowerCase();
    const matchQuery = !q || JSON.stringify(l).toLowerCase().includes(q);
    return matchLevel && matchQuery;
  }), [logs, query, level]);

  const { data: monitors } = useMonitors();
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
      <div className="sticky top-16 z-10 bg-neutral-900 border-b border-neutral-800 px-4 py-3 flex items-center gap-3">
        <input className="flex-1 px-3 py-2 rounded bg-neutral-800 text-neutral-100" placeholder="Search logs..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="px-3 py-2 rounded bg-neutral-800" value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="all">All</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>
      </div>
      <div className="font-mono text-sm p-4 space-y-1 text-neutral-100 bg-neutral-950 min-h-[calc(100vh-4rem)] overflow-y-auto">
        {filtered.map((l, i) => (
          <div key={i} className="whitespace-pre-wrap break-words">
            <span className="text-neutral-500">[{new Date(l.ts).toLocaleTimeString()}]</span>{' '}
            <span className={levelColors[String(l.level)] || 'text-neutral-300'}>{String(l.level).toUpperCase()}</span>{' '}
            <span>{l.message}</span>
            {l.monitor_id ? <span className="text-neutral-500"> · monitor {l.monitor_id}</span> : null}
          </div>
        ))}
        <div ref={endRef} />
      </div>
        </main>
      </div>
    </div>
  );
};

export default LogsPage;


