import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { LogIn } from 'lucide-react';

interface CompanySettings {
  logo_url: string | null;
  company_name: string;
}

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [companySettings, setCompanySettings] =
    useState<CompanySettings | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const redirectByRole = async (userId: string) => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      const roles = (data || []).map((r: any) => r.role);
      if (roles.includes('admin')) return navigate('/dashboard');
      if (roles.includes('doctor')) return navigate('/doctor');
      if (roles.includes('operator')) return navigate('/operator');
      if (roles.includes('visitor')) return navigate('/kiosk');
      navigate('/dashboard');
    };

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      // Não redireciona aqui - deixa o ProtectedRoute em cada rota gerenciar isso
      // para evitar loop quando roles ainda não carregaram
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Não redireciona aqui para evitar conflito;
      // redirecionamento controlado por handleAuth após login
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const loadCompanySettings = async () => {
      const { data } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single();
      if (data) setCompanySettings(data as CompanySettings);
    };
    loadCompanySettings();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: 'Login realizado com sucesso!',
        description: 'Bem-vindo de volta.',
      });

      // Redireciona explicitamente após login bem-sucedido
      if (data?.user?.id) {
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id);
        const roles = (rolesData || []).map((r: any) => r.role);
        if (roles.includes('admin')) {
          return navigate('/dashboard', { replace: true });
        }
        if (roles.includes('doctor')) {
          return navigate('/doctor', { replace: true });
        }
        if (roles.includes('operator')) {
          return navigate('/operator', { replace: true });
        }
        if (roles.includes('visitor')) {
          return navigate('/kiosk', { replace: true });
        }
        navigate('/dashboard', { replace: true });
      }
    } catch (error: any) {
      setErrorMessage(
        'Email ou senha incorretos. Verifique e tente novamente.'
      );
      setShowErrorDialog(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-6'>
      <Card className='w-full max-w-lg md:max-w-xl'>
        <CardHeader className='space-y-5 text-center'>
          <div className='flex justify-center mb-0'>
            {companySettings?.logo_url ? (
              <img
                src={companySettings.logo_url}
                alt={companySettings.company_name || 'Logo'}
                className='h-24 w-24 md:h-28 md:w-28 rounded-full object-cover border border-muted'
              />
            ) : (
              <div className='p-8 bg-primary/10 rounded-full'>
                <LogIn className='h-10 w-10 text-primary' />
              </div>
            )}
          </div>
          <CardTitle className='text-3xl'>Login</CardTitle>
          <CardDescription className='text-base'>
            Entre com suas credenciais para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className='space-y-4'>
            <div className='space-y-2'>
              <label htmlFor='email' className='text-sm font-medium'>
                Email
              </label>
              <Input
                id='email'
                type='email'
                placeholder='seu@email.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete='email'
              />
            </div>
            <div className='space-y-2'>
              <label htmlFor='password' className='text-sm font-medium'>
                Senha
              </label>
              <Input
                id='password'
                type='password'
                placeholder='••••••••'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete='current-password'
              />
            </div>
            <Button type='submit' className='w-full' disabled={loading}>
              {loading ? 'Carregando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Dialog
        open={showErrorDialog}
        onOpenChange={(open) => setShowErrorDialog(open)}
      >
        <DialogContent
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Dados incorretos</DialogTitle>
            <DialogDescription>
              {errorMessage || 'Email ou senha incorretos.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowErrorDialog(false)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
