'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { getSocket, disconnectSocket } from '@/lib/socket';

function elapsed(from: string): string {
  const sec = Math.floor((Date.now() - new Date(from).getTime()) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  return `${min}m ${sec % 60}s`;
}

export default function DeliveryPage() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState<'pickup' | 'transit'>('pickup');

  useEffect(() => {
    const t = sessionStorage.getItem('token');
    if (t) setToken(t);
  }, []);

  // WebSocket + initial fetch
  useEffect(() => {
    if (!token) return;

    api.delivery.mine().then(setOrders).catch(() => {});

    const socket = getSocket();
    socket.on('order.status.updated', (order: any) => {
      if (['READY', 'PICKED_UP'].includes(order.status)) {
        setOrders(prev => {
          const filtered = prev.filter((o: any) => o.id !== order.id);
          return [...filtered, order];
        });
      } else {
        setOrders(prev => prev.filter((o: any) => o.id !== order.id));
      }
    });

    return () => {
      socket.off('order.status.updated');
    };
  }, [token]);

  // elapsed timer
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => setOrders((prev: any[]) => [...prev]), 1000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (token === null) disconnectSocket();
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

  const handlePickup = async (id: string) => {
    try {
      const updated = await api.delivery.pickup(id);
      setOrders((prev: any[]) => prev.map((o: any) => (o.id === id ? updated : o)));
    } catch {}
  };

  const handleDeliver = async (id: string) => {
    try {
      const updated = await api.delivery.deliver(id);
      setOrders((prev: any[]) => prev.map((o: any) => (o.id === id ? updated : o)));
    } catch {}
  };

  const pickupOrders = orders.filter((o: any) => o.status === 'READY');
  const transitOrders = orders.filter((o: any) => o.status === 'PICKED_UP');

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <form onSubmit={handleLogin} className="bg-gray-800 p-8 rounded-xl w-80 space-y-4">
          <h1 className="text-2xl font-bold text-center">Delivery Login</h1>
          {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
          <button className="w-full bg-[var(--primary)] text-white p-3 rounded-lg font-medium">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Delivery Dashboard</h1>
        <button onClick={() => { sessionStorage.removeItem('token'); setToken(null); }} className="text-sm text-gray-400 hover:text-white">Logout</button>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button onClick={() => setTab('pickup')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'pickup' ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
          Pending Pickup ({pickupOrders.length})
        </button>
        <button onClick={() => setTab('transit')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'transit' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
          In Transit ({transitOrders.length})
        </button>
      </div>

      {/* Pickup tab */}
      {tab === 'pickup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pickupOrders.map((order: any) => (
            <div key={order.id} className="bg-gray-800 rounded-xl p-4 border-t-4 border-yellow-500">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-lg">{order.orderNumber}</span>
                <span className="text-xs text-gray-400">{elapsed(order.createdAt)} ago</span>
              </div>
              {order.deliveryAddress && (
                <p className="text-sm text-gray-300 mb-3">
                  <span className="text-gray-500">📍</span> {order.deliveryAddress}
                </p>
              )}
              <div className="space-y-1 mb-3">
                {order.orderItems?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-300">{item.menuItem?.name}</span>
                    <span className="text-white font-medium">×{item.quantity}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => handlePickup(order.id)} className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded-lg text-sm font-medium">
                Pick Up
              </button>
            </div>
          ))}
          {pickupOrders.length === 0 && (
            <p className="text-gray-500 text-sm col-span-full text-center py-12">No orders ready for pickup</p>
          )}
        </div>
      )}

      {/* Transit tab */}
      {tab === 'transit' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {transitOrders.map((order: any) => (
            <div key={order.id} className="bg-gray-800 rounded-xl p-4 border-t-4 border-blue-500">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-lg">{order.orderNumber}</span>
                <span className="text-xs text-gray-400">{elapsed(order.createdAt)} ago</span>
              </div>
              {order.deliveryAddress && (
                <p className="text-sm text-gray-300 mb-3">
                  <span className="text-gray-500">📍</span> {order.deliveryAddress}
                </p>
              )}
              <div className="space-y-1 mb-3">
                {order.orderItems?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-300">{item.menuItem?.name}</span>
                    <span className="text-white font-medium">×{item.quantity}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => handleDeliver(order.id)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium">
                Mark Delivered
              </button>
            </div>
          ))}
          {transitOrders.length === 0 && (
            <p className="text-gray-500 text-sm col-span-full text-center py-12">No orders in transit</p>
          )}
        </div>
      )}
    </div>
  );
}
