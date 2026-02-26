const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescription.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isDoctor, isPatient } = require('../middleware/role.middleware');

/**
 * @route   POST /api/prescriptions
 * @desc    Create a new prescription (Doctor only)
 * @access  Private (Doctor)
 */
router.post('/', authenticate, isDoctor, prescriptionController.createPrescription);

/**
 * @route   GET /api/prescriptions/doctor
 * @desc    Get all prescriptions created by doctor
 * @access  Private (Doctor)
 */
router.get('/doctor', authenticate, isDoctor, prescriptionController.getDoctorPrescriptions);

/**
 * @route   GET /api/prescriptions/patient
 * @desc    Get all prescriptions for patient
 * @access  Private (Patient)
 */
router.get('/patient', authenticate, isPatient, prescriptionController.getPatientPrescriptions);

/**
 * @route   GET /api/prescriptions/verify/:verificationCode
 * @desc    Verify prescription by QR code (Public)
 * @access  Public
 */
router.get('/verify/:verificationCode', prescriptionController.verifyPrescription);

/**
 * @route   GET /api/prescriptions/:id
 * @desc    Get prescription by ID
 * @access  Private (Doctor/Patient)
 */
router.get('/:id', authenticate, prescriptionController.getPrescriptionById);

/**
 * @route   GET /api/prescriptions/:id/download
 * @desc    Download prescription PDF
 * @access  Private (Doctor/Patient)
 */
router.get('/:id/download', authenticate, prescriptionController.downloadPrescription);

/**
 * @route   GET /api/prescriptions/:id/pdf
 * @desc    Stream prescription PDF directly from S3 (proxy)
 * @access  Private (Doctor/Patient)
 */
router.get('/:id/pdf', authenticate, prescriptionController.streamPrescriptionPDF);

/**
 * @route   DELETE /api/prescriptions/:id
 * @desc    Delete prescription (soft delete)
 * @access  Private (Doctor)
 */
router.delete('/:id', authenticate, isDoctor, prescriptionController.deletePrescription);

module.exports = router;
