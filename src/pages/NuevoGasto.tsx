import { PlusCircle, Camera, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
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

const MAX_DESCRIPTION = 150;
const MAX_NOTES = 200;
const MAX_AMOUNT = 1_000_000;

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

  const [errors, setErrors] = useState<Partial<Record<keyof GastoForm, string>>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
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

  const validateField = (name: keyof GastoForm, value: string) => {
    switch (name) {
      case 'description':
        if (!value.trim()) return 'La descripción es obligatoria';
        if (value.length > MAX_DESCRIPTION) return `Máximo ${MAX_DESCRIPTION} caracteres`;
        return '';
      case 'amount': {
        const n = parseFloat(value);
        if (!value) return 'El monto es obligatorio';
        if (isNaN(n) || n <= 0) return 'El monto debe ser mayor que 0';
        if (n > MAX_AMOUNT) return `El monto no puede superar ${simbolo} ${MAX_AMOUNT.toLocaleString()}`;
        return '';
      }
      case 'notes':
        if (value.length > MAX_NOTES) return `Máximo ${MAX_NOTES} caracteres`;
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Bloquear negativos en monto
    if (name === 'amount' && value.includes('-')) return;

    setForm(prev => ({ ...prev, [name]: value }));

    const err = validateField(name as keyof GastoForm, value);
    setErrors(prev => ({ ...prev, [name]: err }));
  };

  const handleCategorySelect = (id: number) => {
    setForm(prev => ({ ...prev, id_categoria: id }));
    setErrors(prev => ({ ...prev, id_categoria: '' }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setFileError('Solo se permiten archivos JPG o PNG');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileError('La imagen no debe superar los 5MB');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileError(null);
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

    // Validar todos los campos antes de enviar
    const descErr = validateField('description', form.description);
    const amountErr = validateField('amount', form.amount);
    const notesErr = validateField('notes', form.notes);
    const catErr = !form.id_categoria ? 'Selecciona una categoría' : '';

    setErrors({ description: descErr, amount: amountErr, notes: notesErr, id_categoria: catErr });

    if (descErr || amountErr || notesErr || catErr) return;
    if (!user) { alert('Debes iniciar sesión'); return; }

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

      const { error } = await supabase.from('gastos').insert({
        id_usuario: user.id,
        descripcion: form.description,
        monto: parseFloat(form.amount),
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

        {/* Foto del recibo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Foto del recibo <span className="text-gray-400">(opcional · JPG o PNG · máx. 5MB)</span>
          </label>
          <div className="flex gap-4 items-center">
            {!previewUrl && (
              <label className="cursor-pointer bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center w-48 h-48 transition">
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Camera size={40} className="text-gray-400 mb-3" />
                <span className="text-sm font-medium text-gray-600">Subir foto</span>
                <span className="text-xs text-gray-400 mt-1">JPG / PNG · Máx. 5MB</span>
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
          {fileError && (
            <p className="mt-2 text-sm text-red-500">{fileError}</p>
          )}
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Descripción *</label>
          <input
            type="text"
            name="description"
            value={form.description}
            onChange={handleChange}
            maxLength={MAX_DESCRIPTION}
            placeholder="Ej: Almuerzo en el centro comercial"
            className={`w-full px-5 py-4 border rounded-2xl focus:outline-none focus:border-emerald-500 text-lg ${
              errors.description ? 'border-red-400' : 'border-gray-200'
            }`}
          />
          <div className="flex justify-between mt-1">
            <p className="text-sm text-red-500">{errors.description ?? ''}</p>
            <p className={`text-xs ${form.description.length >= MAX_DESCRIPTION ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              {form.description.length}/{MAX_DESCRIPTION}
            </p>
          </div>
        </div>

        {/* Monto */}
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
              max={MAX_AMOUNT}
              placeholder="0.00"
              className={`w-full pl-14 pr-5 py-4 border rounded-2xl focus:outline-none focus:border-emerald-500 text-3xl font-semibold ${
                errors.amount ? 'border-red-400' : 'border-gray-200'
              }`}
            />
          </div>
          {errors.amount && (
            <p className="mt-1 text-sm text-red-500">{errors.amount}</p>
          )}
        </div>

        {/* Categoría */}
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
          {errors.id_categoria && (
            <p className="mt-2 text-sm text-red-500">{errors.id_categoria}</p>
          )}
        </div>

        {/* Fecha */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            min={(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })()}
            max={`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`}
            className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notas adicionales</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            maxLength={MAX_NOTES}
            placeholder="Ej: Pagado en efectivo..."
            className={`w-full px-5 py-4 border rounded-2xl focus:outline-none focus:border-emerald-500 resize-y ${
              errors.notes ? 'border-red-400' : 'border-gray-200'
            }`}
          />
          <div className="flex justify-between mt-1">
            <p className="text-sm text-red-500">{errors.notes ?? ''}</p>
            <p className={`text-xs ${form.notes.length >= MAX_NOTES ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              {form.notes.length}/{MAX_NOTES}
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !form.id_categoria || !user}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold py-5 rounded-2xl text-lg flex items-center justify-center gap-3 transition"
        >
          {isSubmitting ? (
            <span>Guardando...</span>
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