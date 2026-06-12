// src/pages/Reportes.tsx
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useExpenses } from '../hooks/useExpenses';
import { useAuth } from '../Context/Authcontext';
import { useSettings } from '../Context/SettingsContext';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const FALLBACK_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6b7280',
];

export default function Reportes() {
  const { user } = useAuth();
  const { expenses, loading } = useExpenses(user?.id || null);
  const { settings } = useSettings();

  const { simbolo, presupuesto_mensual: PRESUPUESTO } = settings;

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const monthExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const [year, month] = e.fecha_gasto.split('-').map(Number);
      return month - 1 === selectedMonth && year === selectedYear;
    });
  }, [expenses, selectedMonth, selectedYear]);

  const prevMonthExpenses = useMemo(() => {
    const prevDate = new Date(selectedYear, selectedMonth - 1, 1);
    const prevMonth = prevDate.getMonth();
    const prevYear = prevDate.getFullYear();
    return expenses.filter((e) => {
      const [year, month] = e.fecha_gasto.split('-').map(Number);
      return month - 1 === prevMonth && year === prevYear;
    });
  }, [expenses, selectedMonth, selectedYear]);

  const totalMes = monthExpenses.reduce((s, e) => s + e.monto, 0);
  const totalMesAnterior = prevMonthExpenses.reduce((s, e) => s + e.monto, 0);
  const diferenciaMes = totalMesAnterior > 0
    ? Math.round(((totalMes - totalMesAnterior) / totalMesAnterior) * 100)
    : 0;

  const presupuestoRestante = PRESUPUESTO - totalMes;
  const diasConGasto = new Set(monthExpenses.map((e) => e.fecha_gasto)).size;
  const promedioDiario = diasConGasto > 0 ? totalMes / diasConGasto : 0;

  const categoryData = useMemo(() => {
    const totals: Record<string, { value: number; nombre: string; icono: string; color: string }> = {};

    monthExpenses.forEach((e) => {
      const key = e.id_categoria != null ? String(e.id_categoria) : 'sin_cat';
      const nombre = e.categorias?.nombre_categoria ?? 'Sin categoría';
      const icono = e.categorias?.icono ?? '📌';
      const color = e.categorias?.color ?? '';

      if (!totals[key]) {
        totals[key] = { value: 0, nombre, icono, color };
      }
      totals[key].value += e.monto;
    });

    return Object.entries(totals)
      .map(([, v], index) => ({
        name: v.nombre,
        value: Math.round(v.value * 100) / 100,
        color: v.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
        icono: v.icono,
        percentage: totalMes > 0 ? Math.round((v.value / totalMes) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [monthExpenses, totalMes]);

  const lineData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(selectedYear, selectedMonth - (5 - i), 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const spent = expenses
        .filter((e) => {
          const [ey, em] = e.fecha_gasto.split('-').map(Number);
          return em - 1 === m && ey === y;
        })
        .reduce((s, e) => s + e.monto, 0);
      return {
        month: MESES[m].slice(0, 3),
        spent: Math.round(spent * 100) / 100,
      };
    });
  }, [expenses, selectedMonth, selectedYear]);

  const topGastos = useMemo(
    () => [...monthExpenses].sort((a, b) => b.monto - a.monto).slice(0, 5),
    [monthExpenses]
  );

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        return {
          label: `${MESES[d.getMonth()]} ${d.getFullYear()}`,
          month: d.getMonth(),
          year: d.getFullYear(),
        };
      }),
    []
  );

  const exportPDF = () => {
    const doc = new jsPDF();
    const mesNombre = `${MESES[selectedMonth]} ${selectedYear}`;

    doc.setFontSize(20);
    doc.setTextColor(16, 185, 129);
    doc.text('GastoClaro — Reporte Mensual', 14, 20);

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(mesNombre, 14, 30);
    doc.text(`Generado el ${new Date().toLocaleDateString('es-MX')}`, 14, 37);

    autoTable(doc, {
      startY: 50,
      head: [['Concepto', 'Valor']],
      body: [
        ['Total gastado', `${simbolo} ${totalMes.toFixed(2)}`],
        ['Presupuesto mensual', `${simbolo} ${PRESUPUESTO.toFixed(2)}`],
        ['Presupuesto restante', `${simbolo} ${presupuestoRestante.toFixed(2)}`],
        ['Promedio diario', `${simbolo} ${promedioDiario.toFixed(2)}`],
        ['Días con gastos', String(diasConGasto)],
      ],
      styles: { fontSize: 11 },
      headStyles: { fillColor: [16, 185, 129] },
    });

    if (topGastos.length > 0) {
      const lastY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(13);
      doc.setTextColor(50, 50, 50);
      doc.text('Top gastos del mes', 14, lastY);

      autoTable(doc, {
        startY: lastY + 5,
        head: [['Descripción', 'Categoría', 'Fecha', 'Monto']],
        body: topGastos.map((g) => [
          g.descripcion,
          g.categorias?.nombre_categoria ?? 'Sin categoría',
          g.fecha_gasto,
          `${simbolo} ${g.monto.toFixed(2)}`,
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [16, 185, 129] },
      });
    }

    doc.save(`GastoClaro_${MESES[selectedMonth]}_${selectedYear}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-lg">Cargando reportes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Reportes</h1>
          <p className="text-gray-500">Resumen y análisis de tus gastos</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={`${selectedMonth}-${selectedYear}`}
            onChange={(e) => {
              const [m, y] = e.target.value.split('-').map(Number);
              setSelectedMonth(m);
              setSelectedYear(y);
            }}
            className="px-5 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-500"
          >
            {monthOptions.map((opt) => (
              <option key={`${opt.month}-${opt.year}`} value={`${opt.month}-${opt.year}`}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={exportPDF}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 px-5 py-3 rounded-2xl transition"
          >
            <Download size={20} />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Total Gastado</p>
          <p className="text-4xl font-bold text-gray-800 mt-2">
            {simbolo} {totalMes.toFixed(2)}
          </p>
          {totalMesAnterior > 0 && (
            <div className={`flex items-center gap-1 text-sm mt-3 ${diferenciaMes > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
              {diferenciaMes > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span>
                {Math.abs(diferenciaMes)}% {diferenciaMes > 0 ? 'más' : 'menos'} que el mes anterior
              </span>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Presupuesto Restante</p>
          <p className={`text-4xl font-bold mt-2 ${presupuestoRestante >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {simbolo} {presupuestoRestante.toFixed(2)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Promedio por día</p>
          <p className="text-4xl font-bold text-gray-800 mt-2">
            {simbolo} {promedioDiario.toFixed(2)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">Categoría Principal</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">
            {categoryData[0] ? `${categoryData[0].icono} ${categoryData[0].name}` : '—'}
          </p>
          {categoryData[0] && (
            <p className="text-sm text-gray-500 mt-1">
              {categoryData[0].percentage}% del total
            </p>
          )}
        </div>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-lg mb-6">Evolución últimos 6 meses</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [`${simbolo} ${value}`, 'Gastado']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                />
                <Line
                  type="monotone"
                  dataKey="spent"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-lg mb-6">Distribución por categoría</h3>
          {categoryData.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-gray-400 gap-2">
              <span className="text-4xl">📊</span>
              <p>Sin gastos en {MESES[selectedMonth]}</p>
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}-${entry.name}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${simbolo} ${value.toFixed(2)}`, 'Monto']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
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
      </div>

      {/* Top gastos */}
      {topGastos.length > 0 && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-lg mb-4">Top gastos de {MESES[selectedMonth]}</h3>
          <div className="space-y-3">
            {topGastos.map((g, i) => (
              <div key={g.id_gasto} className="flex items-center gap-4">
                <span className="text-gray-400 font-mono text-sm w-5">{i + 1}</span>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: (g.categorias?.color ?? '#e5e7eb') + '25' }}
                >
                  {g.categorias?.icono ?? '📌'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{g.descripcion}</p>
                  <p className="text-xs text-gray-500">
                    {g.categorias?.nombre_categoria ?? 'Sin categoría'} • {g.fecha_gasto}
                  </p>
                </div>
                <p className="font-semibold text-red-600 flex-shrink-0">
                  {simbolo} {g.monto.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Desglose por categoría */}
      {categoryData.length > 0 && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-lg mb-4">Desglose por categoría</h3>
          <div className="space-y-4">
            {categoryData.map((cat) => (
              <div key={cat.name}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">
                    {cat.icono} {cat.name}
                  </span>
                  <span className="text-sm text-gray-600">
                    {simbolo} {cat.value.toFixed(2)} ({cat.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}