import { Menu } from 'lucide-react';
import Breadcrumbs from './Breadcrumbs';

export default function Navbar() {
  const now = new Date();
  const fechaActual = now.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-4">
        <button className="text-gray-500 md:hidden">
          <Menu className="h-6 w-6" />
        </button>
        <Breadcrumbs />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">{fechaActual}</span>
      </div>
    </header>
  );
}