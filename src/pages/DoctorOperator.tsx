// c:\Users\Pericles\code\flow-queue-master-main\src\pages\DoctorOperator.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  Phone,
  CheckCircle,
  Repeat,
  Monitor,
  LogOut,
  Loader2,
  Home,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import type { User } from '@supabase/supabase-js';

// Modelo da senha utilizada no fluxo do médico
interface DocTicket {
  id: string;
  ticket_id: string;
  display_number: string;
  patient_name?: string | null;
  priority: string;
  status: string;
  created_at: string;
  counter?: string | null;
  doctor_name?: string | null;
  doctor_tickets?: string | null;
}

const DoctorOperator = () => {
  // Estado principal: fila de espera, senha atual, paginação e dados do médico
  const [tickets, setTickets] = useState<DocTicket[]>([]);
  const [currentTicket, setCurrentTicket] = useState<DocTicket | null>(null);
  const [waitPage, setWaitPage] = useState(0);
  const PAGE_SIZE = 7;
  const [doctorName, setDoctorName] = useState('');
  const [consultorio, setConsultorio] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [callCount, setCallCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [restoringCurrent, setRestoringCurrent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    isDoctor,
    isAdmin,
    isSuperAdmin,
    loading: roleLoading,
  } = useUserRole(currentUser);
  const [doctorId, setDoctorId] = useState<string>('');

  // Verifica sessão e redireciona para a tela de login unificada
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setCurrentUser(session.user);
    };
    checkAuth();
  }, [navigate]);

  // Carrega dados de perfil (nome do médico e consultório) e estado inicial
  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser || roleLoading) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, company')
        .eq('id', currentUser.id)
        .single();
      setDoctorName(profile?.full_name || '');
      setConsultorio(profile?.company || '');
      setDoctorId(currentUser.id);
      const savedCallCount = localStorage.getItem('doctorCallCount');
      setCallCount(savedCallCount ? parseInt(savedCallCount) : 0);
      setIsConfigured(true);
      loadWaitingTickets();
    };
    loadProfile();
  }, [currentUser, isDoctor, isAdmin, roleLoading]);

  // Restaura a última senha chamada e inicia atualização periódica da fila
  useEffect(() => {
    const restoreCurrentTicket = async () => {
      if (!doctorName) return; // Aguarda carregar o nome do médico

      setRestoringCurrent(true);

      // Buscar qualquer ticket em atendimento para este médico
      const { data, error } = await (supabase as any)
        .from('doctor_tickets')
        .select(
          'id, ticket_id, display_number, patient_name, priority, status, created_at, counter, doctor_name, in_service, finished_at, called_at'
        )
        .eq('doctor_id', doctorId)
        .eq('in_service', true)
        .is('finished_at', null)
        .maybeSingle();

      if (data) {
        setCurrentTicket(data as DocTicket);
        localStorage.setItem('currentDoctorTicketId', data.id);
      } else {
        setCurrentTicket(null);
        localStorage.removeItem('currentDoctorTicketId');
      }
      setRestoringCurrent(false);
    };
    if (isConfigured) {
      restoreCurrentTicket();
      loadWaitingTickets();
      const interval = setInterval(loadWaitingTickets, 5000);
      return () => clearInterval(interval);
    }
  }, [isConfigured, doctorName]);

  // Abre a tela de display do consultório em modo fullscreen quando possível
  const openDisplay = () => {
    const url = '/doctor-display?fs=1';
    let win = window.open(
      url,
      'doctorDisplayWindow',
      'fullscreen=yes,toolbar=0,location=0,menubar=0,status=0,resizable=1'
    );
    if (!win) win = window.open(url, '_blank');
    if (!win) {
      toast({
        title: 'Bloqueado pelo navegador',
        description: 'Permita pop-ups.',
        variant: 'destructive',
      });
      return;
    }
    try {
      win.focus();
    } catch {}
  };

  // Carrega a fila de senhas aguardando para o médico usando edge function
  const loadWaitingTickets = async () => {
    if (!doctorId) return; // Aguarda carregar id do médico

    const { data, error } = await supabase.functions.invoke(
      'doctor-queue-preview',
      { body: { doctor_id: doctorId, doctor_name: doctorName } }
    );

    if (error) {
      console.error('doctor-queue-preview error:', error);
    }

    if (error) {
      toast({
        title: 'Erro ao carregar senhas',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    const items = (data as any)?.items as any[] | undefined;
    if (items && Array.isArray(items)) {
      setTickets(items as DocTicket[]);
      setWaitPage((prev) => {
        const maxPage = Math.max(
          0,
          Math.floor(Math.max(0, (items.length - 1) / PAGE_SIZE))
        );
        return Math.min(prev, maxPage);
      });
    } else {
      setTickets([]);
    }
  };

  // Síntese de voz: anuncia paciente, médico e consultório
  const speakDoctorCall = (t: DocTicket) => {
    try {
      const name = t.patient_name || t.display_number;
      const text = `Paciente ${name}, compareça ao consultório ${consultorio} do Doutor ${doctorName}`;
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'pt-BR';
      utter.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch {}
  };

  // Chama próxima senha usando edge function com lógica N,N,P
  const callNextTicket = async () => {
    const { data, error } = await supabase.functions.invoke(
      'doctor-call-next',
      {
        body: {
          doctor_id: doctorId,
          doctor_name: doctorName,
          counter: consultorio,
        },
      }
    );

    if (error) {
      toast({
        title: 'Erro ao chamar senha',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    const nextTicket = (data as any)?.next as DocTicket | null;
    if (!nextTicket) {
      toast({
        title: 'Nenhuma senha disponível',
        description: 'Não há senhas aguardando no momento.',
      });
      return;
    }

    const newCallCount = callCount + 1;
    setCallCount(newCallCount);
    localStorage.setItem('doctorCallCount', newCallCount.toString());

    setCurrentTicket(nextTicket);
    localStorage.setItem('currentDoctorTicketId', nextTicket.id);
    speakDoctorCall(nextTicket);

    toast({
      title: 'Senha chamada',
      description: `Senha ${nextTicket.display_number} foi chamada pelo médico!`,
    });
    loadWaitingTickets();
  };

  const repeatCall = async () => {
    if (!currentTicket) return;

    // Atualizar o called_at para disparar o realtime no Display
    const { error } = await supabase
      .from('doctor_tickets')
      .update({
        called_at: new Date().toISOString(),
      })
      .eq('id', currentTicket.id);

    if (error) {
      toast({
        title: 'Erro ao repetir chamada',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    speakDoctorCall(currentTicket);
    toast({
      title: 'Chamada repetida',
      description: `Senha ${currentTicket.display_number} chamada novamente!`,
    });
  };

  // Finaliza atendimento da senha atual e limpa estado/localStorage
  const finishService = async () => {
    if (!currentTicket) return;

    const now = new Date().toISOString();

    const { error } = await supabase
      .from('doctor_tickets')
      .update({
        status: 'served',
        served_at: now,
        finished_at: now,
        in_service: false,
      })
      .eq('id', currentTicket.id);

    if (error) {
      toast({
        title: 'Erro ao finalizar',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Consulta finalizada',
      description: `Senha ${currentTicket.display_number} foi atendida.`,
    });
    setCurrentTicket(null);
    localStorage.removeItem('currentDoctorTicketId');
    loadWaitingTickets();
  };

  // Faz logout e retorna para a tela de autenticação unificada
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className='h-screen overflow-hidden bg-gradient-to-br from-background to-muted p-4 md:p-6'>
      <div className='mx-auto max-w-6xl'>
        <div className='mb-4 flex items-center justify-between'>
          {(isAdmin || isSuperAdmin) && (
            <Button variant='outline' onClick={() => navigate('/dashboard')}>
              <Home className='mr-2 h-4 w-4' />
              Dashboard
            </Button>
          )}
          <div
            className={`flex items-center gap-4 ${
              !isAdmin && !isSuperAdmin ? 'ml-auto' : ''
            }`}
          >
            <Button variant='outline' onClick={openDisplay}>
              <Monitor className='mr-2 h-4 w-4' /> Abrir Display
            </Button>
            <div className='text-right'>
              <p className='font-semibold text-foreground'>{doctorName}</p>
              <p className='text-sm text-muted-foreground'>{consultorio}</p>
            </div>
            <Button variant='ghost' onClick={handleLogout}>
              <LogOut className='mr-2 h-4 w-4' /> Sair
            </Button>
          </div>
        </div>

        <div className='grid gap-4 lg:grid-cols-3'>
          <Card className='lg:col-span-2 p-6 shadow-medium'>
            <h2 className='mb-6 text-2xl font-bold text-foreground'>
              Senha Atual
            </h2>
            {currentTicket ? (
              <div className='space-y-6'>
                <div className='rounded-lg bg-gradient-primary p-6 text-center text-white shadow-large'>
                  <p className='mb-2 text-xl font-semibold'>Atendendo</p>
                  <p className='text-4xl font-bold'>
                    {currentTicket.patient_name || currentTicket.display_number}
                  </p>
                </div>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <Button
                    size='lg'
                    variant='outline'
                    onClick={repeatCall}
                    className='w-full'
                  >
                    <Repeat className='mr-2 h-5 w-5' /> Repetir Chamada
                  </Button>
                  <Button
                    size='lg'
                    onClick={finishService}
                    className='w-full bg-gradient-success'
                  >
                    <CheckCircle className='mr-2 h-5 w-5' /> Finalizar
                    Atendimento
                  </Button>
                </div>
              </div>
            ) : restoringCurrent ? (
              <div className='py-8 text-center'>
                <Loader2 className='h-8 w-8 animate-spin mx-auto text-primary' />
                <p className='mt-4 text-muted-foreground'>Carregando...</p>
              </div>
            ) : (
              <div className='py-8 text-center'>
                <p className='mb-6 text-xl text-muted-foreground'>
                  Nenhuma senha em atendimento
                </p>
                <Button
                  size='lg'
                  onClick={callNextTicket}
                  className='bg-gradient-primary'
                  disabled={tickets.length === 0}
                >
                  <Phone className='mr-2 h-5 w-5' /> Chamar Próxima Senha
                </Button>
              </div>
            )}
          </Card>

          <Card className='p-5 shadow-medium'>
            <h2 className='mb-4 text-xl font-bold text-foreground'>
              Fila de Espera
            </h2>
            <div className='mb-3 text-center'>
              <p className='text-4xl font-bold text-primary'>
                {tickets.length}
              </p>
              <p className='text-sm text-muted-foreground'>senhas aguardando</p>
            </div>
            <div className='space-y-2'>
              {tickets
                .slice(waitPage * PAGE_SIZE, (waitPage + 1) * PAGE_SIZE)
                .map((ticket, index) => (
                  <div
                    key={ticket.id}
                    className='flex items-center justify-between rounded-lg bg-muted p-3'
                  >
                    <div className='flex items-center gap-3'>
                      <span className='flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground'>
                        {index + 1 + waitPage * PAGE_SIZE}
                      </span>
                      <span className='font-semibold text-foreground'>
                        {ticket.display_number}
                      </span>
                    </div>
                    {ticket.priority !== 'normal' && (
                      <Badge variant='secondary'>Preferencial</Badge>
                    )}
                  </div>
                ))}
            </div>
            <div className='mt-3 flex justify-between'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setWaitPage((p) => Math.max(0, p - 1))}
                disabled={waitPage === 0}
              >
                Anterior
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() =>
                  setWaitPage((p) => {
                    const maxPage = Math.max(
                      0,
                      Math.floor(Math.max(0, tickets.length - 1) / PAGE_SIZE)
                    );
                    return Math.min(maxPage, p + 1);
                  })
                }
                disabled={(waitPage + 1) * PAGE_SIZE >= tickets.length}
              >
                Próximas
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
export default DoctorOperator;
