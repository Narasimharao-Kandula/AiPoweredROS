'use client';

import type { MenuItem } from '@/lib/api';

interface Props {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
}

export default function MenuItemCard({ item, onAddToCart }: Props) {
  return (
    <div className="bg-white rounded-xl border border-[var(--border)] p-4 flex flex-col gap-2">
      <div className="w-full h-32 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center text-4xl">
        🍽️
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-sm">{item.name}</h3>
        {item.description && (
          <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{item.description}</p>
        )}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="font-bold text-[var(--primary)]">₹{Number(item.price).toFixed(2)}</span>
        <button
          onClick={() => onAddToCart(item)}
          className="bg-[var(--primary)] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[var(--primary-dark)] transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}
