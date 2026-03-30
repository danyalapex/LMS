-- Add Stripe billing fields to support subscription reconciliation and renewals
BEGIN;

-- Add fields to organization_subscriptions
ALTER TABLE public.organization_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS next_billing_date date;

-- Add stripe_customer_id to organizations for easy lookup
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_organization_subscriptions_stripe_subscription_id ON public.organization_subscriptions (stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_organization_subscriptions_next_billing_date ON public.organization_subscriptions (next_billing_date);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id ON public.organizations (stripe_customer_id);

COMMIT;
