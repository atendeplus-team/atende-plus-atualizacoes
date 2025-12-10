import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Inicializa Web Audio Context para permitir áudio automático após primeira interação
export function initializeAudioContext() {
  const resumeAudioContext = () => {
    const audioContexts = (window as any).audioContexts || [];
    
    // Cria novo contexto de áudio se não existir
    if (!audioContexts.length) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        (window as any).audioContexts = [audioContext];
        
        // Se estiver suspenso, retoma
        if (audioContext.state === 'suspended') {
          audioContext.resume().catch(() => {});
        }
      } catch (e) {
        // Navegador não suporta Web Audio API
      }
    }
    
    // Remove listener após primeira interação
    document.removeEventListener('click', resumeAudioContext);
    document.removeEventListener('touchstart', resumeAudioContext);
  };
  
  // Ativa áudio na primeira interação do usuário
  document.addEventListener('click', resumeAudioContext, { once: true });
  document.addEventListener('touchstart', resumeAudioContext, { once: true });
  
  // Tenta resumir imediatamente (em caso de recarga)
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
  } catch (e) {
    // Ignorar erros
  }
}
