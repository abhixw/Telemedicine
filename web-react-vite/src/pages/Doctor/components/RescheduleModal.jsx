import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  X, 
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { patientAPI } from '../../../api/patient.api';

const RescheduleModal = ({ isOpen, onClose, appointment, doctorId, onConfirm }) => {
  const [step, setStep] = useState(1);
  const [rescheduleData, setRescheduleData] = useState({
    date: '',
    time: ''
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Generate next 14 days
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        full: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: date.getDate(),
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        isAvailable: true
      });
    }
    return dates;
  };

  const [availableDates] = useState(generateDates());

  // Time slots - 15 minute intervals
  const allTimeSlots = [
    '09:00 AM', '09:15 AM', '09:30 AM', '09:45 AM', '10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM', 
    '11:00 AM', '11:15 AM', '11:30 AM', '11:45 AM',
    '12:00 PM', '12:15 PM', '12:30 PM', '12:45 PM', '01:00 PM', '01:15 PM', '01:30 PM', '01:45 PM',
    '02:00 PM', '02:15 PM', '02:30 PM', '02:45 PM', '03:00 PM', '03:15 PM', '03:30 PM', '03:45 PM', 
    '04:00 PM', '04:15 PM', '04:30 PM', '04:45 PM', '05:00 PM','11:20 PM'
  ];

  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (rescheduleData.date && doctorId) {
        setLoadingSlots(true);
        try {
          console.log('[RescheduleModal] Fetching booked slots for:', { doctorId, date: rescheduleData.date });
          const response = await patientAPI.getBookedSlots(doctorId, rescheduleData.date);
          console.log('[RescheduleModal] Booked slots response:', response);
          
          const booked = response.data?.bookedSlots || [];
          console.log('[RescheduleModal] Booked slots array:', booked);
          
          // Exclude the current appointment's slot if rescheduling to the same date
          const currentAppointmentDate = appointment?.appointmentDate 
            ? new Date(appointment.appointmentDate).toISOString().split('T')[0]
            : null;
          
          const filteredBooked = (rescheduleData.date === currentAppointmentDate && appointment?.appointmentTime)
            ? booked.filter(slot => slot !== appointment.appointmentTime)
            : booked;
          
          console.log('[RescheduleModal] Filtered booked slots:', filteredBooked);
          
          setBookedSlots(filteredBooked);
          const available = allTimeSlots.filter(slot => !filteredBooked.includes(slot));
          console.log('[RescheduleModal] Available slots:', available.length);
          setAvailableSlots(available);
        } catch (error) {
          console.error('Error fetching booked slots:', error);
          // On error, show all slots as available
          toast.error('Could not load booked slots. Showing all slots.');
          setAvailableSlots(allTimeSlots);
          setBookedSlots([]);
        } finally {
          setLoadingSlots(false);
        }
      }
    };

    fetchBookedSlots();
  }, [rescheduleData.date, doctorId, appointment]);

  const handleClose = () => {
    onClose();
    setStep(1);
    setRescheduleData({ date: '', time: '' });
    setAvailableSlots([]);
    setBookedSlots([]);
  };

  const handleConfirm = () => {
    if (rescheduleData.date && rescheduleData.time) {
      onConfirm(rescheduleData);
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
            <div>
              <h2 className="text-[20px] font-semibold text-[#0F172A]">
                Reschedule Appointment
              </h2>
              <p className="text-[12px] text-[#64748B] mt-1">
                {step === 1 && 'Select a new date'}
                {step === 2 && 'Choose a new time slot'}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-[#F8FAFC] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#64748B]" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="px-6 pt-4">
            <div className="flex items-center gap-2">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div className={`h-1 flex-1 rounded-full transition-all ${
                    s <= step ? 'bg-[#2563EB]' : 'bg-[#E2E8F0]'
                  }`} />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] font-medium text-[#64748B]">Date</span>
              <span className="text-[10px] font-medium text-[#64748B]">Time</span>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 overflow-y-auto max-h-[60vh]">
            <AnimatePresence mode="wait">
              {/* Step 1: Select Date */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-[16px] font-semibold text-[#0F172A] mb-4">
                      Select New Date
                    </h3>
                    <div className="grid grid-cols-7 gap-2">
                      {availableDates.map((date, index) => (
                        <button
                          key={index}
                          onClick={() => date.isAvailable && setRescheduleData({ ...rescheduleData, date: date.full })}
                          disabled={!date.isAvailable}
                          className={`p-3 rounded-lg transition-all text-center ${
                            rescheduleData.date === date.full
                              ? 'bg-[#2563EB] text-white'
                              : date.isAvailable
                              ? 'bg-[#F8FAFC] hover:bg-[#E2E8F0] text-[#0F172A]'
                              : 'bg-[#F8FAFC] text-[#CBD5E1] cursor-not-allowed opacity-50'
                          }`}
                        >
                          <div className="text-[10px] font-medium mb-1">{date.day}</div>
                          <div className="text-[14px] font-semibold">{date.date}</div>
                          <div className="text-[10px]">{date.month}</div>
                        </button>
                      ))}
                    </div>
                    {rescheduleData.date && (
                      <p className="text-[12px] text-[#16A34A] mt-3 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Date selected: {new Date(rescheduleData.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Select Time */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-[16px] font-semibold text-[#0F172A] mb-4">
                      Available Time Slots
                    </h3>
                    {loadingSlots ? (
                      <div className="text-center py-8 bg-[#F8FAFC] rounded-lg">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB] mx-auto mb-2"></div>
                        <p className="text-[14px] font-medium text-[#64748B]">Loading slots...</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-4 gap-3">
                          {allTimeSlots.map((slot, index) => {
                            const isBooked = bookedSlots.includes(slot);
                            const isAvailable = !isBooked; // If not booked, it's available
                            
                            return (
                              <button
                                key={index}
                                onClick={() => isAvailable && setRescheduleData({ ...rescheduleData, time: slot })}
                                disabled={isBooked}
                                className={`py-3 px-2 rounded-lg text-[12px] font-medium transition-all relative ${
                                  rescheduleData.time === slot
                                    ? 'bg-[#2563EB] text-white'
                                    : isBooked
                                    ? 'bg-[#FEE2E2] text-[#991B1B] cursor-not-allowed opacity-75 line-through'
                                    : 'bg-[#F8FAFC] hover:bg-[#E2E8F0] text-[#0F172A] border border-[#E2E8F0]'
                                }`}
                                title={isBooked ? 'This slot is already booked' : 'Available'}
                              >
                                {slot}
                                {isBooked && (
                                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#DC2626] rounded-full flex items-center justify-center">
                                    <X className="w-3 h-3 text-white" />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {bookedSlots.length > 0 && (
                          <div className="mt-4 p-3 bg-[#FEF3C7] border border-[#FDE047] rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-[#CA8A04] mt-0.5 flex-shrink-0" />
                            <p className="text-[12px] text-[#92400E]">
                              <strong>{bookedSlots.length}</strong> slot{bookedSlots.length > 1 ? 's are' : ' is'} already booked.
                              {availableSlots.length > 0 
                                ? ` ${availableSlots.length} slot${availableSlots.length > 1 ? 's are' : ' is'} still available.`
                                : ' All slots are taken for this date.'}
                            </p>
                          </div>
                        )}
                        {bookedSlots.length === allTimeSlots.length && (
                          <div className="mt-4 text-center py-8 bg-[#FEF3C7] rounded-lg">
                            <AlertCircle className="w-8 h-8 text-[#F59E0B] mx-auto mb-2" />
                            <p className="text-[14px] font-medium text-[#92400E]">No slots available</p>
                            <p className="text-[12px] text-[#92400E] mt-1">All slots are booked for this date. Please select another date.</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#E2E8F0] flex items-center justify-between">
            <button
              onClick={() => step > 1 ? setStep(step - 1) : handleClose()}
              className="flex items-center gap-2 px-4 py-2.5 text-[#64748B] hover:text-[#0F172A] font-medium rounded-lg hover:bg-[#F8FAFC] transition-all text-[14px]"
            >
              <ChevronLeft className="w-4 h-4" />
              {step === 1 ? 'Cancel' : 'Back'}
            </button>

            <button
              onClick={() => {
                if (step === 1 && rescheduleData.date) setStep(2);
                else if (step === 2 && rescheduleData.time) handleConfirm();
              }}
              disabled={
                (step === 1 && !rescheduleData.date) ||
                (step === 2 && !rescheduleData.time)
              }
              className="flex items-center gap-2 px-6 py-2.5 bg-[#2563EB] text-white rounded-lg font-medium hover:bg-[#1D4ED8] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-[14px]"
            >
              {step === 2 ? 'Confirm Reschedule' : 'Continue'}
              {step === 1 && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RescheduleModal;
