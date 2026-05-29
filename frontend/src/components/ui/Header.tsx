'use client';

import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white border-b border-[var(--border)] sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/menu" className="font-bold text-lg text-[var(--primary)]">
          🍽️ Restaurant OS
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/menu" className="hover:text-[var(--primary)]">Menu</Link>
          <Link href="/cart" className="hover:text-[var(--primary)]">Cart</Link>
          <Link href="/orders" className="hover:text-[var(--primary)]">Orders</Link>
        </nav>
      </div>
    </header>
  );
}
