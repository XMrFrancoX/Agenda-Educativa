import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kaltejxxonrtlkvlcyyu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthbHRlanh4b25ydGxrdmxjeXl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjQyOTU5MSwiZXhwIjoyMDk4MDA1NTkxfQ.-NRlkAYtn1sfEeYSIEUtndONDybsf4WAo8QxWObUEKc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPolicies() {
  const { data, error } = await supabase.from('calendar_events').select('*');
  console.log('Events bypass RLS:', data);

  // We can't query pg_policies via standard Supabase JS unless it's exposed,
  // but we can try to fetch the events using the anon key with their auth token!
}
checkPolicies();
