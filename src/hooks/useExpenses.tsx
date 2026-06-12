// src/hooks/useExpenses.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Expense {
  id_gasto: number;
  id_usuario: string;
  descripcion: string;
  monto: number;
  fecha_gasto: string;
  notas?: string | null;
  id_categoria?: number | null;
  foto_url?: string | null;
  created_at: string;
  categorias?: {
    nombre_categoria: string;
    icono?: string;
    color?: string;
  } | null;
}

export const useExpenses = (userId: string | null) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    if (!userId) {
      console.warn('🚫 useExpenses: No hay userId');
      setExpenses([]);
      setLoading(false);
      return;
    }

    console.log('🔍 Cargando gastos para usuario:', userId);
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('gastos')
      .select(`
        id_gasto,
        id_usuario,
        id_categoria,
        descripcion,
        monto,
        fecha_gasto,
        notas,
        foto_url,
        created_at,
        categorias (
          nombre_categoria,
          icono,
          color
        )
      `)
      .eq('id_usuario', userId)
      .order('fecha_gasto', { ascending: false });

    if (fetchError) {
      console.error('Error fetching expenses:', fetchError.message);
      setError(fetchError.message);
      setExpenses([]);
    } else {
      console.log(`Se cargaron ${data?.length || 0} gastos`);

      const normalized = (data || []).map((item: any) => ({
        ...item,
        categorias: Array.isArray(item.categorias)
          ? item.categorias[0] ?? null
          : item.categorias ?? null,
      }));

      setExpenses(normalized);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return { expenses, loading, error, refetch: fetchExpenses };
};