import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/Dashboard';
import Kiosk from '@/pages/Kiosk';
import Display from '@/pages/Display';
import Operator from '@/pages/Operator';

import DoctorOperator from '@/pages/DoctorOperator';
import DoctorDisplay from '@/pages/DoctorDisplay';
import TicketSuccess from '@/pages/TicketSuccess';
import Track from '@/pages/Track';
import Admin from '@/pages/Admin';
import UserManagement from '@/pages/UserManagement';
import SlidesManagement from '@/pages/SlidesManagement';
import SpecialtiesManagement from '@/pages/SpecialtiesManagement';
import Reports from '@/pages/Reports';
import NotFound from '@/pages/NotFound';

// Cliente de cache e fetch (React Query) para toda a aplicação
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* Mapa de rotas com proteção por perfis via ProtectedRoute */}
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Index />} />
          <Route path='/auth' element={<Auth />} />
          {/* Dashboard: requer sessão; redireciona por papel (admin/operator/toten/doctor) */}
          <Route
            path='/dashboard'
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          {/* Kiosk: permitido a toten e admin */}
          <Route
            path='/kiosk'
            element={
              <ProtectedRoute allowedRoles={['visitor', 'admin']}>
                <Kiosk />
              </ProtectedRoute>
            }
          />
          <Route path='/display' element={<Display />} />
          {/* Operator: permitido a operator e admin */}
          <Route
            path='/operator'
            element={
              <ProtectedRoute allowedRoles={['operator', 'admin']}>
                <Operator />
              </ProtectedRoute>
            }
          />

          {/* Doctor: permitido a doctor e admin */}
          <Route
            path='/doctor'
            element={
              <ProtectedRoute allowedRoles={['doctor', 'admin']}>
                <DoctorOperator />
              </ProtectedRoute>
            }
          />
          <Route path='/doctor-display' element={<DoctorDisplay />} />
          <Route path='/ticket/:id' element={<TicketSuccess />} />
          <Route path='/track' element={<Track />} />
          {/* Admin: somente admin */}
          <Route
            path='/admin'
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Admin />
              </ProtectedRoute>
            }
          />
          {/* Admin Slides: somente admin */}
          <Route
            path='/admin/slides'
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <SlidesManagement />
              </ProtectedRoute>
            }
          />
          {/* Admin Specialties: somente admin */}
          <Route
            path='/admin/specialties'
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <SpecialtiesManagement />
              </ProtectedRoute>
            }
          />
          {/* Admin Reports: somente admin */}
          <Route
            path='/admin/reports'
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Reports />
              </ProtectedRoute>
            }
          />
          {/* User Management: somente admin */}
          <Route
            path='/users'
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path='*' element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
