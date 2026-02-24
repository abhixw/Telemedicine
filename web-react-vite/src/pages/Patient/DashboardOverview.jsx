import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  CreditCard, 
  FileText, 
  Heart,
  Clock,
  MapPin,
  Video,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Star,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const DashboardOverview = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Mock data - replace with API calls
  const stats = [
    {
      title: 'Upcoming Appointments',
      value: '2',
      icon: Calendar,
      iconColor: 'text-[#2563EB]',
      iconBg: 'bg-[#EFF6FF]',
      change: 'This week'
    },
    {
      title: 'Pending Bills',
      value: '₹1,000',
      icon: CreditCard,
      iconColor: 'text-[#F59E0B]',
      iconBg: 'bg-[#FEF3C7]',
      change: '2 pending'
    },
    {
      title: 'Active Prescriptions',
      value: '3',
      icon: FileText,
      iconColor: 'text-[#16A34A]',
      iconBg: 'bg-[#DCFCE7]',
      change: '1 expiring soon'
    },
    {
      title: 'Saved Doctors',
      value: '8',
      icon: Heart,
      iconColor: 'text-[#DC2626]',
      iconBg: 'bg-[#FEE2E2]',
      change: 'Recently consulted'
    }
  ];

  const nextAppointment = {
    doctor: 'Dr. Dhwani Bhanusali',
    specialization: 'Nephrologist',
    hospital: 'City General Hospital',
    date: 'Wed, April 26, 2026',
    time: '10:30 AM',
    type: 'In-Person Appointment',
    rating: 4.5,
    reviews: '120+',
    fee: 500,
    avatar: 'https://i.pravatar.cc/150?img=5',
    refNo: 'APPT123456'
  };

  const healthReminders = [
    {
      title: 'Medication Reminder',
      description: 'Take Amoxicillin 500mg - Due in 2 hours',
      time: '2 hours',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Lab Test Scheduled',
      description: 'Blood test at City Lab - Tomorrow 9:00 AM',
      time: 'Tomorrow',
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Health Check-up',
      description: 'Annual physical exam due next month',
      time: 'Next month',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ];

  const recentRecords = [
    {
      title: 'Prescription - Dr. Rakhi Singh',
      date: 'April 20, 2026',
      type: 'Prescription'
    },
    {
      title: 'Blood Test Report',
      date: 'April 15, 2026',
      type: 'Lab Report'
    }
  ];

  const healthTips = [
    'Stay hydrated - Drink at least 8 glasses of water daily',
    'Exercise regularly - 30 minutes of moderate activity daily',
    'Sleep well - Aim for 7-8 hours of quality sleep'
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold text-[#0F172A] mb-1" style={{letterSpacing: '-0.3px'}}>
            Welcome Back, {user?.name || 'Kuldeep Raj'}!
          </h1>
          <p className="text-[14px] text-[#64748B]">
            Here's what's happening with your health today
          </p>
        </div>
        <button 
          onClick={() => navigate('/patient/find-doctors')}
          className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] text-white rounded-lg font-medium hover:bg-[#1D4ED8] transition-all text-sm"
        >
          <Sparkles className="w-4 h-4" />
          Quick Book
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white border border-[#E2E8F0] rounded-xl p-5 hover:shadow-sm transition-all cursor-pointer group"
              style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 ${stat.iconBg} rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform`}>
                  <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
              </div>
              <h3 className="text-[20px] font-semibold text-[#0F172A] mb-1" style={{letterSpacing: '-0.3px'}}>{stat.value}</h3>
              <p className="text-[14px] font-medium text-[#64748B] mb-1">{stat.title}</p>
              <p className="text-[12px] text-[#94A3B8]">{stat.change}</p>
            </motion.div>
          );
        })}
      </div>

      {/* AI Medical Report Analysis - Featured Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 rounded-2xl p-6 text-white overflow-hidden relative cursor-pointer"
        onClick={() => navigate('/patient/medical-reports')}
        style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -ml-24 -mb-24" />
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
              <span className="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full">
                NEW FEATURE
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{letterSpacing: '-0.5px'}}>
              AI-Powered Medical Report Analysis
            </h2>
            <p className="text-white/90 mb-4 max-w-2xl">
              Upload your medical reports and let our AI recommend the right specialist for you. 
              Perfect for when you don't know which doctor to consult!
            </p>
            <div className="flex items-center gap-3">
              <button className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-all flex items-center gap-2 text-sm shadow-lg">
                Upload Report
                <ArrowRight className="w-4 h-4" />
              </button>
              <button 
                className="border-2 border-white/30 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/10 transition-all text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/patient/medical-history');
                }}
              >
                View History
              </button>
            </div>
          </div>
          <div className="hidden lg:flex items-center justify-center">
            <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
              <FileText className="w-16 h-16 text-white" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Next Appointment Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl p-6 border-l-4 border-[#2563EB]"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0', borderLeft: '4px solid #2563EB' }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-[18px] font-semibold text-[#0F172A]" style={{letterSpacing: '-0.3px'}}>Next Appointment</h2>
          </div>
          <span className="text-[12px] font-medium text-[#64748B] bg-[#F8FAFC] px-3 py-1 rounded-lg">
            Ref. No: {nextAppointment.refNo}
          </span>
        </div>

        <div className="flex items-start gap-4">
          <img 
            src={nextAppointment.avatar} 
            alt={nextAppointment.doctor}
            className="w-16 h-16 rounded-xl object-cover border-2 border-[#E2E8F0]"
          />
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-[18px] font-semibold text-[#0F172A]" style={{letterSpacing: '-0.3px'}}>{nextAppointment.doctor}</h3>
                </div>
                <p className="text-[#2563EB] font-medium text-[14px] mb-1">{nextAppointment.specialization}</p>
                <div className="flex items-center gap-1 text-[#64748B] text-[14px]">
                  <MapPin className="w-4 h-4" />
                  <span>{nextAppointment.hospital}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
                <span className="text-[14px] font-semibold text-[#0F172A]">{nextAppointment.rating}</span>
                <span className="text-[14px] text-[#64748B]">({nextAppointment.reviews})</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4 mb-4 py-4 border-y border-[#E2E8F0]">
              <div className="flex items-center gap-2 text-[14px]">
                <div className="w-8 h-8 bg-[#F8FAFC] rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-[#64748B]" />
                </div>
                <div>
                  <p className="text-[12px] text-[#64748B] font-medium">Date</p>
                  <p className="text-[14px] font-semibold text-[#0F172A]">{nextAppointment.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[14px]">
                <div className="w-8 h-8 bg-[#F8FAFC] rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-[#64748B]" />
                </div>
                <div>
                  <p className="text-[12px] text-[#64748B] font-medium">Time</p>
                  <p className="text-[14px] font-semibold text-[#0F172A]">{nextAppointment.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[14px]">
                <div className="text-right ml-auto">
                  <p className="text-[12px] text-[#64748B] font-medium">Fee</p>
                  <p className="text-[18px] font-semibold text-[#0F172A]">₹ {nextAppointment.fee}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="flex-1 bg-[#2563EB] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[#1D4ED8] transition-all flex items-center justify-center gap-2 text-[14px]">
                <Video className="w-4 h-4" />
                Join / Reschedule
              </button>
              <button className="px-5 py-2.5 border border-[#E2E8F0] text-[#64748B] rounded-lg font-medium hover:bg-[#F8FAFC] transition-all text-[14px]">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bottom Row: Health Reminders & Recent Records */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Medical Record */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl p-6 border border-[#E2E8F0]"
          style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[18px] font-semibold text-[#0F172A]" style={{letterSpacing: '-0.3px'}}>Recent Medical Record</h2>
            <button className="text-[#2563EB] font-medium text-[14px] hover:text-[#1D4ED8]">
              View Record
            </button>
          </div>
          <div className="flex items-center gap-4 p-4 bg-[#F8FAFC] rounded-lg">
            <img 
              src="https://i.pravatar.cc/150?img=10" 
              alt="Dr. Rakhi Singh"
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div className="flex-1">
              <h3 className="font-medium text-[#0F172A] text-[14px] mb-1">Dr. Rakhi Singh</h3>
              <p className="text-[14px] text-[#64748B]">Hypertetision Medication</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-[#64748B] text-[12px]">
                  <Calendar className="w-3 h-3" />
                  <span>April 26, 2026</span>
                </div>
              </div>
            </div>
            <span className="text-[18px] font-semibold text-[#0F172A]">₹ 500</span>
          </div>
        </motion.div>

        {/* Health Reminders */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl p-6 border border-[#E2E8F0]"
          style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[18px] font-semibold text-[#0F172A]" style={{letterSpacing: '-0.3px'}}>Health Reminders</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-[#F8FAFC] rounded-lg">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-[#E2E8F0]">
                <Clock className="w-4 h-4 text-[#64748B]" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] text-[#0F172A] font-medium mb-1">Time for your annual health check-up.</p>
                <p className="text-[12px] text-[#64748B]">Stay on-top of your health by scheduling a check-up soon.</p>
              </div>
            </div>
            <button className="w-full px-4 py-2.5 bg-[#2563EB] text-white rounded-lg font-medium hover:bg-[#1D4ED8] transition-all text-[14px]">
              Book Appointment
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardOverview;
