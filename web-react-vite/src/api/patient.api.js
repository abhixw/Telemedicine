/**
 * Patient API Service
 * All patient-related API calls
 */
import api from '../config/axios';

export const patientAPI = {
  /**
   * Get patient dashboard statistics
   * @returns {Promise} Dashboard stats
   */
  getDashboardStats: async () => {
    const response = await api.get('/v1/patient/dashboard/stats');
    return response.data;
  },

  /**
   * Get appointments
   * @param {Object} params - Query parameters (status, startDate, endDate, page, limit)
   * @returns {Promise} Appointments list
   */
  getAppointments: async (params = {}) => {
    const response = await api.get('/v1/appointments', { params });
    return response.data;
  },

  /**
   * Cancel appointment
   * @param {String} appointmentId - Appointment ID
   * @param {String} reason - Cancellation reason
   * @returns {Promise} Cancelled appointment
   */
  cancelAppointment: async (appointmentId, reason) => {
    const response = await api.put(`/v1/appointments/${appointmentId}/cancel`, {
      cancellationReason: reason
    });
    return response.data;
  },

  /**
   * Book appointment
   * @param {Object} data - Appointment data
   * @returns {Promise} Created appointment
   */
  bookAppointment: async (data) => {
    const response = await api.post('/v1/patient/appointments', data);
    return response.data;
  },

  /**
   * Get medical records
   * @returns {Promise} Medical records
   */
  getMedicalRecords: async () => {
    const response = await api.get('/v1/patient/medical-records');
    return response.data;
  },

  /**
   * Get all available doctors
   * @returns {Promise} Doctors list
   */
  getDoctors: async (params = {}) => {
    const response = await api.get('/v1/doctors', { params });
    return response.data;
  },

  /**
   * Create Razorpay order for appointment
   * @param {Object} data - Appointment and payment data
   * @returns {Promise} Razorpay order details
   */
  createAppointmentOrder: async (data) => {
    const response = await api.post('/v1/appointments/create-order', data);
    return response.data;
  },

  /**
   * Verify Razorpay payment
   * @param {Object} data - Payment verification data
   * @returns {Promise} Verified appointment
   */
  verifyPayment: async (data) => {
    const response = await api.post('/v1/appointments/verify-payment', data);
    return response.data;
  },

  /**
   * Get booked slots for a doctor on a specific date
   * @param {String} doctorId - Doctor ID
   * @param {String} date - Date in YYYY-MM-DD format
   * @returns {Promise} Array of booked time slots
   */
  getBookedSlots: async (doctorId, date) => {
    const response = await api.get('/v1/appointments/booked-slots', {
      params: { doctorId, date }
    });
    return response.data;
  },

  /**
   * Accept doctor's reschedule request
   * @param {String} appointmentId - Appointment ID
   * @returns {Promise} Updated appointment
   */
  acceptReschedule: async (appointmentId) => {
    const response = await api.put(`/v1/appointments/${appointmentId}/accept-reschedule`);
    return response.data;
  },

  /**
   * Reject doctor's reschedule request (cancels appointment with refund)
   * @param {String} appointmentId - Appointment ID
   * @returns {Promise} Cancelled appointment
   */
  rejectReschedule: async (appointmentId) => {
    const response = await api.put(`/v1/appointments/${appointmentId}/reject-reschedule`);
    return response.data;
  },

  // ========== Medical Report APIs ==========

  /**
   * Upload a medical report
   * @param {FormData} formData - Form data with file and metadata
   * @returns {Promise} Uploaded report
   */
  uploadMedicalReport: async (formData) => {
    const response = await api.post('/v1/medical-reports/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Get all medical reports for the logged-in patient
   * @param {Object} params - Query parameters (status, reportType, page, limit)
   * @returns {Promise} Reports list
   */
  getMedicalReports: async (params = {}) => {
    const response = await api.get('/v1/medical-reports', { params });
    return response.data;
  },

  /**
   * Get a specific medical report with analysis
   * @param {String} reportId - Report ID
   * @returns {Promise} Report with analysis
   */
  getMedicalReportById: async (reportId) => {
    const response = await api.get(`/v1/medical-reports/${reportId}`);
    return response.data;
  },

  /**
   * Get report analysis and recommendations
   * @param {String} reportId - Report ID
   * @returns {Promise} Report analysis with recommended doctors
   */
  getReportAnalysis: async (reportId) => {
    const response = await api.get(`/v1/medical-reports/${reportId}/analysis`);
    return response.data;
  },

  /**
   * Get doctors by specialty
   * @param {String} specialty - Specialty name
   * @param {Object} params - Query parameters (page, limit)
   * @returns {Promise} Doctors list
   */
  getDoctorsBySpecialty: async (specialty, params = {}) => {
    const response = await api.get('/v1/medical-reports/doctors/by-specialty', {
      params: { specialty, ...params }
    });
    return response.data;
  },

  /**
   * Record doctor selection for a report
   * @param {String} reportId - Report ID
   * @param {String} doctorId - Doctor ID
   * @param {String} specialty - Specialty
   * @returns {Promise} Updated analysis
   */
  selectDoctorForReport: async (reportId, doctorId, specialty) => {
    const response = await api.post(`/v1/medical-reports/${reportId}/select-doctor`, {
      doctorId,
      specialty
    });
    return response.data;
  },

  /**
   * Record manual specialty selection
   * @param {String} reportId - Report ID
   * @param {String} specialty - Selected specialty
   * @returns {Promise} Doctors list for the specialty
   */
  selectSpecialtyManually: async (reportId, specialty) => {
    const response = await api.post(`/v1/medical-reports/${reportId}/select-specialty`, {
      specialty
    });
    return response.data;
  },

  /**
   * Get available medical specialties
   * @returns {Promise} Specialties list
   */
  getMedicalSpecialties: async () => {
    const response = await api.get('/v1/medical-reports/specialties');
    return response.data;
  },

  /**
   * Get medical history
   * @param {Object} params - Query parameters (page, limit)
   * @returns {Promise} Medical history
   */
  getMedicalHistory: async (params = {}) => {
    const response = await api.get('/v1/medical-reports/history', { params });
    return response.data;
  },

  /**
   * Delete a medical report
   * @param {String} reportId - Report ID
   * @returns {Promise} Success message
   */
  deleteMedicalReport: async (reportId) => {
    const response = await api.delete(`/v1/medical-reports/${reportId}`);
    return response.data;
  },

  /**
   * Re-analyze a report
   * @param {String} reportId - Report ID
   * @returns {Promise} Updated analysis
   */
  reanalyzeMedicalReport: async (reportId) => {
    const response = await api.post(`/v1/medical-reports/${reportId}/reanalyze`);
    return response.data;
  },
};
