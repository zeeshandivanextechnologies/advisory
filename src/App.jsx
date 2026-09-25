import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ToastContainer, ErrorBoundary } from './components/common/index';


import Landing        from './pages/Landing';
import Contact        from './pages/Contact';
import Terms          from './pages/Terms';
import Privacy        from './pages/Privacy';
import Disclaimer     from './pages/Disclaimer';

import Login          from './pages/auth/Login';
import Register       from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import OTP            from './pages/auth/OTP';
import NewPassword    from './pages/auth/NewPassword';

import Welcome  from './pages/onboarding/Welcome';
import Connect  from './pages/onboarding/Connect';
import Needs    from './pages/onboarding/Needs';

import UserLayout        from './components/layout/UserLayout';
import UserDashboard     from './pages/user/Dashboard';
import StartBusiness     from './pages/user/StartBusiness';
import UserDocuments     from './pages/user/Documents';
import ConnectAdvisor    from './pages/user/ConnectAdvisor';
import Consultations     from './pages/user/Consultations';
import BookConsultation  from './pages/user/BookConsultation';
import UserNotifications from './pages/user/Notifications';
import UserSettings      from './pages/user/Settings';
import SessionNotes      from './pages/user/SessionNotes';
import VideoCall         from './pages/user/VideoCall';
import Plans             from './pages/user/Plans';
import UserServices      from './pages/user/Services';
import UserCommunity     from './pages/user/Community';
import UserEngagements   from './pages/user/Engagements';
import UserIntake        from './pages/user/Intake';
import CaseWorkspacePage from './pages/CaseWorkspacePage';

import AdvisorLayout        from './components/layout/AdvisorLayout';
import AdvisorDashboard     from './pages/advisor/Dashboard';
import AdvisorDocuments     from './pages/advisor/Documents';
import AdvisorClients       from './pages/advisor/Clients';
import AdvisorSchedule      from './pages/advisor/Schedule';
import AdvisorNotifications from './pages/advisor/Notifications';
import AdvisorSettings      from './pages/advisor/Settings';
import AdvisorRetainers     from './pages/advisor/Retainers';
import AdvisorEngagements   from './pages/advisor/Engagements';

import AdminLayout    from './components/layout/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers     from './pages/admin/Users';
import AdminAdvisors  from './pages/admin/Advisors';
import AdminCases     from './pages/admin/Cases';
import AdminDocuments from './pages/admin/Documents';
import AdminRevenue   from './pages/admin/Revenue';
import AdminSettings  from './pages/admin/Settings';
import AdminServices  from './pages/admin/Services';
import AdminCommunity from './pages/admin/Community';
import AdminEngagements from './pages/admin/Engagements';
import AdminLeads     from './pages/admin/Leads';
import AdminTeam      from './pages/admin/Team';
import Home from './pages/Landing/Home';
import LandingLayout from './pages/Landing/LandingLayout';
import Boarding from './pages/onboarding/Boarding';


/* ── Route Guards ────────────────────────────────────────── */
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-overlays"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (roles && !roles.includes(user.role)) {
    const redirects = { admin: '/admin/dashboard', advisor: '/advisor/dashboard', user: '/user/dashboard' };
    return <Navigate to={redirects[user.role] || '/'} replace />;
  }
  return children;
};

const PublicOnly = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;
  if (user) {
    const map = { admin: '/admin/dashboard', advisor: '/advisor/dashboard', user: '/user/dashboard' };
    return <Navigate to={map[user.role] || '/'} replace />;
    
  }
  return children;
};

/* ── Routes ──────────────────────────────────────────────── */
function AppRoutes() {
  return (
    <Routes>
      {/* <Route path="/"           element={<PublicOnly><Landing /> </PublicOnly>} />
      <Route path="/contact"    element={<Contact />} />
      <Route path="/terms"      element={<Terms />} />
      <Route path="/privacy"    element={<Privacy />} />
      <Route path="/disclaimer" element={<Disclaimer />} /> */}

       <Route element={<LandingLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/disclaimer" element={<Disclaimer />} />
      </Route>


 
     
      <Route path="/auth/login"           element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/auth/register"        element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/auth/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
      <Route path="/auth/otp"             element={<PublicOnly><OTP /></PublicOnly>} />
      {/* Not PublicOnly: the reset link arrives with a recovery session already signed in */}
      <Route path="/auth/reset-password"  element={<NewPassword />} />
      <Route path="/auth/new-password"    element={<NewPassword />} />

      <Route path="/onboarding/welcome" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
      <Route path="/onboarding/needs"   element={<ProtectedRoute><Needs /></ProtectedRoute>} />
      <Route path="/onboarding/connect" element={<ProtectedRoute><Connect /></ProtectedRoute>} />
      <Route path="/boarding" element={<Boarding />} />
      

      {/* ── User ── */}
      <Route path="/user" element={<ProtectedRoute roles={['user']}><UserLayout /></ProtectedRoute>}>
        <Route index                    element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"         element={<ErrorBoundary><UserDashboard /></ErrorBoundary>} />
        <Route path="start-business"    element={<ErrorBoundary><StartBusiness /></ErrorBoundary>} />
        <Route path="documents"         element={<ErrorBoundary><UserDocuments /></ErrorBoundary>} />
        <Route path="connect-advisor"   element={<ErrorBoundary><ConnectAdvisor /></ErrorBoundary>} />
        <Route path="consultations"     element={<ErrorBoundary><Consultations /></ErrorBoundary>} />
        <Route path="book-consultation" element={<ErrorBoundary><BookConsultation /></ErrorBoundary>} />
        <Route path="notifications"     element={<ErrorBoundary><UserNotifications /></ErrorBoundary>} />
        <Route path="settings"          element={<ErrorBoundary><UserSettings /></ErrorBoundary>} />
        <Route path="session-notes"     element={<ErrorBoundary><SessionNotes /></ErrorBoundary>} />
        <Route path="plans"             element={<ErrorBoundary><Plans /></ErrorBoundary>} />
        <Route path="services"          element={<ErrorBoundary><UserServices /></ErrorBoundary>} />
        <Route path="community"         element={<ErrorBoundary><UserCommunity /></ErrorBoundary>} />
        <Route path="engagements"       element={<ErrorBoundary><UserEngagements /></ErrorBoundary>} />
        <Route path="intake"            element={<ErrorBoundary><UserIntake /></ErrorBoundary>} />
        <Route path="cases/:id"         element={<ErrorBoundary><CaseWorkspacePage /></ErrorBoundary>} />
      </Route>

      <Route path="/user/video-call/:id" element={<ProtectedRoute roles={['user','advisor']}><VideoCall /></ProtectedRoute>} />
      <Route path="/user/video-call"     element={<ProtectedRoute roles={['user','advisor']}><VideoCall /></ProtectedRoute>} />

      {/* ── Advisor ── */}
      <Route path="/advisor" element={<ProtectedRoute roles={['advisor']}><AdvisorLayout /></ProtectedRoute>}>
        <Route index                element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"     element={<ErrorBoundary><AdvisorDashboard /></ErrorBoundary>} />
        <Route path="documents"     element={<ErrorBoundary><AdvisorDocuments /></ErrorBoundary>} />
        <Route path="clients"       element={<ErrorBoundary><AdvisorClients /></ErrorBoundary>} />
        <Route path="schedule"      element={<ErrorBoundary><AdvisorSchedule /></ErrorBoundary>} />
        <Route path="notifications" element={<ErrorBoundary><AdvisorNotifications /></ErrorBoundary>} />
        <Route path="settings"      element={<ErrorBoundary><AdvisorSettings /></ErrorBoundary>} />
        <Route path="retainers"     element={<ErrorBoundary><AdvisorRetainers /></ErrorBoundary>} />
        <Route path="engagements"   element={<ErrorBoundary><AdvisorEngagements /></ErrorBoundary>} />
        <Route path="cases/:id"     element={<ErrorBoundary><CaseWorkspacePage /></ErrorBoundary>} />
      </Route>

      {/* ── Admin ── */}
      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>}>
        <Route index                element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"     element={<ErrorBoundary><AdminDashboard /></ErrorBoundary>} />
        <Route path="users"         element={<ErrorBoundary><AdminUsers /></ErrorBoundary>} />
        <Route path="advisors"      element={<ErrorBoundary><AdminAdvisors /></ErrorBoundary>} />
        <Route path="cases"         element={<ErrorBoundary><AdminCases /></ErrorBoundary>} />
        <Route path="documents"     element={<ErrorBoundary><AdminDocuments /></ErrorBoundary>} />
        <Route path="revenue"       element={<ErrorBoundary><AdminRevenue /></ErrorBoundary>} />
        <Route path="settings"      element={<ErrorBoundary><AdminSettings /></ErrorBoundary>} />
        <Route path="services"      element={<ErrorBoundary><AdminServices /></ErrorBoundary>} />
        <Route path="community"     element={<ErrorBoundary><AdminCommunity /></ErrorBoundary>} />
        <Route path="engagements"   element={<ErrorBoundary><AdminEngagements /></ErrorBoundary>} />
        <Route path="leads"         element={<ErrorBoundary><AdminLeads /></ErrorBoundary>} />
        <Route path="team"          element={<ErrorBoundary><AdminTeam /></ErrorBoundary>} />
        <Route path="cases/:id"     element={<ErrorBoundary><CaseWorkspacePage /></ErrorBoundary>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <AuthProvider>
          <AppRoutes />
          {/* FIX: ToastContainer must be mounted for showToast() to work anywhere in the app */}
          <ToastContainer />
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}
