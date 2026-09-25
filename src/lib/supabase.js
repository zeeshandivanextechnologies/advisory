import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL;
const key = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  // CRA only reads .env at startup — restart `npm start` after editing it
  throw new Error('Missing REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_PUBLISHABLE_KEY. Check .env and restart the dev server.');
}

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
