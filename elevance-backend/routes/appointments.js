const express = require("express");
const router = express.Router();
const { supabase } = require("../supabaseClient");
const { verifyFirebaseToken } = require("../auth/authorizetokens");

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

        res.json({ appointments: data });
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

        // Check for conflicts
        const { data: conflicts, error: conflictError } = await supabase
            .from('appointments')
            .select('id')
            .eq('provider_id', provider_id)
            .eq('appointment_date', appointment_date)
            .eq('status', 'scheduled')
            .or(`start_time.lte.${start_time},end_time.gte.${end_time}`);

        if (conflictError) throw conflictError;

        if (conflicts && conflicts.length > 0) {
            return res.status(409).json({
                error: "Time slot not available",
                details: "This time slot is already booked"
            });
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

        if (error) throw error;

        res.status(201).json({
            message: "Appointment booked successfully",
            appointment: data
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

        // Verify ownership
        const { data: existing, error: fetchError } = await supabase
            .from('appointments')
            .select('user_id')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        if (!existing || existing.user_id !== uid) {
            return res.status(403).json({ error: "Not authorized to modify this appointment" });
        }

        const updates = {};
        if (status) updates.status = status;
        if (cancellation_reason) updates.cancellation_reason = cancellation_reason;
        if (notes !== undefined) updates.notes = notes;
        if (status === 'cancelled') updates.cancelled_at = new Date().toISOString();
        updates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('appointments')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            message: "Appointment updated successfully",
            appointment: data
        });
    } catch (err) {
        console.error("Error updating appointment:", err);
        res.status(500).json({ error: "Failed to update appointment", details: err.message });
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
