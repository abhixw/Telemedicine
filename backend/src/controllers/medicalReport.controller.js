const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, S3_BUCKET } = require('../config/s3');
const MedicalReport = require('../models/MedicalReport');
const ReportAnalysis = require('../models/ReportAnalysis');
const Doctor = require('../models/Doctor');
const { 
    processReport, 
    reAnalyzeReport, 
    getAvailableSpecialties 
} = require('../services/reportProcessing.service');
const { successResponse, errorResponse } = require('../utils/response.util');
const logger = require('../config/logger');

/**
 * Upload a medical report
 * POST /api/medical-reports/upload
 */
exports.uploadReport = async (req, res) => {
    try {
        const { reportType, reportTitle, description, reportDate } = req.body;
        const file = req.file;
        
        if (!file) {
            return errorResponse(res, 'No file uploaded', 400);
        }
        
        if (!reportType || !reportTitle) {
            return errorResponse(res, 'Report type and title are required', 400);
        }
        
        const patientId = req.user._id;
        
        // Generate unique filename
        const timestamp = Date.now();
        const fileExtension = file.originalname.split('.').pop();
        const s3Key = `medical-reports/${patientId}/${timestamp}-${file.originalname}`;
        
        // Upload to S3
        const uploadParams = {
            Bucket: S3_BUCKET,
            Key: s3Key,
            Body: file.buffer,
            ContentType: file.mimetype,
            ServerSideEncryption: 'AES256'
        };
        
        await s3Client.send(new PutObjectCommand(uploadParams));
        
        // Generate file URL
        const fileUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
        
        // Create medical report record
        const medicalReport = new MedicalReport({
            patientId,
            reportType,
            reportTitle,
            description: description || '',
            fileUrl,
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            s3Key,
            reportDate: reportDate ? new Date(reportDate) : new Date(),
            processingStatus: 'pending'
        });
        
        await medicalReport.save();
        
        // Process report asynchronously (don't wait for completion)
        processReport(medicalReport._id.toString(), file.buffer)
            .then(() => {
                logger.info(`Report ${medicalReport._id} processed successfully`);
            })
            .catch((error) => {
                logger.error(`Error processing report ${medicalReport._id}:`, error);
            });
        
        logger.info(`Medical report uploaded by patient ${patientId}`);
        
        return successResponse(res, {
            message: 'Report uploaded successfully. Processing in background.',
            report: medicalReport
        }, 201);
        
    } catch (error) {
        logger.error('Error uploading medical report:', error);
        return errorResponse(res, 'Failed to upload report', 500);
    }
};

/**
 * Get all reports for the logged-in patient
 * GET /api/medical-reports
 */
exports.getMyReports = async (req, res) => {
    try {
        const patientId = req.user._id;
        const { status, reportType, limit = 20, page = 1 } = req.query;
        
        const query = { patientId, isActive: true };
        
        if (status) {
            query.processingStatus = status;
        }
        
        if (reportType) {
            query.reportType = reportType;
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const reports = await MedicalReport.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);
        
        const total = await MedicalReport.countDocuments(query);
        
        return successResponse(res, {
            reports,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
        
    } catch (error) {
        logger.error('Error fetching medical reports:', error);
        return errorResponse(res, 'Failed to fetch reports', 500);
    }
};

/**
 * Get a specific report with analysis
 * GET /api/medical-reports/:reportId
 */
exports.getReportById = async (req, res) => {
    try {
        const { reportId } = req.params;
        const patientId = req.user._id;
        
        const report = await MedicalReport.findOne({ 
            _id: reportId, 
            patientId,
            isActive: true 
        });
        
        if (!report) {
            return errorResponse(res, 'Report not found', 404);
        }
        
        // Get analysis if available
        const analysis = await ReportAnalysis.findOne({ reportId: report._id })
            .populate('userAction.selectedDoctorId', 'name specialization profileImage')
            .populate('userAction.appointmentId', 'appointmentDate status');
        
        return successResponse(res, {
            report,
            analysis: analysis || null
        });
        
    } catch (error) {
        logger.error('Error fetching report:', error);
        return errorResponse(res, 'Failed to fetch report', 500);
    }
};

/**
 * Get report analysis and recommendations
 * GET /api/medical-reports/:reportId/analysis
 */
exports.getReportAnalysis = async (req, res) => {
    try {
        const { reportId } = req.params;
        const patientId = req.user._id;
        
        // Verify report ownership
        const report = await MedicalReport.findOne({ 
            _id: reportId, 
            patientId,
            isActive: true 
        });
        
        if (!report) {
            return errorResponse(res, 'Report not found', 404);
        }
        
        // Check if report is processed
        if (report.processingStatus !== 'completed') {
            return successResponse(res, {
                status: report.processingStatus,
                message: report.processingStatus === 'processing' 
                    ? 'Report is being processed. Please check back in a moment.'
                    : report.processingStatus === 'failed'
                    ? 'Report processing failed. Please try re-uploading.'
                    : 'Report is queued for processing.'
            });
        }
        
        // Get analysis
        const analysis = await ReportAnalysis.findOne({ reportId: report._id });
        
        if (!analysis) {
            return errorResponse(res, 'Analysis not found', 404);
        }
        
        // Get recommended doctors from ALL recommended specialties (not just primary)
        let recommendedDoctors = [];
        
        if (analysis.recommendedSpecialists && analysis.recommendedSpecialists.length > 0) {
            // Extract all specialty names from recommendations
            const specialties = analysis.recommendedSpecialists.map(spec => spec.specialty);
            
            logger.info(`Fetching doctors for specialties: ${specialties.join(', ')}`);
            
            // Find doctors matching ANY of the recommended specialties
            recommendedDoctors = await Doctor.find({
                specialization: { $in: specialties },
                isActive: true
            })
            .select('name specialization experience rating hourlyRate profileImage availability languages hospitalName location hospitalAddress')
            .sort({ rating: -1 })
            .limit(20); // Increased limit to show more doctors from all specialties
            
            logger.info(`Found ${recommendedDoctors.length} doctors across ${specialties.length} specialties`);
        }
        
        return successResponse(res, {
            report,
            analysis,
            recommendedDoctors,
            availableSpecialties: getAvailableSpecialties()
        });
        
    } catch (error) {
        logger.error('Error fetching report analysis:', error);
        return errorResponse(res, 'Failed to fetch analysis', 500);
    }
};

/**
 * Get doctors by specialty (for manual selection or after recommendation)
 * GET /api/medical-reports/doctors/by-specialty
 */
exports.getDoctorsBySpecialty = async (req, res) => {
    try {
        const { specialty, limit = 20, page = 1 } = req.query;
        
        if (!specialty) {
            return errorResponse(res, 'Specialty is required', 400);
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const doctors = await Doctor.find({
            specialization: specialty,
            isActive: true
        })
        .select('name specialization experience rating hourlyRate profileImage availability languages hospitalName location')
        .sort({ rating: -1, experience: -1 })
        .limit(parseInt(limit))
        .skip(skip);
        
        const total = await Doctor.countDocuments({
            specialization: specialty,
            isActive: true
        });
        
        return successResponse(res, {
            specialty,
            doctors,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
        
    } catch (error) {
        logger.error('Error fetching doctors by specialty:', error);
        return errorResponse(res, 'Failed to fetch doctors', 500);
    }
};

/**
 * Record doctor selection
 * POST /api/medical-reports/:reportId/select-doctor
 */
exports.selectDoctor = async (req, res) => {
    try {
        const { reportId } = req.params;
        const { doctorId, specialty } = req.body;
        const patientId = req.user._id;
        
        if (!doctorId) {
            return errorResponse(res, 'Doctor ID is required', 400);
        }
        
        // Verify report ownership
        const report = await MedicalReport.findOne({ 
            _id: reportId, 
            patientId,
            isActive: true 
        });
        
        if (!report) {
            return errorResponse(res, 'Report not found', 404);
        }
        
        // Verify doctor exists
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return errorResponse(res, 'Doctor not found', 404);
        }
        
        // Get or create analysis
        let analysis = await ReportAnalysis.findOne({ reportId: report._id });
        
        if (!analysis) {
            analysis = new ReportAnalysis({
                reportId: report._id,
                patientId: report.patientId
            });
        }
        
        // Record selection
        await analysis.recordDoctorSelection(doctorId, specialty || doctor.specialization);
        
        logger.info(`Patient ${patientId} selected doctor ${doctorId} for report ${reportId}`);
        
        return successResponse(res, {
            message: 'Doctor selection recorded',
            analysis
        });
        
    } catch (error) {
        logger.error('Error recording doctor selection:', error);
        return errorResponse(res, 'Failed to record selection', 500);
    }
};

/**
 * Record manual specialty selection (when auto-detection fails)
 * POST /api/medical-reports/:reportId/select-specialty
 */
exports.selectSpecialtyManually = async (req, res) => {
    try {
        const { reportId } = req.params;
        const { specialty } = req.body;
        const patientId = req.user._id;
        
        if (!specialty) {
            return errorResponse(res, 'Specialty is required', 400);
        }
        
        // Verify report ownership
        const report = await MedicalReport.findOne({ 
            _id: reportId, 
            patientId,
            isActive: true 
        });
        
        if (!report) {
            return errorResponse(res, 'Report not found', 404);
        }
        
        // Get or create analysis
        let analysis = await ReportAnalysis.findOne({ reportId: report._id });
        
        if (!analysis) {
            analysis = new ReportAnalysis({
                reportId: report._id,
                patientId: report.patientId
            });
        }
        
        // Record manual selection
        await analysis.recordManualSelection(specialty);
        
        // Get doctors for this specialty
        const doctors = await Doctor.find({
            specialization: specialty,
            isActive: true
        })
        .select('name specialization experience rating hourlyRate profileImage availability languages hospitalName')
        .sort({ rating: -1 })
        .limit(10);
        
        logger.info(`Patient ${patientId} manually selected specialty ${specialty} for report ${reportId}`);
        
        return successResponse(res, {
            message: 'Specialty selected',
            analysis,
            doctors
        });
        
    } catch (error) {
        logger.error('Error recording specialty selection:', error);
        return errorResponse(res, 'Failed to record selection', 500);
    }
};

/**
 * Get available specialties
 * GET /api/medical-reports/specialties
 */
exports.getSpecialties = async (req, res) => {
    try {
        const specialties = getAvailableSpecialties();
        
        // Get count of doctors for each specialty
        const specialtiesWithCount = await Promise.all(
            specialties.map(async (specialty) => {
                const count = await Doctor.countDocuments({
                    specialization: specialty,
                    isActive: true
                });
                return {
                    name: specialty,
                    doctorCount: count
                };
            })
        );
        
        return successResponse(res, {
            specialties: specialtiesWithCount
        });
        
    } catch (error) {
        logger.error('Error fetching specialties:', error);
        return errorResponse(res, 'Failed to fetch specialties', 500);
    }
};

/**
 * Get medical history (all reports with analysis)
 * GET /api/medical-reports/history
 */
exports.getMedicalHistory = async (req, res) => {
    try {
        const patientId = req.user._id;
        const { limit = 20, page = 1 } = req.query;
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Get all reports with their analysis
        const reports = await MedicalReport.find({ 
            patientId,
            isActive: true,
            processingStatus: 'completed'
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip);
        
        // Get analyses for these reports
        const reportIds = reports.map(r => r._id);
        const analyses = await ReportAnalysis.find({ 
            reportId: { $in: reportIds }
        })
        .populate('userAction.selectedDoctorId', 'name specialization profileImage')
        .populate('userAction.appointmentId', 'appointmentDate status');
        
        // Combine reports with analyses
        const history = reports.map(report => {
            const analysis = analyses.find(a => a.reportId.toString() === report._id.toString());
            return {
                report,
                analysis: analysis || null
            };
        });
        
        const total = await MedicalReport.countDocuments({ 
            patientId,
            isActive: true,
            processingStatus: 'completed'
        });
        
        return successResponse(res, {
            history,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
        
    } catch (error) {
        logger.error('Error fetching medical history:', error);
        return errorResponse(res, 'Failed to fetch medical history', 500);
    }
};

/**
 * Delete a report
 * DELETE /api/medical-reports/:reportId
 */
exports.deleteReport = async (req, res) => {
    try {
        const { reportId } = req.params;
        const patientId = req.user._id;
        
        const report = await MedicalReport.findOne({ 
            _id: reportId, 
            patientId 
        });
        
        if (!report) {
            return errorResponse(res, 'Report not found', 404);
        }
        
        // Soft delete
        report.isActive = false;
        await report.save();
        
        logger.info(`Report ${reportId} deleted by patient ${patientId}`);
        
        return successResponse(res, {
            message: 'Report deleted successfully'
        });
        
    } catch (error) {
        logger.error('Error deleting report:', error);
        return errorResponse(res, 'Failed to delete report', 500);
    }
};

/**
 * Re-analyze a report (manual trigger)
 * POST /api/medical-reports/:reportId/reanalyze
 */
exports.reanalyzeReport = async (req, res) => {
    try {
        const { reportId } = req.params;
        const patientId = req.user._id;
        
        // Verify report ownership
        const report = await MedicalReport.findOne({ 
            _id: reportId, 
            patientId,
            isActive: true 
        });
        
        if (!report) {
            return errorResponse(res, 'Report not found', 404);
        }
        
        if (report.processingStatus !== 'completed') {
            return errorResponse(res, 'Report is not yet processed', 400);
        }
        
        // Re-analyze
        const result = await reAnalyzeReport(reportId);
        
        logger.info(`Report ${reportId} re-analyzed by patient ${patientId}`);
        
        return successResponse(res, {
            message: 'Report re-analyzed successfully',
            analysis: result.analysis
        });
        
    } catch (error) {
        logger.error('Error re-analyzing report:', error);
        return errorResponse(res, error.message || 'Failed to re-analyze report', 500);
    }
};
