import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iejyrterhykuvjqymvcs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllanlydGVyaHlrdXZqcXltdmNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MDc0MDQsImV4cCI6MjA2ODA4MzQwNH0.C6kYC776kO9BwLwB4MuySXuDhv1HJVyiCa0fMn_3-e0';

export const supabase = createClient(supabaseUrl, supabaseKey); 