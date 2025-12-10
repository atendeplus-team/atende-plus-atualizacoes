import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import type { User } from '@supabase/supabase-js';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
}

const ProtectedRoute = ({
  children,
  allowedRoles,
  requireAuth = true,
}: ProtectedRouteProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { roles, loading: roleLoading } = useUserRole(user);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading || roleLoading) {
      return;
    }

    // Se requer autenticação e não está logado
    if (requireAuth && !user) {
      if (location.pathname !== '/auth') {
        navigate('/auth', { replace: true });
      }
      return;
    }

    // Se tem roles específicas permitidas, verifica
    if (allowedRoles && allowedRoles.length > 0 && user) {
      // Se roles está vazio, aguarda
      if (roles.length === 0) {
        const timer = setTimeout(() => {
          if (roles.length === 0 && !roleLoading) {
            if (location.pathname !== '/auth') {
              navigate('/auth', { replace: true });
            }
          }
        }, 500);
        return () => clearTimeout(timer);
      }

      // Superadmin tem acesso a todas as rotas
      const isSuperAdmin = roles.includes('superadmin');
      const hasAllowedRole =
        isSuperAdmin || roles.some((role) => allowedRoles.includes(role));

      if (!hasAllowedRole) {
        if (location.pathname !== '/auth') {
          navigate('/auth', { replace: true });
        }
      }
    }
  }, [
    user,
    roles,
    loading,
    roleLoading,
    requireAuth,
    allowedRoles,
    navigate,
    location.pathname,
  ]);

  if (loading || roleLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <p>Carregando...</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
