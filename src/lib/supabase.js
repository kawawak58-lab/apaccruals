import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ugpucpkuhqdjxwzvklqe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVncHVjcGt1aHFkanh3enZrbHFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NjQxNTEsImV4cCI6MjA4MzI0MDE1MX0.j5uftXOVmRY7xmdSoeokuEa8XYV2Qxzqj5lf4oeUPEg";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
