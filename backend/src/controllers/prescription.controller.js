const Prescription = require('../models/Prescription');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const { generatePrescriptionPDF, uploadPrescriptionToS3, getPresignedPdfUrl } = require('../services/prescription.service');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, S3_BUCKET } = require('../config/s3');
const { successResponse, errorResponse } = require('../utils/response.util');
const logger = require('../config/logger');

/**
 * Create prescription for a completed appointment
 * POST /api/prescriptions
 */
exports.createPrescription = async (req, res) => {
    try {
        const {
            appointmentId,
            diagnosis,
            medicines,
            testsRecommended,
            followUpDate,
            specialInstructions
        } = req.body;

        const doctorId = req.user._id;

        if (!appointmentId || !diagnosis || !medicines || medicines.length === 0) {
            return errorResponse(res, 'Appointment ID, diagnosis, and at least one medicine are required', 400);
        }

        const appointment = await Appointment.findOne({
            _id: appointmentId,
            doctorId,
            status: 'completed'
        }).populate('patientId');

        if (!appointment) {
            return errorResponse(res, 'Completed appointment not found or access denied', 404);
        }

        const existingPrescription = await Prescription.findOne({ appointmentId, isActive: true });
        if (existingPrescription) {
            return errorResponse(res, 'Prescription already exists for this appointment', 400);
        }

        const patient = appointment.patientId;
        if (!patient) {
            return errorResponse(res, 'Patient not found', 404);
        }

        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return errorResponse(res, 'Doctor not found', 404);
        }

        const calculateAge = (dob) => {
            if (!dob) return 'N/A';
            const today = new Date();
            const birthDate = new Date(dob);
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age;
        };

        const prescription = new Prescription({
            appointmentId,
            patientId: patient._id,
            doctorId,
            diagnosis,
            medicines,
            testsRecommended: testsRecommended || [],
            followUpDate: followUpDate || null,
            specialInstructions: specialInstructions || '',
            pdfUrl: 'pending',
            pdfS3Key: 'pending',
            verificationCode: 'pending'
        });

        await prescription.save();

        // Generate PDF
        const pdfData = {
            prescriptionId: prescription._id.toString(),
            patientName: patient.name,
            patientAge: calculateAge(patient.dateOfBirth),
            patientGender: patient.gender || 'N/A',
            doctorName: doctor.name,
            doctorSpecialization: doctor.specialization,
            doctorLicense: doctor.licenseNumber || doctor.registrationNumber || 'N/A',
            diagnosis,
            medicines,
            testsRecommended: testsRecommended || [],
            followUpDate,
            specialInstructions: specialInstructions || '',
            appointmentDate: appointment.appointmentDate
        };

        const { pdfBuffer, verificationCode } = await generatePrescriptionPDF(pdfData);

        // Upload to S3
        const { pdfUrl, s3Key } = await uploadPrescriptionToS3(pdfBuffer, prescription._id);

        // Update prescription with PDF details
        prescription.pdfUrl = pdfUrl;
        prescription.pdfS3Key = s3Key;
        prescription.verificationCode = verificationCode;
        await prescription.save();

        // Update appointment with prescription reference
        appointment.prescription = diagnosis;
        await appointment.save();

        logger.info(`Prescription created by doctor ${doctorId} for appointment ${appointmentId}`);

        return successResponse(res, {
            message: 'Prescription created successfully',
            prescription
        }, 201);

    } catch (error) {
        logger.error('Error creating prescription:', error);
        return errorResponse(res, 'Failed to create prescription', 500);
    }
};

/**
 * Get all prescriptions for doctor
 * GET /api/prescriptions/doctor
 */
exports.getDoctorPrescriptions = async (req, res) => {
    try {
        const doctorId = req.user._id;
        const { limit = 20, page = 1 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const prescriptions = await Prescription.find({ 
            doctorId,
            isActive: true 
        })
        .populate('patientId', 'name email phone profileImage')
        .populate('appointmentId', 'appointmentDate appointmentTime consultationType')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip);

        const total = await Prescription.countDocuments({ doctorId, isActive: true });

        return successResponse(res, {
            prescriptions,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        logger.error('Error fetching doctor prescriptions:', error);
        return errorResponse(res, 'Failed to fetch prescriptions', 500);
    }
};

/**
 * Get all prescriptions for patient
 * GET /api/prescriptions/patient
 */
exports.getPatientPrescriptions = async (req, res) => {
    try {
        const patientId = req.user._id;
        const { limit = 20, page = 1 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const prescriptions = await Prescription.find({ 
            patientId,
            isActive: true 
        })
        .populate('doctorId', 'name specialization profileImage licenseNumber')
        .populate('appointmentId', 'appointmentDate appointmentTime consultationType')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip);

        const total = await Prescription.countDocuments({ patientId, isActive: true });

        return successResponse(res, {
            prescriptions,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        logger.error('Error fetching patient prescriptions:', error);
        return errorResponse(res, 'Failed to fetch prescriptions', 500);
    }
};

/**
 * Get prescription by ID
 * GET /api/prescriptions/:id
 */
exports.getPrescriptionById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const userRole = req.user.role;

        const prescription = await Prescription.findById(id)
            .populate('patientId', 'name email phone profileImage')
            .populate('doctorId', 'name specialization profileImage licenseNumber')
            .populate('appointmentId', 'appointmentDate appointmentTime consultationType');

        if (!prescription || !prescription.isActive) {
            return errorResponse(res, 'Prescription not found', 404);
        }

        // Check access: patient or doctor who created it
        if (userRole === 'patient' && prescription.patientId._id.toString() !== userId.toString()) {
            return errorResponse(res, 'Access denied', 403);
        }

        if (userRole === 'doctor' && prescription.doctorId._id.toString() !== userId.toString()) {
            return errorResponse(res, 'Access denied', 403);
        }

        // Record view if patient
        if (userRole === 'patient') {
            await prescription.recordView();
        }

        // Generate pre-signed URL for viewing PDF
        let signedPdfUrl = null;
        if (prescription.pdfS3Key && prescription.pdfS3Key !== 'pending') {
            signedPdfUrl = await getPresignedPdfUrl(prescription.pdfS3Key);
        }

        const prescriptionData = prescription.toObject();
        prescriptionData.pdfUrl = signedPdfUrl || prescription.pdfUrl;

        return successResponse(res, { prescription: prescriptionData });

    } catch (error) {
        logger.error('Error fetching prescription:', error);
        return errorResponse(res, 'Failed to fetch prescription', 500);
    }
};

/**
 * Download prescription PDF
 * GET /api/prescriptions/:id/download
 */
exports.downloadPrescription = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const userRole = req.user.role;

        const prescription = await Prescription.findById(id);

        if (!prescription || !prescription.isActive) {
            return errorResponse(res, 'Prescription not found', 404);
        }

        // Check access
        if (userRole === 'patient' && prescription.patientId.toString() !== userId.toString()) {
            return errorResponse(res, 'Access denied', 403);
        }

        if (userRole === 'doctor' && prescription.doctorId.toString() !== userId.toString()) {
            return errorResponse(res, 'Access denied', 403);
        }

        // Record download
        await prescription.recordDownload();

        logger.info(`Prescription ${id} downloaded by ${userRole} ${userId}`);

        // Generate a pre-signed URL (valid for 15 minutes)
        const signedUrl = await getPresignedPdfUrl(prescription.pdfS3Key);

        return successResponse(res, {
            pdfUrl: signedUrl,
            fileName: `prescription_${prescription._id}.pdf`
        });

    } catch (error) {
        logger.error('Error downloading prescription:', error);
        return errorResponse(res, 'Failed to download prescription', 500);
    }
};

/**
 * Verify prescription by QR code
 * GET /api/prescriptions/verify/:verificationCode
 */
exports.verifyPrescription = async (req, res) => {
    try {
        const { verificationCode } = req.params;

        const prescription = await Prescription.findOne({ 
            verificationCode,
            isActive: true 
        })
        .populate('patientId', 'name')
        .populate('doctorId', 'name specialization licenseNumber')
        .populate('appointmentId', 'appointmentDate');

        if (!prescription) {
            return errorResponse(res, 'Invalid verification code', 404);
        }

        return successResponse(res, {
            valid: true,
            prescription: {
                id: prescription._id,
                patientName: prescription.patientId.name,
                doctorName: prescription.doctorId.name,
                doctorSpecialization: prescription.doctorId.specialization,
                doctorLicense: prescription.doctorId.licenseNumber,
                diagnosis: prescription.diagnosis,
                issuedDate: prescription.createdAt,
                consultationDate: prescription.appointmentId.appointmentDate
            }
        });

    } catch (error) {
        logger.error('Error verifying prescription:', error);
        return errorResponse(res, 'Failed to verify prescription', 500);
    }
};

/**
 * Delete prescription (soft delete)
 * DELETE /api/prescriptions/:id
 */
exports.deletePrescription = async (req, res) => {
    try {
        const { id } = req.params;
        const doctorId = req.user._id;

        const prescription = await Prescription.findOne({ 
            _id: id,
            doctorId 
        });

        if (!prescription) {
            return errorResponse(res, 'Prescription not found', 404);
        }

        prescription.isActive = false;
        await prescription.save();

        logger.info(`Prescription ${id} deleted by doctor ${doctorId}`);

        return successResponse(res, {
            message: 'Prescription deleted successfully'
        });

    } catch (error) {
        logger.error('Error deleting prescription:', error);
        return errorResponse(res, 'Failed to delete prescription', 500);
    }
};

/**
 * Stream prescription PDF directly from S3 (proxy)
 * GET /api/prescriptions/:id/pdf
 */
exports.streamPrescriptionPDF = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const userRole = req.user.role;

        const prescription = await Prescription.findById(id);

        if (!prescription || !prescription.isActive) {
            return errorResponse(res, 'Prescription not found', 404);
        }

        // Check access
        if (userRole === 'patient' && prescription.patientId.toString() !== userId.toString()) {
            return errorResponse(res, 'Access denied', 403);
        }

        if (userRole === 'doctor' && prescription.doctorId.toString() !== userId.toString()) {
            return errorResponse(res, 'Access denied', 403);
        }

        if (!prescription.pdfS3Key || prescription.pdfS3Key === 'pending') {
            return errorResponse(res, 'PDF not yet generated', 404);
        }

        // Fetch the PDF directly from S3
        const command = new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: prescription.pdfS3Key
        });

        const s3Response = await s3Client.send(command);

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="prescription_${id}.pdf"`);
        if (s3Response.ContentLength) {
            res.setHeader('Content-Length', s3Response.ContentLength);
        }

        // Pipe the S3 stream directly to the response
        s3Response.Body.pipe(res);

        logger.info(`Prescription ${id} streamed to ${userRole} ${userId}`);

    } catch (error) {
        logger.error('Error streaming prescription PDF:', error);
        return errorResponse(res, 'Failed to load prescription PDF', 500);
    }
};
