import Header from '@/components/ui/Header';
import { CartProvider } from '@/lib/cart';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </CartProvider>
  );
}
