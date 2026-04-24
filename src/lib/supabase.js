import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://uvdvvypfnznaxgiffqxr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2ZHZ2eXBmbnpuYXhnaWZmcXhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMjMxODQsImV4cCI6MjA5MDU5OTE4NH0.dtZtuqNYC7Hs9JV02LMitco-ZwRL-6bCQP0nH1Zf1Kc";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
