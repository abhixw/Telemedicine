/**
 * Admin API Service
 * All admin-related API calls
 */
import api from '../config/axios';

export const adminAPI = {
  /**
   * Get dashboard statistics
   * @returns {Promise} Dashboard stats
   */
  getDashboardStats: async () => {
    const response = await api.get('/v1/admin/dashboard/stats');
    return response.data;
  },

  /**
   * Get recent registrations
   * @returns {Promise} Recent registrations
   */
  getRecentRegistrations: async () => {
    const response = await api.get('/v1/admin/dashboard/recent-registrations');
    return response.data;
  },

  /**
   * Get all users
   * @param {Object} params - Query parameters
   * @returns {Promise} Users list
   */
  getUsers: async (params = {}) => {
    const response = await api.get('/v1/admin/users', { params });
    return response.data;
  },

  /**
   * Get all doctors
   * @param {Object} params - Query parameters
   * @returns {Promise} Doctors list
   */
  getDoctors: async (params = {}) => {
    const response = await api.get('/v1/admin/doctors', { params });
    return response.data;
  },

  /**
   * Get all patients
   * @param {Object} params - Query parameters
   * @returns {Promise} Patients list
   */
  getPatients: async (params = {}) => {
    const response = await api.get('/v1/admin/patients', { params });
    return response.data;
  },

  /**
   * Update user status
   * @param {string} userId - User ID
   * @param {Object} data - Status update data
   * @returns {Promise} Updated user
   */
  updateUserStatus: async (userId, data) => {
    const response = await api.put(`/v1/admin/users/${userId}/status`, data);
    return response.data;
  },

  /**
   * Get doctor by ID
   * @param {string} doctorId - Doctor ID
   * @returns {Promise} Doctor details
   */
  getDoctorById: async (doctorId) => {
    const response = await api.get(`/v1/admin/doctors/${doctorId}`);
    return response.data;
  },

  /**
   * Get patient by ID
   * @param {string} patientId - Patient ID
   * @returns {Promise} Patient details
   */
  getPatientById: async (patientId) => {
    const response = await api.get(`/v1/admin/patients/${patientId}`);
    return response.data;
  },

  /**
   * Get all appointments
   * @param {Object} params - Query parameters (status, date, search)
   * @returns {Promise} Appointments list
   */
  getAllAppointments: async (params = {}) => {
    const response = await api.get('/v1/admin/appointments', { params });
    return response.data;
  },

  /**
   * Get appointments trend
   * @param {number} days - Number of days (default: 30)
   * @returns {Promise} Appointments trend data
   */
  getAppointmentsTrend: async (days = 30) => {
    const response = await api.get('/v1/admin/analytics/appointments-trend', { params: { days } });
    return response.data;
  },

  /**
   * Get appointment status distribution
   * @returns {Promise} Status distribution data
   */
  getStatusDistribution: async () => {
    const response = await api.get('/v1/admin/analytics/status-distribution');
    return response.data;
  },

  /**
   * Get top performing doctors
   * @param {number} limit - Number of doctors (default: 5)
   * @returns {Promise} Top doctors data
   */
  getTopDoctors: async (limit = 5) => {
    const response = await api.get('/v1/admin/analytics/top-doctors', { params: { limit } });
    return response.data;
  },

  /**
   * Get peak hours analysis
   * @returns {Promise} Peak hours data
   */
  getPeakHours: async () => {
    const response = await api.get('/v1/admin/analytics/peak-hours');
    return response.data;
  },

  /**
   * Get specialty distribution
   * @returns {Promise} Specialty distribution data
   */
  getSpecialtyDistribution: async () => {
    const response = await api.get('/v1/admin/analytics/specialty-distribution');
    return response.data;
  },

  /**
   * Get revenue analytics
   * @param {number} days - Number of days (default: 30)
   * @returns {Promise} Revenue analytics data
   */
  getRevenueAnalytics: async (days = 30) => {
    const response = await api.get('/v1/admin/analytics/revenue', { params: { days } });
    return response.data;
  },

  /**
   * Get pending doctors for approval
   * @returns {Promise} Pending doctors list
   */
  getPendingDoctors: async () => {
    const response = await api.get('/v1/admin/doctors/pending');
    return response.data;
  },

  /**
   * Approve a doctor
   * @param {string} doctorId - Doctor ID
   * @returns {Promise} Approval response
   */
  approveDoctor: async (doctorId) => {
    const response = await api.put(`/v1/admin/doctors/${doctorId}/approve`);
    return response.data;
  },

  /**
   * Reject a doctor
   * @param {string} doctorId - Doctor ID
   * @param {string} reason - Rejection reason
   * @returns {Promise} Rejection response
   */
  rejectDoctor: async (doctorId, reason) => {
    const response = await api.put(`/v1/admin/doctors/${doctorId}/reject`, { reason });
    return response.data;
  },
};
