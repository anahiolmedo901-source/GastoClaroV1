import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const routeNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/expenses': 'Gastos',
  '/expenses/add': 'Nuevo Gasto',
  '/reports': 'Reportes',
  '/budgets': 'Presupuestos',
};

export default function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center text-sm text-gray-500 mb-6">
      <Link to="/dashboard" className="hover:text-emerald-600">Inicio</Link>
      
      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;

        return (
          <div key={to} className="flex items-center">
            <ChevronRight size={16} className="mx-2 text-gray-400" />
            {isLast ? (
              <span className="font-medium text-gray-800">
                {routeNames[to] || value.charAt(0).toUpperCase() + value.slice(1)}
              </span>
            ) : (
              <Link to={to} className="hover:text-emerald-600">
                {routeNames[to] || value}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}