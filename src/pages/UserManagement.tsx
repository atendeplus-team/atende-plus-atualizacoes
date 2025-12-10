import { useEffect, useState, useCallback } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Shield,
  UserCog,
  Eye,
  EyeOff,
  UserPlus,
  Users,
  Edit,
  Trash2,
  BarChart3,
  LogOut,
  Home,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserRole, type UserRole } from '@/hooks/useUserRole';
import type { User } from '@supabase/supabase-js';
import { createUserSchema } from '@/lib/validations';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  company: string;
  specialty_id?: string | null;
  specialty_name?: string | null;
  roles: UserRole[];
}

interface MedicalSpecialty {
  id: string;
  name: string;
}

// Administração de usuários: criação, edição e perfis (RBAC)
const UserManagement = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [specialties, setSpecialties] = useState<MedicalSpecialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserCompany, setNewUserCompany] = useState('');
  const [newUserSpecialtyId, setNewUserSpecialtyId] = useState('');
  // Perfil selecionado na criação do usuário (apenas um)
  const [newUserRole, setNewUserRole] = useState<UserRole | ''>('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editSpecialtyId, setEditSpecialtyId] = useState('');
  const [editRole, setEditRole] = useState<UserRole | ''>('');
  const [updatingUser, setUpdatingUser] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    isAdmin,
    isSuperAdmin,
    loading: roleLoading,
  } = useUserRole(currentUser);

  // Verifica sessão inicial
  useEffect(() => {
    checkAuth();
  }, []);

  // Armazena usuário autenticado; acesso protegido por rota e validação isAdmin
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

  // Carrega especialidades médicas
  const loadSpecialties = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('medical_specialties')
        .select('id, name')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setSpecialties(data || []);
    } catch (error) {
      console.error('Error loading specialties:', error);
      toast({
        title: 'Erro ao carregar especialidades',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: 'Logout realizado',
      description: 'Até logo!',
    });
    navigate('/auth');
  };

  // Carrega perfis e perfis de acesso combinando profiles e user_roles
  const loadUsers = useCallback(async () => {
    try {
      // Fetch all profiles with specialty info
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(
          `
          id, 
          email, 
          full_name, 
          company,
          specialty_id,
          medical_specialties:specialty_id(name)
        `
        )
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles =
        profiles?.map((profile: any) => ({
          ...profile,
          specialty_name: profile.medical_specialties?.name || null,
          roles:
            userRoles
              ?.filter((ur) => ur.user_id === profile.id)
              .map((ur) => ur.role as UserRole) || [],
        })) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Erro ao carregar usuários',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!currentUser) return;
    if (roleLoading) return;

    loadUsers();
    loadSpecialties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, roleLoading]);

  // Cria usuário via signUp e valida com Zod; apenas admin deve usar este fluxo
  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);

    try {
      // Validar dados com Zod
      const validation = createUserSchema.safeParse({
        email: newUserEmail,
        password: newUserPassword,
        fullName: newUserFullName,
        company: newUserCompany ? newUserCompany : undefined,
      });

      if (!validation.success) {
        const firstError = validation.error.issues[0];
        toast({
          title: 'Erro de validação',
          description: firstError.message,
          variant: 'destructive',
        });
        setCreatingUser(false);
        return;
      }

      const { data: validData } = validation;

      // Valida perfil obrigatório e requisitos de médico
      if (!newUserRole) {
        toast({
          title: 'Selecione um perfil',
          variant: 'destructive',
        });
        setCreatingUser(false);
        return;
      }
      if (newUserRole === 'doctor' && !newUserCompany.trim()) {
        toast({
          title: 'Consultório obrigatório para perfil Médico',
          variant: 'destructive',
        });
        setCreatingUser(false);
        return;
      }

      // Cria o usuário via API admin do Supabase
      const { data: createResp, error } = await supabase.functions.invoke(
        'admin-create-user',
        {
          body: {
            email: validData.email,
            password: validData.password,
            full_name: validData.fullName,
            company: validData.company || '',
            specialty_id:
              newUserRole === 'doctor' ? newUserSpecialtyId || null : null,
            roles: [newUserRole],
          },
        }
      );

      if (error) throw error;

      toast({
        title: 'Usuário criado com sucesso!',
        description: `${newUserFullName} foi adicionado ao sistema.`,
      });

      // Limpa o formulário
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserFullName('');
      setNewUserCompany('');
      setNewUserSpecialtyId('');
      setNewUserRole('');
      setShowCreateUser(false);

      // Recarrega a lista de usuários
      loadUsers();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar usuário',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCreatingUser(false);
    }
  };

  // Adiciona perfil ao usuário; RLS: somente admin pode inserir em user_roles
  const addRole = async (userId: string, role: UserRole) => {
    try {
      const { error } = await (supabase as any).from('user_roles').insert({
        user_id: userId,
        role,
        created_by: currentUser?.id,
      });

      if (error) throw error;

      toast({
        title: 'Perfil adicionado',
        description: `Perfil ${role} adicionado com sucesso.`,
      });

      loadUsers();
    } catch (error: any) {
      console.error('Error adding role:', error);
      toast({
        title: 'Erro ao adicionar perfil',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  // Remove perfil do usuário; RLS: somente admin pode deletar de user_roles
  const removeRole = async (userId: string, role: UserRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      toast({
        title: 'Perfil removido',
        description: `Perfil ${role} removido com sucesso.`,
      });

      loadUsers();
    } catch (error) {
      console.error('Error removing role:', error);
      toast({
        title: 'Erro ao remover perfil',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const openEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setEditFullName(user.full_name);
    setEditCompany(user.company);
    setEditSpecialtyId(user.specialty_id || '');
    setEditEmail(user.email);
    setEditRole(user.roles[0] || '');
  };

  // Atualiza dados em profiles; política RLS permite admin atualizar
  const updateUser = async () => {
    if (!editingUser) return;
    setUpdatingUser(true);

    if (!editRole) {
      toast({
        title: 'Selecione um perfil',
        variant: 'destructive',
      });
      setUpdatingUser(false);
      return;
    }

    if (editRole === 'doctor' && !editCompany.trim()) {
      toast({
        title: 'Consultório obrigatório para perfil Médico',
        variant: 'destructive',
      });
      setUpdatingUser(false);
      return;
    }

    try {
      // Atualizar dados do perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editFullName,
          company: editCompany,
          specialty_id: editRole === 'doctor' ? editSpecialtyId || null : null,
          email: editEmail,
        })
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      // Verificar se a role mudou antes de atualizar
      const { data: currentRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', editingUser.id);

      const currentRole = currentRoles?.[0]?.role;

      // Só atualizar roles se a role mudou
      if (currentRole !== editRole) {
        // Remover todos os perfis antigos
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', editingUser.id);

        if (deleteError) throw deleteError;

        // Adicionar o novo perfil
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({
            user_id: editingUser.id,
            role: editRole,
            created_by: currentUser?.id,
          });

        if (insertError) throw insertError;
      }

      toast({
        title: 'Usuário atualizado',
        description: 'Dados salvos com sucesso.',
      });
      setEditingUser(null);
      loadUsers();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar usuário',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingUser(false);
    }
  };

  // Exclui usuário: remove roles, perfil e do Auth; privilégios devem ser restritos a admin
  const deleteUser = async (userId: string) => {
    const confirmed = window.confirm(
      'Tem certeza que deseja excluir este usuário? Esta ação removerá o usuário completamente do sistema.'
    );
    if (!confirmed) return;
    try {
      // Call Edge Function to delete user from Auth, profiles and user_roles
      const { error } = await supabase.functions.invoke('admin-delete-user', {
        body: { user_id: userId },
      });

      if (error) throw error;

      toast({
        title: 'Usuário excluído',
        description: 'Usuário removido completamente do sistema.',
      });
      loadUsers();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir usuário',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield className='h-4 w-4' />;
      case 'operator':
        return <UserCog className='h-4 w-4' />;
      case 'visitor':
        return <Eye className='h-4 w-4' />;
      case 'doctor':
        return <Users className='h-4 w-4' />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/10 text-red-500';
      case 'operator':
        return 'bg-blue-500/10 text-blue-500';
      case 'visitor':
        return 'bg-gray-500/10 text-gray-500';
      case 'doctor':
        return 'bg-emerald-500/10 text-emerald-600';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'operator':
        return 'Operador';
      case 'visitor':
        return 'Toten';
      case 'doctor':
        return 'Médico';
    }
  };

  if (loading || roleLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!currentUser || !isAdmin) {
    return null;
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-background to-muted p-6'>
      <div className='max-w-6xl mx-auto space-y-6'>
        <div className='flex items-center justify-between'>
          <div className='flex gap-2'>
            <Button variant='outline' onClick={() => navigate('/admin')}>
              <BarChart3 className='mr-2 h-4 w-4' />
              Painel Administrativo
            </Button>
            {isSuperAdmin && (
              <Button variant='outline' onClick={() => navigate('/dashboard')}>
                <Home className='mr-2 h-4 w-4' />
                Dashboard
              </Button>
            )}
          </div>

          <div className='flex gap-2'>
            {!showCreateUser && (
              <Button onClick={() => setShowCreateUser(true)}>
                <UserPlus className='mr-2 h-4 w-4' />
                Criar Novo Usuário
              </Button>
            )}
            <Button onClick={handleLogout} variant='ghost'>
              <LogOut className='mr-2 h-4 w-4' />
              Sair
            </Button>
          </div>
        </div>

        {showCreateUser && (
          <Card>
            <CardHeader>
              <CardTitle>Criar Novo Usuário</CardTitle>
              <CardDescription>
                Adicione um novo usuário ao sistema e atribua suas permissões
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createUser} className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='role'>Perfil *</Label>
                  <Select
                    value={newUserRole}
                    onValueChange={(value) => {
                      setNewUserRole(value as UserRole);
                      if (value === 'visitor') setNewUserCompany('');
                    }}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Selecione o perfil do usuário' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='admin'>
                        <div className='flex items-center gap-2'>
                          <Shield className='h-4 w-4 text-red-500' />
                          Administrador
                        </div>
                      </SelectItem>
                      <SelectItem value='operator'>
                        <div className='flex items-center gap-2'>
                          <UserCog className='h-4 w-4 text-blue-500' />
                          Operador
                        </div>
                      </SelectItem>
                      <SelectItem value='visitor'>
                        <div className='flex items-center gap-2'>
                          <Users className='h-4 w-4' />
                          Toten
                        </div>
                      </SelectItem>
                      <SelectItem value='doctor'>
                        <div className='flex items-center gap-2'>
                          <Users className='h-4 w-4 text-emerald-600' />
                          Médico
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='fullName'>Nome Completo</Label>
                    <Input
                      id='fullName'
                      type='text'
                      value={newUserFullName}
                      onChange={(e) => setNewUserFullName(e.target.value)}
                      placeholder='João Silva'
                      required
                    />
                  </div>
                  {newUserRole !== 'visitor' && (
                    <div className='space-y-2'>
                      <Label htmlFor='company'>
                        {newUserRole === 'doctor' ? 'Consultório' : 'Guichê'}
                      </Label>
                      <Input
                        id='company'
                        type='text'
                        inputMode='numeric'
                        pattern='\d*'
                        value={newUserCompany}
                        onChange={(e) =>
                          setNewUserCompany(e.target.value.replace(/\D/g, ''))
                        }
                        placeholder={
                          newUserRole === 'doctor'
                            ? 'Número do consultório (obrigatório p/ médico)'
                            : 'Número do guichê (opcional)'
                        }
                      />
                    </div>
                  )}
                </div>
                {newUserRole === 'doctor' && (
                  <div className='space-y-2'>
                    <Label htmlFor='specialty'>Especialidade</Label>
                    <Select
                      value={newUserSpecialtyId}
                      onValueChange={setNewUserSpecialtyId}
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Selecione a especialidade' />
                      </SelectTrigger>
                      <SelectContent>
                        {specialties.map((specialty) => (
                          <SelectItem key={specialty.id} value={specialty.id}>
                            {specialty.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='email'>Email</Label>
                    <Input
                      id='email'
                      type='email'
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder='usuario@email.com'
                      required
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='password'>Senha</Label>
                    <div className='relative'>
                      <Input
                        id='password'
                        type={showCreatePassword ? 'text' : 'password'}
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder='Mínimo 6 caracteres'
                        required
                        minLength={6}
                      />
                      <button
                        type='button'
                        aria-label={
                          showCreatePassword ? 'Ocultar senha' : 'Mostrar senha'
                        }
                        className='absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground'
                        onClick={() => setShowCreatePassword((v) => !v)}
                      >
                        {showCreatePassword ? (
                          <EyeOff className='h-4 w-4' />
                        ) : (
                          <Eye className='h-4 w-4' />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <Button
                  type='submit'
                  disabled={creatingUser}
                  className='w-full'
                >
                  {creatingUser ? 'Criando...' : 'Criar Usuário'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className='space-y-6'>
          {/* Card SuperAdmin - só visível para superadmin */}
          {isSuperAdmin && (
            <Card>
              <CardHeader className='bg-purple-50 dark:bg-purple-950/20'>
                <div className='flex items-center gap-2'>
                  <Shield className='h-6 w-6 text-purple-500' />
                  <CardTitle className='text-xl'>SuperAdmin</CardTitle>
                </div>
                <CardDescription>
                  Acesso total ao sistema (apenas para desenvolvedores)
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-6'>
                <div className='space-y-4'>
                  {users
                    .filter((u) => u.roles.includes('superadmin'))
                    .map((user) => (
                      <Card
                        key={user.id}
                        className='p-4 border-purple-200 dark:border-purple-900'
                      >
                        <div className='flex items-start justify-between gap-4'>
                          <div className='flex-1'>
                            <h3 className='font-semibold text-lg'>
                              {user.full_name}
                            </h3>
                            <p className='text-sm text-muted-foreground'>
                              {user.email}
                            </p>
                            {user.company && (
                              <p className='text-xs text-muted-foreground mt-1'>
                                Guichê: {user.company}
                              </p>
                            )}
                          </div>

                          <TooltipProvider>
                            <div className='flex items-center gap-2'>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant='outline'
                                    size='icon'
                                    onClick={() => openEditUser(user)}
                                  >
                                    <Edit className='h-4 w-4' />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Editar usuário</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant='destructive'
                                    size='icon'
                                    onClick={() => deleteUser(user.id)}
                                  >
                                    <Trash2 className='h-4 w-4' />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Excluir usuário</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TooltipProvider>
                        </div>
                      </Card>
                    ))}

                  {users.filter((u) => u.roles.includes('superadmin'))
                    .length === 0 && (
                    <div className='text-center py-8 text-muted-foreground'>
                      Nenhum super administrador cadastrado
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Card Administradores */}
          <Card>
            <CardHeader className='bg-red-50 dark:bg-red-950/20'>
              <div className='flex items-center gap-2'>
                <Shield className='h-6 w-6 text-red-500' />
                <CardTitle className='text-xl'>Administradores</CardTitle>
              </div>
              <CardDescription>Acesso completo ao sistema</CardDescription>
            </CardHeader>
            <CardContent className='pt-6'>
              <div className='space-y-4'>
                {(() => {
                  const adminUsers = users.filter(
                    (u) =>
                      u.roles.includes('admin') &&
                      !u.roles.includes('superadmin')
                  );
                  return adminUsers.map((user) => (
                    <Card
                      key={user.id}
                      className='p-4 border-red-200 dark:border-red-900'
                    >
                      <div className='flex items-start justify-between gap-4'>
                        <div className='flex-1'>
                          <h3 className='font-semibold text-lg'>
                            {user.full_name}
                          </h3>
                          <p className='text-sm text-muted-foreground'>
                            {user.email}
                          </p>
                          {user.company && (
                            <p className='text-xs text-muted-foreground mt-1'>
                              Guichê: {user.company}
                            </p>
                          )}
                        </div>

                        <TooltipProvider>
                          <div className='flex items-center gap-2'>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant='outline'
                                  size='icon'
                                  onClick={() => openEditUser(user)}
                                >
                                  <Edit className='h-4 w-4' />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Editar usuário</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant='destructive'
                                  size='icon'
                                  onClick={() => deleteUser(user.id)}
                                >
                                  <Trash2 className='h-4 w-4' />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Excluir usuário</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </div>
                    </Card>
                  ));
                })()}

                {(() => {
                  const adminCount = users.filter(
                    (u) =>
                      u.roles.includes('admin') &&
                      !u.roles.includes('superadmin')
                  ).length;
                  return adminCount === 0 ? (
                    <div className='text-center py-8 text-muted-foreground'>
                      Nenhum administrador cadastrado
                    </div>
                  ) : null;
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Card Operadores */}
          <Card>
            <CardHeader className='bg-blue-50 dark:bg-blue-950/20'>
              <div className='flex items-center gap-2'>
                <UserCog className='h-6 w-6 text-blue-500' />
                <CardTitle className='text-xl'>Operadores</CardTitle>
              </div>
              <CardDescription>
                Atendentes que chamam e atendem senhas
              </CardDescription>
            </CardHeader>
            <CardContent className='pt-6'>
              <div className='space-y-4'>
                {users
                  .filter((u) => u.roles.includes('operator'))
                  .map((user) => (
                    <Card
                      key={user.id}
                      className='p-4 border-blue-200 dark:border-blue-900'
                    >
                      <div className='flex items-start justify-between gap-4'>
                        <div className='flex-1'>
                          <h3 className='font-semibold text-lg'>
                            {user.full_name}
                          </h3>
                          <p className='text-sm text-muted-foreground'>
                            {user.email}
                          </p>
                          {user.company && (
                            <p className='text-xs text-muted-foreground mt-1'>
                              Guichê: {user.company}
                            </p>
                          )}
                        </div>

                        <TooltipProvider>
                          <div className='flex items-center gap-2'>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant='outline'
                                  size='icon'
                                  onClick={() => openEditUser(user)}
                                >
                                  <Edit className='h-4 w-4' />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Editar usuário</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant='destructive'
                                  size='icon'
                                  onClick={() => deleteUser(user.id)}
                                >
                                  <Trash2 className='h-4 w-4' />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Excluir usuário</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </div>
                    </Card>
                  ))}

                {users.filter((u) => u.roles.includes('operator')).length ===
                  0 && (
                  <div className='text-center py-8 text-muted-foreground'>
                    Nenhum operador cadastrado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card Médicos */}
          <Card>
            <CardHeader className='bg-green-50 dark:bg-green-950/20'>
              <div className='flex items-center gap-2'>
                <Users className='h-6 w-6 text-green-500' />
                <CardTitle className='text-xl'>Médicos</CardTitle>
              </div>
              <CardDescription>Médicos que atendem pacientes</CardDescription>
            </CardHeader>
            <CardContent className='pt-6'>
              <div className='space-y-4'>
                {users
                  .filter((u) => u.roles.includes('doctor'))
                  .map((user) => (
                    <Card
                      key={user.id}
                      className='p-4 border-green-200 dark:border-green-900'
                    >
                      <div className='flex items-start justify-between gap-4'>
                        <div className='flex-1'>
                          <h3 className='font-semibold text-lg'>
                            {user.full_name}
                            {user.specialty_name && (
                              <span className='text-sm font-normal text-muted-foreground ml-2'>
                                - {user.specialty_name}
                              </span>
                            )}
                          </h3>
                          <p className='text-sm text-muted-foreground'>
                            {user.email}
                          </p>
                          {user.company && (
                            <p className='text-xs text-muted-foreground mt-1'>
                              Consultório: {user.company}
                            </p>
                          )}
                        </div>

                        <TooltipProvider>
                          <div className='flex items-center gap-2'>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant='outline'
                                  size='icon'
                                  onClick={() => openEditUser(user)}
                                >
                                  <Edit className='h-4 w-4' />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Editar usuário</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant='destructive'
                                  size='icon'
                                  onClick={() => deleteUser(user.id)}
                                >
                                  <Trash2 className='h-4 w-4' />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Excluir usuário</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </div>
                    </Card>
                  ))}

                {users.filter((u) => u.roles.includes('doctor')).length ===
                  0 && (
                  <div className='text-center py-8 text-muted-foreground'>
                    Nenhum médico cadastrado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card Totens */}
          <Card>
            <CardHeader className='bg-gray-50 dark:bg-gray-950/20'>
              <div className='flex items-center gap-2'>
                <Eye className='h-6 w-6 text-gray-500' />
                <CardTitle className='text-xl'>Totens</CardTitle>
              </div>
              <CardDescription>Apenas visualizam informações</CardDescription>
            </CardHeader>
            <CardContent className='pt-6'>
              <div className='space-y-4'>
                {users
                  .filter((u) => u.roles.includes('visitor'))
                  .map((user) => (
                    <Card
                      key={user.id}
                      className='p-4 border-gray-200 dark:border-gray-900'
                    >
                      <div className='flex items-start justify-between gap-4'>
                        <div className='flex-1'>
                          <h3 className='font-semibold text-lg'>
                            {user.full_name}
                          </h3>
                          <p className='text-sm text-muted-foreground'>
                            {user.email}
                          </p>
                          {user.company && (
                            <p className='text-xs text-muted-foreground mt-1'>
                              Localização: {user.company}
                            </p>
                          )}
                        </div>

                        <TooltipProvider>
                          <div className='flex items-center gap-2'>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant='outline'
                                  size='icon'
                                  onClick={() => openEditUser(user)}
                                >
                                  <Edit className='h-4 w-4' />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Editar usuário</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant='destructive'
                                  size='icon'
                                  onClick={() => deleteUser(user.id)}
                                >
                                  <Trash2 className='h-4 w-4' />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Excluir usuário</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </div>
                    </Card>
                  ))}

                {users.filter((u) => u.roles.includes('visitor')).length ===
                  0 && (
                  <div className='text-center py-8 text-muted-foreground'>
                    Nenhum toten cadastrado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card Usuários sem perfil */}
          {users.filter((u) => u.roles.length === 0).length > 0 && (
            <Card>
              <CardHeader className='bg-amber-50 dark:bg-amber-950/20'>
                <div className='flex items-center gap-2'>
                  <Users className='h-6 w-6 text-amber-500' />
                  <CardTitle className='text-xl'>Sem Perfil</CardTitle>
                </div>
                <CardDescription>
                  Usuários sem permissões atribuídas
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-6'>
                <div className='space-y-4'>
                  {users
                    .filter((u) => u.roles.length === 0)
                    .map((user) => (
                      <Card
                        key={user.id}
                        className='p-4 border-amber-200 dark:border-amber-900'
                      >
                        <div className='flex items-start justify-between gap-4'>
                          <div className='flex-1'>
                            <h3 className='font-semibold text-lg'>
                              {user.full_name}
                            </h3>
                            <p className='text-sm text-muted-foreground'>
                              {user.email}
                            </p>
                            {user.company && (
                              <p className='text-xs text-muted-foreground mt-1'>
                                {user.company}
                              </p>
                            )}
                          </div>

                          <TooltipProvider>
                            <div className='flex items-center gap-2'>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant='outline'
                                    size='icon'
                                    onClick={() => openEditUser(user)}
                                  >
                                    <Edit className='h-4 w-4' />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Editar usuário</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant='destructive'
                                    size='icon'
                                    onClick={() => deleteUser(user.id)}
                                  >
                                    <Trash2 className='h-4 w-4' />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Excluir usuário</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TooltipProvider>
                        </div>
                      </Card>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className='mt-6'>
          <CardHeader>
            <CardTitle className='text-lg'>Sobre os Perfis</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 text-sm'>
            <div className='flex items-start gap-3'>
              <Shield className='h-5 w-5 text-red-500 mt-0.5' />
              <div>
                <p className='font-semibold'>Administrador</p>
                <p className='text-muted-foreground'>
                  Acesso completo: gerencia filas, usuários, visualiza
                  estatísticas
                </p>
              </div>
            </div>
            <div className='flex items-start gap-3'>
              <UserCog className='h-5 w-5 text-blue-500 mt-0.5' />
              <div>
                <p className='font-semibold'>Operador</p>
                <p className='text-muted-foreground'>
                  Pode chamar e atender senhas, mas não gerencia filas ou
                  usuários
                </p>
              </div>
            </div>
            <div className='flex items-start gap-3'>
              <Eye className='h-5 w-5 text-gray-500 mt-0.5' />
              <div>
                <p className='font-semibold'>Toten</p>
                <p className='text-muted-foreground'>
                  Apenas visualiza informações, sem permissão para modificar
                  dados
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Dialog
          open={!!editingUser}
          onOpenChange={(open) => {
            if (!open) setEditingUser(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Atualize os dados do usuário
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label>Nome Completo</Label>
                <Input
                  type='text'
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                />
              </div>
              {editRole !== 'visitor' && (
                <div className='space-y-2'>
                  <Label>
                    {editRole === 'doctor' ? 'Consultório' : 'Guichê'}
                  </Label>
                  <Input
                    type='text'
                    inputMode='numeric'
                    pattern='\d*'
                    value={editCompany}
                    onChange={(e) =>
                      setEditCompany(e.target.value.replace(/\D/g, ''))
                    }
                  />
                </div>
              )}
              {editRole === 'doctor' && (
                <div className='space-y-2'>
                  <Label htmlFor='editSpecialty'>Especialidade</Label>
                  <Select
                    value={editSpecialtyId}
                    onValueChange={setEditSpecialtyId}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Selecione a especialidade' />
                    </SelectTrigger>
                    <SelectContent>
                      {specialties.map((specialty) => (
                        <SelectItem key={specialty.id} value={specialty.id}>
                          {specialty.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className='space-y-2'>
                <Label>Email</Label>
                <Input
                  type='email'
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='editRole'>Perfil *</Label>
                <Select
                  value={editRole}
                  onValueChange={(value) => {
                    setEditRole(value as UserRole);
                    if (value === 'visitor') setEditCompany('');
                  }}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Selecione o perfil do usuário' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='admin'>
                      <div className='flex items-center gap-2'>
                        <Shield className='h-4 w-4 text-red-500' />
                        Administrador
                      </div>
                    </SelectItem>
                    <SelectItem value='operator'>
                      <div className='flex items-center gap-2'>
                        <UserCog className='h-4 w-4 text-blue-500' />
                        Operador
                      </div>
                    </SelectItem>
                    <SelectItem value='visitor'>
                      <div className='flex items-center gap-2'>
                        <Users className='h-4 w-4' />
                        Toten
                      </div>
                    </SelectItem>
                    <SelectItem value='doctor'>
                      <div className='flex items-center gap-2'>
                        <Users className='h-4 w-4 text-emerald-600' />
                        Médico
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setEditingUser(null)}>
                Cancelar
              </Button>
              <Button onClick={updateUser} disabled={updatingUser}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default UserManagement;
