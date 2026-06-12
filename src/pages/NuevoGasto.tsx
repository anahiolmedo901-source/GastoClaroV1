import { PlusCircle, Camera, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Breadcrumbs from '../componentes/Breadcrumbs';
import { supabase } from '../lib/supabase';
import { useAuth } from '../Context/Authcontext';
import { useSettings } from '../Context/SettingsContext';

interface CategoriaDB {
  id_categoria: number;
  nombre_categoria: string;
  icono: string;
  color: string;
}

interface GastoForm {
  description: string;
  amount: string;
  id_categoria: number | null;
  date: string;
  notes: string;
}

export default function NuevoGasto() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();

  const { simbolo } = settings;

  const [categorias, setCategorias] = useState<CategoriaDB[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  const [form, setForm] = useState<GastoForm>({
    description: '',
    amount: '',
    id_categoria: null,
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchCategorias = async () => {
      const { data, error } = await supabase
        .from('categorias')
        .select('id_categoria, nombre_categoria, icono, color')
        .eq('categoria_predeterminada', true)
        .order('nombre_categoria');

      if (error) console.error('Error cargando categorías:', error);
      else setCategorias(data || []);
      setLoadingCats(false);
    };
    fetchCategorias();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'amount' && value.includes('-')) {
      return;
    }

    setForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCategorySelect = (id: number) => {
    setForm(prev => ({ ...prev, id_categoria: id }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen no debe superar los 5MB');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const uploadFoto = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const fileName = `usuario_${user?.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('recibos')
      .upload(fileName, file, { upsert: false });

    if (error) {
      console.error('Error subiendo foto:', error);
      return null;
    }

    return fileName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('Debes iniciar sesión para registrar un gasto');
      return;
    }

    if (!form.description || !form.amount || !form.id_categoria) {
      alert('Por favor completa los campos obligatorios, incluyendo la categoría');
      return;
    }

    const monto = parseFloat(form.amount);

    if (isNaN(monto) || monto <= 0) {
      alert('El monto debe ser mayor que 0');
      return;
    }

    setIsSubmitting(true);

    try {
      let foto_url: string | null = null;
      if (selectedFile) {
        foto_url = await uploadFoto(selectedFile);
        if (!foto_url) {
          alert('Error al subir la imagen. El gasto no se guardó.');
          setIsSubmitting(false);
          return;
        }
      }

      const { error } = await supabase
        .from('gastos')
        .insert({
          id_usuario: user.id,
          descripcion: form.description,
          monto,
          fecha_gasto: form.date,
          notas: form.notes || null,
          id_categoria: form.id_categoria,
          foto_url,
        });

      if (error) throw error;

      alert('Gasto registrado correctamente');
      navigate('/');

    } catch (error: any) {
      console.error('Error completo:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Nuevo Gasto</h1>
        <p className="text-gray-500">Registra un nuevo gasto</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-8">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Foto del recibo <span className="text-gray-400">(opcional)</span>
          </label>
          <div className="flex gap-4 items-center">
            {!previewUrl && (
              <label className="cursor-pointer bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center w-48 h-48 transition">
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <Camera size={40} className="text-gray-400 mb-3" />
                <span className="text-sm font-medium text-gray-600">Subir foto</span>
                <span className="text-xs text-gray-400 mt-1">Máx. 5MB</span>
              </label>
            )}

            {previewUrl && (
              <div className="relative w-48 h-48 border border-gray-200 rounded-2xl overflow-hidden flex-shrink-0">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition"
                >
                  <X size={16} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs text-center py-1">
                  {selectedFile?.name.slice(0, 20)}...
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Descripción *</label>
          <input
            type="text"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Ej: Almuerzo en el centro comercial"
            className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-500 text-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Monto *</label>
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
              {simbolo}
            </span>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              step="0.01"
              min="0.01"
              placeholder="0.00"
              className="w-full pl-14 pr-5 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-500 text-3xl font-semibold"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Categoría *</label>
          {loadingCats ? (
            <p className="text-gray-400 text-sm">Cargando categorías...</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {categorias.map((cat) => (
                <button
                  key={cat.id_categoria}
                  type="button"
                  onClick={() => handleCategorySelect(cat.id_categoria)}
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 text-sm font-medium ${
                    form.id_categoria === cat.id_categoria
                      ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-3xl">{cat.icono}</span>
                  <span className="text-center leading-tight">{cat.nombre_categoria}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notas adicionales</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Ej: Pagado en efectivo..."
            className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-500 resize-y"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !form.id_categoria || !user}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold py-5 rounded-2xl text-lg flex items-center justify-center gap-3 transition"
        >
          {isSubmitting ? (
            <span>{selectedFile ? 'Guardando...' : 'Guardando...'}</span>
          ) : (
            <>
              <PlusCircle size={24} />
              Registrar Gasto
            </>
          )}
        </button>
      </form>
    </div>
  );
}