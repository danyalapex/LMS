export type PlanTone = "slate" | "blue" | "amber";

export type SubscriptionPolicy = {
  code: string;
  name: string;
  monthlyPricePkr: number;
  description: string;
  executiveSummary: string;
  idealFor: string;
  supportModel: string;
  brandingModel: string;
  accessGovernance: string;
  defaultSeats: number;
  includesPersonalBranding: boolean;
  tone: PlanTone;
  features: string[];
  capabilities: Array<{
    label: string;
    value: string;
  }>;
};

export type SubscriptionPosture = {
  policy: SubscriptionPolicy;
  accessLabel: string;
  accessTone: "neutral" | "good" | "warn" | "critical";
  accessSummary: string;
  renewalLabel: string;
  renewalTone: "neutral" | "good" | "warn" | "critical";
  renewalSummary: string;
  renewalDate: string | null;
  daysUntilRenewal: number | null;
  utilizationPct: number | null;
  capacityLabel: string;
  capacityTone: "neutral" | "good" | "warn" | "critical";
  capacitySummary: string;
};

const DEFAULT_POLICY: SubscriptionPolicy = {
  code: "CUSTOM",
  name: "Custom Contract",
  monthlyPricePkr: 0,
  description: "Commercial terms defined outside the standard packaged plans.",
  executiveSummary: "Custom enterprise commercial profile.",
  idealFor: "Special accounts with manually negotiated scope.",
  supportModel: "Contract-defined support coverage.",
  brandingModel: "Contract-defined branding scope.",
  accessGovernance: "Access rules are governed manually by Arkali operations.",
  defaultSeats: 500,
  includesPersonalBranding: false,
  tone: "slate",
  features: [
    "Commercial terms negotiated separately",
    "Manual access governance",
    "Delivery scope aligned to account contract",
  ],
  capabilities: [
    { label: "Operations", value: "Contract-defined" },
    { label: "Finance", value: "Contract-defined" },
    { label: "Branding", value: "Contract-defined" },
    { label: "Support", value: "Contract-defined" },
  ],
};

export const SUBSCRIPTION_POLICIES: SubscriptionPolicy[] = [
  {
    code: "BASIC_3K",
    name: "Foundation",
    monthlyPricePkr: 3000,
    description:
      "Operational foundation for a school that needs a clean digital core without custom commercial complexity.",
    executiveSummary:
      "Core academic and administrative control with standard service boundaries.",
    idealFor: "Single-campus schools formalising student, staff, timetable, and academic records.",
    supportModel: "Standard business-hours support with guided onboarding.",
    brandingModel: "Arkali standard identity with school name and default experience.",
    accessGovernance:
      "Standard tenant access with core LMS modules and platform-managed defaults.",
    defaultSeats: 350,
    includesPersonalBranding: false,
    tone: "slate",
    features: [
      "Student, staff, guardian, course, and timetable operations",
      "Attendance, grading, and assignment workflows",
      "Standard reporting and billing visibility",
      "Governed on Arkali default brand system",
    ],
    capabilities: [
      { label: "Academic operations", value: "Core LMS suite" },
      { label: "Finance workflows", value: "Standard billing controls" },
      { label: "Analytics", value: "Operational reporting" },
      { label: "Branding", value: "Standard Arkali experience" },
      { label: "Support", value: "Business-hours" },
    ],
  },
  {
    code: "NORMAL_8K",
    name: "Professional",
    monthlyPricePkr: 8000,
    description:
      "A management-grade operating tier for institutions that need finance, reporting, and process discipline across teams.",
    executiveSummary:
      "Cross-functional school operations with stronger finance control and administrative visibility.",
    idealFor: "Growing institutions coordinating admin, finance, academic, and reporting teams.",
    supportModel: "Priority operational support with guided configuration reviews.",
    brandingModel: "Enhanced school identity with polished tenant presentation.",
    accessGovernance:
      "Expanded operational control set with stronger finance and reporting posture.",
    defaultSeats: 750,
    includesPersonalBranding: false,
    tone: "blue",
    features: [
      "Everything in Foundation",
      "Full finance, payroll, and fee workflow management",
      "Improved reporting posture for leadership reviews",
      "Operational governance for multi-role admin teams",
    ],
    capabilities: [
      { label: "Academic operations", value: "Advanced coordination" },
      { label: "Finance workflows", value: "Billing + payroll suite" },
      { label: "Analytics", value: "Leadership-ready summaries" },
      { label: "Branding", value: "Enhanced tenant identity" },
      { label: "Support", value: "Priority operations support" },
    ],
  },
  {
    code: "ELITE_12K",
    name: "Elite",
    monthlyPricePkr: 12000,
    description:
      "Enterprise subscription for schools that require executive visibility, custom branding, and a premium service posture.",
    executiveSummary:
      "Enterprise-grade control plane with white-label branding and contract-level governance.",
    idealFor: "Institutions treating the LMS as a strategic operating platform, not a utility tool.",
    supportModel: "Priority handling, premium onboarding, and executive commercial oversight.",
    brandingModel: "Custom school brand system with logo, palette, and premium presentation rights.",
    accessGovernance:
      "Highest commercial access tier with premium branding rights and enterprise handling.",
    defaultSeats: 1500,
    includesPersonalBranding: true,
    tone: "amber",
    features: [
      "Everything in Professional",
      "Elite custom branding and premium presentation rights",
      "High-capacity contract posture for larger school footprints",
      "Executive-grade service handling and commercial governance",
    ],
    capabilities: [
      { label: "Academic operations", value: "Enterprise-scale coverage" },
      { label: "Finance workflows", value: "Premium governance controls" },
      { label: "Analytics", value: "Executive visibility posture" },
      { label: "Branding", value: "Custom elite branding" },
      { label: "Support", value: "Priority + executive oversight" },
    ],
  },
];

const policyByCode = new Map(
  SUBSCRIPTION_POLICIES.map((policy) => [policy.code, policy] as const),
);

function getDayDiff(dateValue: string | null | undefined) {
  if (!dateValue) {
    return null;
  }

  const target = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  return Math.ceil(
    (target.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export function getSubscriptionPolicy(planCode?: string | null) {
  if (!planCode) {
    return DEFAULT_POLICY;
  }

  return policyByCode.get(planCode) ?? DEFAULT_POLICY;
}

export function getSubscriptionPosture(params: {
  planCode?: string | null;
  status?: string | null;
  seats?: number | null;
  userCount?: number | null;
  nextBillingDate?: string | null;
  endsOn?: string | null;
}): SubscriptionPosture {
  const policy = getSubscriptionPolicy(params.planCode);
  const status = (params.status ?? "").toLowerCase();
  const seats = params.seats ?? policy.defaultSeats;
  const userCount = params.userCount ?? 0;
  const utilizationPct =
    seats > 0 ? Math.round((userCount / seats) * 100) : null;
  const renewalDate = params.nextBillingDate ?? params.endsOn ?? null;
  const daysUntilRenewal = getDayDiff(renewalDate);

  let accessLabel = "Unassigned";
  let accessTone: SubscriptionPosture["accessTone"] = "neutral";
  let accessSummary =
    "No active commercial contract is attached to this tenant yet.";

  if (status === "active") {
    accessLabel = "Production access";
    accessTone = "good";
    accessSummary =
      "Institution is operating under an active contract and standard service posture.";
  } else if (status === "trial") {
    accessLabel = "Trial access";
    accessTone = "warn";
    accessSummary =
      "Institution has live access, but the commercial posture still needs conversion.";
  } else if (status === "past_due") {
    accessLabel = "Payment watch";
    accessTone = "warn";
    accessSummary =
      "Access is still open, but renewal risk needs intervention from platform operations.";
  } else if (status === "suspended") {
    accessLabel = "Suspended";
    accessTone = "critical";
    accessSummary =
      "Commercial access is restricted until platform administration restores service.";
  } else if (status === "cancelled") {
    accessLabel = "Closed";
    accessTone = "critical";
    accessSummary =
      "Previous subscription has been closed and requires reassignment before use.";
  }

  let renewalLabel = "No billing schedule";
  let renewalTone: SubscriptionPosture["renewalTone"] = "neutral";
  let renewalSummary = "No scheduled renewal is recorded for this tenant.";

  if (renewalDate && daysUntilRenewal !== null) {
    if (status === "past_due" || daysUntilRenewal < 0) {
      renewalLabel = "Overdue";
      renewalTone = "critical";
      renewalSummary =
        "Billing date has passed and the account needs recovery action.";
    } else if (daysUntilRenewal <= 7) {
      renewalLabel = "Due this week";
      renewalTone = "warn";
      renewalSummary =
        "Renewal is imminent and should stay on the platform watchlist.";
    } else if (daysUntilRenewal <= 21) {
      renewalLabel = "Upcoming";
      renewalTone = "warn";
      renewalSummary =
        "Renewal is approaching and should remain visible to operations.";
    } else {
      renewalLabel = "Scheduled";
      renewalTone = "good";
      renewalSummary =
        "Billing cadence is scheduled and currently outside the immediate risk window.";
    }
  }

  let capacityLabel = "No seat policy";
  let capacityTone: SubscriptionPosture["capacityTone"] = "neutral";
  let capacitySummary =
    "Seat governance is not available because no active seat limit is stored.";

  if (utilizationPct !== null) {
    if (utilizationPct >= 95) {
      capacityLabel = "Capacity critical";
      capacityTone = "critical";
      capacitySummary =
        "Tenant is at or near seat saturation and needs a contract review.";
    } else if (utilizationPct >= 80) {
      capacityLabel = "Capacity watch";
      capacityTone = "warn";
      capacitySummary =
        "Utilisation is high enough that expansion planning should start now.";
    } else {
      capacityLabel = "Capacity healthy";
      capacityTone = "good";
      capacitySummary =
        "Seat utilisation is operating within a healthy range for the contract.";
    }
  }

  return {
    policy,
    accessLabel,
    accessTone,
    accessSummary,
    renewalLabel,
    renewalTone,
    renewalSummary,
    renewalDate,
    daysUntilRenewal,
    utilizationPct,
    capacityLabel,
    capacityTone,
    capacitySummary,
  };
}
