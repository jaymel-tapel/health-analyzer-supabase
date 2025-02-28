#!/bin/bash

# Create and migrate database
echo "Running database migrations..."

# Option 1: Use supabase db push (if supported)
supabase db push

# Option 2: Alternative approach if db push fails
# You may need to install supabase-js if not already installed
# npm install @supabase/supabase-js

# Create a temporary Node.js script to execute the migration
cat > migrate-temp.js << 'EOL'
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.DB_URL,
  process.env.SERVICE_ROLE_KEY
);

async function runMigration() {
  try {
    const sql = fs.readFileSync('./supabase/migrations/20230601000000_health_analyzer_schema.sql', 'utf8');
    const { error } = await supabase.rpc('pgtle_install_or_update_extension_version_sql', { 
      sql_code: sql 
    });
    
    if (error) {
      console.error('Migration error:', error);
      process.exit(1);
    }
    
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  }
}

runMigration();
EOL

# Uncomment the following line to run the alternative migration if needed
# node migrate-temp.js && rm migrate-temp.js

echo "Database migration complete!" 