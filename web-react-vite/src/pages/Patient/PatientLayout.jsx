import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Search, 
  Calendar,
  FileText, 
  CreditCard, 
  Stethoscope,
  MessageSquare,
  Settings, 
  LogOut,
  Bell,
  Heart,
  X,
  Sparkles,
  Activity
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { patientAPI } from '../../api/patient.api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const PatientLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [upcomingCount, setUpcomingCount] = useState(0);

  useEffect(() => {
    fetchUpcomingAppointments();
  }, []);

  const fetchUpcomingAppointments = async () => {
    try {
      const response = await patientAPI.getAppointments();
      
      if (response && response.success) {
        const allAppointments = response.data?.appointments || [];
        
        // Count upcoming appointments (future appointments with scheduled status)
        const now = new Date();
        const upcoming = allAppointments.filter(apt => {
          const aptDate = new Date(apt.appointmentDate);
          
          // Parse time if available
          if (apt.appointmentTime) {
            const timeMatch = apt.appointmentTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (timeMatch) {
              let hours = parseInt(timeMatch[1]);
              const minutes = parseInt(timeMatch[2]);
              const meridiem = timeMatch[3].toUpperCase();
              
              if (meridiem === 'PM' && hours !== 12) hours += 12;
              if (meridiem === 'AM' && hours === 12) hours = 0;
              
              aptDate.setHours(hours, minutes, 0, 0);
            }
          }
          
          return aptDate >= now && apt.status === 'scheduled';
        });
        
        setUpcomingCount(upcoming.length);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      // Don't show error toast, just fail silently
    }
  };

  const menuItems = [
    { path: '/patient/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/patient/find-doctors', label: 'Find Doctors', icon: Search },
    { path: '/patient/appointments', label: 'My Appointments', icon: Calendar, badge: upcomingCount > 0 ? upcomingCount : null },
    { path: '/patient/medical-reports', label: 'AI Report Analysis', icon: Sparkles },
    { path: '/patient/medical-history', label: 'Medical History', icon: Activity },
    { path: '/patient/medical-records', label: 'Medical Records', icon: FileText },
    { path: '/patient/bills-payments', label: 'Bills & Payments', icon: CreditCard },
    { path: '/patient/my-doctors', label: 'My Doctors', icon: Stethoscope },
    { path: '/patient/settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen bg-[#0F172A] transition-all duration-300 z-40 ${isSidebarOpen ? 'w-64' : 'w-0'} overflow-hidden`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-6 border-b border-[#1E293B]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2563EB] rounded-lg flex items-center justify-center">
                <Heart className="text-white w-5 h-5" fill="white" />
              </div>
              <span className="text-xl font-semibold tracking-tight text-white" style={{letterSpacing: '-0.3px'}}>Telemedicine</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 overflow-y-auto">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                        isActive 
                          ? 'bg-[#1E293B] text-white' 
                          : 'text-[#CBD5E1] hover:bg-[#1E293B]/50 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#64748B] group-hover:text-[#CBD5E1]'}`} />
                      <span className={`text-sm font-medium ${isActive ? 'text-white' : ''}`}>
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className="ml-auto bg-[#10B981] text-white text-xs font-bold px-1.5 py-0.5 rounded-md">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Profile Section */}
          <div className="p-3 border-t border-[#1E293B]">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#1E293B] mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-semibold text-xs">
                {user?.name?.charAt(0)?.toUpperCase() || 'K'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name || 'Kuldeep Raj'}</p>
                <p className="text-xs text-[#64748B] truncate">{user?.email || 'iamkuldeep@gmail.com'}</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-[#DC2626] hover:bg-[#1E293B] rounded-lg transition-colors group"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Top Navbar */}
        <nav className="bg-white border-b border-[#E2E8F0] px-6 py-4 sticky top-0 z-30">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-[#F8FAFC] rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-6">
              <button className="text-[#64748B] hover:text-[#0F172A] transition-colors relative">
                <Bell size={18} />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#DC2626] rounded-full border-2 border-white"></span>
              </button>
              <div className="h-5 w-[1px] bg-[#E2E8F0]"></div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-medium text-[#64748B] uppercase tracking-wider leading-none mb-1">
                    Welcome Back
                  </p>
                  <p className="text-sm font-semibold text-[#0F172A] leading-none" style={{letterSpacing: '-0.3px'}}>
                    {user?.name || 'Kuldeep Raj'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PatientLayout;
