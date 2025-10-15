import React, { useEffect, useState } from 'react';

const StatusPublicPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const slug = window.location.pathname.split('/').pop();
    const load = async () => {
      try {
        const res = await fetch(`/status/${slug}`);
        if (!res.ok) throw new Error('Failed to load status page');
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center text-neutral-600 dark:text-neutral-300">Loading...</div>;
  }
  if (error || !data) {
    return <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center text-danger-600">{error || 'Not found'}</div>;
  }

  const page = data.page || {};
  const monitors = data.monitors || [];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-neutral-900/80 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary-600" />
            <h1 className="text-lg font-bold text-neutral-900 dark:text-white">{page.name || 'Status'}</h1>
          </div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">Updated {new Date(data.generated_at).toLocaleTimeString()}</div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className={page.layout === 'list' ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'}>
          {monitors.map((m) => (
            <div key={m.id} className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-neutral-900 dark:text-white truncate">{m.name}</div>
                <span className={`px-2 py-0.5 rounded text-xs ${m.status === 'up' ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400' : m.status === 'down' ? 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400' : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'}`}>{m.status}</span>
              </div>
              {page.show_uptime !== false && (
                <div className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">Uptime: {(m.uptime_percent || 0).toFixed(2)}%</div>
              )}
              {page.show_latency !== false && (
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Last latency: {m.last_latency_ms ? `${m.last_latency_ms}ms` : '—'}</div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default StatusPublicPage;


