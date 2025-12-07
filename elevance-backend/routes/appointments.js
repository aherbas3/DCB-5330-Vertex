const express = require("express");
const router = express.Router();
const { supabase, query } = require("../supabaseClient");
const { verifyFirebaseToken } = require("../auth/authorizetokens");
const googleCalendarService = require("../services/googleCalendarService");
const { generateAppointmentCalendarUrl } = require("../utils/calendarHelper");
const UserService = require("../services/userService");
const notificationService = require("../services/notificationService");

// Get user's appointments
router.get("/", verifyFirebaseToken, async (req, res) => {
    try {
        const { uid, email } = req.user;

        const { data, error } = await supabase
            .from('appointments')
            .select(`
                *,
                providers:provider_id (
                    id,
                    name,
                    specialty,
                    cost,
                    rating
                )
            `)
            .eq('user_id', uid)
            .order('appointment_date', { ascending: true })
            .order('start_time', { ascending: true });

        if (error) throw error;

        // Add Google Calendar URL to each appointment
        const appointmentsWithCalendarUrl = data.map(appointment => ({
            ...appointment,
            googleCalendarUrl: generateAppointmentCalendarUrl(appointment)
        }));

        res.json({ appointments: appointmentsWithCalendarUrl });
    } catch (err) {
        console.error("Error fetching appointments:", err);
        res.status(500).json({ error: "Failed to fetch appointments", details: err.message });
    }
});

// Book a new appointment
router.post("/", verifyFirebaseToken, async (req, res) => {
    try {
        const { uid, email } = req.user;
        const {
            provider_id,
            appointment_date,
            start_time,
            end_time,
            appointment_type = "consultation",
            notes
        } = req.body;

        // Validate required fields
        if (!provider_id || !appointment_date || !start_time || !end_time) {
            return res.status(400).json({
                error: "Missing required fields",
                details: "provider_id, appointment_date, start_time, and end_time are required"
            });
        }

        // Check if slot exists in provider_slots (atomic check)
        const { data: availableSlot, error: slotError } = await supabase
            .from('provider_slots')
            .select('id')
            .eq('provider_id', provider_id)
            .eq('appointment_date', appointment_date)
            .eq('start_time', start_time)
            .single();

        if (slotError || !availableSlot) {
            return res.status(409).json({
                error: "Time slot not available",
                details: "This time slot is already booked or doesn't exist"
            });
        }

        // Delete the slot from provider_slots (moves it to appointments)
        const { error: deleteError } = await supabase
            .from('provider_slots')
            .delete()
            .eq('id', availableSlot.id);

        if (deleteError) {
            throw deleteError;
        }

        // Create appointment
        const { data, error } = await supabase
            .from('appointments')
            .insert({
                provider_id,
                user_id: uid,
                user_email: email,
                appointment_date,
                start_time,
                end_time,
                appointment_type,
                notes,
                status: 'scheduled'
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        // ========== SEGMENT 2: Fetch user profile to check notification preferences ==========
        let userPhoneNumber = null;
        let notificationsEnabled = false;
        let notificationMethod = 'SMS'; // Default to SMS
        let userId = null; // Database user ID for notification logging
        
        try {
            const userProfile = await UserService.getUserByEmail(email);
            if (userProfile) {
                userPhoneNumber = userProfile.phone_number;
                notificationsEnabled = userProfile.notifications_enabled || false;
                notificationMethod = userProfile.notification_method || 'SMS'; // Get preferred method or default to SMS
                userId = userProfile.id; // Database user ID for logging
                
                console.log('📱 User notification preferences:', {
                    hasPhone: !!userPhoneNumber,
                    notificationsEnabled: notificationsEnabled,
                    notificationMethod: notificationMethod,
                    userId: userId,
                    phoneNumber: userPhoneNumber ? '***' + userPhoneNumber.slice(-4) : 'none'
                });
            } else {
                console.log('⚠️ User profile not found for email:', email);
            }
        } catch (userError) {
            console.error('⚠️ Failed to fetch user profile for notifications:', userError);
            // Don't block booking if user profile fetch fails
        }

        // ========== SEGMENT 3: Fetch provider name and location ==========
        let providerName = null;
        let providerLatitude = null;
        let providerLongitude = null;
        
        // Try Supabase client first (more reliable than raw SQL)
        try {
            const { data: providerData, error: supabaseError } = await supabase
                .from('providers')
                .select('name, latitude, longitude')
                .eq('id', provider_id)
                .single();
            
            if (supabaseError) {
                console.error('⚠️ Failed to fetch provider via Supabase:', supabaseError.message);
            } else if (providerData) {
                providerName = providerData.name;
                
                // Get coordinates from latitude/longitude columns if available
                if (typeof providerData.latitude === 'number' && typeof providerData.longitude === 'number' &&
                    !isNaN(providerData.latitude) && !isNaN(providerData.longitude)) {
                    providerLatitude = providerData.latitude;
                    providerLongitude = providerData.longitude;
                    console.log('📍 Provider location (from Supabase):', `${providerLatitude}, ${providerLongitude}`);
                } else {
                    console.log('⚠️ Provider found but no valid coordinates in latitude/longitude columns');
                    // Fallback: Try SQL query to extract from PostGIS location field
                    console.log('🔄 Attempting SQL query to extract from PostGIS location...');
                    try {
                        const locationQuery = `
                            SELECT ST_Y(location::geometry) AS latitude,
                                   ST_X(location::geometry) AS longitude
                            FROM providers
                            WHERE id = $1
                        `;
                        
                        const locationResult = await query(locationQuery, [provider_id]);
                        
                        if (locationResult.rows && locationResult.rows.length > 0) {
                            const coords = locationResult.rows[0];
                            if (typeof coords.latitude === 'number' && typeof coords.longitude === 'number' &&
                                !isNaN(coords.latitude) && !isNaN(coords.longitude)) {
                                providerLatitude = coords.latitude;
                                providerLongitude = coords.longitude;
                                console.log('📍 Provider location (from PostGIS):', `${providerLatitude}, ${providerLongitude}`);
                            }
                        }
                    } catch (sqlError) {
                        console.error('⚠️ SQL query also failed:', sqlError.message);
                    }
                }
            } else {
                console.log('⚠️ Provider not found with id:', provider_id);
            }
        } catch (providerError) {
            console.error('⚠️ Failed to fetch provider:', providerError.message);
        }

        // Send email notification
        if (email && providerName) {
            const appointmentDetails = {
                providerName: providerName,
                date: new Date(appointment_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                time: new Date(
                    appointment_date + " " + start_time
                ).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                })
            };

            // Send email in background (don't await)
            googleCalendarService.sendAppointmentConfirmation(
                email,
                appointmentDetails
            ).catch(err => {
                console.error('Email notification failed:', err);
            });
        }

        // Generate Google Calendar URL with provider coordinates
        const appointmentWithProvider = {
            ...data,
            providers: providerName ? { name: providerName } : null
        };
        const googleCalendarUrl = generateAppointmentCalendarUrl(
            appointmentWithProvider,
            providerLatitude,
            providerLongitude
        );

        // ========== SEGMENT 4: Send SMS notification if user has notifications enabled and phone number ==========
        if (notificationsEnabled && userPhoneNumber && providerName) {
            try {
                // Format date and time compactly for SMS (e.g., "Dec 8 3 PM")
                // Parse date: "YYYY-MM-DD" format
                const [year, monthNum, day] = appointment_date.split('-').map(Number);
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const month = monthNames[monthNum - 1];
                
                // Parse time: "HH:mm" format (24-hour)
                const [hour24, minute] = start_time.split(':').map(Number);
                
                // Convert to 12-hour format (e.g., "3 PM" or "11 AM")
                const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                const ampm = hour24 >= 12 ? 'PM' : 'AM';
                const timeStr = minute > 0 ? `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}` : `${hour12} ${ampm}`;
                
                // Compact date/time format: "Dec 8 3 PM"
                const compactDateTime = `${month} ${day} ${timeStr}`;

                // Prepare appointment details for SMS with compact format
                const smsAppointmentDetails = {
                    providerName: providerName,
                    date: compactDateTime,  // Compact format: "Dec 8 3 PM"
                    time: '',  // Not needed separately, included in date
                    location: "Elevance Health's Midtown Clinic",  // Compact location text
                    googleCalendarUrl: googleCalendarUrl                          // Calendar link with coordinates (will be shortened)
                };

                console.log('📱 Preparing notification with details:', {
                    notificationMethod: notificationMethod,
                    hasProviderName: !!providerName,
                    compactDateTime: compactDateTime,
                    hasLocation: !!smsAppointmentDetails.location,
                    hasCalendarUrl: !!googleCalendarUrl,
                    phoneNumber: userPhoneNumber ? '***' + userPhoneNumber.slice(-4) : 'none'
                });

                // Send notification via preferred method (SMS or WhatsApp) in background (don't await to avoid blocking response)
                notificationService.sendAppointmentConfirmation(
                    userPhoneNumber,
                    smsAppointmentDetails,
                    notificationMethod,  // Pass the preferred notification method
                    userId  // Pass database user ID for logging
                ).then(result => {
                    if (result.success) {
                        console.log(`✅ ${notificationMethod} sent successfully:`, result.messageSid);
                    } else {
                        console.error(`❌ ${notificationMethod} failed:`, result.error || result.message);
                    }
                }).catch(err => {
                    console.error(`❌ ${notificationMethod} notification error:`, err);
                    console.error('Error stack:', err.stack);
                    // Don't throw - notification failure shouldn't block successful booking
                });
                
                console.log(`📱 ${notificationMethod} notification queued for:`, userPhoneNumber ? '***' + userPhoneNumber.slice(-4) : 'unknown');
            } catch (smsError) {
                console.error('⚠️ Error preparing SMS notification:', smsError);
                // Don't throw - SMS failure shouldn't block successful booking
            }
        } else {
            if (!notificationsEnabled) {
                console.log('📱 Notifications disabled for user');
            } else if (!userPhoneNumber) {
                console.log('📱 No phone number on file for notifications');
            } else if (!providerName) {
                console.log('📱 Provider name not available for notifications');
            }
        }

        // Add Google Calendar URL to response
        const appointmentWithCalendarUrl = {
            ...data,
            googleCalendarUrl: googleCalendarUrl
        };

        res.status(201).json({
            message: "Appointment booked successfully",
            appointment: appointmentWithCalendarUrl
        });
    } catch (err) {
        console.error("Error booking appointment:", err);
        res.status(500).json({ error: "Failed to book appointment", details: err.message });
    }
});

// Update appointment (cancel, reschedule, etc.)
router.put("/:id", verifyFirebaseToken, async (req, res) => {
    try {
        const { uid } = req.user;
        const { id } = req.params;
        const { status, cancellation_reason, notes } = req.body;

        // 1. Load the appointment and verify ownership in ONE query
        const { data: appointmentData, error: apptError } = await supabase
            .from("appointments")
            .select(
                `
                *,
                providers:provider_id ( name )
            `
            )
            .eq("id", id)
            .single();

        if (apptError) {
            console.error("Error fetching appointment for update:", apptError);
            return res
                .status(404)
                .json({ error: "Appointment not found", details: apptError.message });
        }

        if (!appointmentData || appointmentData.user_id !== uid) {
            return res
                .status(403)
                .json({ error: "Not authorized to modify this appointment" });
        }

        // 2. If cancelling, restore the slot back to provider_slots
        if (status === "cancelled") {
            try {
                const { error: slotError } = await supabase
                    .from("provider_slots")
                    .upsert(
                        {
                            provider_id: appointmentData.provider_id,
                            appointment_date: appointmentData.appointment_date,
                            start_time: appointmentData.start_time,
                            end_time: appointmentData.end_time,
                        },
                        {
                            onConflict: "provider_id,appointment_date,start_time",
                            ignoreDuplicates: true, // keep existing if already there
                        }
                    );

                if (slotError) {
                    console.error("Failed to restore slot:", slotError);
                    // We log but don't block cancellation if slot restore fails
                }
            } catch (e) {
                console.error("Unexpected error restoring slot:", e);
            }
        }

        // 3. Build the updates object
        const updates = {
            updated_at: new Date().toISOString(),
        };

        if (status) updates.status = status;
        if (cancellation_reason) updates.cancellation_reason = cancellation_reason;
        if (notes !== undefined) updates.notes = notes;
        if (status === "cancelled") {
            updates.cancelled_at = new Date().toISOString();
        }

        // 4. Apply the update
        const { data, error: updateError } = await supabase
            .from("appointments")
            .update(updates)
            .eq("id", id)
            .select(
                `
                *,
                providers:provider_id ( name )
            `
            )
            .single();

        if (updateError) {
            console.error("Error updating appointment:", updateError);
            throw updateError;
        }

        // 5. Send email notification if appointment was cancelled
        if (status === "cancelled") {
            try {
                if (data.user_email && data.providers) {
                    const appointmentDetails = {
                        providerName: data.providers.name,
                        date: new Date(data.appointment_date).toLocaleDateString(
                            "en-US",
                            {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            }
                        ),
                        time: new Date(
                            `${data.appointment_date} ${data.start_time}`
                        ).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                        }),
                    };

                    googleCalendarService
                        .sendAppointmentCancellation(
                            data.user_email,
                            appointmentDetails
                        )
                        .catch((err) =>
                            console.error("Email notification failed:", err)
                        );
                }
            } catch (emailErr) {
                console.error("Error during email cancellation flow:", emailErr);
            }
        }

        // 6. Respond with updated appointment
        res.json({
            message: "Appointment updated successfully",
            appointment: data,
        });
    } catch (err) {
        console.error("Error updating appointment:", err);
        res.status(500).json({
            error: "Failed to update appointment",
            details: err.message,
        });
    }
});


// Delete appointment (hard delete - use with caution)
router.delete("/:id", verifyFirebaseToken, async (req, res) => {
    try {
        const { uid } = req.user;
        const { id } = req.params;

        // Verify ownership
        const { data: existing, error: fetchError } = await supabase
            .from('appointments')
            .select('user_id')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        if (!existing || existing.user_id !== uid) {
            return res.status(403).json({ error: "Not authorized to delete this appointment" });
        }

        const { error } = await supabase
            .from('appointments')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ message: "Appointment deleted successfully" });
    } catch (err) {
        console.error("Error deleting appointment:", err);
        res.status(500).json({ error: "Failed to delete appointment", details: err.message });
    }
});

module.exports = router;
