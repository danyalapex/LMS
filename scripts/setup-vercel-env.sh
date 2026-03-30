#!/bin/bash
# Setup Vercel environment variables for Supabase
# 
# Usage:
#   Source the values from .env.local and use vercel env commands to set them:
#   export SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL ../.env.local | cut -d'=' -f2)
#   export ANON_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY ../.env.local | cut -d'=' -f2)
#   export SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY ../.env.local | cut -d'=' -f2)
#
#   Then use vercel CLI to add them:
#   npx vercel env add NEXT_PUBLIC_SUPABASE_URL production preview development
#   npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production preview development
#   npx vercel env add SUPABASE_SERVICE_ROLE_KEY production preview development
#

set -e

echo "This script guides you through setting Vercel environment variables"
echo "Values are stored in .env.local in your workspace"
echo ""
echo "Please use the Vercel dashboard or CLI to add:"
echo "  1. NEXT_PUBLIC_SUPABASE_URL"
echo "  2. NEXT_PUBLIC_SUPABASE_ANON_KEY"  
echo "  3. SUPABASE_SERVICE_ROLE_KEY (mark as Sensitive)"
echo ""
echo "See ARKALI_SETUP.md for detailed instructions"

