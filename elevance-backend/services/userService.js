const { supabase } = require('../supabaseClient');

class UserService {
    static async createUser(userData) {
        const { data, error } = await supabase
            .from('users')
            .insert(userData)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async getUserByEmail(email) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // 116 = no rows found
        return data || null;
    }

    static async updateUser(email, updateData) {
        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('email', email)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async deleteUser(email) {
        const { data, error } = await supabase
            .from('users')
            .delete()
            .eq('email', email)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async userExists(email) {
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('email', email);

        if (error) throw error;
        return data.length > 0;
    }

    static async syncUser(userData) {
        const { email } = userData;
        const exists = await this.userExists(email);

        if (exists) {
            console.log('🔄 Updating existing user in Supabase');
            return await this.updateUser(email, userData);
        } else {
            console.log('🆕 Creating new user in Supabase');
            return await this.createUser(userData);
        }
    }
}

module.exports = UserService;
