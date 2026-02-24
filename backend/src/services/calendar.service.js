const { google } = require('googleapis');
const logger = require('../config/logger');

let calendarClient = null;

/**
 * Initialize Google Calendar API client
 */
const initializeCalendarClient = () => {
  try {
    if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      logger.warn('Google Calendar credentials not configured - Calendar integration will be disabled');
      return null;
    }

    const auth = new google.auth.JWT(
      process.env.FIREBASE_CLIENT_EMAIL,
      null,
      process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ]
    );

    calendarClient = google.calendar({ version: 'v3', auth });
    logger.info('Google Calendar client initialized successfully');
    return calendarClient;

  } catch (error) {
    logger.error('Failed to initialize Google Calendar client:', error);
    return null;
  }
};

// Initialize on module load
initializeCalendarClient();

/**
 * Create a Google Calendar event for appointment
 * @param {Object} appointmentData - Appointment details
 * @returns {Promise<Object>} - Calendar event response
 */
const createCalendarEvent = async (appointmentData) => {
  try {
    if (!calendarClient) {
      logger.warn('Google Calendar client not initialized - skipping calendar event creation');
      return { success: false, message: 'Calendar not configured' };
    }

    const {
      patientName,
      patientEmail,
      doctorName,
      doctorEmail,
      appointmentDate,
      appointmentTime,
      consultationType,
      appointmentId,
      patientPhone
    } = appointmentData;

    const dateStr = new Date(appointmentDate).toISOString().split('T')[0];
    const timeStr = convertTo24Hour(appointmentTime);
    
    const startDateTime = new Date(`${dateStr}T${timeStr}:00`);
    
  
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60000);

    // Create event description
    const description = `
Telemedicine Appointment

Patient: ${patientName}
Email: ${patientEmail}
Phone: ${patientPhone || 'N/A'}

Doctor: Dr. ${doctorName}
Type: ${consultationType === 'video' ? 'Video Consultation' : 'In-Person Consultation'}

Appointment ID: ${appointmentId}

${consultationType === 'video' ? 'Video call link will be shared before the appointment.' : 'Please arrive 10 minutes before your scheduled time.'}

---
Powered by Doctify Telemedicine Platform
    `.trim();

    // Calendar event object
    const event = {
      summary: `Appointment: ${patientName} with Dr. ${doctorName}`,
      location: consultationType === 'video' ? 'Online - Video Call' : 'Clinic',
      description: description,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Asia/Kolkata'
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Asia/Kolkata'
      },
      attendees: [
        { email: patientEmail, displayName: patientName },
        { email: doctorEmail, displayName: `Dr. ${doctorName}` }
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 }, // 1 hour before
          { method: 'popup', minutes: 10 } // 10 minutes before
        ]
      },
      colorId: consultationType === 'video' ? '9' : '10', // Blue for video, Green for in-person
      sendNotifications: true,
      sendUpdates: 'all'
    };

    logger.info(`Creating Google Calendar event for appointment ${appointmentId}`);

    // Use the calendar ID from environment or fallback to service account shared calendar
    // When sharing your personal calendar with service account, use your email as calendar ID
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    
    logger.info(`Using calendar ID: ${calendarId}`);

    // Create the event
    const response = await calendarClient.events.insert({
      calendarId: calendarId,
      resource: event,
      sendNotifications: true
    });

    logger.info(`Google Calendar event created successfully. Event ID: ${response.data.id}`);

    return {
      success: true,
      eventId: response.data.id,
      eventLink: response.data.htmlLink
    };

  } catch (error) {
    logger.error('Failed to create Google Calendar event:', {
      error: error.message,
      code: error.code,
      details: error.errors
    });

    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
};

/**
 * Convert 12-hour time format to 24-hour format
 * @param {string} time12h - Time in 12-hour format (e.g., "09:00 AM")
 * @returns {string} - Time in 24-hour format (e.g., "09:00")
 */
const convertTo24Hour = (time12h) => {
  const [time, period] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  
  hours = parseInt(hours);
  
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
};

/**
 * Update a Google Calendar event
 * @param {string} eventId - Calendar event ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} - Update response
 */
const updateCalendarEvent = async (eventId, updateData) => {
  try {
    if (!calendarClient) {
      return { success: false, message: 'Calendar not configured' };
    }

    const response = await calendarClient.events.patch({
      calendarId: 'primary',
      eventId: eventId,
      resource: updateData,
      sendNotifications: true
    });

    logger.info(`Calendar event updated: ${eventId}`);

    return {
      success: true,
      eventId: response.data.id
    };

  } catch (error) {
    logger.error('Failed to update calendar event:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Delete a Google Calendar event
 * @param {string} eventId - Calendar event ID
 * @returns {Promise<Object>} - Delete response
 */
const deleteCalendarEvent = async (eventId) => {
  try {
    if (!calendarClient) {
      return { success: false, message: 'Calendar not configured' };
    }

    await calendarClient.events.delete({
      calendarId: 'primary',
      eventId: eventId,
      sendNotifications: true
    });

    logger.info(`Calendar event deleted: ${eventId}`);

    return { success: true };

  } catch (error) {
    logger.error('Failed to delete calendar event:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent
};
