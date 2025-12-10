import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Volume2 } from 'lucide-react';
import { initializeAudioContext } from '@/lib/utils';

// Modelo da última/recente senha exibida no painel
interface CurrentTicket {
  id: string;
  display_number: string;
  queue_code: string;
  counter: string;
  operator_name: string;
}

// Estatísticas de fila para o cabeçalho lateral
interface WaitingStats {
  total: number;
  byQueue: Record<string, number>;
}

// Branding da empresa para exibição no painel
interface CompanySettings {
  logo_url: string | null;
  company_name: string;
}

// Slides de propaganda (imagem/vídeo) com duração e transição
interface Slide {
  id: string;
  title: string;
  image_url: string;
  duration_seconds: number;
  media_type: 'image' | 'video';
  transition_type: 'fade' | 'slide' | 'zoom' | 'none';
}

const Display = () => {
  const [currentTicket, setCurrentTicket] = useState<CurrentTicket | null>(
    null
  );
  const [recentTickets, setRecentTickets] = useState<CurrentTicket[]>([]);
  const [waitingStats, setWaitingStats] = useState<WaitingStats>({
    total: 0,
    byQueue: {},
  });
  const [blink, setBlink] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [companySettings, setCompanySettings] =
    useState<CompanySettings | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Inicialização: carrega dados, ativa áudio, configura fullscreen e polling
  useEffect(() => {
    loadCurrentTicket();
    loadWaitingStats();
    loadCompanySettings();
    loadSlides();
    setupRealtime();

    setAudioEnabled(true);
    initializeAudioContext(); // Permite áudio automático em Fully Kiosk

    let fullscreenTimer: number | undefined;
    const autoFs =
      new URLSearchParams(window.location.search).get('fs') === '1';
    if (autoFs) {
      enterFullscreen();
      const tryFs = () => enterFullscreen();
      window.addEventListener('focus', tryFs);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') enterFullscreen();
      });
      fullscreenTimer = window.setTimeout(() => enterFullscreen(), 500);
    } else {
      fullscreenTimer = window.setTimeout(() => enterFullscreen(), 2000);
    }

    const interval = setInterval(() => {
      loadWaitingStats();
    }, 5000);

    return () => {
      clearInterval(interval);
      if (fullscreenTimer) clearTimeout(fullscreenTimer);
      window.removeEventListener('focus', () => enterFullscreen());
    };
  }, []);

  // Rotação automática de slides com transição
  // Rotação automática dos slides com transição
  useEffect(() => {
    if (slides.length === 0) return;

    const currentSlide = slides[currentSlideIndex];
    const duration = (currentSlide?.duration_seconds || 10) * 1000;

    const timer = setTimeout(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
        setIsTransitioning(false);
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [slides, currentSlideIndex]);

  // Retorna início do dia atual em formato ISO
  const getTodayStart = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString();
  };

  // Busca última senha chamada e últimas atendidas (apenas do dia de hoje)
  const loadCurrentTicket = async () => {
    const todayStart = getTodayStart();

    const { data } = await supabase
      .from('tickets')
      .select('id, display_number, prefix, counter, operator_name')
      .eq('status', 'called')
      .gte('created_at', todayStart)
      .order('called_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setCurrentTicket({
        id: data.id,
        display_number: data.display_number,
        queue_code: data.prefix || '',
        counter: data.counter || 'Guichê',
        operator_name: data.operator_name || '',
      });
    }

    // Carregar as últimas 5 senhas chamadas (apenas do dia de hoje)
    const { data: recentData } = await supabase
      .from('tickets')
      .select('id, display_number, prefix, counter, operator_name')
      .eq('status', 'served')
      .gte('created_at', todayStart)
      .not('counter', 'is', null)
      .order('served_at', { ascending: false })
      .limit(5);

    if (recentData) {
      setRecentTickets(
        recentData.map((ticket) => ({
          id: ticket.id,
          display_number: ticket.display_number,
          queue_code: ticket.prefix || '',
          counter: ticket.counter || 'Guichê',
          operator_name: ticket.operator_name || '',
        }))
      );
    }
  };

  // Agrega quantidade de senhas aguardando por fila (apenas do dia de hoje)
  const loadWaitingStats = async () => {
    const todayStart = getTodayStart();

    const { data } = await supabase
      .from('tickets')
      .select('prefix')
      .eq('status', 'waiting')
      .gte('created_at', todayStart);

    if (data) {
      const byQueue: Record<string, number> = {};
      data.forEach((ticket) => {
        const queue = ticket.prefix || 'OUTROS';
        byQueue[queue] = (byQueue[queue] || 0) + 1;
      });

      setWaitingStats({
        total: data.length,
        byQueue,
      });
    }
  };

  const loadCompanySettings = async () => {
    const { data } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .single();

    if (data) {
      setCompanySettings(data);
    }
  };

  // Carrega slides ativos ordenados
  const loadSlides = async () => {
    const { data } = await supabase
      .from('propaganda_slides')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (data && data.length > 0) {
      setSlides(data as Slide[]);
    }
  };

  // Síntese de voz para anunciar senha e guichê
  const speakTicket = (ticket: CurrentTicket) => {
    // Cancelar qualquer fala anterior
    window.speechSynthesis.cancel();

    setTimeout(() => {
      const ticketNumber = ticket.display_number.replace(/^[A-Z]+-/, '');
      const text = `Senha ${ticketNumber}, por favor, dirija-se ao guichê ${ticket.counter}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onerror = (event) => {
        console.error('Erro na síntese de voz:', event);
        // Se falhar, tentar ativar áudio
      };

      window.speechSynthesis.speak(utterance);
    }, 300);
  };

  // Inscrição em atualizações de tickets (called/served) para atualizar painel e voz
  const setupRealtime = () => {
    const channelCalled = supabase
      .channel('tickets-display-called')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: 'status=eq.called',
        },
        (payload) => {
          const newTicket = payload.new as any;
          const ticket: CurrentTicket = {
            id: newTicket.id,
            display_number: newTicket.display_number,
            queue_code: newTicket.prefix || '',
            counter: newTicket.counter || 'Guichê',
            operator_name: newTicket.operator_name || '',
          };

          setCurrentTicket(ticket);
          setBlink(true);
          setTimeout(() => setBlink(false), 1000);
          speakTicket(ticket);
        }
      )
      .subscribe();

    const channelServed = supabase
      .channel('tickets-display-served')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: 'status=eq.served',
        },
        (payload) => {
          const t = payload.new as any;
          const servedTicket: CurrentTicket = {
            id: t.id,
            display_number: t.display_number,
            queue_code: t.prefix || '',
            counter: t.counter || 'Guichê',
            operator_name: t.operator_name || '',
          };
          setRecentTickets((prev) =>
            [
              servedTicket,
              ...prev.filter((p) => p.id !== servedTicket.id),
            ].slice(0, 5)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelCalled);
      supabase.removeChannel(channelServed);
    };
  };

  const enableAudio = () => {
    setAudioEnabled(true);
    // Testar a síntese de voz
    const utterance = new SpeechSynthesisUtterance('Sistema de áudio ativado');
    utterance.lang = 'pt-BR';
    window.speechSynthesis.speak(utterance);
  };

  const playNotificationSound = () => {
    if (!currentTicket) return;
    speakTicket(currentTicket);
  };

  const enterFullscreen = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (error) {
      // Erro ao entrar em fullscreen
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen && document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      // Erro ao sair do fullscreen
    }
  };

  const toggleFullscreen = () => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  };

  const getTransitionClass = (slide: Slide) => {
    if (isTransitioning) {
      switch (slide.transition_type) {
        case 'fade':
          return 'opacity-0';
        case 'slide':
          return 'translate-x-full';
        case 'zoom':
          return 'scale-0';
        default:
          return '';
      }
    }
    return 'opacity-100 translate-x-0 scale-100';
  };

  return (
    <div className='flex h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'>
      {/* Lado Esquerdo - Últimas Chamadas e Logo */}
      <div className='w-72 bg-gradient-to-b from-slate-900/80 to-slate-800/80 backdrop-blur-xl border-r border-slate-700/50 flex flex-col shadow-2xl overflow-y-auto'>
        {/* Últimas Chamadas */}
        <div className='flex-1 px-4 pb-4 pt-4'>
          <div className='mb-4'>
            <h2 className='text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300'>
              Últimas Chamadas
            </h2>
            <div className='h-0.5 w-16 bg-gradient-to-r from-primary via-primary/50 to-transparent rounded-full mt-1'></div>
          </div>

          <div className='space-y-2'>
            {recentTickets.length > 0 ? (
              recentTickets.map((ticket, index) => (
                <div
                  key={ticket.id}
                  className='group relative rounded-xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-4 border border-slate-700/40 backdrop-blur-sm shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 animate-fade-in'
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className='absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity'></div>
                  <div className='relative flex items-center justify-between'>
                    <div className='flex flex-col gap-0.5'>
                      <span className='text-[10px] text-slate-400 font-medium uppercase tracking-wider'>
                        Senha
                      </span>
                      <div className='text-3xl font-black text-white'>
                        {ticket.display_number.replace(/^[A-Z]+-/, '')}
                      </div>
                    </div>
                    <div className='flex flex-col items-end gap-0.5'>
                      <span className='text-[10px] text-slate-400 font-medium uppercase tracking-wider'>
                        Guichê
                      </span>
                      <div className='px-3 py-1 bg-gradient-to-br from-primary/30 to-primary/10 rounded-lg border border-primary/40 backdrop-blur-sm'>
                        <div className='text-xl font-black text-primary'>
                          {ticket.counter}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className='text-center text-slate-400 text-sm bg-slate-800/30 rounded-xl p-6 border border-slate-700/30 backdrop-blur-sm'>
                <div className='w-12 h-12 mx-auto mb-3 bg-slate-700/30 rounded-full flex items-center justify-center'>
                  <Volume2 className='w-6 h-6 text-slate-500' />
                </div>
                <p className='text-slate-300 font-medium text-sm'>
                  Aguardando chamadas
                </p>
                <p className='text-[10px] text-slate-500 mt-1'>
                  As senhas aparecerão aqui
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Logo da Empresa */}
        <div className='px-4 pb-4'>
          <div className='rounded-xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-6 border border-slate-700/40 backdrop-blur-sm shadow-lg'>
            <div className='flex items-center justify-center'>
              {companySettings?.logo_url ? (
                <img
                  src={companySettings.logo_url}
                  alt={companySettings.company_name || 'Logo'}
                  className='max-h-32 max-w-full object-contain filter drop-shadow-xl'
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className='text-center text-slate-400 text-sm py-4'>
                  <p className='font-semibold'>Configure a Logo</p>
                  <p className='text-xs mt-1'>em company_settings</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Área Central - Header e Main */}
      <div className='flex-1 flex flex-col min-w-0'>
        {/* Header - Última Senha Chamada */}
        <div className='bg-gradient-to-b from-slate-900/50 to-transparent backdrop-blur-sm p-4'>
          <div
            className={`relative overflow-hidden rounded-2xl shadow-2xl transition-all duration-700 ${
              blink ? 'scale-[1.01] shadow-primary/50' : ''
            }`}
            style={{
              background:
                'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 60%, hsl(var(--primary)) 100%)',
            }}
          >
            {/* Efeito de brilho animado */}
            <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse'></div>

            <div className='relative p-6'>
              {currentTicket ? (
                <div className='flex items-center justify-between gap-8'>
                  {/* Lado Esquerdo - Ícone e Título */}
                  <div className='flex items-center gap-4 min-w-0'>
                    <div className='flex-shrink-0 p-3 bg-white/15 rounded-2xl backdrop-blur-md border-2 border-white/20 shadow-lg'>
                      <Volume2 className='h-8 w-8 text-white animate-pulse' />
                    </div>
                    <div className='flex flex-col justify-center min-w-0'>
                      <span className='text-white/80 text-lg font-bold tracking-wide uppercase'>
                        Senha Chamada
                      </span>
                      <div className='h-0.5 w-16 bg-white/30 rounded-full mt-1'></div>
                    </div>
                  </div>

                  {/* Centro - Número da Senha */}
                  <div className='flex items-center justify-center flex-1'>
                    <div className='text-center'>
                      <p className='text-white/70 text-lg mb-2 font-semibold uppercase tracking-wider'>
                        Atendimento
                      </p>
                      <div className='relative'>
                        <div className='absolute inset-0 bg-white/20 blur-2xl rounded-full'></div>
                        <div className='relative text-7xl font-black text-white tracking-tight leading-none drop-shadow-2xl'>
                          {currentTicket.display_number.replace(/^[A-Z]+-/, '')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Direita - Guichê */}
                  <div className='flex items-center'>
                    <div className='text-center bg-white/15 backdrop-blur-md rounded-2xl px-6 py-4 border-2 border-white/20 shadow-xl'>
                      <p className='text-white/80 text-sm mb-2 font-semibold uppercase tracking-wider'>
                        Guichê
                      </p>
                      <p className='text-5xl font-black text-white tracking-tight'>
                        {currentTicket.counter}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='flex items-center justify-center gap-4 py-4'>
                  <div className='p-3 bg-white/15 rounded-2xl backdrop-blur-md border-2 border-white/20'>
                    <Volume2 className='h-8 w-8 text-white/70' />
                  </div>
                  <div className='text-2xl font-bold text-white/80'>
                    Aguardando próxima chamada...
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main - Área de Propagandas */}
        <div className='flex-1 p-4 flex items-center justify-center min-h-0 relative'>
          {slides.length > 0 ? (
            <div className='w-full h-full relative rounded-3xl overflow-hidden shadow-2xl'>
              {slides[currentSlideIndex]?.media_type === 'video' ? (
                <video
                  key={slides[currentSlideIndex]?.id}
                  src={slides[currentSlideIndex]?.image_url}
                  className={`w-full h-full object-contain bg-slate-900 transition-all duration-300 ${getTransitionClass(
                    slides[currentSlideIndex]
                  )}`}
                  autoPlay
                  muted
                  loop
                  playsInline
                  onError={(e) => {
                    console.error('Erro ao carregar vídeo');
                  }}
                />
              ) : (
                <img
                  key={slides[currentSlideIndex]?.id}
                  src={slides[currentSlideIndex]?.image_url}
                  alt={slides[currentSlideIndex]?.title}
                  className={`w-full h-full object-contain bg-slate-900 transition-all duration-300 ${getTransitionClass(
                    slides[currentSlideIndex]
                  )}`}
                  onError={(e) => {
                    e.currentTarget.src =
                      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="%23333"/><text x="50%" y="50%" text-anchor="middle" fill="%23999">Erro ao carregar imagem</text></svg>';
                  }}
                />
              )}

              {/* Indicador de slides */}
              {slides.length > 1 && (
                <div className='absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 z-10'>
                  {slides.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        index === currentSlideIndex
                          ? 'w-8 bg-primary'
                          : 'w-2 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Botão Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className='absolute top-4 right-4 z-10 p-2 bg-slate-900/80 hover:bg-slate-800/80 rounded-lg border border-slate-700/50 backdrop-blur-sm transition-all duration-200 hover:scale-105'
                title={
                  isFullscreen ? 'Sair do Fullscreen' : 'Entrar em Fullscreen'
                }
              >
                <svg
                  className='w-6 h-6 text-white'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  {isFullscreen ? (
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M6 18L18 6M6 6l12 12'
                    />
                  ) : (
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4'
                    />
                  )}
                </svg>
              </button>
            </div>
          ) : (
            <div className='w-full h-full bg-gradient-to-br from-slate-800/20 to-slate-900/20 rounded-3xl border-2 border-dashed border-slate-700/30 flex items-center justify-center backdrop-blur-sm shadow-inner'>
              <div className='text-center p-12'>
                <div className='relative w-28 h-28 mx-auto mb-8'>
                  <div className='absolute inset-0 bg-primary/10 blur-xl rounded-full'></div>
                  <div className='relative w-28 h-28 bg-gradient-to-br from-slate-700/40 to-slate-800/40 rounded-3xl flex items-center justify-center border border-slate-600/30 backdrop-blur-sm'>
                    <svg
                      className='w-14 h-14 text-slate-400'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={1.5}
                        d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
                      />
                    </svg>
                  </div>
                </div>
                <p className='text-5xl text-transparent bg-clip-text bg-gradient-to-r from-slate-300 to-slate-400 mb-4 font-black'>
                  Área de Propagandas
                </p>
                <p className='text-xl text-slate-500 max-w-md mx-auto'>
                  Adicione slides em Admin → Configurações
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Display;
