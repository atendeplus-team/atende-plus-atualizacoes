import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import type { User } from '@supabase/supabase-js';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  X,
  Home,
} from 'lucide-react';
import { createSlideSchema } from '@/lib/validations';

interface Slide {
  id: string;
  title: string;
  image_url: string;
  display_order: number;
  duration_seconds: number;
  is_active: boolean;
  media_type: 'image' | 'video';
  transition_type: 'fade' | 'slide' | 'zoom' | 'none';
}

const SlidesManagement = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSlideUrl, setNewSlideUrl] = useState('');
  const [newSlideTitle, setNewSlideTitle] = useState('');
  const [newSlideDuration, setNewSlideDuration] = useState(10);
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [transitionType, setTransitionType] = useState<
    'fade' | 'slide' | 'zoom' | 'none'
  >('fade');
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    isAdmin,
    isSuperAdmin,
    loading: roleLoading,
  } = useUserRole(currentUser);

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
      loadSlides();
    }
  }, [currentUser, roleLoading]);

  const loadSlides = async () => {
    try {
      const { data, error } = await supabase
        .from('propaganda_slides')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setSlides((data as Slide[]) || []);
    } catch (error) {
      toast({
        title: 'Erro ao carregar slides',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload múltiplo de arquivos
  const uploadMultipleFiles = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: 'Nenhum arquivo selecionado',
        description: 'Selecione pelo menos um arquivo para fazer upload.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const maxOrder =
        slides.length > 0 ? Math.max(...slides.map((s) => s.display_order)) : 0;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        // Validar tamanho
        const maxSize = file.type.startsWith('video/')
          ? 50 * 1024 * 1024
          : 5 * 1024 * 1024;
        if (file.size > maxSize) {
          toast({
            title: `Arquivo ${file.name} muito grande`,
            description: `O arquivo deve ter no máximo ${
              file.type.startsWith('video/') ? '50MB' : '5MB'
            }.`,
            variant: 'destructive',
          });
          continue;
        }

        // Upload do arquivo
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('propaganda-slides')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          toast({
            title: `Erro no upload de ${file.name}`,
            description: uploadError.message,
            variant: 'destructive',
          });
          continue;
        }

        // Obter URL pública
        const {
          data: { publicUrl },
        } = supabase.storage.from('propaganda-slides').getPublicUrl(fileName);

        // Inserir no banco
        const { error: insertError } = await supabase
          .from('propaganda_slides')
          .insert({
            title: file.name.replace(/\.[^/.]+$/, ''), // Nome sem extensão
            image_url: publicUrl,
            display_order: maxOrder + i + 1,
            duration_seconds: newSlideDuration,
            is_active: true,
            media_type: file.type.startsWith('video/') ? 'video' : 'image',
            transition_type: transitionType,
          });

        if (insertError) {
          toast({
            title: `Erro ao salvar ${file.name}`,
            description: insertError.message,
            variant: 'destructive',
          });
        }
      }

      toast({
        title: 'Upload concluído',
        description: `${selectedFiles.length} arquivo(s) enviado(s) com sucesso.`,
      });

      setSelectedFiles([]);
      setNewSlideDuration(10);
      setTransitionType('fade');
      loadSlides();
    } catch (error: any) {
      toast({
        title: 'Erro no upload',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const addSlide = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newSlideTitle) {
      toast({
        title: 'Campo obrigatório',
        description: 'Preencha o título do slide.',
        variant: 'destructive',
      });
      return;
    }

    if (uploadMode === 'url' && !newSlideUrl) {
      toast({
        title: 'Campo obrigatório',
        description: 'Preencha a URL da imagem.',
        variant: 'destructive',
      });
      return;
    }

    if (uploadMode === 'file' && !selectedFile) {
      toast({
        title: 'Campo obrigatório',
        description: 'Selecione uma imagem do computador.',
        variant: 'destructive',
      });
      return;
    }

    // Validar dados com Zod (apenas quando for URL)
    if (uploadMode === 'url') {
      const validation = createSlideSchema.safeParse({
        title: newSlideTitle,
        imageUrl: newSlideUrl,
        duration: newSlideDuration,
      });

      if (!validation.success) {
        const firstError = validation.error.issues[0];
        toast({
          title: 'Erro de validação',
          description: firstError.message,
          variant: 'destructive',
        });
        return;
      }
    }

    // Validar tamanho do arquivo (máximo 50MB para vídeos, 5MB para imagens)
    if (uploadMode === 'file' && selectedFile) {
      const maxSize =
        mediaType === 'video' ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        toast({
          title: 'Arquivo muito grande',
          description: `O arquivo deve ter no máximo ${
            mediaType === 'video' ? '50MB' : '5MB'
          }.`,
          variant: 'destructive',
        });
        return;
      }
    }

    setUploading(true);

    try {
      let imageUrl = newSlideUrl;

      // Se for upload de arquivo, fazer upload para o storage
      if (uploadMode === 'file' && selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
          .from('propaganda-slides')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Obter URL pública
        const {
          data: { publicUrl },
        } = supabase.storage.from('propaganda-slides').getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const maxOrder =
        slides.length > 0 ? Math.max(...slides.map((s) => s.display_order)) : 0;

      const { error } = await supabase.from('propaganda_slides').insert({
        title: newSlideTitle,
        image_url: imageUrl,
        display_order: maxOrder + 1,
        duration_seconds: newSlideDuration,
        is_active: true,
        media_type: mediaType,
        transition_type: transitionType,
      });

      if (error) throw error;

      toast({
        title: 'Slide adicionado',
        description: 'O slide foi adicionado com sucesso.',
      });

      setNewSlideUrl('');
      setNewSlideTitle('');
      setNewSlideDuration(10);
      setSelectedFile(null);
      setMediaType('image');
      setTransitionType('fade');
      loadSlides();
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar slide',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const toggleSlideActive = async (slideId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('propaganda_slides')
        .update({ is_active: !currentStatus })
        .eq('id', slideId);

      if (error) throw error;

      toast({
        title: currentStatus ? 'Slide desativado' : 'Slide ativado',
        description: `O slide foi ${
          currentStatus ? 'desativado' : 'ativado'
        } com sucesso.`,
      });

      loadSlides();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteSlide = async (slideId: string) => {
    if (!confirm('Deseja realmente excluir este slide?')) return;

    try {
      const { error } = await supabase
        .from('propaganda_slides')
        .delete()
        .eq('id', slideId);

      if (error) throw error;

      toast({
        title: 'Slide excluído',
        description: 'O slide foi excluído com sucesso.',
      });

      loadSlides();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir slide',
        description: error.message,
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

  return (
    <div className='min-h-screen bg-gradient-to-br from-background to-muted p-6'>
      <div className='mx-auto max-w-7xl'>
        <div className='mb-8 flex items-center gap-4'>
          <Button variant='ghost' onClick={() => navigate('/admin')}>
            <ArrowLeft className='mr-2 h-4 w-4' />
            Voltar
          </Button>
          {isSuperAdmin && (
            <Button variant='outline' onClick={() => navigate('/dashboard')}>
              <Home className='mr-2 h-4 w-4' />
              Dashboard
            </Button>
          )}
        </div>

        <div className='mb-8 text-center'>
          <h1 className='text-4xl font-bold text-foreground'>
            Gerenciar Slides de Propaganda
          </h1>
          <p className='mt-2 text-muted-foreground'>
            Adicione imagens para exibir no display
          </p>
        </div>

        <div className='grid gap-6 lg:grid-cols-2'>
          {/* Formulário para adicionar slide */}
          <Card className='p-6'>
            <h2 className='text-2xl font-bold mb-6'>Adicionar Slides</h2>

            {/* Área de Upload Múltiplo */}
            <div className='space-y-4'>
              <div>
                <Label>Configurações Padrão</Label>
                <div className='grid grid-cols-2 gap-4 mt-2'>
                  <div>
                    <Label htmlFor='duration' className='text-xs'>
                      Duração (seg)
                    </Label>
                    <Input
                      id='duration'
                      type='number'
                      min='3'
                      max='60'
                      value={newSlideDuration}
                      onChange={(e) =>
                        setNewSlideDuration(parseInt(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor='transitionType' className='text-xs'>
                      Transição
                    </Label>
                    <select
                      id='transitionType'
                      value={transitionType}
                      onChange={(e) => setTransitionType(e.target.value as any)}
                      className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                    >
                      <option value='fade'>Fade</option>
                      <option value='slide'>Slide</option>
                      <option value='zoom'>Zoom</option>
                      <option value='none'>Nenhuma</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Drag and Drop Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                } ${
                  uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() =>
                  !uploading && document.getElementById('file-upload')?.click()
                }
              >
                <Upload className='h-12 w-12 mx-auto mb-4 text-muted-foreground' />
                <p className='text-lg font-medium mb-2'>
                  {isDragging
                    ? 'Solte os arquivos aqui'
                    : 'Arraste e solte ou clique para selecionar'}
                </p>
                <p className='text-sm text-muted-foreground'>
                  Imagens: JPG, PNG, GIF (máx 5MB) • Vídeos: MP4, WEBM (máx
                  50MB)
                </p>
                <p className='text-xs text-muted-foreground mt-2'>
                  Você pode selecionar múltiplos arquivos
                </p>
              </div>

              <Input
                id='file-upload'
                type='file'
                accept='image/*,video/*'
                multiple
                onChange={handleFileSelect}
                disabled={uploading}
                className='hidden'
              />

              {/* Lista de Arquivos Selecionados */}
              {selectedFiles.length > 0 && (
                <div className='space-y-2'>
                  <Label>Arquivos Selecionados ({selectedFiles.length})</Label>
                  <div className='max-h-64 overflow-y-auto space-y-2'>
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className='flex items-center justify-between p-3 bg-muted rounded-lg'
                      >
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm font-medium truncate'>
                            {file.name}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            {(file.size / 1024).toFixed(1)} KB •{' '}
                            {file.type.startsWith('video/')
                              ? 'Vídeo'
                              : 'Imagem'}
                          </p>
                        </div>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          onClick={() => removeSelectedFile(index)}
                          disabled={uploading}
                        >
                          <X className='h-4 w-4' />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                type='button'
                onClick={uploadMultipleFiles}
                className='w-full'
                disabled={uploading || selectedFiles.length === 0}
              >
                {uploading ? (
                  <>Fazendo upload...</>
                ) : (
                  <>
                    <Plus className='mr-2 h-4 w-4' />
                    Enviar {selectedFiles.length} Arquivo
                    {selectedFiles.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Lista de slides */}
          <Card className='p-6'>
            <h2 className='text-2xl font-bold mb-6'>Slides Cadastrados</h2>
            <div className='space-y-4'>
              {slides.map((slide) => (
                <div
                  key={slide.id}
                  className={`p-4 rounded-lg border ${
                    slide.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'
                  }`}
                >
                  <div className='flex items-start justify-between gap-4'>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 mb-2'>
                        <h3 className='font-semibold truncate'>
                          {slide.title}
                        </h3>
                        <span className='text-xs bg-primary/20 text-primary px-2 py-0.5 rounded'>
                          {slide.media_type === 'video' ? 'Vídeo' : 'Imagem'}
                        </span>
                        {!slide.is_active && (
                          <span className='text-xs bg-muted px-2 py-0.5 rounded'>
                            Inativo
                          </span>
                        )}
                      </div>
                      <p className='text-xs text-muted-foreground mt-1'>
                        Duração: {slide.duration_seconds}s | Transição:{' '}
                        {slide.transition_type}
                      </p>
                    </div>

                    <div className='flex gap-2'>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() =>
                          toggleSlideActive(slide.id, slide.is_active)
                        }
                        title={slide.is_active ? 'Desativar' : 'Ativar'}
                      >
                        {slide.is_active ? (
                          <Eye className='h-4 w-4' />
                        ) : (
                          <EyeOff className='h-4 w-4' />
                        )}
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => deleteSlide(slide.id)}
                        className='text-destructive'
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>

                  {/* Preview da mídia */}
                  <div className='mt-3 flex justify-center'>
                    {slide.media_type === 'video' ? (
                      <video
                        src={slide.image_url}
                        className='max-w-xs max-h-24 object-contain rounded'
                        controls
                        muted
                      />
                    ) : (
                      <img
                        src={slide.image_url}
                        alt={slide.title}
                        className='max-w-xs max-h-24 object-contain rounded'
                        onError={(e) => {
                          e.currentTarget.src =
                            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="50%" y="50%" text-anchor="middle" dy=".3em">Erro ao carregar</text></svg>';
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}

              {slides.length === 0 && (
                <p className='text-center text-muted-foreground py-8'>
                  Nenhum slide cadastrado. Adicione o primeiro slide ao lado.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SlidesManagement;
