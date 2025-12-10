import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export type UserRole =
  | 'admin'
  | 'operator'
  | 'visitor'
  | 'doctor'
  | 'superadmin';

export const useUserRole = (user: User | null) => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user) {
        setRoles([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) throw error;

        const userRoles = data?.map((r) => r.role as UserRole) || [];
        setRoles(userRoles);
      } catch (error) {
        console.error('Error fetching user roles:', error);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [user]);

  const hasRole = (role: UserRole) => roles.includes(role);
  const isSuperAdmin = roles.includes('superadmin');
  const isAdmin = roles.includes('admin') || isSuperAdmin;
  const isOperator = roles.includes('operator') || isSuperAdmin;
  const isDoctor = roles.includes('doctor') || isSuperAdmin;
  // Visitor NÃO herda de superadmin - superadmin não é limitado como visitor
  const isVisitor = roles.includes('visitor') && !isSuperAdmin;

  return {
    roles,
    loading,
    hasRole,
    isSuperAdmin,
    isAdmin,
    isOperator,
    isVisitor,
    isDoctor,
  };
};
