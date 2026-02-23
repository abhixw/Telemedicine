const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
    index: true
  },
  appointmentDate: {
    type: Date,
    required: true,
    index: true
  },
  appointmentTime: {
    type: String,
    required: true
  },
  consultationType: {
    type: String,
    enum: ['video', 'in-person'],
    required: true,
    default: 'video'
  },
  amount: {
    type: Number,
    required: true
  },
  // Razorpay payment details
  paymentId: {
    type: String,
    sparse: true
  },
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
    index: true
  },
  // Appointment status
  status: {
    type: String,
    enum: ['confirmed', 'completed', 'cancelled', 'no-show', 'rescheduled'],
    default: 'confirmed',
    index: true
  },
  // Additional details
  notes: {
    type: String,
    maxlength: 500
  },
  prescription: {
    type: String
  },
  diagnosis: {
    type: String
  },
  // Meeting details for video consultations
  meetingLink: {
    type: String
  },
  meetingId: {
    type: String
  },
  // Google Calendar integration
  calendarEventId: {
    type: String
  },
  calendarEventLink: {
    type: String
  },
  // Video consultation tracking
  callStarted: {
    type: Boolean,
    default: false
  },
  callStartedBy: {
    type: String,
    enum: ['doctor', 'patient']
  },
  callStartedAt: {
    type: Date
  },
  callEndedAt: {
    type: Date
  },
  consultationDuration: {
    type: Number,
    default: 15 // Duration in minutes
  },
  // Reschedule Request (Doctor initiated)
  rescheduleRequestedBy: {
    type: String,
    enum: ['doctor', 'patient']
  },
  rescheduleRequestedAt: {
    type: Date
  },
  proposedAppointmentDate: {
    type: Date
  },
  proposedAppointmentTime: {
    type: String
  },
  rescheduleStatus: {
    type: String,
    enum: ['none', 'pending', 'accepted', 'rejected', 'expired'],
    default: 'none',
    index: true
  },
  // Refund tracking
  refundStatus: {
    type: String,
    enum: ['none', 'pending', 'refunded'],
    default: 'none',
    index: true
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundedAt: {
    type: Date
  },
  // Cancellation/Rescheduling
  cancellationReason: {
    type: String
  },
  cancelledBy: {
    type: String,
    enum: ['patient', 'doctor', 'admin', 'auto']
  },
  cancelledAt: {
    type: Date
  },
  rescheduledFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  rescheduledTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
appointmentSchema.index({ patientId: 1, appointmentDate: 1 });
appointmentSchema.index({ doctorId: 1, appointmentDate: 1 });
appointmentSchema.index({ status: 1, appointmentDate: 1 });

// Virtual for checking if appointment is upcoming
appointmentSchema.virtual('isUpcoming').get(function() {
  return this.appointmentDate > new Date() && this.status === 'confirmed';
});

// Virtual for checking if appointment is past
appointmentSchema.virtual('isPast').get(function() {
  return this.appointmentDate < new Date();
});

// Method to format appointment for JSON response
appointmentSchema.methods.toJSON = function() {
  const obj = this.toObject({ virtuals: true });
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Appointment', appointmentSchema);
