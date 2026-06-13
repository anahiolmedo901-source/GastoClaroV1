import { DollarSign, FolderOpen, Download, Trash2, Save, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import Breadcrumbs from '../componentes/Breadcrumbs';
import { supabase } from '../lib/supabase';
import { useAuth } from '../Context/Authcontext';
import { useSettings } from '../Context/SettingsContext';

export default function Ajustes() {
  const { user, logout } = useAuth();
  const { reloadSettings } = useSettings();

  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    moneda: 'MXN',
    presupuesto_mensual: '2500',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveMsg, setSaveMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchUser = async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('nombre, correo, moneda, presupuesto_mensual')
        .eq('id_usuario', user.id)
        .single();

      if (error) {
        console.error('Error cargando perfil:', error.message);
      } else if (data) {
        setFormData({
          nombre:              data.nombre        ?? '',
          correo:              data.correo        ?? user.email ?? '',
          moneda:              data.moneda        ?? 'MXN',
          presupuesto_mensual: String(data.presupuesto_mensual ?? 2500),
        });
      }
      setIsLoading(false);
    };

    fetchUser();
  }, [user]);

  const NAME_MAX = 50;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (name === 'nombre' && value.length > NAME_MAX) return;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveMsg(null);

    const { error } = await supabase
      .from('usuarios')
      .update({
        nombre:              formData.nombre,
        moneda:              formData.moneda,
        presupuesto_mensual: parseFloat(formData.presupuesto_mensual) || 2500,
      })
      .eq('id_usuario', user.id);

    if (error) {
      setSaveMsg({ type: 'err', text: 'Error al guardar: ' + error.message });
    } else {
      await reloadSettings();
      setSaveMsg({ type: 'ok', text: 'Configuración guardada correctamente' });
      setTimeout(() => setSaveMsg(null), 3000);
    }
    setIsSaving(false);
  };

  const handleExportCSV = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('gastos')
      .select('descripcion, monto, fecha_gasto, notas, id_categoria')
      .eq('id_usuario', user.id)
      .order('fecha_gasto', { ascending: false });

    if (error) {
      alert('Error al exportar: ' + error.message);
      return;
    }

    const header = 'Descripcion,Monto,Fecha,Notas,Categoria';
    const rows = (data || []).map((g) =>
      `"${g.descripcion}",${g.monto},"${g.fecha_gasto}","${g.notas ?? ''}","${g.id_categoria ?? ''}"`
    );
    const csv = [header, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'gastos_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAll = async () => {
    if (!user) return;
    if (
      !window.confirm(
        '⚠️ ¿Seguro que deseas eliminar TODOS tus gastos? Esta acción no se puede deshacer.'
      )
    )
      return;

    const { error } = await supabase
      .from('gastos')
      .delete()
      .eq('id_usuario', user.id);

    if (error) {
      alert('Error al eliminar: ' + error.message);
    } else {
      alert('✅ Todos los gastos fueron eliminados.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Ajustes</h1>
        <p className="text-gray-500">Personaliza tu experiencia</p>
      </div>

      {/* Perfil */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-4xl">
            👤
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Perfil</h2>
            <p className="text-gray-500 text-sm">Información personal</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Nombre</label>
              <span className={`text-xs ${formData.nombre.length >= NAME_MAX ? 'text-red-500' : 'text-gray-400'}`}>
                {formData.nombre.length}/{NAME_MAX}
              </span>
            </div>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              maxLength={NAME_MAX}
              className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              name="correo"
              value={formData.correo}
              disabled
              className="w-full px-5 py-4 border border-gray-200 rounded-2xl bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">
              El correo no se puede cambiar desde aquí.
            </p>
          </div>
        </div>
      </div>

      {/* Preferencias Generales */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-3 text-gray-900">
          <DollarSign size={24} className="text-emerald-600" />
          Preferencias Generales
        </h2>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Moneda principal</p>
              <p className="text-sm text-gray-500">Usada en toda la aplicación</p>
            </div>
            <select
              name="moneda"
              value={formData.moneda}
              onChange={handleChange}
              className="px-5 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-500"
            >
              <option value="MXN">Pesos Mexicanos (MX$)</option>
              <option value="USD">Dólares (US$)</option>
              <option value="EUR">Euros (€)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Presupuesto mensual predeterminado
            </label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
                {{ MXN: 'MX$', USD: 'US$', EUR: '€' }[formData.moneda] ?? formData.moneda}
              </span>
              <input
                type="number"
                name="presupuesto_mensual"
                value={formData.presupuesto_mensual}
                onChange={handleChange}
                className="w-full pl-16 pr-5 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Datos */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-3 text-gray-900">
          <FolderOpen size={24} className="text-emerald-600" />
          Datos
        </h2>

        <div className="space-y-4">
          <button
            onClick={handleExportCSV}
            className="w-full flex items-center justify-between px-6 py-4 border border-gray-200 rounded-2xl hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <Download size={20} className="text-emerald-600" />
              <div className="text-left">
                <p className="font-medium text-sm">Exportar gastos</p>
                <p className="text-xs text-gray-500">Descarga todos tus gastos en CSV</p>
              </div>
            </div>
          </button>

          <button
            onClick={handleDeleteAll}
            className="w-full flex items-center justify-between px-6 py-4 border border-red-100 rounded-2xl hover:bg-red-50 transition"
          >
            <div className="flex items-center gap-3">
              <Trash2 size={20} className="text-red-500" />
              <div className="text-left">
                <p className="font-medium text-sm text-red-600">Eliminar todos los gastos</p>
                <p className="text-xs text-gray-500">Esta acción no se puede deshacer</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {saveMsg && (
        <div
          className={`px-5 py-4 rounded-2xl text-sm font-medium ${
            saveMsg.type === 'ok'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {saveMsg.text}
        </div>
      )}

      {/* Botón Guardar */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold py-5 rounded-2xl text-lg flex items-center justify-center gap-3 transition shadow-sm"
      >
        {isSaving ? (
          <>
            <Loader2 size={22} className="animate-spin" />
            Guardando cambios...
          </>
        ) : (
          <>
            <Save size={24} />
            Guardar Cambios
          </>
        )}
      </button>

      {/* Cerrar sesión */}
      <button
        onClick={logout}
        className="w-full border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium py-4 rounded-2xl transition"
      >
        Cerrar sesión
      </button>

      <div className="text-center text-sm text-gray-400 pt-2 pb-8" />
    </div>
  );
}