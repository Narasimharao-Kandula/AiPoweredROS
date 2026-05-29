'use client';

import { useState, useEffect } from 'react';
import { api, type DashboardData, type User, type Category, type MenuItem, type Order, type Role } from '@/lib/api';

type Tab = 'dashboard' | 'users' | 'menu' | 'orders';

const tabs: { key: Tab; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'users', label: 'Users' },
  { key: 'menu', label: 'Menu' },
  { key: 'orders', label: 'Orders' },
];

const roles: Role[] = ['CUSTOMER', 'WAITER', 'CHEF', 'CASHIER', 'MANAGER', 'DELIVERY'];

function elapsed(from: string): string {
  const sec = Math.floor((Date.now() - new Date(from).getTime()) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  return `${min}m ${sec % 60}s`;
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState<Tab>('dashboard');

  // dashboard data
  const [dash, setDash] = useState<DashboardData | null>(null);

  // users
  const [users, setUsers] = useState<User[]>([]);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', phone: '', role: 'WAITER' as Role });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // menu
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({ name: '', description: '' });
  const [itemForm, setItemForm] = useState({ name: '', description: '', price: 0, categoryId: '' });
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);

  // orders
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [orderFilter, setOrderFilter] = useState('');

  useEffect(() => {
    const t = sessionStorage.getItem('token');
    if (t) setToken(t);
  }, []);

  // fetch dashboard
  useEffect(() => {
    if (!token) return;
    api.admin.dashboard().then(setDash).catch(() => {});
    const interval = setInterval(() => api.admin.dashboard().then(setDash).catch(() => {}), 15000);
    return () => clearInterval(interval);
  }, [token]);

  // fetch users
  useEffect(() => {
    if (!token || tab !== 'users') return;
    api.users.list().then(setUsers).catch(() => {});
  }, [token, tab]);

  // fetch categories + items
  useEffect(() => {
    if (!token || tab !== 'menu') return;
    api.menu.categories().then(cats => {
      setCategories(cats);
      if (cats.length > 0 && !activeCategory) setActiveCategory(cats[0].id);
    }).catch(() => {});
  }, [token, tab]);

  useEffect(() => {
    if (!activeCategory) return;
    api.menu.items(activeCategory).then(setItems).catch(() => {});
  }, [activeCategory]);

  // fetch all orders for "orders" tab (via cashier + kitchen endpoints)
  useEffect(() => {
    if (!token || tab !== 'orders') return;
    Promise.all([
      api.orders.cashier().catch(() => [] as Order[]),
      api.orders.kitchen().catch(() => [] as Order[]),
    ]).then(([cashier, kitchen]) => {
      const seen = new Set<string>();
      setAllOrders([...cashier, ...kitchen].filter(o => {
        if (seen.has(o.id)) return false;
        seen.add(o.id);
        return true;
      }));
    });
  }, [token, tab]);

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

  // user CRUD
  const handleCreateUser = async () => {
    try {
      await api.users.create(userForm);
      setShowUserModal(false);
      setUserForm({ name: '', email: '', password: '', phone: '', role: 'WAITER' });
      setUsers(await api.users.list());
    } catch {}
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      await api.users.update(editingUser.id, { name: editingUser.name, email: editingUser.email, phone: editingUser.phone || undefined, role: editingUser.role });
      setEditingUser(null);
      setUsers(await api.users.list());
    } catch {}
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await api.users.remove(id);
      setUsers(await api.users.list());
    } catch {}
  };

  // category CRUD
  const handleCreateCategory = async () => {
    try {
      await api.menu.createCategory(catForm);
      setCatForm({ name: '', description: '' });
      setCategories(await api.menu.categories());
    } catch {}
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await api.menu.deleteCategory(id);
      setCategories(await api.menu.categories());
      if (activeCategory === id) setActiveCategory(null);
    } catch {}
  };

  // item CRUD
  const handleCreateItem = async () => {
    try {
      await api.menu.createItem({ ...itemForm, price: Number(itemForm.price) });
      setShowItemModal(false);
      setItemForm({ name: '', description: '', price: 0, categoryId: '' });
      if (activeCategory) setItems(await api.menu.items(activeCategory));
    } catch {}
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    try {
      await api.menu.updateItem(editingItem.id, { name: editingItem.name, price: Number(editingItem.price), isAvailable: editingItem.isAvailable });
      setEditingItem(null);
      if (activeCategory) setItems(await api.menu.items(activeCategory));
    } catch {}
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await api.menu.deleteItem(id);
      if (activeCategory) setItems(await api.menu.items(activeCategory));
    } catch {}
  };

  // orders filter
  const filteredOrders = allOrders.filter(o => {
    if (!orderFilter) return true;
    const q = orderFilter.toLowerCase();
    return o.orderNumber.toLowerCase().includes(q) || (o.tableNumber?.toString() || '').includes(q) || o.status.toLowerCase().includes(q);
  });

  // Login screen
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <form onSubmit={handleLogin} className="bg-gray-800 p-8 rounded-xl w-80 space-y-4">
          <h1 className="text-2xl font-bold text-center">Admin Login</h1>
          {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
          <button className="w-full bg-[var(--primary)] text-white p-3 rounded-lg font-medium">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <button onClick={() => { sessionStorage.removeItem('token'); setToken(null); }} className="text-sm text-gray-400 hover:text-white">Logout</button>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 px-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-3 text-sm font-medium border-b-2 transition ${tab === t.key ? 'border-[var(--primary)] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* ===== DASHBOARD TAB ===== */}
        {tab === 'dashboard' && dash && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Orders Today</p>
                <p className="text-3xl font-bold mt-1">{dash.totalOrdersToday}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Revenue Today</p>
                <p className="text-3xl font-bold mt-1 text-green-400">₹{dash.revenueToday.toFixed(2)}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Active Tables</p>
                <p className="text-3xl font-bold mt-1">{dash.activeTableCount}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Total Users</p>
                <p className="text-3xl font-bold mt-1">{dash.totalUsers}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Menu Items</p>
                <p className="text-3xl font-bold mt-1">{dash.totalMenuItems}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Orders by status */}
              <div className="bg-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Orders by Status</h3>
                <div className="space-y-2">
                  {dash.ordersByStatus.map(s => (
                    <div key={s.status} className="flex items-center justify-between text-sm">
                      <span>{s.status}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-700 rounded-full h-2">
                          <div className="bg-[var(--primary)] h-2 rounded-full" style={{ width: `${Math.min(100, (s.count / Math.max(...dash.ordersByStatus.map(x => x.count), 1)) * 100)}%` }} />
                        </div>
                        <span className="font-medium w-8 text-right">{s.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent orders */}
              <div className="bg-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Recent Orders</h3>
                <div className="space-y-2">
                  {dash.recentOrders.map(o => (
                    <div key={o.id} className="flex items-center justify-between text-sm bg-gray-700/50 rounded-lg p-2">
                      <div>
                        <span className="font-medium">{o.orderNumber}</span>
                        {o.tableNumber && <span className="text-gray-400 ml-2">T{o.tableNumber}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{elapsed(o.createdAt)} ago</span>
                        <span className="text-xs text-gray-400">₹{Number(o.totalAmount).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== USERS TAB ===== */}
        {tab === 'users' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Users ({users.length})</h2>
              <button onClick={() => setShowUserModal(true)} className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add User</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-700">
                    <th className="text-left py-3 font-medium">Name</th>
                    <th className="text-left py-3 font-medium">Email</th>
                    <th className="text-left py-3 font-medium">Role</th>
                    <th className="text-left py-3 font-medium">Status</th>
                    <th className="text-right py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-gray-800">
                      <td className="py-3">{u.name}</td>
                      <td className="py-3 text-gray-400">{u.email}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-700">{u.role}</span>
                      </td>
                      <td className="py-3">
                        <span className={`text-xs ${u.isActive ? 'text-green-400' : 'text-red-400'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button onClick={() => setEditingUser(u)} className="text-xs text-gray-400 hover:text-white mr-3">Edit</button>
                        <button onClick={() => handleDeleteUser(u.id)} className="text-xs text-red-400 hover:text-red-300">Deactivate</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Create user modal */}
            {showUserModal && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowUserModal(false)}>
                <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold mb-4">Add User</h3>
                  <div className="space-y-3">
                    <input placeholder="Name" value={userForm.name} onChange={e => setUserForm(p => ({ ...p, name: e.target.value }))} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
                    <input placeholder="Email" value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
                    <input placeholder="Password" type="password" value={userForm.password} onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
                    <input placeholder="Phone (optional)" value={userForm.phone} onChange={e => setUserForm(p => ({ ...p, phone: e.target.value }))} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
                    <select value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value as Role }))} className="w-full p-3 rounded-lg bg-gray-700 text-white">
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button onClick={handleCreateUser} className="w-full bg-[var(--primary)] text-white p-3 rounded-lg font-medium">Create</button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit user modal */}
            {editingUser && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setEditingUser(null)}>
                <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold mb-4">Edit User</h3>
                  <div className="space-y-3">
                    <input placeholder="Name" value={editingUser.name} onChange={e => setEditingUser(p => ({ ...p!, name: e.target.value }))} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
                    <input placeholder="Email" value={editingUser.email} onChange={e => setEditingUser(p => ({ ...p!, email: e.target.value }))} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
                    <input placeholder="Phone" value={editingUser.phone || ''} onChange={e => setEditingUser(p => ({ ...p!, phone: e.target.value }))} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
                    <select value={editingUser.role} onChange={e => setEditingUser(p => ({ ...p!, role: e.target.value as Role }))} className="w-full p-3 rounded-lg bg-gray-700 text-white">
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button onClick={handleUpdateUser} className="w-full bg-[var(--primary)] text-white p-3 rounded-lg font-medium">Save</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== MENU TAB ===== */}
        {tab === 'menu' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Categories */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Categories</h3>
              <div className="space-y-1 mb-4">
                {categories.map(cat => (
                  <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${activeCategory === cat.id ? 'bg-[var(--primary)] text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                    <div className="flex justify-between items-center">
                      <span>{cat.name}</span>
                      <span className="text-xs text-gray-500">{cat._count?.menuItems || 0}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input placeholder="New category" value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} className="flex-1 p-2 rounded-lg bg-gray-800 text-white text-sm placeholder-gray-500 border border-gray-700" />
                <button onClick={handleCreateCategory} className="bg-[var(--primary)] text-white px-3 rounded-lg text-sm font-medium">Add</button>
              </div>
            </div>

            {/* Items */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Items {activeCategory ? `— ${categories.find(c => c.id === activeCategory)?.name || ''}` : ''}</h3>
                <button onClick={() => { setItemForm(p => ({ ...p, categoryId: activeCategory || '' })); setShowItemModal(true); }} className="bg-[var(--primary)] text-white px-3 py-1.5 rounded-lg text-sm font-medium">+ Add Item</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map(item => (
                  <div key={item.id} className="bg-gray-800 rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-gray-400">₹{Number(item.price).toFixed(2)}</div>
                      {!item.isAvailable && <span className="text-xs text-red-400">Unavailable</span>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingItem(item)} className="text-xs text-gray-400 hover:text-white">Edit</button>
                      <button onClick={() => handleDeleteItem(item.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Create item modal */}
            {showItemModal && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowItemModal(false)}>
                <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold mb-4">Add Menu Item</h3>
                  <div className="space-y-3">
                    <input placeholder="Name" value={itemForm.name} onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
                    <input placeholder="Description (optional)" value={itemForm.description} onChange={e => setItemForm(p => ({ ...p, description: e.target.value }))} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
                    <input placeholder="Price" type="number" value={itemForm.price || ''} onChange={e => setItemForm(p => ({ ...p, price: Number(e.target.value) }))} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
                    <select value={itemForm.categoryId || activeCategory || ''} onChange={e => setItemForm(p => ({ ...p, categoryId: e.target.value }))} className="w-full p-3 rounded-lg bg-gray-700 text-white">
                      <option value="">Select category</option>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                    <button onClick={handleCreateItem} className="w-full bg-[var(--primary)] text-white p-3 rounded-lg font-medium">Create</button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit item modal */}
            {editingItem && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setEditingItem(null)}>
                <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold mb-4">Edit Menu Item</h3>
                  <div className="space-y-3">
                    <input placeholder="Name" value={editingItem.name} onChange={e => setEditingItem(p => ({ ...p!, name: e.target.value }))} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
                    <input placeholder="Price" type="number" value={Number(editingItem.price) || ''} onChange={e => setEditingItem(p => ({ ...p!, price: Number(e.target.value) }))} className="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={editingItem.isAvailable} onChange={e => setEditingItem(p => ({ ...p!, isAvailable: e.target.checked }))} />
                      Available
                    </label>
                    <button onClick={handleUpdateItem} className="w-full bg-[var(--primary)] text-white p-3 rounded-lg font-medium">Save</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== ORDERS TAB ===== */}
        {tab === 'orders' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Orders ({filteredOrders.length})</h2>
              <input placeholder="Filter by order, table, or status..." value={orderFilter} onChange={e => setOrderFilter(e.target.value)} className="w-64 p-2 rounded-lg bg-gray-800 text-white text-sm placeholder-gray-500 border border-gray-700" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-700">
                    <th className="text-left py-3 font-medium">Order</th>
                    <th className="text-left py-3 font-medium">Table</th>
                    <th className="text-left py-3 font-medium">Status</th>
                    <th className="text-right py-3 font-medium">Items</th>
                    <th className="text-right py-3 font-medium">Total</th>
                    <th className="text-right py-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(o => (
                    <tr key={o.id} className="border-b border-gray-800">
                      <td className="py-3 font-medium">{o.orderNumber}</td>
                      <td className="py-3 text-gray-400">{o.tableNumber ? `T${o.tableNumber}` : '-'}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-700">{o.status}</span>
                      </td>
                      <td className="py-3 text-right">{o.orderItems?.length || 0}</td>
                      <td className="py-3 text-right">₹{Number(o.totalAmount).toFixed(2)}</td>
                      <td className="py-3 text-right text-gray-400 text-xs">{elapsed(o.createdAt)} ago</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
