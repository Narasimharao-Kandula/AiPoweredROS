'use client';

import { useState, useEffect } from 'react';
import { api, type Notification } from '@/lib/api';

const typeIcons: Record<string, string> = {
  ORDER_CONFIRMED: '🆕',
  ORDER_READY: '✅',
  PAYMENT_RECEIVED: '💰',
  LOW_STOCK: '⚠️',
};

export default function NotificationsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const t = sessionStorage.getItem('token');
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    api.notifications.list().then(setNotifications).catch(() => {});
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await api.orders.login(email, password);
      sessionStorage.setItem('token', res.accessToken);
      setToken(res.accessToken);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.notifications.markRead(id);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    } catch {}
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <form onSubmit={handleLogin} className="bg-gray-800 p-8 rounded-xl w-80 space-y-4">
          <h1 className="text-2xl font-bold text-center">Notifications</h1>
          {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
          <button className="w-full bg-[var(--primary)] text-white p-3 rounded-lg font-medium">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <div className="flex gap-3">
          <button onClick={async () => { try { await api.notifications.markAllRead(); setNotifications(prev => prev.map(n => ({ ...n, read: true }))); } catch {} }} className="text-sm text-[var(--primary)] hover:underline">
            Mark all read
          </button>
          <button onClick={() => { sessionStorage.removeItem('token'); setToken(null); }} className="text-sm text-gray-400 hover:text-white">Logout</button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto space-y-2">
        {notifications.length === 0 && (
          <p className="text-gray-500 text-center py-12">No notifications yet</p>
        )}
        {notifications.map(n => (
          <div key={n.id} className={`bg-gray-800 rounded-lg p-4 flex items-start gap-3 cursor-pointer transition ${!n.read ? 'ring-1 ring-[var(--primary)]/30' : ''}`} onClick={() => !n.read && handleMarkRead(n.id)}>
            <span className="text-xl">{typeIcons[n.type] || '📋'}</span>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <h3 className="font-medium">{n.title}</h3>
                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">{n.message}</p>
            </div>
            {!n.read && <span className="w-2 h-2 bg-[var(--primary)] rounded-full mt-2 shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}
