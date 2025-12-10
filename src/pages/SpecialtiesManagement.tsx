import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import type { User } from '@supabase/supabase-js';
import { Plus, Edit, Trash2, ArrowLeft, Stethoscope, Home } from 'lucide-react';

interface MedicalSpecialty {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const SpecialtiesManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const {
    isAdmin,
    isVisitor,
    isSuperAdmin,
    loading: roleLoading,
  } = useUserRole(currentUser);
  const [specialties, setSpecialties] = useState<MedicalSpecialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSpecialty, setEditingSpecialty] =
    useState<MedicalSpecialty | null>(null);
  const [formData, setFormData] = useState({
    name: '',
  });

  useEffect(() => {
    checkAuth();
  }, []);

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

  useEffect(() => {
    if (currentUser && !roleLoading) {
      if (isVisitor) {
        toast({
          title: 'Acesso negado',
          description: 'Você não tem permissão para acessar esta página.',
          variant: 'destructive',
        });
        navigate('/dashboard');
        return;
      }
      loadSpecialties();
    }
  }, [currentUser, isVisitor, roleLoading]);

  const loadSpecialties = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('medical_specialties')
        .select('*')
        .order('name');

      if (error) throw error;

      setSpecialties(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar especialidades',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (specialty?: MedicalSpecialty) => {
    if (specialty) {
      setEditingSpecialty(specialty);
      setFormData({
        name: specialty.name,
      });
    } else {
      setEditingSpecialty(null);
      setFormData({
        name: '',
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingSpecialty(null);
    setFormData({
      name: '',
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome da especialidade é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingSpecialty) {
        const { error } = await supabase
          .from('medical_specialties')
          .update({
            name: formData.name,
          })
          .eq('id', editingSpecialty.id);

        if (error) throw error;

        toast({
          title: 'Especialidade atualizada',
          description: 'A especialidade foi atualizada com sucesso',
        });
      } else {
        const { error } = await supabase.from('medical_specialties').insert({
          name: formData.name,
        });

        if (error) throw error;

        toast({
          title: 'Especialidade criada',
          description: 'A especialidade foi criada com sucesso',
        });
      }

      loadSpecialties();
      closeDialog();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta especialidade?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('medical_specialties')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Especialidade excluída',
        description: 'A especialidade foi excluída com sucesso',
      });

      loadSpecialties();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (roleLoading || loading) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <p className='text-muted-foreground'>Carregando...</p>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-background p-8'>
      <div className='mx-auto max-w-6xl'>
        <div className='mb-8 flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Button
              variant='outline'
              size='icon'
              onClick={() => navigate('/admin')}
            >
              <ArrowLeft className='h-4 w-4' />
            </Button>
            {isSuperAdmin && (
              <Button variant='outline' onClick={() => navigate('/dashboard')}>
                <Home className='mr-2 h-4 w-4' />
                Dashboard
              </Button>
            )}
            <div>
              <h1 className='text-3xl font-bold text-foreground flex items-center gap-2'>
                <Stethoscope className='h-8 w-8' />
                Especialidades Médicas
              </h1>
              <p className='text-muted-foreground'>
                Gerencie as especialidades médicas disponíveis no sistema
              </p>
            </div>
          </div>
          <Button onClick={() => openDialog()}>
            <Plus className='mr-2 h-4 w-4' />
            Nova Especialidade
          </Button>
        </div>

        <Card className='p-6'>
          <div className='space-y-4'>
            {specialties.map((specialty) => (
              <div
                key={specialty.id}
                className='flex items-center justify-between rounded-lg bg-muted p-4'
              >
                <div className='flex-1'>
                  <h3 className='text-lg font-semibold text-foreground'>
                    {specialty.name}
                  </h3>
                </div>
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => openDialog(specialty)}
                  >
                    <Edit className='h-4 w-4' />
                  </Button>
                  <Button
                    size='sm'
                    onClick={() => handleDelete(specialty.id)}
                    className='bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700'
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            ))}
            {specialties.length === 0 && (
              <div className='text-center py-12'>
                <Stethoscope className='h-16 w-16 mx-auto text-muted-foreground mb-4' />
                <p className='text-muted-foreground text-lg font-medium'>
                  Nenhuma especialidade cadastrada
                </p>
                <p className='text-muted-foreground text-sm mt-2'>
                  Clique em "Nova Especialidade" para começar
                </p>
              </div>
            )}
          </div>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSpecialty
                  ? 'Editar Especialidade'
                  : 'Nova Especialidade'}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados da especialidade médica abaixo
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4'>
              <div>
                <Label htmlFor='name'>Nome da Especialidade *</Label>
                <Input
                  id='name'
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder='Ex: Cardiologia, Pediatria, Ortopedia'
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={closeDialog}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {editingSpecialty ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SpecialtiesManagement;
