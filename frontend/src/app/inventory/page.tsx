'use client';

import { useState, useEffect } from 'react';
import { api, type InventoryItem } from '@/lib/api';

export default function InventoryPage() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState({ name: '', quantity: 0, unit: 'kg', minStock: 0 });

  useEffect(() => {
    const t = sessionStorage.getItem('token');
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    api.inventory.list().then(setItems).catch(() => {});
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

  const handleSubmit = async () => {
    try {
      if (editing) {
        await api.inventory.update(editing.id, form);
        setEditing(null);
      } else {
        await api.inventory.create(form);
      }
      setShowForm(false);
      setForm({ name: '', quantity: 0, unit: 'kg', minStock: 0 });
      setItems(await api.inventory.list());
    } catch {}
  };

  const handleDelete = async (id: string) => {
    try {
      await api.inventory.remove(id);
      setItems(await api.inventory.list());
    } catch {}
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <form onSubmit={handleLogin} className="bg-gray-800 p-8 rounded-xl w-80 space-y-4">
          <h1 className="text-2xl font-bold text-center">Inventory Login</h1>
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
        <h1 className="text-2xl font-bold">📦 Inventory</h1>
        <div className="flex gap-3">
          <button onClick={() => { setEditing(null); setForm({ name: '', quantity: 0, unit: 'kg', minStock: 0 }); setShowForm(true); }} className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Add Item
          </button>
          <button onClick={() => { sessionStorage.removeItem('token'); setToken(null); }} className="text-sm text-gray-400 hover:text-white">Logout</button>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-700">
              <th className="text-left py-3 font-medium">Item</th>
              <th className="text-right py-3 font-medium">Stock</th>
              <th className="text-left py-3 font-medium">Unit</th>
              <th className="text-right py-3 font-medium">Min Stock</th>
              <th className="text-left py-3 font-medium">Status</th>
              <th className="text-right py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b border-gray-800">
                <td className="py-3 font-medium">{item.name}</td>
                <td className="py-3 text-right">{item.quantity}</td>
                <td className="py-3">{item.unit}</td>
                <td className="py-3 text-right">{item.minStock}</td>
                <td className="py-3">
                  {item.isLowStock ? (
                    <span className="text-red-400 text-xs bg-red-400/10 px-2 py-0.5 rounded">Low Stock</span>
                  ) : (
                    <span className="text-green-400 text-xs bg-green-400/10 px-2 py-0.5 rounded">OK</span>
                  )}
                </td>
                <td className="py-3 text-right">
                  <button onClick={() => { setEditing(item); setForm({ name: item.name, quantity: item.quantity, unit: item.unit, minStock: item.minStock }); setShowForm(true); }} className="text-xs text-gray-400 hover:text-white mr-3">Edit</button>
                  <button onClick={() => handleDelete(item.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-gray-500">No inventory items yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{editing ? 'Edit Item' : 'Add Item'}</h3>
            <div className="space-y-3">
              <input placeholder="Item name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
              <input placeholder="Quantity" type="number" value={form.quantity || ''} onChange={e => setForm(p => ({ ...p, quantity: Number(e.target.value) }))} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
              <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} className="w-full p-3 rounded-lg bg-gray-700 text-white">
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="ltr">ltr</option>
                <option value="ml">ml</option>
                <option value="pcs">pcs</option>
                <option value="pkt">pkt</option>
              </select>
              <input placeholder="Min stock alert" type="number" value={form.minStock || ''} onChange={e => setForm(p => ({ ...p, minStock: Number(e.target.value) }))} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
              <button onClick={handleSubmit} className="w-full bg-[var(--primary)] text-white p-3 rounded-lg font-medium">
                {editing ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
