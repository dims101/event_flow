import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_ANON_KEY || '';

// Fallback to placeholder values during module evaluation in SSR/CI to prevent fatal crashes
const validUrl = supabaseUrl.startsWith('http') ? supabaseUrl : 'https://placeholder-project.supabase.co';
const validKey = supabaseAnonKey || 'placeholder-anon-key';

if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    console.warn('Warning: Missing Supabase credentials. Realtime features will not connect to a real instance.');
  }
}

export const supabase = createClient(validUrl, validKey);
