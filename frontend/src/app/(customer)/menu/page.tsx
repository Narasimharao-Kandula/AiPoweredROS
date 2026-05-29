'use client';

import { useState, useEffect } from 'react';
import { api, type Category, type MenuItem } from '@/lib/api';
import { useCart } from '@/lib/cart';
import MenuItemCard from '@/components/ui/MenuItemCard';

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    api.menu.categories().then(data => {
      setCategories(data);
      if (data.length > 0) setActiveCategory(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!activeCategory) return;
    setLoading(true);
    api.menu.items(activeCategory).then(data => {
      setItems(data);
      setLoading(false);
    });
  }, [activeCategory]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Our Menu</h1>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat.id
                ? 'bg-[var(--primary)] text-white'
                : 'bg-white border border-[var(--border)] hover:border-[var(--primary)]'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[var(--text-muted)]">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-[var(--text-muted)]">No items in this category.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map(item => (
            <MenuItemCard key={item.id} item={item} onAddToCart={addItem} />
          ))}
        </div>
      )}
    </div>
  );
}
