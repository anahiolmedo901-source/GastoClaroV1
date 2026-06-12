import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, List, PieChart, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '../Context/Authcontext';
import { useSettings } from '../Context/SettingsContext';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/nuevo', label: 'Añadir Gasto', icon: PlusCircle },
  { to: '/gastos', label: 'Mis Gastos', icon: List },
  { to: '/reportes', label: 'Reportes', icon: PieChart },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  // Nombre desde Supabase (settings) con fallback a metadata o email
  const displayName =
    settings.nombre ||
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Usuario';

  return (
    <aside className="hidden w-64 flex-col border-r border-gray-200 bg-white md:flex">
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <span className="text-2xl font-bold text-emerald-600">GastoClaro</span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border-l-4 border-emerald-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="border-t border-gray-200 p-4 mt-auto">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {displayName}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="h-5 w-5" />
            Cerrar Sesión
          </button>
        </div>
      )}
    </aside>
  );
}