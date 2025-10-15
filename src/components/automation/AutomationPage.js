import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Header from '../dashboard/Header';
import Sidebar from '../dashboard/Sidebar';
import { useMonitors } from '../../hooks/useMonitors';

const AutomationPage = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ monitor_id: '', condition_type: 'down', action_type: 'toast', payload_json: '{}' });

  const load = async () => {
    try {
      const res = await api.get('/automation/rules');
      setRules(res.data || []);
    } catch (e) { setError('Failed to load'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const createRule = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/automation/rules', form);
      setRules([res.data, ...rules]);
      setForm({ monitor_id: '', condition_type: 'down', action_type: 'toast', payload_json: '{}' });
    } catch (e) { setError('Failed to create'); }
  };

  const deleteRule = async (id) => {
    try { await api.delete(`/automation/rules/${id}`); setRules(rules.filter(r => r.id !== id)); } catch {}
  };

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
        <main className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">Automation</h1>
        <form onSubmit={createRule} className="bg-white dark:bg-neutral-900 rounded-xl p-4 border border-neutral-200 dark:border-neutral-800 mb-6">
          <div className="grid md:grid-cols-4 gap-3">
            <input className="px-3 py-2 rounded bg-neutral-100 dark:bg-neutral-800" placeholder="Monitor ID" value={form.monitor_id} onChange={(e) => setForm({ ...form, monitor_id: e.target.value })} />
            <select className="px-3 py-2 rounded bg-neutral-100 dark:bg-neutral-800" value={form.condition_type} onChange={(e) => setForm({ ...form, condition_type: e.target.value })}>
              <option value="down">Goes Down</option>
              <option value="recovered">Recovered</option>
            </select>
            <select className="px-3 py-2 rounded bg-neutral-100 dark:bg-neutral-800" value={form.action_type} onChange={(e) => setForm({ ...form, action_type: e.target.value })}>
              <option value="toast">Toast</option>
              <option value="sound">Sound</option>
              <option value="webhook">Webhook</option>
            </select>
            <input className="px-3 py-2 rounded bg-neutral-100 dark:bg-neutral-800" placeholder='Payload JSON (e.g. {"url":"http://..."})' value={form.payload_json} onChange={(e) => setForm({ ...form, payload_json: e.target.value })} />
          </div>
          <div className="mt-3">
            <button type="submit" className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg">Add Rule</button>
          </div>
        </form>

        <div className="bg-white dark:bg-neutral-900 rounded-xl p-4 border border-neutral-200 dark:border-neutral-800">
          {loading ? 'Loading...' : error ? error : (
            <div className="space-y-2">
              {rules.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded bg-neutral-50 dark:bg-neutral-800">
                  <div className="text-sm text-neutral-800 dark:text-neutral-200">Monitor {r.monitor_id} · {r.condition_type} → {r.action_type}</div>
                  <button onClick={() => deleteRule(r.id)} className="text-sm text-danger-600 hover:underline">Delete</button>
                </div>
              ))}
              {rules.length === 0 && <div className="text-neutral-500">No rules yet.</div>}
            </div>
          )}
        </div>
      </div>
        </main>
      </div>
    </div>
  );
};

export default AutomationPage;


