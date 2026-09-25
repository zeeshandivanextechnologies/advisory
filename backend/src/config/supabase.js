const { createClient } = require('@supabase/supabase-js');
const env = require('./env');
const HttpError = require('../utils/HttpError');

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

// A fresh client per auth request, so concurrent sign-ins never share session state
const authClient = () => createClient(env.supabaseUrl, env.supabasePublishableKey, options);

let admin = null;
// Service-role client: storage uploads/downloads and password updates. Never expose to the browser.
const adminClient = () => {
  if (!env.supabaseServiceRoleKey) {
    throw new HttpError(500, 'Server is missing SUPABASE_SERVICE_ROLE_KEY');
  }
  if (!admin) admin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, options);
  return admin;
};

module.exports = { authClient, adminClient };
