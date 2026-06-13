import { PlusCircle, Search, Edit2, Trash2, X, Save, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useExpenses } from '../hooks/useExpenses';
import { useAuth } from '../Context/Authcontext';
import { useSettings } from '../Context/SettingsContext';

interface CategoriaDB {
  id_categoria: number;
  nombre_categoria: string;
  icono: string;
  color: string;
}

const MAX_DESCRIPTION = 150;
const MAX_NOTES = 200;
const MAX_AMOUNT = 1_000_000;

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const oneMonthAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function Gastos() {
  const { user } = useAuth();
  const { expenses, loading, refetch } = useExpenses(user?.id || null);
  const { settings } = useSettings();

  const { simbolo } = settings;

  const [categorias, setCategorias] = useState<CategoriaDB[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');

  const [imageModal, setImageModal] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    descripcion: '',
    monto: '',
    fecha_gasto: '',
    notas: '',
    id_categoria: null as number | null,
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Estado para edición de la imagen del recibo
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editImageRemoved, setEditImageRemoved] = useState(false);
  const [editCurrentFotoUrl, setEditCurrentFotoUrl] = useState<string | null>(null);
  const [editFileError, setEditFileError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategorias = async () => {
      const { data, error } = await supabase
        .from('categorias')
        .select('id_categoria, nombre_categoria, icono, color')
        .eq('categoria_predeterminada', true)
        .order('nombre_categoria');

      if (error) {
        console.error('Error al cargar categorías:', error.message);
      } else {
        setCategorias(data || []);
      }
    };
    fetchCategorias();
  }, []);

  const getCat = (expense: any) => {
    if (expense.categorias) {
      return {
        id_categoria: expense.id_categoria,
        nombre_categoria: expense.categorias.nombre_categoria,
        icono: expense.categorias.icono,
        color: expense.categorias.color,
      };
    }
    return categorias.find((c) => c.id_categoria === expense.id_categoria);
  };

  const getImageUrl = (path?: string | null) => {
    if (!path) return null;
    const { data } = supabase.storage.from('recibos').getPublicUrl(path);
    return data.publicUrl;
  };

  const filtered = useMemo(() => {
    let result = [...expenses];

    if (searchTerm) {
      result = result.filter((e) => {
        const cat = getCat(e);
        return (
          e.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (cat?.nombre_categoria || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    if (selectedCategory !== 'Todas') {
      result = result.filter((e) => {
        const cat = getCat(e);
        return cat?.nombre_categoria === selectedCategory;
      });
    }

    result.sort((a, b) =>
      sortBy === 'date'
        ? new Date(b.fecha_gasto).getTime() - new Date(a.fecha_gasto).getTime()
        : b.monto - a.monto
    );

    return result;
  }, [expenses, searchTerm, selectedCategory, sortBy, categorias]);

  const totalGastado = filtered.reduce((sum, e) => sum + e.monto, 0);

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    const { error } = await supabase.from('gastos').delete().eq('id_gasto', id);
    if (error) alert('Error al eliminar: ' + error.message);
    else refetch();
  };

  const openEdit = (expense: any) => {
    setEditingId(expense.id_gasto);
    setEditForm({
      descripcion: expense.descripcion,
      monto: String(expense.monto),
      fecha_gasto: expense.fecha_gasto,
      notas: expense.notas || '',
      id_categoria: expense.id_categoria ?? null,
    });
    setEditErrors({});

    // Reset estado de imagen
    setEditCurrentFotoUrl(expense.foto_url ?? null);
    setEditImageFile(null);
    setEditImagePreview(null);
    setEditImageRemoved(false);
    setEditFileError(null);
  };

  const validateEdit = () => {
    const errs: Record<string, string> = {};
    if (!editForm.descripcion.trim()) errs.descripcion = 'La descripción es obligatoria';
    else if (editForm.descripcion.length > MAX_DESCRIPTION) errs.descripcion = `Máximo ${MAX_DESCRIPTION} caracteres`;

    const m = parseFloat(editForm.monto);
    if (!editForm.monto) errs.monto = 'El monto es obligatorio';
    else if (isNaN(m) || m <= 0) errs.monto = 'El monto debe ser mayor que 0';
    else if (m > MAX_AMOUNT) errs.monto = `No puede superar ${simbolo} ${MAX_AMOUNT.toLocaleString()}`;

    if (editForm.notas.length > MAX_NOTES) errs.notas = `Máximo ${MAX_NOTES} caracteres`;

    if (!editForm.fecha_gasto) errs.fecha_gasto = 'La fecha es obligatoria';
    else if (editForm.fecha_gasto < oneMonthAgo()) errs.fecha_gasto = 'La fecha no puede ser mayor a un mes atrás';
    else if (editForm.fecha_gasto > today()) errs.fecha_gasto = 'La fecha no puede ser futura';

    return errs;
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setEditFileError('Solo se permiten archivos JPG o PNG');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setEditFileError('La imagen no debe superar los 5MB');
      e.target.value = '';
      return;
    }

    if (editImagePreview) URL.revokeObjectURL(editImagePreview);
    setEditImageFile(file);
    setEditImagePreview(URL.createObjectURL(file));
    setEditImageRemoved(false);
  };

  const removeEditImage = () => {
    if (editImagePreview) URL.revokeObjectURL(editImagePreview);
    setEditImageFile(null);
    setEditImagePreview(null);
    setEditImageRemoved(true);
    setEditFileError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const errs = validateEdit();
    if (Object.keys(errs).length > 0) { setEditErrors(errs); return; }

    let foto_url: string | null = editCurrentFotoUrl;

    if (editImageRemoved) {
      foto_url = null;
    }

    if (editImageFile) {
      const ext = editImageFile.name.split('.').pop();
      const fileName = `usuario_${user?.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('recibos')
        .upload(fileName, editImageFile, { upsert: false });

      if (uploadError) {
        alert('Error al subir la imagen: ' + uploadError.message);
        return;
      }

      foto_url = fileName;
    }

    const { error } = await supabase
      .from('gastos')
      .update({
        descripcion: editForm.descripcion,
        monto: parseFloat(editForm.monto),
        fecha_gasto: editForm.fecha_gasto,
        notas: editForm.notas || null,
        id_categoria: editForm.id_categoria,
        foto_url,
      })
      .eq('id_gasto', editingId);

    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      setEditingId(null);
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Modal imagen recibo */}
      {imageModal && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setImageModal(null)}
        >
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setImageModal(null)}
              className="absolute -top-4 -right-4 bg-white rounded-full p-1 shadow-lg"
            >
              <X size={20} />
            </button>
            <img src={imageModal} alt="Recibo" className="w-full rounded-2xl" />
          </div>
        </div>
      )}

      {/* Modal edición */}
      {editingId !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md space-y-5 shadow-xl my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Editar gasto</h2>
              <button onClick={() => setEditingId(null)}>
                <X size={22} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input
                type="text"
                value={editForm.descripcion}
                maxLength={MAX_DESCRIPTION}
                onChange={(e) => {
                  setEditForm((p) => ({ ...p, descripcion: e.target.value }));
                  setEditErrors((p) => ({ ...p, descripcion: '' }));
                }}
                className={`w-full px-4 py-3 border rounded-2xl focus:outline-none focus:border-emerald-500 ${editErrors.descripcion ? 'border-red-400' : 'border-gray-200'}`}
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-red-500">{editErrors.descripcion ?? ''}</p>
                <p className={`text-xs ${editForm.descripcion.length >= MAX_DESCRIPTION ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                  {editForm.descripcion.length}/{MAX_DESCRIPTION}
                </p>
              </div>
            </div>

            {/* Monto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400 pointer-events-none">
                  {simbolo}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={MAX_AMOUNT}
                  value={editForm.monto}
                  onChange={(e) => {
                    if (e.target.value.includes('-')) return;
                    setEditForm((p) => ({ ...p, monto: e.target.value }));
                    setEditErrors((p) => ({ ...p, monto: '' }));
                  }}
                  className={`w-full pl-14 pr-4 py-2.5 text-sm border rounded-2xl focus:outline-none focus:border-emerald-500 ${
                    editErrors.monto || parseFloat(editForm.monto) >= MAX_AMOUNT
                      ? 'border-red-400 text-red-600'
                      : 'border-gray-200'
                  }`}
                />
              </div>
              {editErrors.monto && <p className="mt-1 text-xs text-red-500">{editErrors.monto}</p>}
              {!editErrors.monto && parseFloat(editForm.monto) >= MAX_AMOUNT && (
                <p className="mt-1 text-xs text-red-500">
                  Has alcanzado el monto máximo permitido ({simbolo} {MAX_AMOUNT.toLocaleString()})
                </p>
              )}
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input
                type="date"
                value={editForm.fecha_gasto}
                min={oneMonthAgo()}
                max={today()}
                onChange={(e) => {
                  setEditForm((p) => ({ ...p, fecha_gasto: e.target.value }));
                  setEditErrors((p) => ({ ...p, fecha_gasto: '' }));
                }}
                className={`w-full px-4 py-3 border rounded-2xl focus:outline-none focus:border-emerald-500 ${editErrors.fecha_gasto ? 'border-red-400' : 'border-gray-200'}`}
              />
              {editErrors.fecha_gasto && <p className="mt-1 text-xs text-red-500">{editErrors.fecha_gasto}</p>}
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <div className="grid grid-cols-3 gap-2">
                {categorias.map((cat) => (
                  <button
                    key={cat.id_categoria}
                    type="button"
                    onClick={() => setEditForm((p) => ({ ...p, id_categoria: cat.id_categoria }))}
                    className={`p-2 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition ${
                      editForm.id_categoria === cat.id_categoria
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xl">{cat.icono}</span>
                    <span>{cat.nombre_categoria}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea
                value={editForm.notas}
                maxLength={MAX_NOTES}
                onChange={(e) => {
                  setEditForm((p) => ({ ...p, notas: e.target.value }));
                  setEditErrors((p) => ({ ...p, notas: '' }));
                }}
                rows={2}
                className={`w-full px-4 py-3 border rounded-2xl focus:outline-none focus:border-emerald-500 resize-none ${editErrors.notas ? 'border-red-400' : 'border-gray-200'}`}
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-red-500">{editErrors.notas ?? ''}</p>
                <p className={`text-xs ${editForm.notas.length >= MAX_NOTES ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                  {editForm.notas.length}/{MAX_NOTES}
                </p>
              </div>
            </div>

            {/* Foto del recibo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Foto del recibo <span className="text-gray-400">(opcional · JPG o PNG · máx. 5MB)</span>
              </label>

              {(editImagePreview || (editCurrentFotoUrl && !editImageRemoved)) ? (
                <div className="relative w-full h-40 border border-gray-200 rounded-2xl overflow-hidden">
                  <img
                    src={editImagePreview ?? getImageUrl(editCurrentFotoUrl)!}
                    alt="Recibo"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 flex gap-2">
                    <label className="cursor-pointer bg-white/90 hover:bg-white text-gray-700 p-2 rounded-full shadow transition">
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        className="hidden"
                        onChange={handleEditFileChange}
                      />
                      <Camera size={16} />
                    </label>
                    <button
                      type="button"
                      onClick={removeEditImage}
                      className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow transition"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center w-full h-32 transition">
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={handleEditFileChange}
                  />
                  <Camera size={28} className="text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-gray-600">Agregar foto</span>
                </label>
              )}

              {editFileError && (
                <p className="mt-2 text-xs text-red-500">{editFileError}</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditingId(null)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 transition font-medium flex items-center justify-center gap-2"
              >
                <Save size={18} />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Mis Gastos</h1>
          <p className="text-gray-500">
            {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link
          to="/nuevo"
          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl hover:bg-emerald-700 transition font-medium"
        >
          <PlusCircle size={20} />
          Nuevo Gasto
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar gasto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-5 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-500"
          >
            <option value="Todas">Todas las categorías</option>
            {categorias.map((cat) => (
              <option key={cat.id_categoria} value={cat.nombre_categoria}>
                {cat.icono} {cat.nombre_categoria}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')}
            className="px-5 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-500"
          >
            <option value="date">Más recientes</option>
            <option value="amount">Mayor monto</option>
          </select>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-gray-600">{filtered.length} gastos encontrados</p>
          <p className="text-xl font-semibold text-gray-800">
            Total:{' '}
            <span className="text-red-600">
              {simbolo} {totalGastado.toFixed(2)}
            </span>
          </p>
        </div>
      </div>

      {/* Lista de gastos */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white p-12 rounded-3xl text-center text-gray-400">
            Cargando gastos...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl text-center text-gray-500 text-lg">
            No se encontraron gastos
          </div>
        ) : (
          filtered.map((expense) => {
            const cat = getCat(expense);
            const imgUrl = getImageUrl(expense.foto_url);

            return (
              <div
                key={expense.id_gasto}
                className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 group"
              >
                <div className="flex items-start gap-4 min-w-0">
                  {imgUrl ? (
                    <button
                      onClick={() => setImageModal(imgUrl)}
                      className="w-14 h-14 rounded-2xl overflow-hidden border border-gray-200 flex-shrink-0 hover:ring-2 hover:ring-emerald-400 transition"
                    >
                      <img src={imgUrl} alt="recibo" className="w-full h-full object-cover" />
                    </button>
                  ) : (
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: cat?.color ? cat.color + '20' : '#f3f4f6' }}
                    >
                      {cat?.icono ?? '📌'}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="font-semibold text-lg break-words">{expense.descripcion}</p>
                    <p className="text-sm text-gray-500">
                      {cat?.nombre_categoria ?? 'Sin categoría'} • {expense.fecha_gasto}
                    </p>
                    {expense.notas && (
                      <p className="text-sm text-gray-400 mt-1 break-words">{expense.notas}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 flex-shrink-0">
                  <p className="font-bold text-xl text-red-600 whitespace-nowrap">
                    -{simbolo} {expense.monto.toFixed(2)}
                  </p>
                  <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                    <button
                      onClick={() => openEdit(expense)}
                      className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-emerald-600 transition"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id_gasto)}
                      className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-red-600 transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}