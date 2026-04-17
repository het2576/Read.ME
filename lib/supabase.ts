// /lib/supabase.ts — Supabase server + browser clients
// TODO: Implement in Phase 0 (Task 0.9)
//
// Responsibilities:
// - supabaseAdmin: server-side client with service_role key (for API routes)
// - supabaseBrowser: client-side client with anon key (for browser queries)

import { createClient } from '@supabase/supabase-js';

// Server-side client — use in API routes only
// service_role key bypasses RLS by default
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Browser-side client — use in client components
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);
