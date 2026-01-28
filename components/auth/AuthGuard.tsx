import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginForm from './LoginForm';
import ResetPasswordForm from './ResetPasswordForm';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, loading, hasAccess, accessDenied, isPasswordRecovery, clearPasswordRecovery } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Ładowanie...</p>
        </div>
      </div>
    );
  }

  // Tryb resetowania hasła - pokaż formularz zmiany hasła
  if (isPasswordRecovery && isAuthenticated) {
    return <ResetPasswordForm onSuccess={clearPasswordRecovery} />;
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  if (accessDenied || !hasAccess) {
    return <LoginForm accessDenied={true} />;
  }

  return <>{children}</>;
};

export default AuthGuard;
