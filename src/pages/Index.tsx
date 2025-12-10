import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
const Index = () => {
  const navigate = useNavigate();

  // Landing mínima: sempre redireciona para a tela de autenticação unificada
  useEffect(() => {
    navigate("/auth");
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Carregando...</p>
    </div>
  );
};

export default Index;