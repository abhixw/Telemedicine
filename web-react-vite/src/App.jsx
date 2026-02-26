import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';

// Route Guards
import ProtectedRoute from './routes/ProtectedRoute';
import PublicRoute from './routes/PublicRoute';

// Landing Page
import LandingPage from './pages/LandingPage';

// Auth Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import AdminLogin from './pages/Auth/AdminLogin';
import DoctorLogin from './pages/Auth/DoctorLogin';
import PatientLogin from './pages/Auth/PatientLogin';

// Dashboard Pages
import AdminDashboard from './pages/Admin/Dashboard';
import AdminAppointments from './pages/Admin/Appointments';
import DoctorsManagement from './pages/Admin/DoctorsManagement';
import DoctorApproval from './pages/Admin/DoctorApproval';
import DoctorProfile from './pages/Admin/DoctorProfile';
import PatientsManagement from './pages/Admin/PatientsManagement';
import PatientProfile from './pages/Admin/PatientProfile';
import DoctorDashboard from './pages/Doctor/Dashboard';
import DoctorProfilePage from './pages/Doctor/Profile';
import DoctorAppointments from './pages/Doctor/Appointments';
import DoctorPrescriptions from './pages/Doctor/Prescriptions';
import PatientLayout from './pages/Patient/PatientLayout';
import DashboardOverview from './pages/Patient/DashboardOverview';
import FindDoctors from './pages/Patient/FindDoctors';
import MyAppointments from './pages/Patient/MyAppointments';
import MedicalRecords from './pages/Patient/MedicalRecords';
import PatientPrescriptions from './pages/Patient/Prescriptions';
import BillsPayments from './pages/Patient/BillsPayments';
import MyDoctors from './pages/Patient/MyDoctors';
import Settings from './pages/Patient/Settings';
import MedicalReportAnalysis from './pages/Patient/MedicalReportAnalysis';
import MedicalHistory from './pages/Patient/MedicalHistory';
import VoiceSymptoms from './pages/Patient/VoiceSymptoms';
import NearbyPharmacy from './pages/Patient/NearbyPharmacy';
import VideoConsultation from './pages/VideoConsultation/VideoConsultation';

// Components
import Loading from './components/common/Loading';

function App() {
  const { initializeAuth, loading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => unsubscribe && unsubscribe();
  }, [initializeAuth]);

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            padding: '16px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <Routes>
        {/* Landing Page */}
       
<Route path="/" element={
  <PublicRoute>
    <LandingPage />
  </PublicRoute>
} />

        {/* Public Auth Routes */}
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/admin/login" element={
          <PublicRoute>
            <AdminLogin />
          </PublicRoute>
        } />
        <Route path="/doctor/login" element={
          <PublicRoute>
            <DoctorLogin />
          </PublicRoute>
        } />
        <Route path="/patient/login" element={
          <PublicRoute>
            <PatientLogin />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } />

        {/* Protected Routes - Admin */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/doctors" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DoctorsManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/doctors/approval" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DoctorApproval />
          </ProtectedRoute>
        } />
        <Route path="/admin/doctors/:doctorId" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DoctorProfile />
          </ProtectedRoute>
        } />
        <Route path="/admin/patients" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <PatientsManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/patients/:patientId" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <PatientProfile />
          </ProtectedRoute>
        } />
        <Route path="/admin/appointments" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminAppointments />
          </ProtectedRoute>
        } />

        {/* Protected Routes - Doctor */}
        <Route path="/doctor/dashboard" element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <DoctorDashboard />
          </ProtectedRoute>
        } />
        <Route path="/doctor/appointments" element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <DoctorAppointments />
          </ProtectedRoute>
        } />
        <Route path="/doctor/profile" element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <DoctorProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/doctor/prescriptions" element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <DoctorPrescriptions />
          </ProtectedRoute>
        } />
        <Route path="/doctor/consultation/:appointmentId" element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <VideoConsultation />
          </ProtectedRoute>
        } />

        {/* Protected Routes - Patient */}
        <Route path="/patient" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <PatientLayout />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<DashboardOverview />} />
          <Route path="find-doctors" element={<FindDoctors />} />
          <Route path="appointments" element={<MyAppointments />} />
          <Route path="medical-records" element={<MedicalRecords />} />
          <Route path="prescriptions" element={<PatientPrescriptions />} />
          <Route path="get-medicine" element={<NearbyPharmacy />} />
          <Route path="medical-reports" element={<MedicalReportAnalysis />} />
          <Route path="voice-symptoms" element={<VoiceSymptoms />} />
          <Route path="medical-history" element={<MedicalHistory />} />
          <Route path="bills-payments" element={<BillsPayments />} />
          <Route path="my-doctors" element={<MyDoctors />} />
          <Route path="settings" element={<Settings />} />
          <Route index element={<Navigate to="/patient/dashboard" replace />} />
        </Route>
        <Route path="/patient/consultation/:appointmentId" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <VideoConsultation />
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
