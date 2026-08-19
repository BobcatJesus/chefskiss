import { createClient } from '@supabase/supabase-js';

import { env, isSupabaseConfigured } from '@/lib/env';

const supabaseUrl = isSupabaseConfigured && env.supabaseUrl ? env.supabaseUrl : 'https://example.supabase.co';
const supabaseAnonKey = isSupabaseConfigured && env.supabaseAnonKey ? env.supabaseAnonKey : 'missing-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export { isSupabaseConfigured };

