import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

type User = SupabaseUser | null;

type AuthContextType = {
  user: User;
  login: (email: string, password: string) => Promise<boolean>;
  register: (nombre: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUser(data.session.user);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("Error en login:", error.message);
      return false;
    }

    const userId = data.user?.id;

    if (userId) {
      const { error: dbError } = await supabase
        .from("usuarios")
        .update({ ultimo_acceso: new Date() }) 
        .eq("id_usuario", userId);             

      if (dbError) {
        console.error("Error al actualizar ultimo_acceso:", dbError.message);
      }
    }

    setUser(data.user);
    return true;
  };

  const register = async (nombre: string, email: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error("Error en registro:", error.message);
      return false;
    }

    const userId = data.user?.id;

    if (userId) {
      const { error: dbError } = await supabase
        .from("usuarios")
        .insert({
          id_usuario: userId,         
          nombre: nombre,              
          correo: email,               
          fecha_registro: new Date(),  
          ultimo_acceso: new Date()   
        });

      if (dbError) {
        console.error("Error al insertar en tabla usuarios:", dbError.message);
        return false;
      }
    } else {
      console.warn("⚠️ Usuario creado en Auth pero no disponible aún para insertar en tabla.");
    }

    setUser(data.user);
    return true;
  };

  // 🚪 Logout
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
