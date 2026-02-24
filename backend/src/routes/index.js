const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const adminRoutes = require('./admin.routes');
const doctorRoutes = require('./doctor.routes');
const appointmentRoutes = require('./appointment.routes');
const videoRoutes = require('./video.routes');
const chatRoutes = require('./chat.routes');
const medicalReportRoutes = require('./medicalReport.routes');

// API v1 routes
router.use('/v1/auth', authRoutes);
router.use('/v1/users', userRoutes);
router.use('/v1/admin', adminRoutes);
router.use('/v1/doctors', doctorRoutes);
router.use('/v1/appointments', appointmentRoutes);
router.use('/v1/video', videoRoutes);
router.use('/v1/chat', chatRoutes);
router.use('/v1/medical-reports', medicalReportRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
