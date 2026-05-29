'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

const statusColumns = ['CONFIRMED', 'PREPARING', 'READY'] as const;
const columnLabels: Record<string, string> = { CONFIRMED: 'NEW', PREPARING: 'PREPARING', READY: 'READY' };
const columnColors: Record<string, string> = { CONFIRMED: 'border-yellow-500', PREPARING: 'border-blue-500', READY: 'border-green-500' };
const nextStatus: Record<string, string> = { CONFIRMED: 'PREPARING', PREPARING: 'READY', READY: 'DELIVERED' };
const buttonLabels: Record<string, string> = { CONFIRMED: 'Accept', PREPARING: 'Mark Ready', READY: 'Complete' };
const buttonColors: Record<string, string> = { CONFIRMED: 'bg-yellow-600 hover:bg-yellow-700', PREPARING: 'bg-blue-600 hover:bg-blue-700', READY: 'bg-green-600 hover:bg-green-700' };

function elapsed(from: string): string {
  const sec = Math.floor((Date.now() - new Date(from).getTime()) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  return `${min}m ${sec % 60}s`;
}

export default function KitchenPage() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const t = sessionStorage.getItem('token');
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    const fetchOrders = () =>
      api.orders.kitchen().then(setOrders).catch(() => {});
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => setOrders((prev: any[]) => [...prev]), 1000);
    return () => clearInterval(interval);
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

  const handleStatus = async (orderId: string, currentStatus: string) => {
    const next = nextStatus[currentStatus];
    try {
      const updated = await api.orders.updateStatus(orderId, next);
      setOrders((prev: any[]) => prev.map((o: any) => (o.id === orderId ? updated : o)));
    } catch {}
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <form onSubmit={handleLogin} className="bg-gray-800 p-8 rounded-xl w-80 space-y-4">
          <h1 className="text-2xl font-bold text-center">Kitchen Login</h1>
          {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}
          <input
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400"
          />
          <button className="w-full bg-[var(--primary)] text-white p-3 rounded-lg font-medium">
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">👨‍🍳 Kitchen Display</h1>
        <button
          onClick={() => { sessionStorage.removeItem('token'); setToken(null); }}
          className="text-sm text-gray-400 hover:text-white"
        >
          Logout
        </button>
      </header>

      <div className="grid grid-cols-3 gap-4">
        {statusColumns.map(col => {
          const colOrders = orders.filter((o: any) => o.status === col);
          return (
            <div key={col} className={`bg-gray-800 rounded-xl border-t-4 ${columnColors[col]} p-4`}>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                {columnLabels[col]}
                <span className="text-sm text-gray-400">({colOrders.length})</span>
              </h2>
              <div className="space-y-3">
                {colOrders.map((order: any) => (
                  <div key={order.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm">{order.orderNumber}</span>
                      <span className="text-xs text-gray-400">{elapsed(order.createdAt)}</span>
                    </div>
                    <div className="space-y-1 mb-3">
                      {order.orderItems?.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-gray-300">{item.menuItem?.name}</span>
                          <span className="text-white font-medium">×{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => handleStatus(order.id, col)}
                      className={`w-full py-2 rounded-lg text-sm font-medium text-white ${buttonColors[col]}`}
                    >
                      {buttonLabels[col]}
                    </button>
                  </div>
                ))}
                {colOrders.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-8">No orders</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
