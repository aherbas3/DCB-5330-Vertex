const express = require("express");
const router = express.Router();
const { supabase } = require("../supabaseClient");
const { verifyFirebaseToken } = require("../auth/authorizetokens");
const googleCalendarService = require("../services/googleCalendarService");
const { generateAppointmentCalendarUrl } = require("../utils/calendarHelper");

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

        // Fetch provider name
        const { data: providerData, error: providerError } = await supabase
            .from('providers')
            .select('name')
            .eq('id', provider_id)
            .single();

        // Send email notification
        if (email && providerData) {
            const appointmentDetails = {
                providerName: providerData.name,
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

        // Add Google Calendar URL to response
        const appointmentWithCalendarUrl = {
            ...data,
            googleCalendarUrl: generateAppointmentCalendarUrl(data)
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
