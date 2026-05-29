'use client';

import { useState, useEffect } from 'react';
import { api, type Order, type PaymentMethod } from '@/lib/api';
import { getSocket, disconnectSocket } from '@/lib/socket';

const paymentLabels: Record<PaymentMethod, string> = { CASH: '💵 Cash', CARD: '💳 Card', UPI: '📱 UPI' };
const paymentColors: Record<PaymentMethod, string> = {
  CASH: 'bg-green-600 hover:bg-green-700',
  CARD: 'bg-blue-600 hover:bg-blue-700',
  UPI: 'bg-purple-600 hover:bg-purple-700',
};

function elapsed(from: string): string {
  const sec = Math.floor((Date.now() - new Date(from).getTime()) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  return `${min}m ${sec % 60}s`;
}

export default function CashierPage() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [paidOrder, setPaidOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = sessionStorage.getItem('token');
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;

    api.orders.cashier().then(setOrders).catch(() => {});

    const socket = getSocket();
    socket.on('order.created', (order: Order) => {
      if (order.status === 'DELIVERED') setOrders(prev => [order, ...prev]);
    });
    socket.on('order.status.updated', (order: Order) => {
      if (order.status === 'DELIVERED') {
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

  const handlePay = async (method: PaymentMethod) => {
    if (!selected) return;
    try {
      const updated = await api.orders.pay(selected.id, method);
      setPaidOrder(updated);
      setSelected(null);
      setOrders(prev => prev.filter(o => o.id !== selected.id));
    } catch {}
  };

  const filtered = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      (o.tableNumber && o.tableNumber.toString().includes(q))
    );
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <form onSubmit={handleLogin} className="bg-gray-800 p-8 rounded-xl w-80 space-y-4">
          <h1 className="text-2xl font-bold text-center">Cashier Login</h1>
          {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
          <button className="w-full bg-[var(--primary)] text-white p-3 rounded-lg font-medium">Login</button>
        </form>
      </div>
    );
  }

  if (paidOrder) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-2">Payment Successful</h2>
          <div className="bg-gray-700 rounded-lg p-4 space-y-2 text-left mb-6">
            <div className="flex justify-between"><span className="text-gray-400">Order</span><span className="font-medium">{paidOrder.orderNumber}</span></div>
            {paidOrder.tableNumber && <div className="flex justify-between"><span className="text-gray-400">Table</span><span className="font-medium">{paidOrder.tableNumber}</span></div>}
            <div className="flex justify-between"><span className="text-gray-400">Amount</span><span className="font-bold text-lg">₹{Number(paidOrder.totalAmount).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Payment</span><span className="font-medium">{paymentLabels[paidOrder.paymentMethod as PaymentMethod] || paidOrder.paymentMethod}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Paid at</span><span className="font-medium">{paidOrder.paidAt ? new Date(paidOrder.paidAt).toLocaleTimeString() : ''}</span></div>
          </div>
          <button onClick={() => setPaidOrder(null)} className="w-full bg-[var(--primary)] text-white p-3 rounded-lg font-medium">
            New Payment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">🧾 Cashier / POS</h1>
        <button onClick={() => { sessionStorage.removeItem('token'); setToken(null); }} className="text-sm text-gray-400 hover:text-white">Logout</button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Order list */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Ready to Bill ({filtered.length})</h2>
          </div>
          <input placeholder="Search by order or table..." value={search} onChange={e => setSearch(e.target.value)} className="w-full p-2.5 rounded-lg bg-gray-800 text-white placeholder-gray-500 mb-3 border border-gray-700" />
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {filtered.map(order => (
              <button key={order.id} onClick={() => { setSelected(order); setPaidOrder(null); }} className={`w-full text-left bg-gray-800 rounded-lg p-3 border-2 transition ${selected?.id === order.id ? 'border-[var(--primary)]' : 'border-gray-700 hover:border-gray-600'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">{order.orderNumber}</span>
                  {order.tableNumber && <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">T{order.tableNumber}</span>}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{elapsed(order.createdAt)} ago</span>
                  <span className="font-medium text-white">₹{Number(order.totalAmount).toFixed(2)}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{order.orderItems?.length || 0} item{(order.orderItems?.length || 0) !== 1 ? 's' : ''}</div>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-gray-500 text-sm text-center py-8">{search ? 'No matching orders' : 'No orders to bill'}</p>}
          </div>
        </div>

        {/* Bill detail */}
        <div className="lg:col-span-3">
          {!selected && (
            <div className="flex items-center justify-center h-64 text-gray-500">Select an order to view bill</div>
          )}
          {selected && (
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">{selected.orderNumber}</h2>
                  {selected.tableNumber && <p className="text-sm text-gray-400">Table {selected.tableNumber}</p>}
                </div>
                <span className="text-xs text-gray-400">Updated {elapsed(selected.updatedAt || selected.createdAt)} ago</span>
              </div>

              {/* Line items */}
              <table className="w-full mb-6">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-700">
                    <th className="text-left py-2 font-medium">Item</th>
                    <th className="text-right py-2 font-medium">Qty</th>
                    <th className="text-right py-2 font-medium">Price</th>
                    <th className="text-right py-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.orderItems?.map(item => (
                    <tr key={item.id} className="border-b border-gray-700/50">
                      <td className="py-2 text-sm">{item.menuItem?.name}</td>
                      <td className="py-2 text-sm text-right">{item.quantity}</td>
                      <td className="py-2 text-sm text-right text-gray-400">₹{Number(item.unitPrice).toFixed(2)}</td>
                      <td className="py-2 text-sm text-right font-medium">₹{(Number(item.unitPrice) * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-600">
                    <td colSpan={3} className="py-3 text-right font-bold text-lg">Grand Total</td>
                    <td className="py-3 text-right font-bold text-lg text-[var(--secondary)]">₹{Number(selected.totalAmount).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Payment buttons */}
              <div>
                <p className="text-sm text-gray-400 mb-3">Select payment method</p>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.entries(paymentLabels) as [PaymentMethod, string][]).map(([method, label]) => (
                    <button key={method} onClick={() => handlePay(method)} className={`${paymentColors[method]} text-white py-3 rounded-lg font-medium transition`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
