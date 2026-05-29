'use client';

import { useState, useEffect, useRef } from 'react';
import { api, type Notification } from '@/lib/api';

const typeIcons: Record<string, string> = {
  ORDER_CONFIRMED: '🆕',
  ORDER_READY: '✅',
  PAYMENT_RECEIVED: '💰',
  LOW_STOCK: '⚠️',
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUnread = () =>
      api.notifications.unreadCount().then(setUnread).catch(() => {});
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    api.notifications.list().then(setNotifications).catch(() => {});
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await api.notifications.markRead(id);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
      setUnread(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
    } catch {}
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative text-gray-400 hover:text-white transition">
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-medium">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-8 w-80 bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden z-50">
          <div className="p-3 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-medium">Notifications</h3>
            {unread > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-[var(--primary)] hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No notifications</p>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`p-3 border-b border-gray-700/50 cursor-pointer hover:bg-gray-700/50 transition ${!n.read ? 'bg-gray-700/30' : ''}`} onClick={() => !n.read && handleMarkRead(n.id)}>
                  <div className="flex items-start gap-2">
                    <span className="text-base">{typeIcons[n.type] || '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {new Date(n.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    {!n.read && <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mt-1.5 shrink-0" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
