'use client';

import { useState, useEffect } from 'react';
import { api, type Category, type MenuItem, type Order } from '@/lib/api';
import { getSocket, disconnectSocket } from '@/lib/socket';

const TOTAL_TABLES = 20;
const statusColor: Record<string, string> = {
  CONFIRMED: 'border-yellow-500',
  PREPARING: 'border-blue-500',
  READY: 'border-green-500',
  DELIVERED: 'border-gray-600',
};
const statusBadge: Record<string, string> = {
  PENDING: 'bg-gray-600', CONFIRMED: 'bg-yellow-600', PREPARING: 'bg-blue-600',
  READY: 'bg-green-600', DELIVERED: 'bg-gray-600', CANCELLED: 'bg-red-600',
};

function elapsed(from: string): string {
  const sec = Math.floor((Date.now() - new Date(from).getTime()) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  return `${min}m ${sec % 60}s`;
}

export default function WaiterPage() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  // menu for creating orders
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<{ menuItemId: string; name: string; quantity: number; price: number }[]>([]);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const t = sessionStorage.getItem('token');
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;

    api.orders.waiter().then(setOrders).catch(() => {});

    const socket = getSocket();
    socket.on('order.created', (order: Order) => {
      if (order.tableNumber) setOrders(prev => [order, ...prev]);
    });
    socket.on('order.status.updated', (order: Order) => {
      if (order.tableNumber && ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'PENDING'].includes(order.status)) {
        setOrders(prev => {
          const filtered = prev.filter((o: Order) => o.id !== order.id);
          return [...filtered, order];
        });
      } else {
        setOrders(prev => prev.filter((o: Order) => o.id !== order.id));
      }
    });
    socket.on('order.paid', (order: Order) => {
      setOrders(prev => prev.filter((o: Order) => o.id !== order.id));
    });

    return () => {
      socket.off('order.created');
      socket.off('order.status.updated');
      socket.off('order.paid');
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    api.menu.categories().then(cats => {
      setCategories(cats);
      if (cats.length > 0) setActiveCategory(cats[0].id);
    }).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!activeCategory) return;
    api.menu.items(activeCategory).then(setItems).catch(() => {});
  }, [activeCategory]);

  useEffect(() => { if (token === null) disconnectSocket(); }, [token]);

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

  const tableOrders = (table: number) => orders.filter(o => o.tableNumber === table && o.status !== 'DELIVERED' && o.status !== 'CANCELLED');

  const handlePlaceOrder = async () => {
    if (!selectedTable || cart.length === 0) return;
    try {
      await api.orders.create({ items: cart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity })), tableNumber: selectedTable });
      setCart([]);
      setShowMenu(false);
      const updated = await api.orders.waiter();
      setOrders(updated);
    } catch {}
  };

  const handleDelivered = async (orderId: string) => {
    try {
      await api.orders.updateStatus(orderId, 'DELIVERED');
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch {}
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <form onSubmit={handleLogin} className="bg-gray-800 p-8 rounded-xl w-80 space-y-4">
          <h1 className="text-2xl font-bold text-center">Waiter Login</h1>
          {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
          <button className="w-full bg-[var(--primary)] text-white p-3 rounded-lg font-medium">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Waiter Panel</h1>
        <button onClick={() => { sessionStorage.removeItem('token'); setToken(null); }} className="text-sm text-gray-400 hover:text-white">Logout</button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Table grid */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-bold mb-3">Tables</h2>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: TOTAL_TABLES }, (_, i) => i + 1).map(table => {
              const active = tableOrders(table);
              const latest = active.length > 0 ? active.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] : null;
              const isSelected = selectedTable === table;
              return (
                <button key={table} onClick={() => setSelectedTable(table)} className={`p-3 rounded-lg text-center border-2 text-sm font-medium transition ${isSelected ? 'ring-2 ring-[var(--primary)]' : ''} ${latest ? statusColor[latest.status] || 'border-gray-600' : 'border-gray-700 bg-gray-800'} ${latest ? 'bg-gray-800' : 'bg-gray-800/50'}`}>
                  <div className="text-lg font-bold">{table}</div>
                  {latest && <div className="text-xs mt-1 text-gray-400">{active.length} order{active.length > 1 ? 's' : ''}</div>}
                  {!latest && <div className="text-xs mt-1 text-gray-600">Free</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table details */}
        <div className="lg:col-span-3">
          {!selectedTable && (
            <div className="flex items-center justify-center h-64 text-gray-500">Select a table to view orders</div>
          )}

          {selectedTable && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Table {selectedTable}</h2>
                <div className="flex gap-2">
                  <button onClick={() => setShowMenu(true)} className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg text-sm font-medium">New Order</button>
                  <button onClick={() => {
                    const active = tableOrders(selectedTable);
                    const deliverable = active.filter(o => o.status === 'READY' || o.status === 'PREPARING');
                    deliverable.forEach(o => handleDelivered(o.id));
                  }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Mark All Delivered</button>
                </div>
              </div>

              {/* Active orders for this table */}
              <div className="space-y-3">
                {tableOrders(selectedTable).length === 0 && (
                  <p className="text-gray-500 text-center py-8">No active orders for this table</p>
                )}
                {tableOrders(selectedTable).map(order => (
                  <div key={order.id} className="bg-gray-800 rounded-lg p-4 border-l-4 ${statusColor[order.status] || 'border-gray-600'}">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{order.orderNumber}</span>
                        <span className={`px-2 py-0.5 rounded text-xs text-white ${statusBadge[order.status] || 'bg-gray-600'}`}>{order.status}</span>
                      </div>
                      <span className="text-xs text-gray-400">{elapsed(order.createdAt)}</span>
                    </div>
                    <div className="space-y-1 mb-2">
                      {order.orderItems?.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-gray-300">{item.menuItem?.name}</span>
                          <span className="text-white font-medium">×{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-right text-sm text-gray-400">Total: ₹{Number(order.totalAmount).toFixed(2)}</div>
                    {(order.status === 'READY' || order.status === 'PREPARING') && (
                      <button onClick={() => handleDelivered(order.id)} className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium">
                        Mark Delivered
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Menu modal for new order */}
      {showMenu && selectedTable && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowMenu(false)}>
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">New Order — Table {selectedTable}</h3>
              <button onClick={() => setShowMenu(false)} className="text-gray-400 hover:text-white text-xl">&times;</button>
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${activeCategory === cat.id ? 'bg-[var(--primary)] text-white' : 'bg-gray-700 text-gray-300'}`}>
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Menu items */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {items.filter(i => i.isAvailable).map(item => (
                <button key={item.id} onClick={() => setCart(prev => { const existing = prev.find(c => c.menuItemId === item.id); if (existing) return prev.map(c => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c); return [...prev, { menuItemId: item.id, name: item.name, quantity: 1, price: Number(item.price) }]; })} className="bg-gray-700 hover:bg-gray-600 rounded-lg p-3 text-left">
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="text-xs text-gray-400">₹{Number(item.price).toFixed(2)}</div>
                </button>
              ))}
            </div>

            {/* Cart */}
            {cart.length > 0 && (
              <div className="border-t border-gray-700 pt-4">
                <h4 className="font-medium mb-2">Order Items</h4>
                {cart.map(c => (
                  <div key={c.menuItemId} className="flex items-center justify-between py-1 text-sm">
                    <span>{c.name}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setCart(prev => prev.map(x => x.menuItemId === c.menuItemId ? { ...x, quantity: Math.max(0, x.quantity - 1) } : x).filter(x => x.quantity > 0))} className="text-gray-400 hover:text-white w-6 h-6 rounded bg-gray-700 flex items-center justify-center">-</button>
                      <span className="w-6 text-center">{c.quantity}</span>
                      <button onClick={() => setCart(prev => prev.map(x => x.menuItemId === c.menuItemId ? { ...x, quantity: x.quantity + 1 } : x))} className="text-gray-400 hover:text-white w-6 h-6 rounded bg-gray-700 flex items-center justify-center">+</button>
                      <span className="w-16 text-right">₹{(c.price * c.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
                  <span className="font-bold">Total: ₹{cart.reduce((sum, c) => sum + c.price * c.quantity, 0).toFixed(2)}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setCart([])} className="text-sm text-gray-400 hover:text-white">Clear</button>
                    <button onClick={handlePlaceOrder} className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg text-sm font-medium">Place Order</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
