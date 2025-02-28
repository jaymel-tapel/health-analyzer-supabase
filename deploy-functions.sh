#!/bin/bash

# Deploy all Edge Functions
echo "Deploying Edge Functions..."

# Deploy shared folder first
echo "Deploying _shared folder..."
supabase functions deploy _shared --no-verify-jwt

# Deploy all other functions
for func in dental-check skin-tracker posture-check nutri-snap poop-health; do
  echo "Deploying $func..."
  supabase functions deploy $func --no-verify-jwt
done

echo "All functions deployed successfully!" 