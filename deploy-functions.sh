#!/bin/bash

# Deploy all Edge Functions
echo "Deploying Edge Functions..."

# Note about shared folder
echo "Note: _shared folder is not deployed as a separate function but is included with each function deployment"

# Deploy each function
for func in dental-check skin-tracker posture-check nutri-snap poop-health; do
  echo "Deploying $func..."
  supabase functions deploy $func --no-verify-jwt
done

echo "All functions deployed successfully!" 