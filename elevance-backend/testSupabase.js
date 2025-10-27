const { supabase } = require('./supabaseClient');

(async () => {
    const { data, error } = await supabase.from('users').select('*');
    console.log({ data, error });
})();
