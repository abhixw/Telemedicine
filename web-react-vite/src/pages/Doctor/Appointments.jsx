/**
 * Doctor Appointments Page
 * Shows all appointments with filters, status tabs, and appointment details
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  Video, 
  Phone as PhoneIcon,
  MapPin, 
  User,
  Eye,
  Loader2,
  MessageCircle,
  CalendarClock,
  XCircle
} from 'lucide-react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Tabs,
  Tab,
  IconButton,
  TextField,
  MenuItem,
  Select,
  FormControl,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  Avatar
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People,
  VideoCall,
  Assignment,
  CalendarMonth,
  AttachMoney,
  Schedule,
  VerifiedUser,
  Visibility,
  Phone,
  Email,
  AccessTime,
  Person,
  LocalHospital,
  Refresh,
  CheckCircle
} from '@mui/icons-material';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { doctorAPI } from '../../api/doctor.api';
import api from '../../config/axios';
import ChatWindow from '../Patient/components/ChatWindow';
import RescheduleModal from './components/RescheduleModal';
import toast from 'react-hot-toast';

const DoctorAppointments = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [stats, setStats] = useState(null);

  // Filter states
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'past', 'cancelled'
  const [appointmentsByTab, setAppointmentsByTab] = useState({
    upcoming: [],
    past: [],
    cancelled: []
  });
  const [tabCounts, setTabCounts] = useState({
    upcoming: 0,
    past: 0,
    cancelled: 0
  });
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'tomorrow'
  const [statusFilter, setStatusFilter] = useState('all');

  
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [countdown, setCountdown] = useState(0); // Force re-render for countdown
  const [chatOpen, setChatOpen] = useState(false);
  const [chatAppointment, setChatAppointment] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({}); // Store unread message counts by appointmentId
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // Sidebar menu items
  const menuItems = [
    { path: '/doctor/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/doctor/appointments', label: 'Appointments', icon: <CalendarMonth />, badge: stats?.todayAppointments || 0 },
    { path: '/doctor/patients', label: 'My Patients', icon: <People /> },
    { path: '/doctor/consultations', label: 'Consultations', icon: <VideoCall /> },
    { path: '/doctor/prescriptions', label: 'Prescriptions', icon: <Assignment /> },
    { path: '/doctor/earnings', label: 'Earnings', icon: <AttachMoney /> },
    { path: '/doctor/schedule', label: 'Schedule', icon: <Schedule /> },
    { path: '/doctor/profile', label: 'Profile', icon: <VerifiedUser /> },
  ];

  useEffect(() => {
    fetchAppointments();
    fetchStats();
  }, []);

  // Update countdown every second for appointments
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await doctorAPI.getDashboardStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      console.log('Fetching appointments from API...');
      const response = await doctorAPI.getMyAppointments({ limit: 100 });
      console.log('API Response:', response);
      if (response.success) {
        const appointmentsList = response.data.appointments || [];
        console.log('Appointments received:', appointmentsList.length);
        setAppointments(appointmentsList);
        
        // Categorize appointments
        const categorized = {
          upcoming: [],
          past: [],
          cancelled: []
        };

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        appointmentsList.forEach(apt => {
          // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
          const dateStr = apt.appointmentDate.split('T')[0];
          const [year, month, day] = dateStr.split('-').map(Number);
          const aptDate = new Date(year, month - 1, day);
          aptDate.setHours(0, 0, 0, 0);

          if (apt.status === 'cancelled') {
            categorized.cancelled.push(apt);
          } else if (aptDate >= now && (apt.status === 'confirmed' || apt.status === 'pending')) {
            categorized.upcoming.push(apt);
          } else {
            categorized.past.push(apt);
          }
        });

        setAppointmentsByTab(categorized);
        setTabCounts({
          upcoming: categorized.upcoming.length,
          past: categorized.past.length,
          cancelled: categorized.cancelled.length
        });
        
        // Fetch unread message counts for each appointment
        fetchUnreadCounts(appointmentsList);
      } else {
        console.error('API returned success: false');
        setAppointments([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
      setLoading(false);
    }
  };

  const fetchUnreadCounts = async (appointmentsList) => {
    try {
      const countsMap = {};
      
      // Fetch unread count for each appointment in parallel
      await Promise.all(
        appointmentsList.map(async (appointment) => {
          try {
            const response = await api.get(`/v1/chat/${appointment._id}/unread`);
            if (response.data.success && response.data.data) {
              countsMap[appointment._id] = response.data.data.count || 0;
            }
          } catch (error) {
            // Ignore errors for individual appointments
            countsMap[appointment._id] = 0;
          }
        })
      );
      
      setUnreadCounts(countsMap);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  };

  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setDetailsDialogOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsDialogOpen(false);
    setSelectedAppointment(null);
  };

  const handleOpenChat = (appointment) => {
    setChatAppointment(appointment);
    setChatOpen(true);
  };

  const handleCloseChat = async () => {
    // Refresh unread count for the chat appointment when closing
    if (chatAppointment) {
      try {
        const response = await api.get(`/v1/chat/${chatAppointment._id}/unread`);
        if (response.data.success && response.data.data) {
          setUnreadCounts(prev => ({
            ...prev,
            [chatAppointment._id]: response.data.data.count || 0
          }));
        }
      } catch (error) {
        console.log('Error fetching unread count');
      }
    }
    setChatOpen(false);
    setChatAppointment(null);
  };

  // Check if within 1 hour of appointment (for enabling/disabling reschedule/cancel)
  const isWithinOneHour = (appointmentDate, appointmentTime) => {
    const aptDateTime = new Date(appointmentDate);
    const timeMatch = appointmentTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const period = timeMatch[3].toUpperCase();
      
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      aptDateTime.setHours(hours, minutes, 0, 0);
    }

    const now = new Date();
    const oneHourBefore = new Date(aptDateTime.getTime() - 60 * 60 * 1000);

    return now >= oneHourBefore;
  };

  const handleOpenReschedule = (appointment) => {
    setAppointmentToReschedule(appointment);
    setRescheduleModalOpen(true);
  };

  const handleCloseReschedule = () => {
    setRescheduleModalOpen(false);
    setAppointmentToReschedule(null);
  };

  const handleConfirmReschedule = async (rescheduleData) => {
    try {
      const response = await doctorAPI.rescheduleAppointment(appointmentToReschedule._id, {
        newAppointmentDate: rescheduleData.date,
        newAppointmentTime: rescheduleData.time
      });

      if (response.success) {
        toast.success('Reschedule request sent to patient. They have 1 hour to respond.');
        fetchAppointments(); // Refresh the list
        handleCloseReschedule();
      } else {
        toast.error(response.message || 'Failed to reschedule appointment');
      }
    } catch (error) {
      console.error('Reschedule error:', error);
      toast.error(error.response?.data?.message || 'Failed to reschedule appointment');
    }
  };

  const handleOpenCancelConfirm = (appointment) => {
    setAppointmentToCancel(appointment);
    setCancelConfirmOpen(true);
    setCancelReason('');
  };

  const handleCloseCancelConfirm = () => {
    setCancelConfirmOpen(false);
    setAppointmentToCancel(null);
    setCancelReason('');
  };

  const handleConfirmCancel = async () => {
    try {
      const response = await doctorAPI.cancelAppointment(
        appointmentToCancel._id, 
        cancelReason || 'Cancelled by doctor'
      );

      if (response.success) {
        toast.success(response.data.message || 'Appointment cancelled successfully. Full refund processed.');
        fetchAppointments(); // Refresh the list
        handleCloseCancelConfirm();
      } else {
        toast.error(response.message || 'Failed to cancel appointment');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel appointment');
    }
  };

  const tabs = [
    { id: 'upcoming', label: 'Upcoming', count: tabCounts.upcoming },
    { id: 'past', label: 'Past', count: tabCounts.past },
    { id: 'cancelled', label: 'Cancelled', count: tabCounts.cancelled }
  ];

  const getTimeRemaining = (appointmentDate, appointmentTime) => {
    // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
    const dateStr = appointmentDate.split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);
    const aptDate = new Date(year, month - 1, day);
    
    if (appointmentTime && typeof appointmentTime === 'string') {
      const timeMatch = appointmentTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const meridiem = timeMatch[3].toUpperCase();
        
        if (meridiem === 'PM' && hours !== 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;
        
        aptDate.setHours(hours, minutes, 0, 0);
      }
    }
    
    const now = new Date();
    const timeDiff = aptDate - now;
    const totalMinutes = Math.floor(timeDiff / 60000);
    const totalHours = Math.floor(totalMinutes / 60);
    const days = Math.floor(totalHours / 24);
    
    if (days > 1) return `In ${days} days`;
    if (days === 1) return 'Tomorrow';
    if (totalHours > 0) return `In ${totalHours}h ${totalMinutes % 60}m`;
    if (totalMinutes > 0) return `In ${totalMinutes}m`;
    return 'Now';
  };

  const getJoinStatus = (appointment) => {
    // Check if paid
    if (appointment.paymentStatus !== 'paid') {
      return { canJoin: false, message: 'Payment pending' };
    }
    
    // Check if confirmed
    if (!['confirmed', 'completed'].includes(appointment.status)) {
      return { canJoin: false, message: 'Not confirmed' };
    }
    
    // Check if video consultation
    if (appointment.consultationType !== 'video') {
      return { canJoin: false, message: 'In-person only' };
    }
    
    // Check timing (allow joining 15 minutes before)
    // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
    const dateStr = appointment.appointmentDate.split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);
    const appointmentDateTime = new Date(year, month - 1, day);
    const timeStr = appointment.appointmentTime;
    
    // Parse time (handles formats like "09:00 AM", "03:00 PM")
    if (timeStr && typeof timeStr === 'string') {
      const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const meridiem = timeMatch[3].toUpperCase();
        
        if (meridiem === 'PM' && hours !== 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;
        
        appointmentDateTime.setHours(hours, minutes, 0, 0);
      }
    }
    
    const now = new Date();
    const consultationDuration = appointment.consultationDuration || 15;
    const endTime = new Date(appointmentDateTime.getTime() + consultationDuration * 60 * 1000);
    const fifteenMinsBefore = new Date(appointmentDateTime.getTime() - 15 * 60 * 1000);
    const timeDiff = appointmentDateTime - now;
    const totalMinutes = Math.floor(timeDiff / 60000);
    
    // Debug logging
    console.log('Doctor Join Status Check:', {
      appointmentId: appointment._id,
      appointmentTime: timeStr,
      aptDate: appointmentDateTime.toLocaleString(),
      now: now.toLocaleString(),
      fifteenMinsBefore: fifteenMinsBefore.toLocaleString(),
      endTime: endTime.toLocaleString(),
      totalMinutes,
      canJoinWindow: now >= fifteenMinsBefore && now <= endTime
    });
    
    // Allow joining 15 minutes before and until end time
    const canJoinByTime = now >= fifteenMinsBefore && now <= endTime;
    
    if (canJoinByTime) {
      // Show live countdown when less than 15 min
      if (totalMinutes <= 15 && totalMinutes > 0) {
        const mins = Math.floor(totalMinutes);
        const secs = Math.floor((timeDiff % 60000) / 1000);
        return { canJoin: true, message: `Starting in ${mins}:${secs.toString().padStart(2, '0')}`, isCountdown: true };
      } else if (totalMinutes <= 0) {
        return { canJoin: true, message: 'Start Now', isCountdown: false };
      } else {
        return { canJoin: true, message: 'Start Consultation', isCountdown: false };
      }
    } else if (timeDiff > 0) {
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      const days = Math.floor(hours / 24);
      
      if (days > 1) {
        return { canJoin: false, message: `In ${days} days`, isCountdown: false };
      } else if (days === 1) {
        return { canJoin: false, message: 'Tomorrow', isCountdown: false };
      } else if (hours > 0) {
        return { canJoin: false, message: `In ${hours}h ${mins}m`, isCountdown: false };
      } else {
        return { canJoin: false, message: `In ${mins}m`, isCountdown: false };
      }
    } else {
      return { canJoin: false, message: 'Time passed', isCountdown: false };
    }
  };

  const handleJoinConsultation = (appointmentId) => {
    navigate(`/doctor/consultation/${appointmentId}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
      case 'pending':
        return 'warning';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getModeChip = (mode) => {
    return (
      <Chip
        label={mode === 'video' ? 'Online' : 'Offline'}
        size="small"
        sx={{
          bgcolor: 'transparent',
          border: '1px solid #e0e0e0',
          color: 'text.primary'
        }}
      />
    );
  };

  // Pagination
  const currentAppointments = appointmentsByTab[activeTab] || [];
  const paginatedAppointments = currentAppointments.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  return (
    <DashboardLayout menuItems={menuItems}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" fontWeight="bold" sx={{ color: '#1a237e' }}>
            Appointments
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Chip 
              label={`Total: ${appointments.length}`} 
              color="primary" 
              sx={{ fontSize: '0.9rem', fontWeight: 600 }}
            />
            {/* <Button
              variant="outlined"
              size="small"
              startIcon={<Refresh />}
              onClick={fetchAppointments}
              disabled={loading}
            >
              Refresh
            </Button> */}
          </Box>
        </Box>

        {/* Filters Section */}
        {/* <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant={dateFilter === 'today' ? 'contained' : 'outlined'}
            onClick={() => setDateFilter('today')}
            sx={{ textTransform: 'none' }}
          >
            Today
          </Button>
          <Button
            variant={dateFilter === 'tomorrow' ? 'contained' : 'outlined'}
            onClick={() => setDateFilter('tomorrow')}
            sx={{ textTransform: 'none' }}
          >
            Tomorrow
          </Button>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              displayEmpty
            >
              <MenuItem value="all">Status: All</MenuItem>
              <MenuItem value="pending">Status: Pending</MenuItem>
              <MenuItem value="confirmed">Status: Confirmed</MenuItem>
              <MenuItem value="completed">Status: Completed</MenuItem>
              <MenuItem value="cancelled">Status: Cancelled</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            sx={{ textTransform: 'none', ml: 'auto' }}
          >
            Show Filters
          </Button>
        </Box> */}

        {/* Appointment Tabs */}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-start' }}>
          <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-slate-200 shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </Box>
      </Box>

      {/* Appointments Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-3xl p-20 text-center border border-slate-100">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Loading appointments...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-3xl p-20 text-center border border-slate-100">
            <Alert severity="warning">
              No appointments found. This could mean you don't have any appointments yet or there was an error fetching them.
            </Alert>
          </div>
        ) : currentAppointments.length === 0 ? (
          <div className="bg-white rounded-3xl p-20 text-center border border-slate-100">
            <Alert severity="info">
              <Typography variant="body1" sx={{ mb: 1 }}>
                No {activeTab} appointments
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total appointments: {appointments.length}
              </Typography>
            </Alert>
          </div>
        ) : (
          <>
            <AnimatePresence mode="wait">
              {paginatedAppointments.map((appointment, index) => (
                <motion.div
                  key={appointment._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3">
                    {/* Patient Avatar */}
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center border-2 border-slate-100">
                      <User className="w-7 h-7 text-white" />
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="text-lg font-black text-slate-900">
                              {appointment.patientId?.name || 'N/A'}
                            </h3>
                            <span className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-lg">
                              #{appointment._id?.slice(-6) || 'N/A'}
                            </span>
                          </div>
                          <p className="text-blue-600 font-semibold text-xs mb-0.5">
                            {appointment.patientId?.age || '0'} years, {appointment.patientId?.gender || 'N/A'}
                          </p>
                          <div className="flex items-center gap-1 text-slate-500 text-xs">
                            <PhoneIcon className="w-3 h-3" />
                            <span>{appointment.patientId?.phone || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold ${
                            appointment.status === 'confirmed' ? 'bg-green-50 text-green-600 border border-green-200' :
                            appointment.status === 'completed' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                            appointment.status === 'cancelled' ? 'bg-red-50 text-red-600 border border-red-200' :
                            'bg-yellow-50 text-yellow-600 border border-yellow-200'
                          }`}>
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </span>
                          {appointment.status === 'confirmed' && (() => {
                            const timeRemaining = getTimeRemaining(appointment.appointmentDate, appointment.appointmentTime);
                            return (
                              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                                ⏰ {timeRemaining}
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="flex items-center gap-1.5 text-sm">
                          <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center">
                            <Calendar className="w-3.5 h-3.5 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 font-medium">Date</p>
                            <p className="text-xs font-bold text-slate-900">
                              {new Date(appointment.appointmentDate).toLocaleDateString('en-GB', { 
                                day: 'numeric', 
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center">
                            <Clock className="w-3.5 h-3.5 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 font-medium">Time</p>
                            <p className="text-xs font-bold text-slate-900">{appointment.appointmentTime}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center">
                            <Video className="w-3.5 h-3.5 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 font-medium">Type</p>
                            <p className="text-xs font-bold text-slate-900 capitalize">{appointment.consultationType}</p>
                          </div>
                        </div>
                      </div>

                      {/* Problem/Notes Section */}
                      <div className="bg-slate-50 rounded-lg p-2 mb-3">
                        <p className="text-[10px] text-slate-500 font-medium mb-0.5">Chief Complaint</p>
                        <p className="text-xs font-semibold text-slate-900">
                          {appointment.notes || 'General Consultation'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500">
                            Duration: {appointment.consultationDuration || 15} mins
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          {/* Reschedule Button - Only for upcoming confirmed appointments */}
                          {appointment.status === 'confirmed' && activeTab === 'upcoming' && (
                            <button 
                              onClick={() => handleOpenReschedule(appointment)}
                              disabled={isWithinOneHour(appointment.appointmentDate, appointment.appointmentTime)}
                              className={`px-4 py-2 rounded-xl font-bold transition-all shadow-lg flex items-center gap-1.5 text-sm ${
                                isWithinOneHour(appointment.appointmentDate, appointment.appointmentTime)
                                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                  : 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-100'
                              }`}
                              title={isWithinOneHour(appointment.appointmentDate, appointment.appointmentTime) 
                                ? 'Cannot reschedule within 1 hour of appointment' 
                                : 'Reschedule appointment'}
                            >
                              <CalendarClock className="w-3.5 h-3.5" />
                              Reschedule
                            </button>
                          )}

                          {/* Cancel Button - Only for upcoming confirmed appointments */}
                          {appointment.status === 'confirmed' && activeTab === 'upcoming' && (
                            <button 
                              onClick={() => handleOpenCancelConfirm(appointment)}
                              disabled={isWithinOneHour(appointment.appointmentDate, appointment.appointmentTime)}
                              className={`px-4 py-2 rounded-xl font-bold transition-all shadow-lg flex items-center gap-1.5 text-sm ${
                                isWithinOneHour(appointment.appointmentDate, appointment.appointmentTime)
                                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                  : 'bg-red-600 text-white hover:bg-red-700 shadow-red-100'
                              }`}
                              title={isWithinOneHour(appointment.appointmentDate, appointment.appointmentTime) 
                                ? 'Cannot cancel within 1 hour of appointment' 
                                : 'Cancel appointment'}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Cancel
                            </button>
                          )}

                          {appointment.consultationType === 'video' && (() => {
                            const joinStatus = getJoinStatus(appointment);
                            return (
                              <button 
                                onClick={() => joinStatus.canJoin && handleJoinConsultation(appointment._id)}
                                disabled={!joinStatus.canJoin}
                                className={`px-4 py-2 rounded-xl font-bold transition-all shadow-lg flex items-center gap-1.5 text-sm ${
                                  joinStatus.canJoin 
                                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-100 cursor-pointer' 
                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                <Video className="w-4 h-4" />
                                {joinStatus.message}
                              </button>
                            );
                          })()}
                          <button 
                            onClick={() => handleOpenChat(appointment)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-1.5 text-sm relative"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            Chat
                            {unreadCounts[appointment._id] > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-md"></span>
                            )}
                          </button>
                          <button 
                            onClick={() => handleViewDetails(appointment)}
                            className="px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-all flex items-center gap-1.5 text-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Pagination */}
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'white', borderRadius: 4, border: '1px solid #e2e8f0' }}>
              <Typography variant="body2" color="textSecondary">
                Showing {Math.min((page - 1) * rowsPerPage + 1, currentAppointments.length)} of {currentAppointments.length} results
              </Typography>
              <Pagination
                count={Math.ceil(currentAppointments.length / rowsPerPage)}
                page={page}
                onChange={(e, value) => setPage(value)}
                color="primary"
              />
            </Box>
          </>
        )}
      </div>

      {/* Appointment Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" fontWeight="bold">
              Appointment Details
            </Typography>
            <IconButton onClick={handleCloseDetails} size="small">
              <Box sx={{ fontSize: 24 }}>✕</Box>
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ px: 4, py: 3 }}>
          {selectedAppointment && (
            <Box>
              {/* Patient Information Section */}
              <Box sx={{ mb: 4, p: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <Person sx={{ fontSize: 20 }} />
                  <Typography variant="h6" fontWeight="bold">
                    Patient Information
                  </Typography>
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={2}>
                    <Avatar
                      sx={{
                        width: 80,
                        height: 80,
                        bgcolor: '#4A90E2',
                        fontSize: 32,
                        fontWeight: 'bold'
                      }}
                    >
                      {selectedAppointment.patientId?.name?.charAt(0) || 'P'}
                    </Avatar>
                  </Grid>
                  
                  <Grid item xs={12} md={5}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Patient Name
                      </Typography>
                      <Typography variant="h6" fontWeight="600">
                        {selectedAppointment.patientId?.name || 'N/A'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Age & Gender
                      </Typography>
                      <Typography variant="body1" fontWeight="500">
                        {selectedAppointment.patientId?.age || 'N/A'} years, {selectedAppointment.patientId?.gender || 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={5}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Contact
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Phone sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body1" fontWeight="500">
                          +91 {selectedAppointment.patientId?.phone || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Appointment Information Section */}
              <Box sx={{ mb: 4, p: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <CalendarMonth sx={{ fontSize: 20 }} />
                  <Typography variant="h6" fontWeight="bold">
                    Appointment Information
                  </Typography>
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ 
                        p: 1, 
                        bgcolor: '#E3F2FD', 
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <CalendarMonth sx={{ fontSize: 20, color: '#1976d2' }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Appointment Date
                        </Typography>
                        <Typography variant="body1" fontWeight="600">
                          {new Date(selectedAppointment.appointmentDate).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ 
                        p: 1, 
                        bgcolor: '#FFF3E0', 
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <AccessTime sx={{ fontSize: 20, color: '#f57c00' }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Appointment Time
                        </Typography>
                        <Typography variant="body1" fontWeight="600">
                          {selectedAppointment.appointmentTime}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ 
                        p: 1, 
                        bgcolor: '#F3E5F5', 
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <VideoCall sx={{ fontSize: 20, color: '#7b1fa2' }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Consultation Type
                        </Typography>
                        <Chip
                          label={selectedAppointment.consultationType === 'video' ? 'Online Consultation' : 'Offline Consultation'}
                          size="small"
                          sx={{ 
                            fontWeight: 600,
                            bgcolor: '#f5f5f5',
                            color: 'text.primary'
                          }}
                        />
                      </Box>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ 
                        p: 1, 
                        bgcolor: '#FFF3E0', 
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <CheckCircle sx={{ fontSize: 20, color: '#f57c00' }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Status
                        </Typography>
                        <Chip
                          label={selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                          color={getStatusColor(selectedAppointment.status)}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Payment Information Section */}
              <Box sx={{ mb: 2, p: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <AttachMoney sx={{ fontSize: 20 }} />
                  <Typography variant="h6" fontWeight="bold">
                    Payment Information
                  </Typography>
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ 
                        p: 1, 
                        bgcolor: '#E8F5E9', 
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Box sx={{ fontSize: 20, color: '#2e7d32', fontWeight: 'bold' }}>₹</Box>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Amount Paid
                        </Typography>
                        <Typography variant="h5" fontWeight="700" color="#2e7d32">
                          ₹{selectedAppointment.amount || 0}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ 
                        p: 1, 
                        bgcolor: '#E8F5E9', 
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <CheckCircle sx={{ fontSize: 20, color: '#2e7d32' }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Payment Status
                        </Typography>
                        <Chip
                          label={selectedAppointment.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                          color={selectedAppointment.paymentStatus === 'paid' ? 'success' : 'warning'}
                          size="small"
                          icon={<CheckCircle sx={{ fontSize: 16 }} />}
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ 
                        p: 1, 
                        bgcolor: '#E3F2FD', 
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 36
                      }}>
                        <Box sx={{ fontSize: 16, color: '#1976d2', fontWeight: 'bold' }}>S</Box>
                      </Box>
                      <Box sx={{ flex: 1, overflow: 'hidden' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Payment ID:
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace',
                            wordBreak: 'break-all',
                            fontSize: '0.85rem'
                          }}
                        >
                          {selectedAppointment.paymentId || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ 
                        p: 1, 
                        bgcolor: '#F3E5F5', 
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 36
                      }}>
                        <Box sx={{ fontSize: 16, color: '#7b1fa2', fontWeight: 'bold' }}>#</Box>
                      </Box>
                      <Box sx={{ flex: 1, overflow: 'hidden' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Order ID:
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace',
                            wordBreak: 'break-all',
                            fontSize: '0.85rem'
                          }}
                        >
                          {selectedAppointment.orderId || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 4, py: 2 }}>
          <Button 
            onClick={handleCloseDetails}
            variant="contained"
            sx={{ 
              textTransform: 'none',
              px: 4,
              py: 1,
              borderRadius: 2,
              fontWeight: 600
            }}
          >
            CLOSE
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Chat Window */}
      <ChatWindow 
        isOpen={chatOpen}
        onClose={handleCloseChat}
        appointment={chatAppointment}
      />

      {/* Reschedule Modal */}
      <RescheduleModal  
        isOpen={rescheduleModalOpen}
        onClose={handleCloseReschedule}
        appointment={appointmentToReschedule}
        doctorId={appointmentToReschedule?.doctorId?._id}
        onConfirm={handleConfirmReschedule}
      />

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={cancelConfirmOpen}
        onClose={handleCloseCancelConfirm}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 20 }}>
          Cancel Appointment
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Alert severity="warning" sx={{ mb: 3 }}>
              This action will cancel the appointment and process a full refund to the patient.
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Please provide a reason for cancellation (optional):
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g., Emergency, Rescheduling needed, etc."
              variant="outlined"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={handleCloseCancelConfirm}
            sx={{ 
              textTransform: 'none',
              px: 3,
              py: 1,
              borderRadius: 2,
              fontWeight: 600
            }}
          >
            Go Back
          </Button>
          <Button 
            onClick={handleConfirmCancel}
            variant="contained"
            color="error"
            sx={{ 
              textTransform: 'none',
              px: 3,
              py: 1,
              borderRadius: 2,
              fontWeight: 600
            }}
          >
            Confirm Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default DoctorAppointments;
