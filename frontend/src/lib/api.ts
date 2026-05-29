const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  _count?: { menuItems: number };
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  categoryId: string;
  category: Category;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  createdAt: string;
  orderItems: OrderItem[];
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  menuItem: MenuItem;
}

function authHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  menu: {
    categories: () => fetchAPI<Category[]>('/menu/categories'),
    items: (categoryId?: string) =>
      fetchAPI<MenuItem[]>(`/menu/items${categoryId ? `?categoryId=${categoryId}` : ''}`),
  },
  orders: {
    create: (data: { items: { menuItemId: string; quantity: number }[] }) =>
      fetchAPI<Order>('/orders', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: authHeaders(),
      }),
    mine: () =>
      fetchAPI<Order[]>('/orders/mine', { headers: authHeaders() }),
    byNumber: (orderNumber: string) => fetchAPI<Order>(`/orders/${orderNumber}`),
    kitchen: () =>
      fetchAPI<Order[]>('/orders/kitchen', { headers: authHeaders() }),
    updateStatus: (id: string, status: string) =>
      fetchAPI<Order>(`/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: authHeaders(),
      }),
    login: (email: string, password: string) =>
      fetchAPI<{ user: any; accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
  },
};
