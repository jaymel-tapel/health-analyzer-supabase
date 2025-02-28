#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo "Loaded environment variables from .env file"
else
  echo "Error: .env file not found"
  exit 1
fi

# Start Supabase functions
echo "Starting Supabase functions in development mode..."
supabase functions serve 