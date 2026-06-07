import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rbnnbjauwfmmxsniahys.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibm5iamF1d2ZtbXhzbmlhaHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzMyMDMsImV4cCI6MjA5NjQwOTIwM30.YKnpoyouDIMp_YLINNU1uYCHsC_NhksEtSCTNOiLUKQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Nama bucket di Supabase Storage
export const STORAGE_BUCKET = 'berkas-sihalal';
