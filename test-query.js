import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kaltejxxonrtlkvlcyyu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthbHRlanh4b25ydGxrdmxjeXl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjQyOTU5MSwiZXhwIjoyMDk4MDA1NTkxfQ.-NRlkAYtn1sfEeYSIEUtndONDybsf4WAo8QxWObUEKc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
		.from('calendar_events')
		.select(`
			id, title, description, starts_at, ends_at, all_day,
			location, visibility, category_id, created_by,
			event_categories ( id, name, color, icon ),
			profiles ( id, full_name, role )
		`);
		
  if (error) {
    console.error('Supabase Error:', error);
  } else {
    console.log('Query successful, rows:', data.length);
  }
}

test();
