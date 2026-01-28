import React, { useState } from 'react';
import { supabase } from '../../integrations/supabase/client';

interface LoginFormProps {
  accessDenied?: boolean;
  onRetry?: () => void;
}

type ViewMode = 'login' | 'reset' | 'reset-sent';

const LoginForm: React.FC<LoginFormProps> = ({ accessDenied, onRetry }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Nieprawidłowy email lub hasło');
        }
        throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Wystąpił błąd podczas logowania');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setViewMode('reset-sent');
    } catch (err: any) {
      setError(err.message || 'Wystąpił błąd podczas wysyłania emaila');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    if (onRetry) onRetry();
  };

  const switchToReset = () => {
    setError(null);
    setViewMode('reset');
  };

  const switchToLogin = () => {
    setError(null);
    setViewMode('login');
  };

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Brak dostępu</h1>
            <p className="text-slate-600 mb-6">
              Twoje konto nie ma uprawnień do korzystania z Poltel Hub.
              Skontaktuj się z administratorem, aby uzyskać dostęp.
            </p>
            <button
              onClick={handleSignOut}
              className="px-6 py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
            >
              Zaloguj się na inne konto
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Widok po wysłaniu emaila resetującego
  if (viewMode === 'reset-sent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Sprawdź swoją skrzynkę</h1>
            <p className="text-slate-600 mb-6">
              Wysłaliśmy link do resetowania hasła na adres <strong>{email}</strong>.
              Kliknij link w emailu, aby ustawić nowe hasło.
            </p>
            <button
              onClick={switchToLogin}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Powrót do logowania
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Widok resetowania hasła
  if (viewMode === 'reset') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Resetowanie hasła</h1>
            <p className="text-slate-600">Wyślemy Ci link do ustawienia nowego hasła</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-6">Podaj swój email</h2>

            {error && (
              <div className="mb-4 p-3 rounded-lg text-sm bg-rose-50 text-rose-700 border border-rose-200">
                {error}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none"
                  placeholder="jan@firma.pl"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Wysyłanie...' : 'Wyślij link resetujący'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={switchToLogin}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Powrót do logowania
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Widok logowania (domyślny)
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Poltel Hub</h1>
          <p className="text-slate-600">Dashboard automatyzacji contentowych</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Zaloguj się</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm bg-rose-50 text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none"
                placeholder="jan@firma.pl"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-700">
                  Hasło
                </label>
                <button
                  type="button"
                  onClick={switchToReset}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Zapomniałem hasła
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none"
                placeholder="Wprowadź hasło"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logowanie...' : 'Zaloguj się'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Dostęp tylko dla upoważnionych użytkowników
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
