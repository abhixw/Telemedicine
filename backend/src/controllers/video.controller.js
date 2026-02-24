const { RtcTokenBuilder, RtcRole } = require('agora-token');
const Appointment = require('../models/Appointment');
const { successResponse, errorResponse } = require('../utils/response.util');

class VideoController {
    /**
     * Generate Agora RTC token for video consultation
     * @route POST /api/v1/video/token
     */
    async generateToken(req, res, next) {
        try {
            const { appointmentId } = req.body;
            const userId = req.user.firebaseUid;
            const userRole = req.user.role;

            if (!appointmentId) {
                return errorResponse(res, 'Appointment ID is required', 400);
            }

            // Validate appointmentId format
            if (!appointmentId.match(/^[0-9a-fA-F]{24}$/)) {
                return errorResponse(res, 'Invalid appointment ID format', 400);
            }

            // Fetch appointment details
            const appointment = await Appointment.findById(appointmentId)
                .populate('patientId', '_id firebaseUid')
                .populate('doctorId', '_id firebaseUid');

            if (!appointment) {
                return errorResponse(res, 'Appointment not found', 404);
            }

            // Verify user is either the patient or doctor for this appointment
            const isPatient = appointment.patientId?.firebaseUid === userId;
            const isDoctor = appointment.doctorId?.firebaseUid === userId;

            if (!isPatient && !isDoctor) {
                return errorResponse(res, 'Unauthorized to join this consultation', 403);
            }

            // Check if appointment is paid (only for patients)
            if (isPatient && appointment.paymentStatus !== 'paid') {
                return errorResponse(res, 'Payment required to join consultation', 403);
            }

            // Check if appointment is confirmed or completed
            if (!['confirmed', 'completed'].includes(appointment.status)) {
                return errorResponse(res, 'Appointment must be confirmed to join', 400);
            }

            // Generate Agora token
            const appId = process.env.AGORA_APP_ID;
            const appCertificate = process.env.AGORA_APP_CERTIFICATE;
            
            if (!appId || !appCertificate) {
                return errorResponse(res, 'Agora credentials not configured', 500);
            }

            // Use appointmentId as channel name
            const channelName = appointmentId;
            
            // Generate unique UID for this user session (use timestamp + random)
            const uid = 0; // 0 means Agora will auto-generate UID
            
            // Token role
            const role = RtcRole.PUBLISHER; // Both can publish audio/video
            
            // Token expiration time (2 hours from now)
            const expirationTimeInSeconds = 7200;
            const currentTimestamp = Math.floor(Date.now() / 1000);
            const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

            // Build token
            const token = RtcTokenBuilder.buildTokenWithUid(
                appId,
                appCertificate,
                channelName,
                uid,
                role,
                privilegeExpiredTs
            );

            return successResponse(res, {
                token,
                channelName,
                uid,
                appId,
                expiresAt: privilegeExpiredTs,
                userRole: isPatient ? 'patient' : 'doctor',
                appointment: {
                    id: appointment._id,
                    date: appointment.appointmentDate,
                    time: appointment.appointmentTime,
                    status: appointment.status
                }
            }, 'Token generated successfully');

        } catch (error) {
            console.error('Generate token error:', error);
            next(error);
        }
    }

    /**
     * Validate if user can join consultation
     * @route GET /api/v1/video/validate/:appointmentId
     */
    async validateConsultation(req, res, next) {
        try {
            const { appointmentId } = req.params;
            const userId = req.user.firebaseUid;

            // Validate appointmentId format
            if (!appointmentId || !appointmentId.match(/^[0-9a-fA-F]{24}$/)) {
                return errorResponse(res, 'Invalid appointment ID format', 400);
            }

            const appointment = await Appointment.findById(appointmentId)
                .populate('patientId', '_id firebaseUid name')
                .populate('doctorId', '_id firebaseUid name');

            if (!appointment) {
                return errorResponse(res, 'Appointment not found', 404);
            }

            const isPatient = appointment.patientId?.firebaseUid === userId;
            const isDoctor = appointment.doctorId?.firebaseUid === userId;

            console.log('[Validate] Auth check:', {
                userId,
                patientFirebaseUid: appointment.patientId?.firebaseUid,
                doctorFirebaseUid: appointment.doctorId?.firebaseUid,
                isPatient,
                isDoctor
            });

            if (!isPatient && !isDoctor) {
                return errorResponse(res, 'Unauthorized: You are not part of this consultation', 403);
            }

            // Check payment status
            if (isPatient && appointment.paymentStatus !== 'paid') {
                return successResponse(res, {
                    canJoin: false,
                    reason: 'Payment required'
                });
            }

            // Check appointment status
            if (!['confirmed', 'completed'].includes(appointment.status)) {
                return successResponse(res, {
                    canJoin: false,
                    reason: 'Appointment not confirmed'
                });
            }

            // Check appointment time (allow joining 15 minutes before)
            // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
            const dateStr = appointment.appointmentDate.toISOString().split('T')[0];
            const [year, month, day] = dateStr.split('-').map(Number);
            const appointmentDateTime = new Date(year, month - 1, day);
            
            // Parse time format: "09:00 AM" or "03:15 PM"
            const timeMatch = appointment.appointmentTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!timeMatch) {
                return errorResponse(res, 'Invalid appointment time format', 400);
            }
            
            let hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const meridiem = timeMatch[3].toUpperCase();
            
            // Convert to 24-hour format
            if (meridiem === 'PM' && hours !== 12) hours += 12;
            if (meridiem === 'AM' && hours === 12) hours = 0;
            
            appointmentDateTime.setHours(hours, minutes, 0, 0);
            
            const now = new Date();
            const consultationDuration = appointment.consultationDuration || 15;
            const endTime = new Date(appointmentDateTime.getTime() + consultationDuration * 60 * 1000);
            const fifteenMinsBefore = new Date(appointmentDateTime.getTime() - 15 * 60 * 1000);
            const timeDiff = appointmentDateTime - now;
            const minutesUntilAppointment = Math.floor(timeDiff / 60000);

            // Allow joining 15 minutes before and until end time
            const canJoinByTime = minutesUntilAppointment <= 15 && now <= endTime;

            if (!canJoinByTime) {
                const timeUntilCanJoin = minutesUntilAppointment - 15;
                return successResponse(res, {
                    canJoin: false,
                    reason: minutesUntilAppointment > 15 
                        ? `Available ${timeUntilCanJoin} minutes before appointment time`
                        : 'Consultation window has ended'
                });
            }

            return successResponse(res, {
                canJoin: true,
                callStarted: appointment.callStarted || false,
                callStartedBy: appointment.callStartedBy,
                appointment: {
                    id: appointment._id,
                    patientName: appointment.patientId.name,
                    doctorName: appointment.doctorId.name,
                    date: appointment.appointmentDate,
                    time: appointment.appointmentTime,
                    status: appointment.status,
                    consultationDuration: appointment.consultationDuration || 15
                }
            });

        } catch (error) {
            console.error('Validate consultation error:', error);
            next(error);
        }
    }

    /**
     * Start consultation (Doctor initiates)
     * @route POST /api/v1/video/start/:appointmentId
     */
    async startConsultation(req, res, next) {
        try {
            const { appointmentId } = req.params;
            const userId = req.user.firebaseUid;
            const userRole = req.user.role;

            // Validate appointmentId format
            if (!appointmentId || !appointmentId.match(/^[0-9a-fA-F]{24}$/)) {
                return errorResponse(res, 'Invalid appointment ID format', 400);
            }

            const appointment = await Appointment.findById(appointmentId)
                .populate('patientId', '_id firebaseUid name')
                .populate('doctorId', '_id firebaseUid name');

            if (!appointment) {
                return errorResponse(res, 'Appointment not found', 404);
            }

            const isDoctor = appointment.doctorId?.firebaseUid === userId;
            const isPatient = appointment.patientId?.firebaseUid === userId;

            if (!isDoctor && !isPatient) {
                return errorResponse(res, 'Unauthorized', 403);
            }

            // Update appointment with call started
            appointment.callStarted = true;
            appointment.callStartedBy = isDoctor ? 'doctor' : 'patient';
            appointment.callStartedAt = new Date();
            
            await appointment.save();

            return successResponse(res, {
                callStarted: true,
                callStartedAt: appointment.callStartedAt,
                startedBy: appointment.callStartedBy
            }, 'Consultation started successfully');

        } catch (error) {
            console.error('Start consultation error:', error);
            next(error);
        }
    }

    /**
     * End consultation
     * @route POST /api/v1/video/end/:appointmentId
     */
    async endConsultation(req, res, next) {
        try {
            const { appointmentId } = req.params;
            const userId = req.user.firebaseUid;

            // Validate appointmentId format
            if (!appointmentId || !appointmentId.match(/^[0-9a-fA-F]{24}$/)) {
                return errorResponse(res, 'Invalid appointment ID format', 400);
            }

            const appointment = await Appointment.findById(appointmentId)
                .populate('patientId', '_id firebaseUid')
                .populate('doctorId', '_id firebaseUid');

            if (!appointment) {
                return errorResponse(res, 'Appointment not found', 404);
            }

            const isDoctor = appointment.doctorId?.firebaseUid === userId;
            const isPatient = appointment.patientId?.firebaseUid === userId;

            if (!isDoctor && !isPatient) {
                return errorResponse(res, 'Unauthorized', 403);
            }

            // Update appointment status to completed
            appointment.callEndedAt = new Date();
            appointment.status = 'completed';
            
            await appointment.save();

            return successResponse(res, {
                status: 'completed',
                callEndedAt: appointment.callEndedAt
            }, 'Consultation ended successfully');

        } catch (error) {
            console.error('End consultation error:', error);
            next(error);
        }
    }

    /**
     * Get call status (for patient waiting room)
     * @route GET /api/v1/video/status/:appointmentId
     */
    async getCallStatus(req, res, next) {
        try {
            const { appointmentId } = req.params;
            const userId = req.user.firebaseUid;

            // Validate appointmentId format
            if (!appointmentId || !appointmentId.match(/^[0-9a-fA-F]{24}$/)) {
                return errorResponse(res, 'Invalid appointment ID format', 400);
            }

            const appointment = await Appointment.findById(appointmentId)
                .populate('patientId', '_id firebaseUid')
                .populate('doctorId', '_id firebaseUid');

            if (!appointment) {
                return errorResponse(res, 'Appointment not found', 404);
            }

            const isPatient = appointment.patientId?.firebaseUid === userId;
            const isDoctor = appointment.doctorId?.firebaseUid === userId;

            if (!isPatient && !isDoctor) {
                return errorResponse(res, 'Unauthorized', 403);
            }

            return successResponse(res, {
                callStarted: appointment.callStarted || false,
                callStartedBy: appointment.callStartedBy,
                callStartedAt: appointment.callStartedAt,
                status: appointment.status
            });

        } catch (error) {
            console.error('Get call status error:', error);
            next(error);
        }
    }
}

module.exports = new VideoController();
