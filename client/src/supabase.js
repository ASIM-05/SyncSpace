import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;
export const configurationError = !supabase ? 'This deployment is missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.' : null;
