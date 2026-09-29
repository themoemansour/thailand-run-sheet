import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_JS_VERSION } from './config.js';

let clientPromise;
export function getSupabase() {
  if (!clientPromise) {
    clientPromise = import(`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@${SUPABASE_JS_VERSION}/+esm`)
      .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }))
      .catch(error => { clientPromise = undefined; throw error; });
  }
  return clientPromise;
}
