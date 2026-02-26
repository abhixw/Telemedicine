import api from '../config/axios';

/**
 * Create a new prescription (Doctor)
 */
export const createPrescription = async (prescriptionData) => {
  const response = await api.post('/v1/prescriptions', prescriptionData);
  return response.data;
};

/**
 * Get all prescriptions for doctor
 */
export const getDoctorPrescriptions = async (params = {}) => {
  const response = await api.get('/v1/prescriptions/doctor', { params });
  return response.data;
};

/**
 * Get all prescriptions for patient
 */
export const getPatientPrescriptions = async (params = {}) => {
  const response = await api.get('/v1/prescriptions/patient', { params });
  return response.data;
};

/**
 * Get prescription by ID
 */
export const getPrescriptionById = async (id) => {
  const response = await api.get(`/v1/prescriptions/${id}`);
  return response.data;
};

/**
 * Download prescription PDF
 */
export const downloadPrescription = async (id) => {
  const response = await api.get(`/v1/prescriptions/${id}/download`);
  return response.data;
};

/**
 * Verify prescription by QR code
 */
export const verifyPrescription = async (verificationCode) => {
  const response = await api.get(`/v1/prescriptions/verify/${verificationCode}`);
  return response.data;
};

/**
 * Delete prescription
 */
export const deletePrescription = async (id) => {
  const response = await api.delete(`/v1/prescriptions/${id}`);
  return response.data;
};

/**
 * Get the proxy stream URL for a prescription PDF (bypasses S3 permissions)
 */
export const getPdfStreamUrl = (id) => {
  const baseURL = api.defaults.baseURL;
  return `${baseURL}/v1/prescriptions/${id}/pdf`;
};

/**
 * Fetch prescription PDF as blob (with auth headers) via backend proxy
 */
export const getPdfBlob = async (id) => {
  const response = await api.get(`/v1/prescriptions/${id}/pdf`, {
    responseType: 'arraybuffer'
  });
  return response.data;
};

const prescriptionAPI = {
  createPrescription,
  getDoctorPrescriptions,
  getPatientPrescriptions,
  getPrescriptionById,
  downloadPrescription,
  verifyPrescription,
  deletePrescription,
  getPdfStreamUrl,
  getPdfBlob
};

export default prescriptionAPI;
