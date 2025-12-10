import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Monitor,
  UserCog,
  BarChart3,
  LogOut,
  Ticket,
  Stethoscope,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useUserRole } from '@/hooks/useUserRole';
import type { User } from '@supabase/supabase-js';

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    isAdmin,
    isOperator,
    isVisitor,
    isDoctor,
    isSuperAdmin,
    loading: roleLoading,
  } = useUserRole(user);

  // Session timeout: 30 minutes with 5 minute warning
  useSessionTimeout({ timeoutMinutes: 30, warningMinutes: 5 });

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate('/auth');
        return;
      }

      setUser(session.user);

      // Buscar o nome do perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single();

      if (profile?.full_name) {
        setUserName(profile.full_name);
      } else {
        setUserName(session.user.email?.split('@')[0] || 'Usuário');
      }

      setLoading(false);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Redireciona baseado no role do usuário
  useEffect(() => {
    if (loading || roleLoading || !user) return;

    // Superadmins permanecem no dashboard para escolher onde ir
    if (isSuperAdmin) {
      return;
    }

    // Admins vão direto para o painel administrativo
    if (isAdmin) {
      navigate('/admin');
      return;
    }

    // Operadores vão direto para o painel de atendimento
    if (isOperator && !isAdmin) {
      navigate('/operator');
      return;
    }

    // Toten vão para o kiosk
    if (isVisitor && !isAdmin && !isOperator && !isDoctor) {
      navigate('/kiosk');
      return;
    }

    // Médicos vão para o painel de médicos
    if (isDoctor && !isAdmin) {
      navigate('/doctor');
      return;
    }
  }, [
    user,
    loading,
    roleLoading,
    isAdmin,
    isOperator,
    isVisitor,
    isDoctor,
    isSuperAdmin,
    navigate,
  ]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: 'Logout realizado',
        description: 'Até logo!',
      });
      navigate('/auth');
    } catch (error) {
      toast({
        title: 'Erro ao sair',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  if (loading || roleLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <p>Carregando...</p>
      </div>
    );
  }

  const baseMenuOptions = [
    {
      title: 'Emissão de Senhas',
      description: 'Gerar novas senhas para atendimento',
      icon: Ticket,
      path: '/kiosk',
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      title: 'Painel de Atendimento',
      description: 'Chamar e gerenciar senhas',
      icon: UserCog,
      path: '/operator',
      color: 'bg-green-500/10 text-green-500',
    },
    {
      title: 'Display / TV',
      description: 'Exibir senhas chamadas',
      icon: Monitor,
      path: '/display',
      color: 'bg-purple-500/10 text-purple-500',
    },
    {
      title: 'Painel Administrativo',
      description: 'Ver relatórios e métricas',
      icon: BarChart3,
      path: '/admin',
      color: 'bg-orange-500/10 text-orange-500',
    },
  ];

  // Add doctor and user management options for admins and superadmins
  const doctorAndAdminOptions =
    isAdmin || isSuperAdmin
      ? [
          {
            title: 'Painel dos Médicos',
            description: 'Chamar e atender como médico',
            icon: Stethoscope,
            path: '/doctor',
            color: 'bg-emerald-500/10 text-emerald-600',
          },
          {
            title: 'Gerenciar Usuários',
            description: 'Controlar perfis e permissões',
            icon: UserCog,
            path: '/users',
            color: 'bg-red-500/10 text-red-500',
          },
        ]
      : [];

  const menuOptions = [...baseMenuOptions, ...doctorAndAdminOptions];

  return (
    <div className='min-h-screen bg-gradient-to-br from-background to-muted p-6'>
      <div className='max-w-6xl mx-auto'>
        <div className='flex justify-between items-center mb-8'>
          <div>
            <h1 className='text-3xl font-bold mb-1'>Bem-vindo, {userName}!</h1>
            <p className='text-muted-foreground'>{user?.email}</p>
          </div>
          <Button onClick={handleLogout} variant='outline'>
            <LogOut className='mr-2 h-4 w-4' />
            Sair
          </Button>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {menuOptions.map((option) => (
            <Card
              key={option.path}
              className='cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105'
              onClick={() => navigate(option.path)}
            >
              <CardHeader>
                <div
                  className={`w-12 h-12 rounded-lg ${option.color} flex items-center justify-center mb-4`}
                >
                  <option.icon className='h-6 w-6' />
                </div>
                <CardTitle className='text-xl'>{option.title}</CardTitle>
                <CardDescription>{option.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant='ghost' className='w-full justify-start'>
                  Acessar →
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
