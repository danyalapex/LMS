# Elite LMS Features - Implementation Guide

## Overview

This document outlines the new features implemented in the Arkali Solutions LMS, including:
- Subscription payment management (Cash-first, Bank API ready)
- Class-based learning structure
- Exam and assessment management
- Guardian auto-linking during signup
- In-app notifications
- Premium UI components

## 1. Environment Configuration

### Setup `.env.local`

Add the following variables to your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database Connection (optional)
DATABASE_URL=postgresql://user:password@localhost:5432/arkali_lms
DATABASE_POOL_URL=postgresql://user:password@localhost:5432/arkali_lms?schema=public

# Payment Configuration
NEXT_PUBLIC_PAYMENT_METHOD=cash
BANK_API_URL=https://api.bank.example.com
BANK_API_KEY=your-bank-api-key

# Application Configuration
NEXT_PUBLIC_APP_NAME=Arkali Solutions LMS
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 2. Database Migrations

Apply the new migration to set up class-based structure:

```bash
npx supabase db push
```

The migration adds:
- `grade_classes` - Grade classes (Class 9, Class 10, etc.)
- `class_courses` - Courses offered in each grade class
- `exams` - Exam definitions
- `exam_sheets` - Student exam submissions and marks
- `notifications` - In-app notification system
- `subscription_payments` - Payment tracking

## 3. Signup with Guardian Auto-Linking

### Updated Signup Flow

The new signup page (`/signup`) supports three registration modes:

1. **Student Only**: Student registers and creates account
2. **Guardian Only**: Guardian registers separately
3. **Both**: Student and Guardian register together (auto-linked)

### Features

- Comprehensive information collection for both student and guardian
- Date of birth, national ID, address, and contact information
- Automatic linking of guardian to student
- Auto-generated password for guardian when registering with student

### Implementation

**File**: `src/app/signup/page.tsx`

```typescript
// Example: Guardian-Student joint registration
// Guardian is auto-linked and receives a system-generated initial password
// Both can login with their own credentials
```

**Database Tables**:
- `users` - Extended with DOB, national_id, address, etc.
- `students` - Added father_name, mother_name fields
- `guardian_student_links_new` - Tracking multiple guardians per student

## 4. Subscription Payment Management

### Payment Methods

The system supports multiple payment methods:

1. **Cash** (Default) - Payments marked as completed immediately
2. **Bank Transfer** - Status: Pending (ready for bank API integration)
3. **Cheque** - Status: Pending (manual verification)

### Features

- Record payments with multiple methods
- Track payment status (pending/completed/failed)
- Payment reference tracking
- Due date and overdue management
- Payment statistics and reporting

### Usage

**Record a Cash Payment**:

```typescript
import { recordSubscriptionPayment } from "@/app/actions/subscriptions";

await recordSubscriptionPayment({
  organizationId: "org-id",
  subscriptionId: "sub-id",
  amount: 3000,
  paymentMethod: "cash",
  dueDate: "2026-03-31",
  referenceNo: "CASH-001",
});
```

**Bank API Integration** (Ready for Implementation):

When bank API credentials are available, use:

```typescript
import { initiateBankTransfer } from "@/app/actions/subscriptions";

await initiateBankTransfer(
  paymentId,
  process.env.BANK_API_URL!,
  process.env.BANK_API_KEY!
);
```

## 5. Class-Based Learning Structure

### Database Structure

```
Organization
  ├─ Grade Classes (Class 9, Class 10)
  │   ├─ Students (enrolled in grade class)
  │   ├─ Class Courses (Math, English, Urdu)
  │   │   ├─ Assignments
  │   │   ├─ Grades
  │   │   └─ Teachers
  │   └─ Exams
  │       ├─ Unit Tests
  │       ├─ Mid-Semester Exams
  │       └─ Final Exams
```

### Key Tables

- `grade_classes` - Grade class definitions
- `class_courses` - Courses within each grade
- `exams` - Exam definitions (unit_test, mid_semester, final_exam, quiz)
- `exam_sheets` - Student exam submissions and marks
- `exam_result_sheets` - Overall exam results and grades

### Creating a Grade Class

```sql
INSERT INTO grade_classes (organization_id, code, name, section, class_teacher_user_id, capacity)
VALUES (
  'org-id',
  'CLASS-9-A',
  'Class 9',
  'A',
  'teacher-user-id',
  50
);
```

## 6. Exam Management

### Exam Types

- **Unit Test**: Short quizzes/tests
- **Mid-Semester**: Mid-term exams
- **Final Exam**: End-of-term comprehensive exams
- **Quiz**: Quick assessments

### Features

- Scheduled date and time
- Duration tracking
- Exam instructions
- Passing marks configuration
- Student exam sheets for submissions
- Automatic grade calculation
- Result publishing

### Creating an Exam

```sql
INSERT INTO exams (
  organization_id,
  grade_class_id,
  course_id,
  exam_code,
  title,
  exam_type,
  total_marks,
  passing_marks,
  scheduled_date,
  duration_minutes
) VALUES (
  'org-id',
  'class-id',
  'course-id',
  'MATH-MID-2026',
  'Mathematics Mid-Semester Exam',
  'mid_semester',
  100,
  40,
  '2026-04-15T10:00:00',
  90
);
```

## 7. In-App Notifications

### Features

- Real-time notifications for key events
- Multiple notification types
- Read/unread status tracking
- Archive functionality
- Bulk notification support

### Notification Types

- `announcement` - General announcements 📢
- `assignment` - Assignment updates 📝
- `grade` - Grade releases ⭐
- `attendance` - Attendance marks ✓
- `exam` - Exam schedules 📋
- `fee` - Fee notifications 💳
- `system` - System messages ⚙️

### Usage

**Send Notification**:

```typescript
import { createNotification } from "@/app/actions/notifications";

await createNotification({
  recipientUserId: "student-id",
  notificationType: "exam",
  title: "Exam Scheduled",
  message: "Mathematics final exam scheduled for April 20, 2026",
  relatedEntity: "exam",
  relatedEntityId: "exam-id",
});
```

**Send Bulk Notifications**:

```typescript
import { sendBulkNotifications } from "@/app/actions/notifications";

await sendBulkNotifications({
  recipientUserIds: ["student-1", "student-2", "student-3"],
  notificationType: "announcement",
  title: "School Holiday",
  message: "School will be closed on Eid holidays",
  createdBy: "admin-id",
});
```

**Get Unread Count** (in headers/navbar):

```typescript
import { getUnreadNotificationCount } from "@/lib/notifications/queries";

const count = await getUnreadNotificationCount();
```

## 8. Premium UI Components

### Available Components

Located in `src/components/ui/premium-components.tsx`:

1. **PremiumButton** - Gradient buttons with variants
2. **PremiumCard** - Premium card containers
3. **PremiumStatCard** - Statistics display
4. **PremiumInput** - Enhanced input fields
5. **PremiumSelect** - Enhanced select dropdowns
6. **PremiumBadge** - Status/category badges
7. **PremiumDivider** - Styled dividers
8. **PremiumAlert** - Alert components
9. **PremiumSpinner** - Loading indicators
10. **PremiumSectionTitle** - Section headers
11. **PremiumGrid** - Responsive grid layouts

### Usage Examples

```typescript
import {
  PremiumButton,
  PremiumCard,
  PremiumInput,
  PremiumAlert,
  PremiumGrid,
} from "@/components/ui/premium-components";

export function MyComponent() {
  return (
    <PremiumGrid columns={2}>
      <PremiumCard hoverable>
        <h3>Form Example</h3>
        <PremiumInput
          placeholder="Enter name"
          icon="👤"
          error={error}
        />
        <PremiumButton variant="primary">Submit</PremiumButton>
      </PremiumCard>

      <PremiumAlert
        type="success"
        title="Success!"
        message="Operation completed successfully"
      />
    </PremiumGrid>
  );
}
```

## 9. Payment Components

Located in `src/components/subscriptions/payment-components.tsx`:

1. **PaymentMethodBadge** - Display payment method
2. **PaymentStatusBadge** - Display payment status
3. **SubscriptionPaymentItem** - Payment display card
4. **SubscriptionPaymentForm** - Record new payment
5. **PaymentStatisticsCard** - Payment analytics

### Usage

```typescript
import {
  SubscriptionPaymentForm,
  PaymentStatisticsCard,
} from "@/components/subscriptions/payment-components";

export function PaymentPage() {
  return (
    <>
      <PaymentStatisticsCard stats={paymentStats} />
      <SubscriptionPaymentForm
        onSubmit={handlePayment}
      />
    </>
  );
}
```

## 10. Notification Components

Located in `src/components/notifications/notification-item.tsx`:

1. **NotificationBell** - Bell icon with unread count
2. **NotificationItem** - Individual notification card
3. **NotificationList** - List of notifications

### Usage

```typescript
import {
  NotificationBell,
  NotificationList,
} from "@/components/notifications/notification-item";

export function Navbar() {
  return (
    <>
      <NotificationBell unreadCount={5} />
    </>
  );
}

export function NotificationsPage() {
  const { notifications } = await getNotifications();
  return <NotificationList notifications={notifications} />;
}
```

## 11. Next Steps

### Bank API Integration

When you have bank API credentials:

1. Add to `.env.local`:
   ```
   BANK_API_URL=https://api.your-bank.com
   BANK_API_KEY=your-api-key
   ```

2. Update the `initiateBankTransfer` function in `src/app/actions/subscriptions.ts`

3. Implement the actual bank API call with proper error handling

### Email Notifications

Add email integration for important events:
- Grade releases
- Exam schedules
- Fee reminders
- Attendance alerts

### SMS Notifications (Pakistan)

Consider integrating SMS for guardian alerts:
- Exam results
- Fee due dates
- Important announcements

### Advanced Reporting

Implement reports for:
- Student performance by exam and class
- Class-wise performance analytics
- Guardian engagement metrics
- Payment collection analytics

## Database Quick Reference

### Key Tables

| Table | Purpose |
|-------|---------|
| `grade_classes` | Grade class definitions |
| `class_courses` | Courses in grade classes |
| `students` | Student records (expanded profile) |
| `guardian_student_links_new` | Guardian-student relationships |
| `exams` | Exam definitions |
| `exam_sheets` | Student exam submissions |
| `exam_result_sheets` | Exam results and grades |
| `notifications` | In-app notifications |
| `subscription_payments` | Payment records |

## Troubleshooting

### Migration Issues

```bash
# If migration fails, check status:
npx supabase migration list

# Push again:
npx supabase db push
```

### Notification Not Showing

1. Check user exists in organization
2. Verify notification created in correct organization
3. Check notification status in database

### Payment Status Not Updating

1. Verify payment exists in database
2. Check payment method is supported
3. Review subscription_payments table

## Support & Resources

- Database Schema: `supabase/schema.sql`
- Migrations: `supabase/migrations/`
- Environment Guide: `.env.example`
- Premium Components: `src/components/ui/`
- Actions: `src/app/actions/`
