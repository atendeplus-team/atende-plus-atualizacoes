import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SessionTimeoutOptions {
  timeoutMinutes?: number;
  warningMinutes?: number;
  enabled?: boolean;
}

export const useSessionTimeout = (options: SessionTimeoutOptions = {}) => {
  const {
    timeoutMinutes = 30,
    warningMinutes = 5,
    enabled = true,
  } = options;

  const navigate = useNavigate();
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningRef = useRef<NodeJS.Timeout>();
  const [showWarning, setShowWarning] = useState(false);

  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = (timeoutMinutes - warningMinutes) * 60 * 1000;

  const logout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Sessão expirada",
      description: "Você foi desconectado por inatividade.",
      variant: "destructive",
    });
    navigate("/auth");
  };

  const resetTimers = () => {
    setShowWarning(false);

    if (warningRef.current) {
      clearTimeout(warningRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!enabled) return;

    // Warning timer
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      toast({
        title: "Sessão expirando",
        description: `Você será desconectado em ${warningMinutes} minutos por inatividade.`,
      });
    }, warningMs);

    // Logout timer
    timeoutRef.current = setTimeout(() => {
      logout();
    }, timeoutMs);
  };

  useEffect(() => {
    if (!enabled) return;

    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];

    const handleActivity = () => {
      resetTimers();
    };

    // Initialize timers
    resetTimers();

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    return () => {
      if (warningRef.current) clearTimeout(warningRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled, timeoutMinutes, warningMinutes]);

  return { showWarning, resetTimers };
};
