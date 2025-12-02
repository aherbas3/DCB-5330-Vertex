/**
 * Generate Google Calendar URL for adding events
 * No API needed - just creates a URL that opens Google Calendar
 */

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

/**
 * Creates a Google Calendar "Add Event" URL
 * @param {Object} eventDetails - Event details
 * @param {string} eventDetails.title - Event title
 * @param {string} eventDetails.description - Event description
 * @param {string} eventDetails.startTime - ISO datetime string
 * @param {string} eventDetails.endTime - ISO datetime string
 * @param {string} eventDetails.location - Optional location
 * @returns {string} Google Calendar URL
 */
function generateGoogleCalendarUrl({ title, description, startTime, endTime, location = '' }) {
    // Format: YYYYMMDDTHHMMSSZ (UTC format for Google Calendar)
    const formatForGoogle = (isoString) => {
        return dayjs(isoString).utc().format('YYYYMMDDTHHmmss') + 'Z';
    };

    const start = formatForGoogle(startTime);
    const end = formatForGoogle(endTime);

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: title,
        details: description,
        dates: `${start}/${end}`,
        location: location,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Creates an appointment-specific Google Calendar URL
 * @param {Object} appointment - Appointment object from database
 * @returns {string} Google Calendar URL
 */
function generateAppointmentCalendarUrl(appointment) {
    const { provider_id, appointment_date, start_time, end_time, notes } = appointment;

    // Combine date and time for start
    const startDateTime = dayjs(`${appointment_date} ${start_time}`).toISOString();
    const endDateTime = dayjs(`${appointment_date} ${end_time}`).toISOString();

    // Get provider name if available
    const providerName = appointment.providers?.name || 'Healthcare Provider';

    return generateGoogleCalendarUrl({
        title: `Appointment with ${providerName}`,
        description: notes || `Healthcare appointment with ${providerName}`,
        startTime: startDateTime,
        endTime: endDateTime,
        location: 'Elevance Health',
    });
}

module.exports = {
    generateGoogleCalendarUrl,
    generateAppointmentCalendarUrl,
};
