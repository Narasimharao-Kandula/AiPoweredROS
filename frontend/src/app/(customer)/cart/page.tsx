'use client';

import { useCart } from '@/lib/cart';
import { api } from '@/lib/api';
import { useState } from 'react';

export default function CartPage() {
  const { items, updateQuantity, removeItem, total, clearCart } = useCart();
  const [placing, setPlacing] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  const placeOrder = async () => {
    setPlacing(true);
    try {
      const order = await api.orders.create({
        items: items.map(i => ({ menuItemId: i.menuItem.id, quantity: i.quantity })),
      });
      setOrderNumber(order.orderNumber);
      clearCart();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  if (orderNumber) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold mb-2">Order Placed!</h1>
        <p className="text-[var(--text-muted)] mb-1">Order #{orderNumber}</p>
        <p className="text-sm text-[var(--text-muted)]">Your food is being prepared.</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🛒</div>
        <h1 className="text-xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-[var(--text-muted)]">Browse the menu to add items.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Your Cart</h1>

      <div className="space-y-3 mb-6">
        {items.map(item => (
          <div key={item.menuItem.id} className="bg-white rounded-xl border border-[var(--border)] p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="font-medium text-sm">{item.menuItem.name}</p>
              <p className="text-xs text-[var(--text-muted)]">₹{Number(item.menuItem.price).toFixed(2)} each</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                className="w-7 h-7 rounded-full border border-[var(--border)] flex items-center justify-center text-sm hover:bg-gray-50"
              >
                -
              </button>
              <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                className="w-7 h-7 rounded-full border border-[var(--border)] flex items-center justify-center text-sm hover:bg-gray-50"
              >
                +
              </button>
            </div>
            <p className="font-semibold text-sm w-16 text-right">
              ₹{(Number(item.menuItem.price) * item.quantity).toFixed(2)}
            </p>
            <button
              onClick={() => removeItem(item.menuItem.id)}
              className="text-red-400 hover:text-red-600 text-sm"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] p-4">
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold">Total</span>
          <span className="font-bold text-lg text-[var(--primary)]">₹{total.toFixed(2)}</span>
        </div>
        <button
          onClick={placeOrder}
          disabled={placing}
          className="w-full bg-[var(--primary)] text-white py-3 rounded-xl font-medium hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-50"
        >
          {placing ? 'Placing Order...' : 'Place Order'}
        </button>
      </div>
    </div>
  );
}
