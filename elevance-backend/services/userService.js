const { query } = require('../database');

class UserService {
    // Create a new user in PostgreSQL
    static async createUser(userData) {
        const {
            first_name,
            last_name,
            email,
            phone_number,
            language = 'English',
            notifications_enabled = true
        } = userData;

        try {
            const result = await query(`
                INSERT INTO users (
                    first_name, last_name, email, 
                    phone_number, language, notifications_enabled
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [first_name, last_name, email, phone_number, language, notifications_enabled]);

            console.log('✅ User created in PostgreSQL:', result.rows[0]);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error creating user:', error);
            throw error;
        }
    }

    // Get user by ID
    static async getUserById(id) {
        try {
            const result = await query(`
                SELECT * FROM users WHERE id = $1
            `, [id]);

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            console.error('❌ Error fetching user by ID:', error);
            throw error;
        }
    }

    // Get user by email
    static async getUserByEmail(email) {
        try {
            const result = await query(`
                SELECT * FROM users WHERE email = $1
            `, [email]);

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            console.error('❌ Error fetching user by email:', error);
            throw error;
        }
    }

    // Update user profile
    static async updateUser(email, updateData) {
        const {
            first_name,
            last_name,
            phone_number,
            language,
            notifications_enabled
        } = updateData;

        try {
            // Build dynamic query based on provided fields
            const fields = [];
            const values = [];
            let paramCount = 1;

            if (first_name !== undefined) {
                fields.push(`first_name = $${paramCount}`);
                values.push(first_name);
                paramCount++;
            }

            if (last_name !== undefined) {
                fields.push(`last_name = $${paramCount}`);
                values.push(last_name);
                paramCount++;
            }

            if (phone_number !== undefined) {
                fields.push(`phone_number = $${paramCount}`);
                values.push(phone_number);
                paramCount++;
            }

            if (language !== undefined) {
                fields.push(`language = $${paramCount}`);
                values.push(language);
                paramCount++;
            }

            if (notifications_enabled !== undefined) {
                fields.push(`notifications_enabled = $${paramCount}`);
                values.push(notifications_enabled);
                paramCount++;
            }

            if (fields.length === 0) {
                throw new Error('No fields to update');
            }

            values.push(email);

            const result = await query(`
                UPDATE users 
                SET ${fields.join(', ')}
                WHERE email = $${paramCount}
                RETURNING *
            `, values);

            if (result.rows.length === 0) {
                throw new Error('User not found');
            }

            console.log('✅ User updated in PostgreSQL:', result.rows[0]);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error updating user:', error);
            throw error;
        }
    }

    // Delete user by email
    static async deleteUser(email) {
        try {
            const result = await query(`
                DELETE FROM users WHERE email = $1 RETURNING *
            `, [email]);

            if (result.rows.length === 0) {
                throw new Error('User not found');
            }

            console.log('✅ User deleted from PostgreSQL:', result.rows[0]);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error deleting user:', error);
            throw error;
        }
    }

    // Check if user exists by email
    static async userExists(email) {
        try {
            const result = await query(`
                SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)
            `, [email]);

            return result.rows[0].exists;
        } catch (error) {
            console.error('❌ Error checking if user exists:', error);
            throw error;
        }
    }

    // Sync user data (create or update based on existence)
    static async syncUser(userData) {
        const { email } = userData;
        
        try {
            // Check if user exists
            const existingUser = await this.getUserByEmail(email);
            
            if (existingUser) {
                // Update existing user
                console.log('🔄 Updating existing user in PostgreSQL');
                return await this.updateUser(email, userData);
            } else {
                // Create new user
                console.log('🆕 Creating new user in PostgreSQL');
                return await this.createUser(userData);
            }
        } catch (error) {
            console.error('❌ Error syncing user:', error);
            throw error;
        }
    }
}

module.exports = UserService;
