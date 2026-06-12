import { PlusCircle, TrendingUp, TrendingDown, Wallet, ArrowRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useExpenses } from '../hooks/useExpenses';
import { useAuth } from '../Context/Authcontext';
import { useSettings } from '../Context/SettingsContext';

const FALLBACK_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6b7280',
];

export default function Dashboard() {
  const { user } = useAuth();
  const { expenses, loading } = useExpenses(user?.id || null);
  const { settings } = useSettings();

  const { simbolo, presupuesto_mensual } = settings;

  const totalSpent = expenses.reduce((sum, exp) => sum + exp.monto, 0);

  const today = new Date().toISOString().split('T')[0];
  const totalToday = expenses
    .filter((exp) => exp.fecha_gasto.startsWith(today))
    .reduce((sum, exp) => sum + exp.monto, 0);

  const recentExpenses = expenses.slice(0, 4);

  const categoryData = useMemo(() => {
    const totals: Record<string, { value: number; nombre: string; icono: string; color: string }> = {};

    expenses.forEach((exp) => {
      const key = exp.id_categoria != null ? String(exp.id_categoria) : 'sin_cat';
      const catNombre = exp.categorias?.nombre_categoria ?? 'Sin categoría';
      const catIcono = exp.categorias?.icono ?? '📌';
      const catColor = exp.categorias?.color ?? '';

      if (!totals[key]) {
        totals[key] = { value: 0, nombre: catNombre, icono: catIcono, color: catColor };
      }
      totals[key].value += exp.monto;
    });

    return Object.entries(totals)
      .map(([, v], index) => ({
        name: v.nombre,
        value: Math.round(v.value * 100) / 100,
        color: v.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
        icono: v.icono,
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const getCatFromExpense = (exp: any) => ({
    nombre_categoria: exp.categorias?.nombre_categoria ?? 'Sin categoría',
    icono: exp.categorias?.icono ?? '📌',
    color: exp.categorias?.color ?? '#e5e7eb',
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500">
            {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link
          to="/nuevo"
          className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl hover:bg-emerald-700 transition font-medium"
        >
          <PlusCircle size={20} />
          Nuevo Gasto
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Gastado este mes</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                {simbolo} {totalSpent.toFixed(2)}
              </p>
            </div>
            <TrendingUp className="text-red-500" size={32} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Presupuesto Restante</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">
                {simbolo} {(presupuesto_mensual - totalSpent).toFixed(2)}
              </p>
            </div>
            <Wallet className="text-emerald-500" size={32} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Gastos hoy</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                {simbolo} {totalToday.toFixed(2)}
              </p>
            </div>
            <TrendingDown className="text-emerald-500" size={32} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-lg mb-4">Gastos por Categoría</h3>
          {loading ? (
            <div className="h-80 flex items-center justify-center text-gray-400">Cargando datos...</div>
          ) : categoryData.length === 0 ? (
            <div className="h-80 flex flex-col items-center justify-center text-gray-400 gap-2">
              <span className="text-4xl">📊</span>
              <p>No hay gastos registrados aún</p>
              <Link to="/nuevo" className="text-emerald-600 text-sm hover:underline">
                Agrega tu primer gasto →
              </Link>
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="45%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}-${entry.name}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${simbolo} ${value.toFixed(2)}`, 'Monto']} />
                  <Legend
                    verticalAlign="bottom"
                    height={40}
                    formatter={(value) => {
                      const item = categoryData.find((c) => c.name === value);
                      return `${item?.icono ?? ''} ${value}`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Últimos Gastos</h3>
            <Link to="/gastos" className="text-emerald-600 text-sm flex items-center hover:underline">
              Ver todos <ArrowRight size={16} className="ml-1" />
            </Link>
          </div>

          <div className="space-y-4">
            {loading ? (
              <p className="text-gray-400 text-sm">Cargando gastos...</p>
            ) : recentExpenses.length === 0 ? (
              <p className="text-gray-400 text-sm">No hay gastos registrados aún.</p>
            ) : (
              recentExpenses.map((expense) => {
                const cat = getCatFromExpense(expense);
                return (
                  <div key={expense.id_gasto} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ backgroundColor: cat.color + '25' }}
                      >
                        {cat.icono}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{expense.descripcion}</p>
                        <p className="text-xs text-gray-500">
                          {cat.nombre_categoria} • {expense.fecha_gasto}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-red-600 text-sm">
                      -{simbolo} {expense.monto.toFixed(2)}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}