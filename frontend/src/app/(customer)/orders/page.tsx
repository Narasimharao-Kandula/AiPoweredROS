'use client';

import { useState, useEffect } from 'react';
import { api, type Order } from '@/lib/api';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-orange-100 text-orange-800',
  READY: 'bg-green-100 text-green-800',
  DELIVERED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.orders.mine().then(data => {
      setOrders(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-[var(--text-muted)]">Loading...</p>;

  if (orders.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">📋</div>
        <h1 className="text-xl font-bold mb-2">No orders yet</h1>
        <p className="text-[var(--text-muted)]">Place your first order from the menu.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>
      <div className="space-y-3">
        {orders.map(order => (
          <div key={order.id} className="bg-white rounded-xl border border-[var(--border)] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold">Order #{order.orderNumber}</span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[order.status]}`}>
                {order.status}
              </span>
            </div>
            <div className="space-y-1 mb-3">
              {order.orderItems?.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.menuItem?.name} × {item.quantity}</span>
                  <span className="text-[var(--text-muted)]">₹{(Number(item.unitPrice) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between border-t border-[var(--border)] pt-3 text-sm">
              <span className="text-[var(--text-muted)]">{new Date(order.createdAt).toLocaleString()}</span>
              <span className="font-bold">₹{Number(order.totalAmount).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
