const express = require('express');
const router = express.Router();
const multer = require('multer');
const medicalReportController = require('../controllers/medicalReport.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isPatient } = require('../middleware/role.middleware');

// Multer config for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/heic',
        'image/heif'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF and image files (JPEG, PNG, WebP, HEIC) are allowed'), false);
    }
};

// 10MB max file size
const upload = multer({ 
    storage, 
    fileFilter, 
    limits: { fileSize: 10 * 1024 * 1024 }
});

// All routes require authentication
router.use(authenticate);

// Get available specialties (no patient role check needed)
router.get('/specialties', medicalReportController.getSpecialties);

// Get doctors by specialty (no patient role check needed)
router.get('/doctors/by-specialty', medicalReportController.getDoctorsBySpecialty);

// Patient-only routes
router.post('/upload', isPatient, upload.single('reportFile'), medicalReportController.uploadReport);
router.get('/history', isPatient, medicalReportController.getMedicalHistory);
router.get('/', isPatient, medicalReportController.getMyReports);
router.get('/:reportId', isPatient, medicalReportController.getReportById);
router.get('/:reportId/analysis', isPatient, medicalReportController.getReportAnalysis);
router.post('/:reportId/select-doctor', isPatient, medicalReportController.selectDoctor);
router.post('/:reportId/select-specialty', isPatient, medicalReportController.selectSpecialtyManually);
router.post('/:reportId/reanalyze', isPatient, medicalReportController.reanalyzeReport);
router.delete('/:reportId', isPatient, medicalReportController.deleteReport);

module.exports = router;
