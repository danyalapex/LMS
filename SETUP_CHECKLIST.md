# Quick Setup Checklist

## 📋 Prerequisites
- Node.js installed
- Supabase project created
- Environment variables configured

## 🚀 Setup Steps

### 1. Install Dependencies
```bash
npm install date-fns
```

### 2. Update Environment Variables
Copy and update `.env.local`:
```bash
# Supabase (from .env.example)
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-key

# Database (optional)
DATABASE_URL=your-db-url

# Payment (cash is default)
NEXT_PUBLIC_PAYMENT_METHOD=cash
BANK_API_URL=
BANK_API_KEY=

# App Config
NEXT_PUBLIC_APP_NAME=Arkali Solutions LMS
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Apply Database Migration
```bash
npx supabase db push
```

This creates:
- Grade classes structure
- Exam management tables
- Notification system
- Payment tracking
- Extended user profiles

### 4. Test Features

#### Test Signup Flow
1. Visit `http://localhost:3000/signup`
2. Try three modes:
   - Student Only (single registration)
   - Guardian Only (separate account)
   - Both (joint registration with auto-linking)

#### Test Notifications
```typescript
// In any server action
import { createNotification } from "@/app/actions/notifications";

await createNotification({
  recipientUserId: "user-id",
  notificationType: "announcement",
  title: "Welcome!",
  message: "Welcome to Arkali LMS"
});
```

#### Test Payments
```typescript
// In any server action
import { recordSubscriptionPayment } from "@/app/actions/subscriptions";

await recordSubscriptionPayment({
  organizationId: "org-id",
  subscriptionId: "sub-id",
  amount: 3000,
  paymentMethod: "cash",
  dueDate: "2026-03-31"
});
```

### 5. Add Notification Bell to Navbar
```typescript
// In your navbar component
import { NotificationBell } from "@/components/notifications/notification-item";
import { getUnreadNotificationCount } from "@/lib/notifications/queries";

export async function Navbar() {
  const unreadCount = await getUnreadNotificationCount();
  return <NotificationBell unreadCount={unreadCount} />;
}
```

### 6. Add Premium Components to Pages
```typescript
// Example page
import {
  PremiumButton,
  PremiumCard,
  PremiumGrid,
} from "@/components/ui/premium-components";
import {
  PaymentStatisticsCard,
  SubscriptionPaymentForm,
} from "@/components/subscriptions/payment-components";

export default function PaymentPage() {
  return (
    <PremiumGrid columns={2}>
      <PremiumCard>
        <h2>Payments</h2>
        <PaymentStatisticsCard stats={stats} />
        <SubscriptionPaymentForm onSubmit={handlePayment} />
      </PremiumCard>
    </PremiumGrid>
  );
}
```

## ✅ Verification Checklist

- [ ] `date-fns` installed
- [ ] Environment variables set in `.env.local`
- [ ] Database migration applied (`npx supabase db push`)
- [ ] Signup page works (visit `/signup`)
- [ ] Can create notifications
- [ ] Can record payments
- [ ] Premium components render correctly
- [ ] Notification bell shows in navbar

## 📚 Documentation

**Full guide**: `docs/elite-features.md`

**Implementation summary**: `IMPLEMENTATION_SUMMARY.md`

## 🆘 Common Issues

### Migration fails
```bash
npx supabase migration list    # Check status
npx supabase db push           # Try again
```

### date-fns not found
```bash
npm install date-fns
npm run dev
```

### Notifications not showing
1. Check organization_id in database
2. Verify notification created: `SELECT * FROM notifications;`
3. Check user has notifications table access

### Payment not recorded
1. Verify organization and subscription IDs exist
2. Check payment method is valid (cash/bank_transfer/cheque)
3. Review subscription_payments table

## 📞 Support

1. Check `docs/elite-features.md` for detailed docs
2. Review component examples in source files
3. Check database schema in `supabase/migrations/`

---

**Ready to go!** 🚀 Start with step 1 and work through the checklist.
