// c:\Users\Pericles\code\flow-queue-master-main\src\pages\DoctorAuth.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface CompanySettings { logo_url: string | null; company_name: string; }

const DoctorAuth = () => {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate(); const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate("/doctor");
    };
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => { if (session) navigate("/doctor"); });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const loadCompanySettings = async () => {
      const { data } = await supabase.from("company_settings").select("*").limit(1).single();
      if (data) setCompanySettings(data as CompanySettings);
    };
    loadCompanySettings();
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/doctor");
    } catch (error: any) {
      setErrorMessage("Email ou senha incorretos. Verifique e tente novamente.");
      setShowErrorDialog(true);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-6">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-2">
          {companySettings?.logo_url ? (
            <img src={companySettings.logo_url} alt="Logo" className="mx-auto h-20 w-20 rounded-full object-cover" />
          ) : (<div className="mx-auto h-20 w-20 rounded-full bg-muted" />)}
          <h1 className="text-2xl font-semibold">Login do Médico</h1>
        </div>
        <div className="space-y-4">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button className="w-full bg-gradient-primary" onClick={handleLogin} disabled={loading}>Entrar</Button>
        </div>
      </Card>
      <Dialog open={showErrorDialog} onOpenChange={(open) => setShowErrorDialog(open)}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Dados incorretos</DialogTitle>
            <DialogDescription>{errorMessage || "Email ou senha incorretos."}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowErrorDialog(false)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default DoctorAuth;