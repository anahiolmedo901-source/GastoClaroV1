import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './Authcontext';

const SIMBOLOS: Record<string, string> = {
  MXN: 'MX$',
  USD: 'US$',
  EUR: '€',
};

type Settings = {
  nombre: string;
  moneda: string;
  presupuesto_mensual: number;
  simbolo: string;
};

type SettingsContextType = {
  settings: Settings;
  reloadSettings: () => Promise<void>;
};

const defaults: Settings = {
  nombre: '',
  moneda: 'MXN',
  presupuesto_mensual: 2500,
  simbolo: 'MX$',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<Settings>(defaults);

  const reloadSettings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('usuarios')
      .select('nombre, moneda, presupuesto_mensual')
      .eq('id_usuario', user.id)
      .single();

    if (error) {
      console.error('Error cargando settings:', error.message);
      return;
    }

    if (data) {
      const moneda = data.moneda ?? 'MXN';
      setSettings({
        nombre: data.nombre ?? '',
        moneda,
        presupuesto_mensual: data.presupuesto_mensual ?? 2500,
        simbolo: SIMBOLOS[moneda] ?? moneda,
      });
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      reloadSettings();
    }
    if (!authLoading && !user) {
      setSettings(defaults);
    }
  }, [user, authLoading]);

  return (
    <SettingsContext.Provider value={{ settings, reloadSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};