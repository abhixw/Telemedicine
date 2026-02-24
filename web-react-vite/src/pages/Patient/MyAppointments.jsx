import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Video, 
  Star,
  Download,
  X,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  MessageCircle,
  AlertTriangle,
  Check
} from 'lucide-react';
import { patientAPI } from '../../api';
import toast from 'react-hot-toast';
import api from '../../config/axios';
import ChatWindow from './components/ChatWindow';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert
} from '@mui/material';

const MyAppointments = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [appointments, setAppointments] = useState({
    upcoming: [],
    past: [],
    cancelled: []
  });
  const [loading, setLoading] = useState(true);
  const [tabCounts, setTabCounts] = useState({
    upcoming: 0,
    past: 0,
    cancelled: 0
  });
  const [countdown, setCountdown] = useState(0); // Force re-render for countdown
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({}); // Store unread message counts
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [appointmentToReject, setAppointmentToReject] = useState(null);

  // Fetch appointments
  const fetchAppointments = async () => {
    setLoading(true);
    try {
      // Fetch all appointments at once
      const response = await patientAPI.getAppointments();
      const allAppointments = response.data?.appointments || [];

      // Categorize appointments
      const now = new Date();
      const categorized = {
        upcoming: [],
        past: [],
        cancelled: []
      };

      allAppointments.forEach(apt => {
        // Parse appointment date and time together
        // Handle both appointmentDate and appointmentDateTime
        let aptDate;
        
        if (apt.appointmentDateTime) {
          aptDate = new Date(apt.appointmentDateTime);
        } else {
          // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
          const dateStr = apt.appointmentDate.split('T')[0];
          const [year, month, day] = dateStr.split('-').map(Number);
          // Create date in local timezone
          aptDate = new Date(year, month - 1, day);
        }
        
        const timeStr = apt.appointmentTime;
        
        // Parse time (handles formats like "09:00 AM", "02:00 PM")
        if (timeStr && typeof timeStr === 'string') {
          const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const meridiem = timeMatch[3].toUpperCase();
            
            if (meridiem === 'PM' && hours !== 12) hours += 12;
            if (meridiem === 'AM' && hours === 12) hours = 0;
            
            aptDate.setHours(hours, minutes, 0, 0);
          }
        }
        
        const consultationDuration = apt.consultationDuration || 15; // Default 15 minutes
        const aptEndDate = new Date(aptDate.getTime() + consultationDuration * 60000);
        
        const now = new Date();
        
        if (apt.status === 'cancelled') {
          categorized.cancelled.push(transformAppointment(apt));
        } else if (apt.status === 'completed' || aptEndDate < now) {
          categorized.past.push(transformAppointment(apt, 'completed'));
        } else {
          categorized.upcoming.push(transformAppointment(apt));
        }
      });

      setAppointments(categorized);
      setTabCounts({
        upcoming: categorized.upcoming.length,
        past: categorized.past.length,
        cancelled: categorized.cancelled.length
      });
      
      // Skip unread counts to prevent excessive API calls
      // Uncomment below if you need unread message counts
      // fetchUnreadCounts(allAppointments);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCounts = async (appointmentsList) => {
    try {
      const countsMap = {};
      
      await Promise.all(
        appointmentsList.map(async (apt) => {
          try {
            const response = await api.get(`/v1/chat/${apt._id}/unread`);
            if (response.data.success && response.data.data) {
              countsMap[apt._id] = response.data.data.count || 0;
            }
          } catch (error) {
            countsMap[apt._id] = 0;
          }
        })
      );
      
      setUnreadCounts(countsMap);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  };

  // Transform backend appointment to UI format
  const transformAppointment = (apt, overrideStatus = null) => {
    const doctor = apt.doctorId || {};
    // Handle both appointmentDate and appointmentDateTime formats
    let date;
    if (apt.appointmentDateTime) {
      date = new Date(apt.appointmentDateTime);
    } else {
      // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
      const dateStr = apt.appointmentDate.split('T')[0];
      const [year, month, day] = dateStr.split('-').map(Number);
      // Create date in local timezone
      date = new Date(year, month - 1, day);
    }
    
    // Format date as "Wed, April 26, 2026"
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Extract time from appointmentDateTime if appointmentTime is missing
    const appointmentTime = apt.appointmentTime || 
      (apt.appointmentDateTime ? date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }) : 'Time not set');

    // Get doctor profile image URL or placeholder
    const avatar = doctor.profileImage 
      ? (doctor.profileImage.startsWith('http') 
          ? doctor.profileImage 
          : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}${doctor.profileImage}`)
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name || 'Doctor')}&background=random`;

    // Extract IDs - handle both populated objects and string IDs
    const extractId = (field) => {
      if (!field) return null;
      if (typeof field === 'string') return field;
      return field._id || field.id || null;
    };

    return {
      id: apt._id,
      refNo: `APPT${apt._id.slice(-6).toUpperCase()}`,
      doctor: doctor.name || 'Unknown Doctor',
      doctorId: extractId(apt.doctorId),
      patientId: extractId(apt.patientId),
      specialization: doctor.specialization || 'General Physician',
      hospital: 'City General Hospital', // From mock - can be added to doctor model
      date: formattedDate,
      time: appointmentTime,
      type: apt.consultationType === 'video' ? 'Video Consultation' : 'In-Person Appointment',
      consultationType: apt.consultationType,
      rating: 4.5, // From mock - can be calculated from reviews
      reviews: '120+', // From mock - can be added to doctor model
      fee: apt.amount,
      avatar,
      status: overrideStatus || apt.status,
      paymentStatus: apt.paymentStatus,
      paymentId: apt.paymentId,
      orderId: apt.orderId,
      cancelReason: apt.cancellationReason || null,
      badge: null, // Can add based on doctor rating
      appointmentDate: apt.appointmentDate || apt.appointmentDateTime,
      appointmentTime: appointmentTime,
      consultationDuration: apt.consultationDuration || 15,
      // Reschedule fields
      rescheduleStatus: apt.rescheduleStatus || 'none',
      rescheduleRequestedBy: apt.rescheduleRequestedBy || null,
      rescheduleRequestedAt: apt.rescheduleRequestedAt || null,
      proposedAppointmentDate: apt.proposedAppointmentDate || null,
      proposedAppointmentTime: apt.proposedAppointmentTime || null
    };
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Update countdown every second for upcoming appointments
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'upcoming') {
        setCountdown(prev => prev + 1);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [activeTab]);

  const tabs = [
    { id: 'upcoming', label: 'Upcoming', count: tabCounts.upcoming },
    { id: 'past', label: 'Past', count: tabCounts.past },
    { id: 'cancelled', label: 'Cancelled', count: tabCounts.cancelled }
  ];

  const currentAppointments = appointments[activeTab] || [];

  // Get time remaining in human-readable format
  const getTimeRemaining = (appointmentDate, appointmentTime) => {
    // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
    const dateStr = appointmentDate.split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);
    // Create date in local timezone
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
    
    // More than 24 hours - show days
    if (days > 1) {
      return `In ${days} days`;
    } else if (days === 1) {
      return 'Tomorrow';
    }
    // Same day - show hours and minutes
    else if (totalHours > 0) {
      const mins = totalMinutes % 60;
      return `Starts in ${totalHours}h ${mins}m`;
    }
    // Less than an hour - show minutes
    else if (totalMinutes > 0) {
      return `Starts in ${totalMinutes} min`;
    }
    // Past
    else {
      return 'Time passed';
    }
  };

  // Check if user can join the video consultation and get status message
  const getJoinStatus = (appointmentDate, appointmentTime, consultationDuration = 15) => {
    // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
    const dateStr = appointmentDate.split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);
    // Create date in local timezone
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
    const fifteenMinsBefore = new Date(aptDate.getTime() - 15 * 60 * 1000);
    const endTime = new Date(aptDate.getTime() + consultationDuration * 60 * 1000);
    const timeDiff = aptDate - now;
    const totalMinutes = Math.floor(timeDiff / 60000);
    
    // Can join 15 minutes before and until end time
    if (now >= fifteenMinsBefore && now <= endTime) {
      // Show live countdown when less than 15 min
      if (totalMinutes <= 15 && totalMinutes > 0) {
        const mins = Math.floor(totalMinutes);
        const secs = Math.floor((timeDiff % 60000) / 1000);
        return { canJoin: true, message: `Starting in ${mins}:${secs.toString().padStart(2, '0')}`, isCountdown: true };
      } else if (totalMinutes <= 0) {
        return { canJoin: true, message: 'Join Now', isCountdown: false };
      } else {
        return { canJoin: true, message: 'Join Consultation', isCountdown: false };
      }
    } else if (timeDiff > 0) {
      return { canJoin: false, message: getTimeRemaining(appointmentDate, appointmentTime), isCountdown: false };
    } else {
      return { canJoin: false, message: 'Time passed', isCountdown: false };
    }
  };

  const handleJoinConsultation = (appointmentId) => {
    navigate(`/patient/consultation/${appointmentId}`);
  };

  const handleOpenChat = (appointment) => {
    setSelectedAppointment(appointment);
    setChatOpen(true);
  };

  const handleCloseChat = async () => {
    if (selectedAppointment) {
      try {
        const response = await api.get(`/v1/chat/${selectedAppointment.id}/unread`);
        if (response.data.success && response.data.data) {
          setUnreadCounts(prev => ({
            ...prev,
            [selectedAppointment.id]: response.data.data.count || 0
          }));
        }
      } catch (error) {
        console.log('Error fetching unread count');
      }
    }
    setChatOpen(false);
    setSelectedAppointment(null);
  };

  const handleAcceptReschedule = async (appointmentId) => {
    try {
      const response = await patientAPI.acceptReschedule(appointmentId);
      if (response.success) {
        toast.success('Reschedule accepted! Appointment updated to new date/time.');
        fetchAppointments(); // Refresh list
      } else {
        toast.error(response.message || 'Failed to accept reschedule');
      }
    } catch (error) {
      console.error('Accept reschedule error:', error);
      if (error.response?.data?.message?.includes('expired')) {
        toast.error('Reschedule request expired. Appointment has been cancelled with refund.');
        fetchAppointments(); // Refresh to show cancelled status
      } else {
        toast.error(error.response?.data?.message || 'Failed to accept reschedule');
      }
    }
  };

  const handleOpenRejectConfirm = (appointment) => {
    setAppointmentToReject(appointment);
    setRejectConfirmOpen(true);
  };

  const handleCloseRejectConfirm = () => {
    setRejectConfirmOpen(false);
    setAppointmentToReject(null);
  };

  const handleConfirmRejectReschedule = async () => {
    try {
      const response = await patientAPI.rejectReschedule(appointmentToReject.id);
      if (response.success) {
        toast.success('Appointment cancelled with full refund. You can book another appointment.');
        fetchAppointments(); // Refresh list
        handleCloseRejectConfirm();
      } else {
        toast.error(response.message || 'Failed to reject reschedule');
      }
    } catch (error) {
      console.error('Reject reschedule error:', error);
      toast.error(error.response?.data?.message || 'Failed to reject reschedule');
    }
  };

  const handleCancel = async (appointmentId) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    const reason = prompt('Please provide a reason for cancellation (optional):');
    
    try {
      toast.loading('Cancelling appointment...');
      await patientAPI.cancelAppointment(appointmentId, reason || 'Cancelled by patient');
      toast.dismiss();
      toast.success('Appointment cancelled successfully');
      
      // Refresh appointments
      fetchAppointments();
    } catch (error) {
      toast.dismiss();
      console.error('Failed to cancel appointment:', error);
      toast.error('Failed to cancel appointment');
    }
  };

  const handleDownloadInvoice = (appointmentId) => {
    console.log('Download invoice:', appointmentId);
    toast.info('Invoice download feature coming soon!');
    // TODO: Implement invoice download
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'completed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 mb-2">My Appointments</h1>
        <p className="text-slate-500 font-medium">Track and manage your doctor appointments here.</p>
      </div>

      {/* Tabs & Filters */}
      <div className="flex items-center justify-between">
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

        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
          Filters
        </button>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-3xl p-20 text-center border border-slate-100">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Loading appointments...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {currentAppointments.length > 0 ? (
              currentAppointments.map((appointment, index) => (
                <motion.div
                  key={appointment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all"
                >
                  {/* Reschedule Notification Banner */}
                  {appointment.rescheduleStatus === 'pending' && appointment.proposedAppointmentDate && (
                    <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-amber-900 mb-1">
                            Doctor has requested to reschedule your appointment          
                          </h4>
                          <p className="text-sm text-amber-800 mb-3">
                            <strong>New Date:</strong> {new Date(appointment.proposedAppointmentDate).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                            <br />
                            <strong>New Time:</strong> {appointment.proposedAppointmentTime}
                          </p>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleAcceptReschedule(appointment.id)}
                              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all text-sm"
                            >
                              <Check className="w-4 h-4" />
                              Accept Reschedule
                            </button>
                            <button 
                              onClick={() => handleOpenRejectConfirm(appointment)}
                              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all text-sm"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject & Cancel
                            </button>
                          </div>
                          <p className="text-xs text-amber-700 mt-2">
                            ⏰ You have 1 hour from the reschedule request to respond, or the appointment will be auto-cancelled with refund.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    {/* Doctor Avatar */}
                    <img 
                      src={appointment.avatar} 
                      alt={appointment.doctor}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-100"
                    />

                    {/* Main Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-black text-slate-900">{appointment.doctor}</h3>
                            {appointment.badge && (
                              <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-2 py-1 rounded-md">
                                ⭐ {appointment.badge}
                              </span>
                            )}
                            {activeTab !== 'upcoming' && (
                              <span className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold border ${getStatusColor(appointment.status)}`}>
                                {getStatusIcon(appointment.status)}
                                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                              </span>
                            )}
                          </div>
                          <p className="text-blue-600 font-semibold text-sm mb-1">{appointment.specialization}</p>
                          <div className="flex items-center gap-1 text-slate-500 text-sm">
                            <MapPin className="w-4 h-4" />
                            <span>{appointment.hospital}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1 rounded-lg">
                            Ref. No: {appointment.refNo}
                          </span>
                          {activeTab === 'upcoming' && (
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                              ⏰ {getTimeRemaining(appointment.appointmentDate, appointment.appointmentTime)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-medium">Date</p>
                            <p className="text-sm font-bold text-slate-900">{appointment.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
                            <Clock className="w-4 h-4 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-medium">Time</p>
                            <p className="text-sm font-bold text-slate-900">{appointment.time}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
                            <Video className="w-4 h-4 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-medium">Type</p>
                            <p className="text-sm font-bold text-slate-900">{appointment.type}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-sm font-bold text-slate-900">{appointment.rating}</span>
                            <span className="text-sm text-slate-500">({appointment.reviews} reviews)</span>
                          </div>
                          <span className="text-lg font-black text-slate-900">₹ {appointment.fee}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3">
                          {activeTab === 'upcoming' && (
                            <>
                              {appointment.consultationType === 'video' && 
                               appointment.status === 'confirmed' && 
                               appointment.paymentStatus === 'paid' && (() => {
                                const joinStatus = getJoinStatus(
                                  appointment.appointmentDate, 
                                  appointment.appointmentTime,
                                  appointment.consultationDuration || 15
                                );
                                return (
                                  <button 
                                    onClick={() => joinStatus.canJoin && handleJoinConsultation(appointment.id)}
                                    disabled={!joinStatus.canJoin}
                                    className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 ${
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
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2 relative"
                              >
                                <MessageCircle className="w-4 h-4" />
                                Chat
                                {unreadCounts[appointment.id] > 0 && (
                                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full border-2 border-white shadow-md"></span>
                                )}
                              </button>
                              <button 
                                onClick={() => handleCancel(appointment.id)}
                                className="px-6 py-2.5 border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {activeTab === 'past' && (
                            <button 
                              onClick={() => handleDownloadInvoice(appointment.id)}
                              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2"
                            >
                              <Download className="w-4 h-4" />
                              Download Invoice
                            </button>
                          )}
                          {activeTab === 'cancelled' && appointment.cancelReason && (
                            <span className="text-sm text-slate-500 italic">{appointment.cancelReason}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-3xl p-20 text-center border border-slate-100"
              >
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Calendar size={28} className="text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">No {activeTab} appointments</h3>
                <p className="text-slate-500 font-medium">You don't have any {activeTab} appointments at the moment.</p>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
      
      {/* Chat Window */}
      <ChatWindow 
        isOpen={chatOpen}
        onClose={handleCloseChat}
        appointment={selectedAppointment}
      />

      {/* Reject Reschedule Confirmation Dialog */}
      <Dialog
        open={rejectConfirmOpen}
        onClose={handleCloseRejectConfirm}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 20 }}>
          Reject Reschedule & Cancel Appointment
        </DialogTitle>
        <DialogContent>
          <div style={{ paddingTop: 16 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              If you reject this reschedule request, the appointment will be cancelled and you will receive a full refund.
            </Alert>
            <p style={{ color: '#64748b', marginBottom: 16 }}>
              You can book a new appointment with this or another doctor after cancellation.
            </p>
            <p style={{ color: '#0f172a', fontWeight: 600 }}>
              Are you sure you want to cancel this appointment?
            </p>
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={handleCloseRejectConfirm}
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
            onClick={handleConfirmRejectReschedule}
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
    </div>
  );
};

export default MyAppointments;
