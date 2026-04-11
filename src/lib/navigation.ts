import type { UserRole } from "@/lib/auth";

export type NavigationItem = {
  href: string;
  label: string;
  description: string;
};

export const navigationByRole: Record<UserRole, NavigationItem[]> = {
  platform_admin: [
    {
      href: "/platform",
      label: "Platform Hub",
      description: "Schools, subscriptions, and platform revenue.",
    },
    {
      href: "/platform/arkali-management",
      label: "Arkali Console",
      description: "Arkali Solutions subscription & revenue console.",
    },
  ],
  admin: [
    {
      href: "/admin",
      label: "Control Room",
      description: "Live institution operations and approvals.",
    },
    {
      href: "/admin/students",
      label: "Students",
      description: "Admissions, roster and student records.",
    },
    {
      href: "/admin/staff",
      label: "Staff",
      description: "Workforce, departments, contracts.",
    },
    {
      href: "/admin/courses",
      label: "Courses",
      description: "Course catalog, teacher assignment, enrollments.",
    },
    {
      href: "/admin/guardians",
      label: "Guardians",
      description: "Parent links and dependent mapping.",
    },
    {
      href: "/admin/timetable",
      label: "Timetable",
      description: "Period setup and weekly scheduling.",
    },
    {
      href: "/admin/reports",
      label: "Reports",
      description: "Academic, attendance and payroll analytics.",
    },
    {
      href: "/admin/fees",
      label: "Fees",
      description: "Billing plans, invoices, and fee collections.",
    },
    {
      href: "/admin/settings",
      label: "Settings",
      description: "School grading scales, fee rules, and payment methods.",
    },
    {
      href: "/admin/workflows",
      label: "Workflows",
      description: "Approvals, transitions and audit stream.",
    },
    {
      href: "/admin/notifications",
      label: "Notifications",
      description: "Targeted announcements and communication.",
    },
    {
      href: "/admin/payroll",
      label: "Payroll",
      description: "Cycles, deductions, payout operations.",
    },
  ],
  teacher: [
    {
      href: "/teacher",
      label: "Classroom Board",
      description: "Today classes and performance pulse.",
    },
    {
      href: "/teacher/attendance",
      label: "Attendance",
      description: "Session roll call and attendance logs.",
    },
    {
      href: "/teacher/grades",
      label: "Grades",
      description: "Assignment grading and feedback.",
    },
    {
      href: "/teacher/submissions",
      label: "Submissions",
      description: "Student submissions and grading queue.",
    },
    {
      href: "/teacher/timetable",
      label: "Timetable",
      description: "Weekly class schedule and room map.",
    },
    {
      href: "/teacher/announcements",
      label: "Announcements",
      description: "Institution and classroom notices.",
    },
  ],
  student: [
    {
      href: "/student",
      label: "My Workspace",
      description: "Progress and daily focus tasks.",
    },
    {
      href: "/student/grades",
      label: "My Grades",
      description: "Assessment scores and comments.",
    },
    {
      href: "/student/fees",
      label: "My Fees",
      description: "Invoices, due dates, and payment ledger.",
    },
    {
      href: "/student/assignments",
      label: "Assignments",
      description: "Submission workflow and deadlines.",
    },
    {
      href: "/student/attendance",
      label: "My Attendance",
      description: "Attendance status and session history.",
    },
    {
      href: "/student/timetable",
      label: "My Timetable",
      description: "Class schedule by day and period.",
    },
    {
      href: "/student/announcements",
      label: "Announcements",
      description: "Notices and updates for students.",
    },
  ],
  guardian: [
    {
      href: "/guardian",
      label: "Dependent View",
      description: "Linked student progress monitoring.",
    },
  ],
  finance: [
    {
      href: "/admin/fees",
      label: "Fees & Billing",
      description: "Fee plans, invoices, and collection ledger.",
    },
    {
      href: "/admin/payroll",
      label: "Payroll Ops",
      description: "Compensation, approvals and payouts.",
    },
    {
      href: "/admin/settings",
      label: "School Settings",
      description: "Payment methods and fee collection policy.",
    },
    {
      href: "/admin/workflows",
      label: "Approvals",
      description: "Payroll transition approvals and audit trail.",
    },
    {
      href: "/admin",
      label: "Control Room",
      description: "Institution financial health overview.",
    },
  ],
};
