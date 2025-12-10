import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { ArrowLeft, Download, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface OperatorStats {
  operator_name: string;
  total_tickets: number;
  normal_tickets: number;
  preferential_tickets: number;
  avg_service_time: number;
}

interface DoctorStats {
  doctor_id: string;
  doctor_name: string;
  specialty_name: string | null;
  total_tickets: number;
  normal_tickets: number;
  preferential_tickets: number;
  avg_service_time: number;
}

interface QueueStats {
  queue_code: string;
  total_tickets: number;
}

interface HourlyStats {
  hour: number;
  tickets: number;
}

// Relatórios e Analytics: acesso restrito a admin; exporta PDF/Excel e exibe gráficos
const Reports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [operatorStats, setOperatorStats] = useState<OperatorStats[]>([]);
  const [doctorStats, setDoctorStats] = useState<DoctorStats[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats[]>([]);
  const [hourlyStats, setHourlyStats] = useState<HourlyStats[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [totalServed, setTotalServed] = useState(0);
  const [avgWaitTime, setAvgWaitTime] = useState(0);
  const [avgServiceTime, setAvgServiceTime] = useState(0);

  // Verifica sessão inicial
  useEffect(() => {
    checkAuth();
  }, []);

  // Verifica se o usuário está autenticado e se é admin
  const checkAuth = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate('/auth');
        return;
      }

      setCurrentUser(session.user);

      // Busca as roles do usuário
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

      if (rolesError) {
        console.error('Erro ao buscar roles:', rolesError);
        toast({
          title: 'Erro',
          description: 'Erro ao verificar permissões',
          variant: 'destructive',
        });
        navigate('/dashboard');
        return;
      }

      const userRoles = rolesData?.map((r) => r.role) || [];
      const hasAdminRole = userRoles.includes('admin');

      if (!hasAdminRole) {
        toast({
          title: 'Acesso negado',
          description: 'Apenas administradores podem acessar relatórios.',
          variant: 'destructive',
        });
        navigate('/dashboard');
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    } catch (error) {
      console.error('Erro na autenticação:', error);
      navigate('/auth');
    }
  };

  // Carrega relatórios quando o usuário for validado
  useEffect(() => {
    if (!loading && isAdmin && currentUser) {
      loadReports();
    }
  }, [loading, isAdmin, currentUser, startDate, endDate]);

  // Agrega métricas por período: totais, tempos médios, por operador, fila e horário
  const loadReports = async () => {
    try {
      // Criar data de início e fim com formato correto
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T23:59:59.999');

      // Tickets totais e servidos
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (ticketsError) {
        console.error('Reports - Erro na query:', ticketsError);
        throw ticketsError;
      }

      const total = tickets?.length || 0;
      const served = tickets?.filter((t) => t.status === 'served').length || 0;

      setTotalTickets(total);
      setTotalServed(served);

      // Tempos médios
      const waitTimes =
        tickets
          ?.filter((t) => t.called_at)
          .map(
            (t) =>
              (new Date(t.called_at!).getTime() -
                new Date(t.created_at).getTime()) /
              1000
          ) || [];

      const serviceTimes =
        tickets
          ?.filter((t) => t.served_at && t.called_at)
          .map(
            (t) =>
              (new Date(t.served_at!).getTime() -
                new Date(t.called_at!).getTime()) /
              1000
          ) || [];

      setAvgWaitTime(
        waitTimes.length
          ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
          : 0
      );
      setAvgServiceTime(
        serviceTimes.length
          ? serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length
          : 0
      );

      // Stats por operador
      const operatorMap = new Map<
        string,
        {
          count: number;
          normal: number;
          preferential: number;
          totalTime: number;
        }
      >();
      tickets?.forEach((ticket) => {
        if (ticket.operator_name && ticket.served_at && ticket.called_at) {
          const time =
            (new Date(ticket.served_at).getTime() -
              new Date(ticket.called_at).getTime()) /
            1000;
          const current = operatorMap.get(ticket.operator_name) || {
            count: 0,
            normal: 0,
            preferential: 0,
            totalTime: 0,
          };

          const isPreferential =
            ticket.priority === 'priority' ||
            ticket.priority === 'preferential';

          operatorMap.set(ticket.operator_name, {
            count: current.count + 1,
            normal: current.normal + (isPreferential ? 0 : 1),
            preferential: current.preferential + (isPreferential ? 1 : 0),
            totalTime: current.totalTime + time,
          });
        }
      });

      const opStats = Array.from(operatorMap.entries()).map(([name, data]) => ({
        operator_name: name,
        total_tickets: data.count,
        normal_tickets: data.normal,
        preferential_tickets: data.preferential,
        avg_service_time: data.totalTime / data.count,
      }));

      setOperatorStats(opStats);

      // Stats por médico
      const { data: doctorTickets } = await supabase
        .from('doctor_tickets')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      // Buscar IDs únicos de médicos
      const doctorIds = Array.from(
        new Set(doctorTickets?.map((t: any) => t.doctor_id).filter(Boolean))
      );

      // Buscar perfis dos médicos
      let profiles: any[] = [];
      if (doctorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, specialty_id')
          .in('id', doctorIds);
        profiles = profilesData || [];
      }

      // Buscar especialidades
      const specialtyIds = Array.from(
        new Set(profiles.map((p) => p.specialty_id).filter(Boolean))
      );

      let specialties: any[] = [];
      if (specialtyIds.length > 0) {
        const { data: specialtiesData } = await (supabase as any)
          .from('medical_specialties')
          .select('id, name')
          .in('id', specialtyIds);
        specialties = specialtiesData || [];
      }

      // Criar mapa de especialidades
      const specialtiesMap = new Map();
      if (specialties) {
        specialties.forEach((s: any) => {
          specialtiesMap.set(s.id, s.name);
        });
      }

      // Criar mapa de profiles
      const profilesMap = new Map();
      profiles?.forEach((profile: any) => {
        profilesMap.set(profile.id, {
          full_name: profile.full_name,
          specialty_name:
            specialtiesMap.get(profile.specialty_id) || 'Sem especialidade',
        });
      });

      // Agrupar por médico
      const doctorMap = new Map<
        string,
        {
          count: number;
          normal: number;
          preferential: number;
          totalTime: number;
          name: string;
          specialty: string;
        }
      >();

      doctorTickets?.forEach((ticket: any) => {
        const doctorId = ticket.doctor_id;
        if (doctorId) {
          if (!doctorMap.has(doctorId)) {
            const profileData = profilesMap.get(doctorId);
            doctorMap.set(doctorId, {
              count: 0,
              normal: 0,
              preferential: 0,
              totalTime: 0,
              name: profileData?.full_name || ticket.doctor_name || 'Sem nome',
              specialty: profileData?.specialty_name || 'Sem especialidade',
            });
          }

          const stats = doctorMap.get(doctorId)!;
          stats.count += 1;

          const isPreferential =
            ticket.priority === 'priority' ||
            ticket.priority === 'preferential';
          stats.normal += isPreferential ? 0 : 1;
          stats.preferential += isPreferential ? 1 : 0;

          // Calcular tempo de atendimento
          if (ticket.served_at && ticket.called_at) {
            const time =
              (new Date(ticket.served_at).getTime() -
                new Date(ticket.called_at).getTime()) /
              1000;
            stats.totalTime += time;
          }
        }
      });

      const docStats = Array.from(doctorMap.entries()).map(
        ([doctor_id, data]) => ({
          doctor_id,
          doctor_name: data.name,
          specialty_name: data.specialty,
          total_tickets: data.count,
          normal_tickets: data.normal,
          preferential_tickets: data.preferential,
          avg_service_time: data.count > 0 ? data.totalTime / data.count : 0,
        })
      );

      setDoctorStats(docStats);

      // Stats por fila
      const { data: queues } = await supabase.from('queues').select('*');
      const queueMap = new Map<string, number>();

      tickets?.forEach((ticket) => {
        const queue = queues?.find((q) => q.id === ticket.queue_id);
        if (queue) {
          queueMap.set(queue.code, (queueMap.get(queue.code) || 0) + 1);
        }
      });

      const qStats = Array.from(queueMap.entries()).map(([code, count]) => ({
        queue_code: code,
        total_tickets: count,
      }));

      setQueueStats(qStats);

      // Stats por hora
      const hourMap = new Map<number, number>();
      tickets?.forEach((ticket) => {
        const hour = new Date(ticket.created_at).getHours();
        hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
      });

      const hStats = Array.from(hourMap.entries())
        .map(([hour, tickets]) => ({ hour, tickets }))
        .sort((a, b) => a.hour - b.hour);

      setHourlyStats(hStats);
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar relatórios',
        variant: 'destructive',
      });
    }
  };

  // Exporta resumo e tabelas em PDF (jsPDF + autoTable)
  const exportToPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Relatório de Atendimento', 14, 20);

    doc.setFontSize(11);
    doc.text(`Período: ${startDate} a ${endDate}`, 14, 30);

    doc.setFontSize(12);
    doc.text('Resumo Geral', 14, 40);

    autoTable(doc, {
      startY: 45,
      head: [['Métrica', 'Valor']],
      body: [
        ['Total de Senhas', totalTickets.toString()],
        ['Senhas Atendidas', totalServed.toString()],
        ['Tempo Médio de Espera', `${(avgWaitTime / 60).toFixed(1)} min`],
        [
          'Tempo Médio de Atendimento',
          `${(avgServiceTime / 60).toFixed(1)} min`,
        ],
      ],
    });

    if (operatorStats.length > 0) {
      doc.text(
        'Desempenho por Operador',
        14,
        (doc as any).lastAutoTable.finalY + 10
      );
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 15,
        head: [
          [
            'Operador',
            'Total',
            'Normais',
            'Preferenciais',
            'Tempo Médio (min)',
          ],
        ],
        body: operatorStats.map((op) => [
          op.operator_name,
          op.total_tickets.toString(),
          op.normal_tickets.toString(),
          op.preferential_tickets.toString(),
          (op.avg_service_time / 60).toFixed(1),
        ]),
      });
    }

    if (doctorStats.length > 0) {
      doc.text(
        'Desempenho por Médico',
        14,
        (doc as any).lastAutoTable.finalY + 10
      );
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 15,
        head: [
          [
            'Médico',
            'Especialidade',
            'Total',
            'Normais',
            'Preferenciais',
            'Tempo Médio (min)',
          ],
        ],
        body: doctorStats.map((doc) => [
          doc.doctor_name,
          doc.specialty_name || 'Sem especialidade',
          doc.total_tickets.toString(),
          doc.normal_tickets.toString(),
          doc.preferential_tickets.toString(),
          doc.avg_service_time > 0
            ? (doc.avg_service_time / 60).toFixed(1)
            : '-',
        ]),
      });
    }

    if (queueStats.length > 0) {
      doc.text(
        'Atendimentos por Fila',
        14,
        (doc as any).lastAutoTable.finalY + 10
      );
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 15,
        head: [['Fila', 'Total de Senhas']],
        body: queueStats.map((q) => [q.queue_code, q.total_tickets.toString()]),
      });
    }

    doc.save(`relatorio_${startDate}_${endDate}.pdf`);

    toast({
      title: 'Sucesso',
      description: 'Relatório PDF exportado com sucesso',
    });
  };

  // Exporta planilhas Excel (XLSX) com resumo, operadores, filas e horários
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Resumo geral
    const summaryData = [
      ['Métrica', 'Valor'],
      ['Total de Senhas', totalTickets],
      ['Senhas Atendidas', totalServed],
      ['Tempo Médio de Espera (min)', (avgWaitTime / 60).toFixed(1)],
      ['Tempo Médio de Atendimento (min)', (avgServiceTime / 60).toFixed(1)],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumo');

    // Operadores
    if (operatorStats.length > 0) {
      const operatorData = [
        ['Operador', 'Total', 'Normais', 'Preferenciais', 'Tempo Médio (min)'],
        ...operatorStats.map((op) => [
          op.operator_name,
          op.total_tickets,
          op.normal_tickets,
          op.preferential_tickets,
          (op.avg_service_time / 60).toFixed(1),
        ]),
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(operatorData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Operadores');
    }

    // Médicos
    if (doctorStats.length > 0) {
      const doctorData = [
        [
          'Médico',
          'Especialidade',
          'Total',
          'Normais',
          'Preferenciais',
          'Tempo Médio (min)',
        ],
        ...doctorStats.map((doc) => [
          doc.doctor_name,
          doc.specialty_name || 'Sem especialidade',
          doc.total_tickets,
          doc.normal_tickets,
          doc.preferential_tickets,
          doc.avg_service_time > 0
            ? (doc.avg_service_time / 60).toFixed(1)
            : '-',
        ]),
      ];
      const ws2b = XLSX.utils.aoa_to_sheet(doctorData);
      XLSX.utils.book_append_sheet(wb, ws2b, 'Médicos');
    }

    // Filas
    if (queueStats.length > 0) {
      const queueData = [
        ['Fila', 'Total de Senhas'],
        ...queueStats.map((q) => [q.queue_code, q.total_tickets]),
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(queueData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Filas');
    }

    // Horários
    if (hourlyStats.length > 0) {
      const hourlyData = [
        ['Hora', 'Senhas Geradas'],
        ...hourlyStats.map((h) => [`${h.hour}:00`, h.tickets]),
      ];
      const ws4 = XLSX.utils.aoa_to_sheet(hourlyData);
      XLSX.utils.book_append_sheet(wb, ws4, 'Por Horário');
    }

    XLSX.writeFile(wb, `relatorio_${startDate}_${endDate}.xlsx`);

    toast({
      title: 'Sucesso',
      description: 'Relatório Excel exportado com sucesso',
    });
  };

  const COLORS = [
    '#3b82f6', // Azul
    '#10b981', // Verde
    '#f59e0b', // Laranja
    '#8b5cf6', // Roxo
    '#ef4444', // Vermelho
    '#06b6d4', // Ciano
    '#ec4899', // Rosa
    '#14b8a6', // Teal
  ];

  if (loading) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <p className='text-foreground'>Carregando...</p>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-background p-6'>
      <div className='max-w-7xl mx-auto space-y-6'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Button variant='ghost' onClick={() => navigate('/admin')}>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Voltar
            </Button>
            <h1 className='text-3xl font-bold text-foreground'>
              Relatórios e Analytics
            </h1>
          </div>
          <div className='flex gap-2'>
            <Button onClick={exportToPDF} variant='outline'>
              <Download className='mr-2 h-4 w-4' />
              PDF
            </Button>
            <Button onClick={exportToExcel} variant='outline'>
              <Download className='mr-2 h-4 w-4' />
              Excel
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Calendar className='h-5 w-5' />
              Período do Relatório
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='startDate'>Data Inicial</Label>
                <Input
                  id='startDate'
                  type='date'
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='endDate'>Data Final</Label>
                <Input
                  id='endDate'
                  type='date'
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total de Senhas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-foreground'>
                {totalTickets}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium'>
                Senhas Atendidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-foreground'>
                {totalServed}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium'>
                Tempo Médio de Espera
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-foreground'>
                {(avgWaitTime / 60).toFixed(1)} min
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium'>
                Tempo Médio de Atendimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-foreground'>
                {(avgServiceTime / 60).toFixed(1)} min
              </div>
            </CardContent>
          </Card>
        </div>

        {operatorStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Desempenho por Operador</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width='100%' height={300}>
                <BarChart data={operatorStats}>
                  <CartesianGrid
                    strokeDasharray='3 3'
                    stroke='hsl(var(--border))'
                  />
                  <XAxis
                    dataKey='operator_name'
                    stroke='hsl(var(--foreground))'
                  />
                  <YAxis stroke='hsl(var(--foreground))' />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Legend />
                  <Bar dataKey='normal_tickets' name='Normal' fill='#3b82f6' />
                  <Bar
                    dataKey='preferential_tickets'
                    name='Preferencial'
                    fill='#10b981'
                  />
                </BarChart>
              </ResponsiveContainer>

              {/* Tabela de operadores */}
              <div className='mt-6 overflow-x-auto'>
                <table className='w-full'>
                  <thead>
                    <tr className='border-b'>
                      <th className='text-left p-2'>Operador</th>
                      <th className='text-right p-2'>Total</th>
                      <th className='text-right p-2'>Normais</th>
                      <th className='text-right p-2'>Preferenciais</th>
                      <th className='text-right p-2'>Tempo Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operatorStats.map((op, index) => (
                      <tr key={index} className='border-b hover:bg-muted/50'>
                        <td className='p-2'>{op.operator_name}</td>
                        <td className='text-right p-2'>{op.total_tickets}</td>
                        <td className='text-right p-2'>{op.normal_tickets}</td>
                        <td className='text-right p-2'>
                          {op.preferential_tickets}
                        </td>
                        <td className='text-right p-2'>
                          {(op.avg_service_time / 60).toFixed(1)} min
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {doctorStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Desempenho por Médico</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width='100%' height={300}>
                <BarChart data={doctorStats}>
                  <CartesianGrid
                    strokeDasharray='3 3'
                    stroke='hsl(var(--border))'
                  />
                  <XAxis
                    dataKey='doctor_name'
                    stroke='hsl(var(--foreground))'
                  />
                  <YAxis stroke='hsl(var(--foreground))' />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Legend />
                  <Bar dataKey='normal_tickets' name='Normal' fill='#f59e0b' />
                  <Bar
                    dataKey='preferential_tickets'
                    name='Preferencial'
                    fill='#8b5cf6'
                  />
                </BarChart>
              </ResponsiveContainer>

              {/* Tabela de médicos */}
              <div className='mt-6 overflow-x-auto'>
                <table className='w-full'>
                  <thead>
                    <tr className='border-b'>
                      <th className='text-left p-2'>Médico</th>
                      <th className='text-left p-2'>Especialidade</th>
                      <th className='text-right p-2'>Total</th>
                      <th className='text-right p-2'>Normais</th>
                      <th className='text-right p-2'>Preferenciais</th>
                      <th className='text-right p-2'>Tempo Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctorStats.map((doctor, index) => (
                      <tr key={index} className='border-b hover:bg-muted/50'>
                        <td className='p-2'>{doctor.doctor_name}</td>
                        <td className='p-2'>{doctor.specialty_name}</td>
                        <td className='text-right p-2'>
                          {doctor.total_tickets}
                        </td>
                        <td className='text-right p-2'>
                          {doctor.normal_tickets}
                        </td>
                        <td className='text-right p-2'>
                          {doctor.preferential_tickets}
                        </td>
                        <td className='text-right p-2'>
                          {doctor.avg_service_time > 0
                            ? `${(doctor.avg_service_time / 60).toFixed(1)} min`
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          {queueStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Fila</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width='100%' height={300}>
                  <PieChart>
                    <Pie
                      data={queueStats}
                      dataKey='total_tickets'
                      nameKey='queue_code'
                      cx='50%'
                      cy='50%'
                      outerRadius={80}
                      label
                    >
                      {queueStats.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {hourlyStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Senhas por Horário</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width='100%' height={300}>
                  <LineChart data={hourlyStats}>
                    <CartesianGrid
                      strokeDasharray='3 3'
                      stroke='hsl(var(--border))'
                    />
                    <XAxis
                      dataKey='hour'
                      stroke='hsl(var(--foreground))'
                      tickFormatter={(hour) => `${hour}:00`}
                    />
                    <YAxis stroke='hsl(var(--foreground))' />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        color: 'hsl(var(--foreground))',
                      }}
                      labelFormatter={(hour) => `Hora: ${hour}:00`}
                    />
                    <Legend />
                    <Line
                      type='monotone'
                      dataKey='tickets'
                      name='Senhas Geradas'
                      stroke='#10b981'
                      strokeWidth={3}
                      dot={{ fill: '#10b981', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {operatorStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tempo Médio de Atendimento por Operador</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width='100%' height={300}>
                <BarChart data={operatorStats}>
                  <CartesianGrid
                    strokeDasharray='3 3'
                    stroke='hsl(var(--border))'
                  />
                  <XAxis
                    dataKey='operator_name'
                    stroke='hsl(var(--foreground))'
                  />
                  <YAxis stroke='hsl(var(--foreground))' />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      color: 'hsl(var(--foreground))',
                    }}
                    formatter={(value: number) =>
                      `${(value / 60).toFixed(1)} min`
                    }
                  />
                  <Legend />
                  <Bar
                    dataKey='avg_service_time'
                    name='Tempo Médio (segundos)'
                    fill='#f59e0b'
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Reports;
