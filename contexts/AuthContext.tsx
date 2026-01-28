import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  hasAccess: boolean;
  accessDenied: boolean;
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const checkPoltelAccess = async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('poltel_allowed_users')
        .select('email')
        .eq('email', email)
        .single();

      if (error) {
        console.log('AuthContext: Brak dostępu do Poltel Hub dla:', email);
        return false;
      }

      return !!data;
    } catch (err) {
      console.error('AuthContext: Błąd sprawdzania dostępu:', err);
      return false;
    }
  };

  const updateAuthState = async (newSession: Session | null) => {
    console.log('AuthContext: Aktualizacja stanu auth:', newSession?.user?.email || 'Brak sesji');
    setSession(newSession);
    setUser(newSession?.user ?? null);

    if (newSession?.user?.email) {
      const access = await checkPoltelAccess(newSession.user.email);
      setHasAccess(access);
      setAccessDenied(!access);

      if (!access) {
        console.log('AuthContext: Użytkownik nie ma dostępu do Poltel Hub');
      }
    } else {
      setHasAccess(false);
      setAccessDenied(false);
    }

    if (newSession && error) {
      setError(null);
    }
  };

  const clearAuthState = () => {
    console.log('AuthContext: Czyszczenie stanu auth');
    setSession(null);
    setUser(null);
    setError(null);
    setHasAccess(false);
    setAccessDenied(false);
    setIsPasswordRecovery(false);
  };

  const clearPasswordRecovery = () => {
    setIsPasswordRecovery(false);
    // Wyczyść hash z URL po zmianie hasła
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const signOut = async () => {
    try {
      console.log('AuthContext: Rozpoczynanie wylogowania...');
      clearAuthState();

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.log('AuthContext: Błąd wylogowania:', error);

        if (error.message.includes('session_not_found') ||
            error.message.includes('Session not found') ||
            error.status === 403) {
          console.log('AuthContext: Sesja już nieważna na serwerze');
          return;
        }

        await supabase.auth.signOut({ scope: 'local' });
        return;
      }

      console.log('AuthContext: Wylogowanie zakończone sukcesem');
    } catch (err) {
      console.error('AuthContext: Nieoczekiwany błąd wylogowania:', err);

      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (localError) {
        console.error('AuthContext: Nie udało się wyczyścić lokalnej sesji:', localError);
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        console.log('AuthContext: Zmiana stanu auth:', event, newSession?.user?.email || 'Brak sesji');

        if (event === 'SIGNED_OUT') {
          clearAuthState();
          setLoading(false);
          return;
        }

        if (event === 'PASSWORD_RECOVERY') {
          console.log('AuthContext: Tryb resetowania hasła');
          setIsPasswordRecovery(true);
          await updateAuthState(newSession);
          setLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await updateAuthState(newSession);
          setLoading(false);
          return;
        }

        if (session?.access_token !== newSession?.access_token) {
          await updateAuthState(newSession);
          if (loading) setLoading(false);
        }
      }
    );

    const initializeAuth = async () => {
      try {
        console.log('AuthContext: Inicjalizacja auth...');

        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('AuthContext: Błąd pobierania sesji:', sessionError);

          if (sessionError.message.includes('session_not_found') ||
              sessionError.message.includes('Session not found')) {
            console.log('AuthContext: Sesja nie znaleziona na serwerze, czyszczenie lokalnej sesji');
            await supabase.auth.signOut({ scope: 'local' });
            if (mounted) {
              clearAuthState();
              setLoading(false);
            }
            return;
          }

          if (mounted) {
            setError(sessionError.message);
            setLoading(false);
          }
          return;
        }

        if (mounted) {
          console.log('AuthContext: Początkowa sesja:', initialSession?.user?.email || 'Brak sesji');
          await updateAuthState(initialSession);
          setLoading(false);
        }
      } catch (err) {
        console.error('AuthContext: Błąd inicjalizacji auth:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Błąd autoryzacji');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    isAuthenticated: !!user && !!session,
    hasAccess,
    accessDenied,
    isPasswordRecovery,
    clearPasswordRecovery,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
