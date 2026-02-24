const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const logger = require('../config/logger');
const { createSuccessResponse, createErrorResponse } = require('../utils/response.util');
const { sendAppointmentConfirmation } = require('../services/whatsapp.service');
const { generateAndUploadInvoice } = require('../services/invoice.service');
const { sendAppointmentEmail } = require('../services/email.service');

/**
 * Create Razorpay Order for Appointment Booking
 * POST /api/v1/appointments/create-order
 */
exports.createAppointmentOrder = async (req, res) => {
  const startTime = Date.now();
  try {
    logger.info(`[CreateOrder] Starting order creation for user ${req.user?._id}`);
    
    const { doctorId, amount, appointmentDate, appointmentTime, consultationType } = req.body;
    const patientId = req.user._id; // From auth middleware

    logger.debug(`[CreateOrder] Request data: doctorId=${doctorId}, amount=${amount}, consultationType=${consultationType}`);


    const missingFields = [];
    if (!doctorId) missingFields.push('doctorId');
    if (!amount) missingFields.push('amount');
    if (!appointmentDate) missingFields.push('appointmentDate');
    if (!appointmentTime) missingFields.push('appointmentTime');
    if (!consultationType) missingFields.push('consultationType');

    if (missingFields.length > 0) {
      logger.warn(`Missing fields in appointment order: ${missingFields.join(', ')}`);
      return res.status(400).json(
        createErrorResponse(`Missing required fields: ${missingFields.join(', ')}`)
      );
    }

    // Validate consultation type
    const validTypes = ['in-person', 'video'];
    if (!validTypes.includes(consultationType)) {
      return res.status(400).json(
        createErrorResponse(`Invalid consultationType. Must be one of: ${validTypes.join(', ')}`)
      );
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json(
        createErrorResponse('Amount must be a positive number')
      );
    }

    // Verify doctor exists
    logger.debug('[CreateOrder] Verifying doctor exists...');
    const doctor = await Doctor.findById(doctorId).maxTimeMS(5000);
    if (!doctor) {
      return res.status(404).json(createErrorResponse('Doctor not found'));
    }
    logger.debug('[CreateOrder] Doctor verified');

    // Verify patient exists
    logger.debug('[CreateOrder] Verifying patient exists...');
    const patient = await Patient.findById(patientId).maxTimeMS(5000);
    if (!patient) {
      return res.status(404).json(createErrorResponse('Patient not found'));
    }
    logger.debug('[CreateOrder] Patient verified');

    // Create Razorpay order with timeout
    logger.info('[CreateOrder] Creating Razorpay order...');
    // Generate short receipt (max 40 chars for Razorpay)
    const shortPatientId = patientId.toString().slice(-8);
    const timestamp = Date.now().toString().slice(-10);
    const receipt = `apt_${timestamp}_${shortPatientId}`;
    
    const options = {
      amount: Math.round(amount * 100), // Convert to paise (1 INR = 100 paise)
      currency: 'INR',
      receipt: receipt,
      notes: {
        doctorId: doctorId.toString(),
        patientId: patientId.toString(),
        appointmentDate,
        appointmentTime,
        consultationType
      }
    };

    logger.debug('[CreateOrder] Razorpay options:', JSON.stringify(options));

    // Add timeout to Razorpay API call
    let order;
    try {
      const orderPromise = razorpay.orders.create(options);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Razorpay order creation timeout')), 25000)
      );
      
      order = await Promise.race([orderPromise, timeoutPromise]);
      logger.debug('[CreateOrder] Razorpay raw response:', JSON.stringify(order));
    } catch (razorpayError) {
      logger.error('[CreateOrder] Razorpay API error:', {
        error: razorpayError,
        message: razorpayError?.message,
        description: razorpayError?.error?.description,
        statusCode: razorpayError?.statusCode
      });
      throw razorpayError;
    }

    logger.info(`[CreateOrder] Razorpay order created successfully: ${order.id} in ${Date.now() - startTime}ms`);

    res.status(200).json(
      createSuccessResponse({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      }, 'Payment order created successfully')
    );
  } catch (error) {
    logger.error('Create order error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      description: error.description
    });

    // Handle specific error types
    const errorMessage = error.message || '';
    
    if (errorMessage.includes('timeout')) {
      return res.status(504).json(
        createErrorResponse('Request timeout - please try again', 'Razorpay service took too long to respond')
      );
    }

    if (error.name === 'MongooseError' || error.name === 'MongoError') {
      return res.status(503).json(
        createErrorResponse('Database error - please try again', errorMessage || 'Database connection issue')
      );
    }

    // Razorpay specific errors
    if (error.statusCode) {
      return res.status(error.statusCode).json(
        createErrorResponse(`Razorpay error: ${error.error?.description || errorMessage || 'Unknown error'}`)
      );
    }

    res.status(500).json(
      createErrorResponse('Failed to create payment order', errorMessage || 'An unexpected error occurred')
    );
  }
};

/**
 * Verify Razorpay Payment and Create Appointment
 * POST /api/v1/appointments/verify-payment
 */
exports.verifyPayment = async (req, res) => {
  try {
    logger.info('[VerifyPayment] Starting payment verification');
    logger.info('[VerifyPayment] Request body:', JSON.stringify(req.body));
    console.log('=== VERIFY PAYMENT DEBUG ===');
    console.log('Request Body:', req.body);
    console.log('Order ID:', req.body.razorpay_order_id);
    console.log('Payment ID:', req.body.razorpay_payment_id);
    console.log('Signature:', req.body.razorpay_signature);
    console.log('========================');
    
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      doctorId,
      appointmentDate,
      appointmentTime,
      consultationType,
      amount,
      notes
    } = req.body;

    const patientId = req.user._id;
    logger.info(`[VerifyPayment] Patient ID: ${patientId}`);

    if (!razorpay_order_id || !razorpay_payment_id) {
      logger.warn('[VerifyPayment] Missing order_id or payment_id');
      return res.status(400).json(
        createErrorResponse('Payment order ID and payment ID are required')
      );
    }
    
    if (!razorpay_signature || razorpay_signature === '') {
      logger.warn('[VerifyPayment] Missing or empty signature');
      
      if (process.env.NODE_ENV !== 'production') {
        logger.info('[VerifyPayment] Signature missing in test mode, verifying payment via Razorpay API');
        console.log('Attempting to verify via Razorpay API...');
        
        try {
          const payment = await razorpay.payments.fetch(razorpay_payment_id);
          logger.info('[VerifyPayment] Payment fetched from Razorpay:',  {
            id: payment.id,
            status: payment.status,
            order_id: payment.order_id,
            amount: payment.amount
          });
          console.log('Razorpay Payment Details:', payment);
          
          // Verify payment is captured and matches our order
          if (payment.status === 'captured' && payment.order_id === razorpay_order_id) {
            logger.info('[VerifyPayment] Payment verified via Razorpay API - Status: captured, Order matches');
            console.log('✅ Payment verified successfully via API');
            // Continue with appointment creation below
          } else {
            logger.warn('[VerifyPayment] Payment verification failed:', {
              status: payment.status,
              paymentOrderId: payment.order_id,
              expectedOrderId: razorpay_order_id,
              statusMatch: payment.status === 'captured',
              orderMatch: payment.order_id === razorpay_order_id
            });
            console.error('❌ Verification failed:', {
              status: payment.status,
              paymentOrderId: payment.order_id,
              expectedOrderId: razorpay_order_id
            });
            return res.status(400).json(
              createErrorResponse(`Payment verification failed - Status: ${payment.status}, Order match: ${payment.order_id === razorpay_order_id}`)
            );
          }
        } catch (apiError) {
          logger.error('[VerifyPayment] Failed to fetch payment from Razorpay:', {
            message: apiError.message,
            statusCode: apiError.statusCode,
            error: apiError.error
          });
          console.error('Razorpay API Error:', apiError);
          return res.status(500).json(
            createErrorResponse('Could not verify payment with Razorpay: ' + apiError.message)
          );
        }
      } else {
        logger.error('[VerifyPayment] Signature required in production mode');
        return res.status(400).json(
          createErrorResponse('Payment signature is required')
        );
      }
    } else {
      // Signature provided - verify it
      logger.info('[VerifyPayment] Verifying payment signature manually...');
      console.log('Verifying signature...');
      
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        logger.warn(`[VerifyPayment] Invalid payment signature for order ${razorpay_order_id}`);
        console.error('❌ Signature mismatch:', {
          expected: expectedSignature,
          received: razorpay_signature
        });
        return res.status(400).json(
          createErrorResponse('Invalid payment signature')
        );
      }
      logger.info('[VerifyPayment] Signature verified successfully');
      console.log('✅ Signature verified');
    }
    
    // Validate appointment details
    if (!doctorId || !appointmentDate || !appointmentTime || !consultationType || !amount) {
      logger.warn('[VerifyPayment] Missing appointment details');
      return res.status(400).json(
        createErrorResponse('Appointment details are required')
      );
    }
    
    logger.info('[VerifyPayment] Creating appointment...');
    
    // Payment verified - Create appointment
    const appointment = await Appointment.create({
      patientId,
      doctorId,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      consultationType,
      amount,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      paymentStatus: 'paid',
      status: 'confirmed',
      notes: notes || ''
    });

    logger.info(`[VerifyPayment] Appointment created with ID: ${appointment._id}`);

    // Populate doctor and patient details for response
    await appointment.populate([
      { path: 'doctorId', select: 'name email specialization' },
      { path: 'patientId', select: 'name email phone' }
    ]);

    logger.info(`[VerifyPayment] Appointment created successfully: ${appointment._id} for patient ${patientId} with doctor ${doctorId}`);

    // Generate invoice PDF and send WhatsApp confirmation (non-blocking)
    let whatsappSent = false;
    let whatsappMessage = '';
    let invoiceUrl = null;
    
    try {
      // Step 1: Generate invoice PDF
      logger.info('[VerifyPayment] Generating invoice PDF...');
      const invoiceResult = await generateAndUploadInvoice({
        appointmentId: appointment._id.toString(),
        patientName: appointment.patientId.name,
        patientEmail: appointment.patientId.email,
        patientPhone: appointment.patientId.phone,
        doctorName: appointment.doctorId.name,
        doctorSpecialization: appointment.doctorId.specialization,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        consultationType: appointment.consultationType,
        amount: appointment.amount,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        invoiceDate: new Date()
      });

      if (invoiceResult.success) {
        logger.info(`[VerifyPayment] Invoice generated and uploaded: ${invoiceResult.url}`);
        invoiceUrl = invoiceResult.url;
      } else {
        logger.warn(`[VerifyPayment] Invoice generation failed: ${invoiceResult.error}`);
      }

      // Step 2: Send WhatsApp confirmation with invoice
      logger.info('[VerifyPayment] Sending WhatsApp confirmation...');
      const whatsappResult = await sendAppointmentConfirmation({
        patientName: appointment.patientId.name,
        patientPhone: appointment.patientId.phone,
        doctorName: appointment.doctorId.name,
        doctorSpecialization: appointment.doctorId.specialization,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        consultationType: appointment.consultationType,
        appointmentId: appointment._id.toString(),
        invoiceUrl: invoiceUrl // Attach invoice PDF to WhatsApp
      });

      if (whatsappResult.success) {
        logger.info(`[VerifyPayment] WhatsApp confirmation sent successfully. SID: ${whatsappResult.messageSid}`);
        whatsappSent = true;
        whatsappMessage = invoiceUrl 
          ? '📱 Check your WhatsApp for appointment confirmation and invoice PDF!' 
          : '📱 Check your WhatsApp for appointment confirmation details!';
      } else {
        logger.warn(`[VerifyPayment] WhatsApp confirmation failed: ${whatsappResult.message || whatsappResult.error}`);
        whatsappMessage = 'Appointment confirmed! (WhatsApp notification could not be sent)';
      }

      // Step 3: Send email notifications with calendar invite (.ics file attached)
      logger.info('[VerifyPayment] Sending email notifications with calendar invite...');
      const emailResult = await sendAppointmentEmail({
        patientName: appointment.patientId.name,
        patientEmail: appointment.patientId.email,
        doctorName: appointment.doctorId.name,
        doctorEmail: appointment.doctorId.email,
        doctorSpecialization: appointment.doctorId.specialization,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        consultationType: appointment.consultationType,
        appointmentId: appointment._id.toString(),
        amount: appointment.amount
      });

      if (emailResult.success) {
        logger.info(`[VerifyPayment] Emails sent successfully. Patient: ${emailResult.patientSent}, Doctor: ${emailResult.doctorSent}`);
        if (emailResult.patientSent && emailResult.doctorSent) {
          whatsappMessage = whatsappMessage + ' 📧 Confirmation emails with calendar invite sent!';
        } else if (emailResult.patientSent) {
          whatsappMessage = whatsappMessage + ' 📧 Confirmation email with calendar invite sent to patient!';
        } else if (emailResult.doctorSent) {
          whatsappMessage = whatsappMessage + ' 📧 Confirmation email sent to doctor!';
        }
      } else {
        logger.warn(`[VerifyPayment] Email notification failed: ${emailResult.message}`);
      }

    } catch (whatsappError) {
      // Log but don't fail the request - WhatsApp is not critical
      logger.error('[VerifyPayment] WhatsApp/Invoice/Calendar notification error:', whatsappError);
      whatsappMessage = 'Appointment confirmed successfully!';
    }

    res.status(201).json(
      createSuccessResponse({
        success: true,
        appointmentId: appointment._id,
        appointment,
        whatsappSent: whatsappSent,
        invoiceUrl: invoiceUrl,
        notification: whatsappMessage
      }, whatsappSent ? 
        'Appointment booked successfully! Check your WhatsApp for confirmation.' : 
        'Appointment booked successfully!')
    );
  } catch (error) {
    logger.error('[VerifyPayment] Error occurred:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });
    
    // Handle duplicate order ID error
    if (error.code === 11000 && error.keyPattern?.orderId) {
      logger.warn('[VerifyPayment] Duplicate order ID detected');
      return res.status(400).json(
        createErrorResponse('This payment has already been processed')
      );
    }

    res.status(500).json(
      createErrorResponse('Payment verification failed', error.message)
    );
  }
};

/**
 * Get Appointment by ID
 * GET /api/v1/appointments/:id
 */
exports.getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const appointment = await Appointment.findById(id)
      .populate('doctorId', 'name email specialization profileImage')
      .populate('patientId', 'name email phone');

    if (!appointment) {
      return res.status(404).json(createErrorResponse('Appointment not found'));
    }

    // Check if user has access to this appointment
    const hasAccess = 
      userRole === 'admin' ||
      appointment.patientId._id.toString() === userId.toString() ||
      appointment.doctorId._id.toString() === userId.toString();

    if (!hasAccess) {
      return res.status(403).json(createErrorResponse('Access denied'));
    }

    res.status(200).json(createSuccessResponse(appointment, 'Appointment retrieved successfully'));
  } catch (error) {
    logger.error('Get appointment error:', error);
    res.status(500).json(createErrorResponse('Failed to get appointment', error.message));
  }
};

/**
 * Get User Appointments (Patient or Doctor)
 * GET /api/v1/appointments
 */
exports.getUserAppointments = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const { status, startDate, endDate, limit = 50, page = 1 } = req.query;

    // Build query based on user role
    let query = {};
    if (userRole === 'patient') {
      query.patientId = userId;
    } else if (userRole === 'doctor') {
      query.doctorId = userId;
    } else {
      return res.status(403).json(createErrorResponse('Invalid user role'));
    }

    // Add status filter if provided
    if (status) {
      query.status = status;
    }

    // Add date range filter if provided
    if (startDate || endDate) {
      query.appointmentDate = {};
      if (startDate) query.appointmentDate.$gte = new Date(startDate);
      if (endDate) query.appointmentDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let appointments = await Appointment.find(query)
      .populate('doctorId', 'name email specialization profileImage')
      .populate('patientId', 'name email phone')
      .sort({ appointmentDate: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Auto-cancel expired reschedule requests (1 hour check)
    const now = new Date();
    for (let appointment of appointments) {
      if (appointment.rescheduleStatus === 'pending' && appointment.rescheduleRequestedAt) {
        const rescheduleTime = new Date(appointment.rescheduleRequestedAt);
        const expiryTime = new Date(rescheduleTime.getTime() + 60 * 60 * 1000);
        
        if (now > expiryTime) {
          // Auto-cancel
          appointment.status = 'cancelled';
          appointment.rescheduleStatus = 'expired';
          appointment.cancellationReason = 'Patient did not respond to reschedule request within 1 hour';
          appointment.cancelledBy = 'auto';
          appointment.cancelledAt = new Date();
          appointment.refundStatus = 'refunded';
          appointment.refundAmount = appointment.amount;
          appointment.refundedAt = new Date();
          
          await appointment.save();
          
          logger.info(`Auto-cancelled appointment ${appointment._id} due to expired reschedule request`);
        }
      }
    }

    // Refresh appointments after auto-cancel
    appointments = await Appointment.find(query)
      .populate('doctorId', 'name email specialization profileImage')
      .populate('patientId', 'name email phone')
      .sort({ appointmentDate: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Appointment.countDocuments(query);

    res.status(200).json(
      createSuccessResponse({
        appointments,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }, 'Appointments retrieved successfully')
    );
  } catch (error) {
    logger.error('Get user appointments error:', error);
    res.status(500).json(createErrorResponse('Failed to get appointments', error.message));
  }
};

/**
 * Cancel Appointment
 * PUT /api/v1/appointments/:id/cancel
 */
exports.cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json(createErrorResponse('Appointment not found'));
    }

    // Check if user has permission to cancel
    const canCancel = 
      userRole === 'admin' ||
      appointment.patientId.toString() === userId.toString() ||
      appointment.doctorId.toString() === userId.toString();

    if (!canCancel) {
      return res.status(403).json(createErrorResponse('Access denied'));
    }

    // Check if appointment can be cancelled
    if (appointment.status === 'cancelled') {
      return res.status(400).json(createErrorResponse('Appointment is already cancelled'));
    }

    if (appointment.status === 'completed') {
      return res.status(400).json(createErrorResponse('Cannot cancel completed appointment'));
    }

    // If doctor is cancelling, check 1 hour rule
    if (userRole === 'doctor' && appointment.doctorId.toString() === userId.toString()) {
      const aptDateTime = new Date(appointment.appointmentDate);
      const timeMatch = appointment.appointmentTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const period = timeMatch[3].toUpperCase();
        
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        aptDateTime.setHours(hours, minutes, 0, 0);
      }

      const now = new Date();
      const oneHourBefore = new Date(aptDateTime.getTime() - 60 * 60 * 1000);

      if (now >= oneHourBefore) {
        return res.status(400).json(
          createErrorResponse('Cannot cancel within 1 hour of appointment time')
        );
      }
    }

    // Update appointment with cancellation and refund
    appointment.status = 'cancelled';
    appointment.cancellationReason = cancellationReason || 'No reason provided';
    appointment.cancelledBy = userRole;
    appointment.cancelledAt = new Date();
    
    // Process refund (full amount)
    if (appointment.paymentStatus === 'paid') {
      appointment.refundStatus = 'refunded';
      appointment.refundAmount = appointment.amount;
      appointment.refundedAt = new Date();
    }
    
    await appointment.save();

    logger.info(`Appointment ${id} cancelled by ${userRole} ${userId} with refund`);

    res.status(200).json(
      createSuccessResponse({
        appointment,
        message: appointment.refundStatus === 'refunded' 
          ? 'Appointment cancelled successfully. Full refund has been processed.' 
          : 'Appointment cancelled successfully.'
      }, 'Appointment cancelled successfully')
    );
  } catch (error) {
    logger.error('Cancel appointment error:', error);
    res.status(500).json(createErrorResponse('Failed to cancel appointment', error.message));
  }
};

/**
 * Get Booked Slots for a Doctor on a Specific Date
 * GET /api/v1/appointments/booked-slots
 * Query params: doctorId, date
 */
exports.getBookedSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    // Validate required fields
    if (!doctorId || !date) {
      return res.status(400).json(
        createErrorResponse('Doctor ID and date are required')
      );
    }

    // Verify doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json(createErrorResponse('Doctor not found'));
    }

    // Parse the date and create start/end of day
    const appointmentDate = new Date(date);
    const startOfDay = new Date(appointmentDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(appointmentDate.setHours(23, 59, 59, 999));

    // Find all confirmed appointments for this doctor on this date
    const bookedAppointments = await Appointment.find({
      doctorId: doctorId,
      appointmentDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $in: ['confirmed', 'rescheduled'] }, // Only confirmed and rescheduled appointments block slots
      paymentStatus: 'paid' // Only paid appointments block slots
    }).select('appointmentTime');

    // Extract just the time slots
    const bookedSlots = bookedAppointments.map(apt => apt.appointmentTime);

    logger.info(`Retrieved ${bookedSlots.length} booked slots for doctor ${doctorId} on ${date}`);

    res.status(200).json(
      createSuccessResponse({ bookedSlots }, 'Booked slots retrieved successfully')
    );
  } catch (error) {
    logger.error('Get booked slots error:', error);
    res.status(500).json(createErrorResponse('Failed to get booked slots', error.message));
  }
};

/**
 * Doctor Reschedule Appointment (must be at least 1 hour before appointment)
 * PUT /api/v1/appointments/:id/reschedule
 */
exports.doctorRescheduleAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { newAppointmentDate, newAppointmentTime } = req.body;
    const doctorId = req.user._id;

    logger.info(`[DoctorReschedule] Doctor ${doctorId} attempting to reschedule appointment ${id}`);

    // Validate required fields
    if (!newAppointmentDate || !newAppointmentTime) {
      return res.status(400).json(
        createErrorResponse('New appointment date and time are required')
      );
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json(createErrorResponse('Appointment not found'));
    }

    // Verify doctor owns this appointment
    if (appointment.doctorId.toString() !== doctorId.toString()) {
      return res.status(403).json(createErrorResponse('Access denied'));
    }

    // Check if appointment can be rescheduled
    if (appointment.status === 'cancelled') {
      return res.status(400).json(createErrorResponse('Cannot reschedule cancelled appointment'));
    }

    if (appointment.status === 'completed') {
      return res.status(400).json(createErrorResponse('Cannot reschedule completed appointment'));
    }

    // Check if already has pending reschedule
    if (appointment.rescheduleStatus === 'pending') {
      return res.status(400).json(createErrorResponse('A reschedule request is already pending'));
    }

    // Parse appointment date and time to check if within 1 hour
    const aptDateTime = new Date(appointment.appointmentDate);
    const timeMatch = appointment.appointmentTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const period = timeMatch[3].toUpperCase();
      
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      aptDateTime.setHours(hours, minutes, 0, 0);
    }

    const now = new Date();
    const oneHourBefore = new Date(aptDateTime.getTime() - 60 * 60 * 1000);

    if (now >= oneHourBefore) {
      return res.status(400).json(
        createErrorResponse('Cannot reschedule within 1 hour of appointment time')
      );
    }

    // Update appointment with reschedule request
    appointment.rescheduleRequestedBy = 'doctor';
    appointment.rescheduleRequestedAt = new Date();
    appointment.proposedAppointmentDate = new Date(newAppointmentDate);
    appointment.proposedAppointmentTime = newAppointmentTime;
    appointment.rescheduleStatus = 'pending';
    
    await appointment.save();

    logger.info(`[DoctorReschedule] Reschedule request created for appointment ${id}`);

    res.status(200).json(
      createSuccessResponse({
        appointment,
        message: 'Reschedule request sent to patient. Patient has 1 hour to respond.'
      }, 'Reschedule request created successfully')
    );
  } catch (error) {
    logger.error('Doctor reschedule error:', error);
    res.status(500).json(createErrorResponse('Failed to reschedule appointment', error.message));
  }
};

/**
 * Patient Accept Reschedule
 * PUT /api/v1/appointments/:id/accept-reschedule
 */
exports.patientAcceptReschedule = async (req, res) => {
  try {
    const { id } = req.params;
    const patientId = req.user._id;

    logger.info(`[PatientAcceptReschedule] Patient ${patientId} accepting reschedule for appointment ${id}`);

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json(createErrorResponse('Appointment not found'));
    }

    // Verify patient owns this appointment
    if (appointment.patientId.toString() !== patientId.toString()) {
      return res.status(403).json(createErrorResponse('Access denied'));
    }

    // Check if there's a pending reschedule
    if (appointment.rescheduleStatus !== 'pending') {
      return res.status(400).json(createErrorResponse('No pending reschedule request'));
    }

    // Check if reschedule request has expired (1 hour)
    const rescheduleTime = new Date(appointment.rescheduleRequestedAt);
    const expiryTime = new Date(rescheduleTime.getTime() + 60 * 60 * 1000);
    const now = new Date();

    if (now > expiryTime) {
      // Auto-cancel if expired
      appointment.status = 'cancelled';
      appointment.rescheduleStatus = 'expired';
      appointment.cancellationReason = 'Patient did not respond to reschedule request within 1 hour';
      appointment.cancelledBy = 'auto';
      appointment.cancelledAt = new Date();
      appointment.refundStatus = 'refunded';
      appointment.refundAmount = appointment.amount;
      appointment.refundedAt = new Date();
      
      await appointment.save();

      return res.status(400).json(
        createErrorResponse('Reschedule request has expired. Appointment has been cancelled and refunded.')
      );
    }

    // Accept reschedule - update appointment
    appointment.appointmentDate = appointment.proposedAppointmentDate;
    appointment.appointmentTime = appointment.proposedAppointmentTime;
    appointment.rescheduleStatus = 'accepted';
    appointment.proposedAppointmentDate = null;
    appointment.proposedAppointmentTime = null;
    
    await appointment.save();

    logger.info(`[PatientAcceptReschedule] Appointment ${id} rescheduled successfully`);

    res.status(200).json(
      createSuccessResponse(appointment, 'Appointment rescheduled successfully')
    );
  } catch (error) {
    logger.error('Patient accept reschedule error:', error);
    res.status(500).json(createErrorResponse('Failed to accept reschedule', error.message));
  }
};

/**
 * Patient Reject Reschedule (Cancel appointment with refund)
 * PUT /api/v1/appointments/:id/reject-reschedule
 */
exports.patientRejectReschedule = async (req, res) => {
  try {
    const { id } = req.params;
    const patientId = req.user._id;

    logger.info(`[PatientRejectReschedule] Patient ${patientId} rejecting reschedule for appointment ${id}`);

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json(createErrorResponse('Appointment not found'));
    }

    // Verify patient owns this appointment
    if (appointment.patientId.toString() !== patientId.toString()) {
      return res.status(403).json(createErrorResponse('Access denied'));
    }

    // Check if there's a pending reschedule
    if (appointment.rescheduleStatus !== 'pending') {
      return res.status(400).json(createErrorResponse('No pending reschedule request'));
    }

    // Reject reschedule - cancel appointment with full refund
    appointment.status = 'cancelled';
    appointment.rescheduleStatus = 'rejected';
    appointment.cancellationReason = 'Patient rejected reschedule request';
    appointment.cancelledBy = 'patient';
    appointment.cancelledAt = new Date();
    appointment.refundStatus = 'refunded';
    appointment.refundAmount = appointment.amount;
    appointment.refundedAt = new Date();
    appointment.proposedAppointmentDate = null;
    appointment.proposedAppointmentTime = null;
    
    await appointment.save();

    logger.info(`[PatientRejectReschedule] Appointment ${id} cancelled with full refund`);

    res.status(200).json(
      createSuccessResponse({
        appointment,
        message: 'Appointment cancelled. Full refund has been processed.'
      }, 'Reschedule rejected and appointment cancelled')
    );
  } catch (error) {
    logger.error('Patient reject reschedule error:', error);
    res.status(500).json(createErrorResponse('Failed to reject reschedule', error.message));
  }
};

module.exports = exports;
