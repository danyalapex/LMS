"use client";

import { useState, useEffect } from "react";
import { PremiumButton, PremiumCard, PremiumSectionTitle } from "@/components/ui/premium-components";
import { SchoolForm } from "@/components/admin/school-form";
import { PremiumPlanModal } from "@/components/admin/premium-plan-modal";

interface School {
  id: string;
  name: string;
  code: string;
  contact_email: string;
  status: string;
  created_at: string;
}

interface Subscription {
  id: string;
  organization_id: string;
  status: string;
  amount_pkr: number;
  ends_on: string | null;
  next_billing_date: string | null;
  subscription_plans: any[];
}

export default function AdminSchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch schools
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [schoolsRes, subscriptionsRes, plansRes] = await Promise.all([
          fetch("/api/admin/schools"),
          fetch("/api/admin/subscriptions"),
          fetch("/api/admin/plans"),
        ]);

        if (!schoolsRes.ok || !subscriptionsRes.ok || !plansRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const schoolsData = await schoolsRes.json();
        const subsData = await subscriptionsRes.json();
        const plansData = await plansRes.json();

        setSchools(schoolsData.data || []);
        setSubscriptions(subsData.data || []);
        setPlans(plansData.data || []);
      } catch (err: any) {
        setError(err.message || "Failed to load data");
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddSchool = async (data: any) => {
    try {
      const response = await fetch("/api/admin/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create school");
      }

      const result = await response.json();
      setSchools([result.data, ...schools]);
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || "Failed to create school");
    }
  };

  const handleUpdateSchool = async (data: any) => {
    if (!editingSchool) return;

    try {
      const response = await fetch(`/api/admin/schools/${editingSchool.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update school");
      }

      const result = await response.json();
      setSchools(schools.map((s) => (s.id === editingSchool.id ? result.data : s)));
      setEditingSchool(null);
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || "Failed to update school");
    }
  };

  const handleDeleteSchool = async (id: string) => {
    if (!confirm("Are you sure you want to delete this school?")) return;

    try {
      const response = await fetch(`/api/admin/schools/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete school");
      }

      setSchools(schools.filter((s) => s.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete school");
    }
  };

  const handleSelectPlan = async (planId: string) => {
    if (!selectedSchoolId) return;

    try {
      const response = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: selectedSchoolId,
          plan_id: planId,
          starts_on: new Date().toISOString().split("T")[0],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create subscription");
      }

      const result = await response.json();
      setSubscriptions([result.data, ...subscriptions]);
      setShowPlanModal(false);
      setSelectedSchoolId(null);
    } catch (err: any) {
      setError(err.message || "Failed to create subscription");
    }
  };

  const getSchoolSubscription = (schoolId: string) => {
    return subscriptions.find((s) => s.organization_id === schoolId);
  };

  const getNextBillingDate = (sub: Subscription | undefined) => {
    if (!sub) return "No subscription";
    return sub.next_billing_date || sub.ends_on || "No date set";
  };

  const getDaysUntilExpiry = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return null;
    const days = Math.floor(
      (new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  if (loading) {
    return (
      <div className="p-6">
        <PremiumCard>
          <p className="text-slate-600">Loading schools...</p>
        </PremiumCard>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PremiumSectionTitle
        title="School Management"
        subtitle="Manage schools and their subscriptions"
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Schools ({schools.length})</h3>
        <PremiumButton
          variant="primary"
          onClick={() => {
            setEditingSchool(null);
            setShowForm(true);
          }}
        >
          + Add School
        </PremiumButton>
      </div>

      {/* Form Modal */}
      {showForm && (
        <PremiumCard>
          <h3 className="text-lg font-semibold mb-4">
            {editingSchool ? "Edit School" : "Add New School"}
          </h3>
          <SchoolForm
            initialData={editingSchool}
            onSubmit={editingSchool ? handleUpdateSchool : handleAddSchool}
            onCancel={() => {
              setShowForm(false);
              setEditingSchool(null);
            }}
          />
        </PremiumCard>
      )}

      {/* Schools Table */}
      {schools.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">School Name</th>
                <th className="text-left py-2 px-4">Code</th>
                <th className="text-left py-2 px-4">Contact</th>
                <th className="text-left py-2 px-4">Status</th>
                <th className="text-left py-2 px-4">Plan</th>
                <th className="text-left py-2 px-4">Expiry</th>
                <th className="text-left py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((school) => {
                const sub = getSchoolSubscription(school.id);
                const daysLeft = getDaysUntilExpiry(sub?.ends_on || sub?.next_billing_date);
                const planName = sub?.subscription_plans?.[0]?.name || "No Plan";

                return (
                  <tr key={school.id} className="border-b hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium">{school.name}</td>
                    <td className="py-3 px-4 text-slate-600">{school.code}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {school.contact_email || "-"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          school.status === "active"
                            ? "bg-green-100 text-green-700"
                            : school.status === "suspended"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {school.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <div className="font-medium">{planName}</div>
                        {sub && (
                          <div className="text-xs text-slate-500">
                            {sub.status}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <div>
                          {daysLeft !== null ? (
                            <span
                              className={
                                daysLeft < 30
                                  ? "text-red-600 font-semibold"
                                  : "text-slate-600"
                              }
                            >
                              {daysLeft} days
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {getNextBillingDate(sub)}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <PremiumButton
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelectedSchoolId(school.id);
                            setShowPlanModal(true);
                          }}
                        >
                          Plan
                        </PremiumButton>
                        <PremiumButton
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingSchool(school);
                            setShowForm(true);
                          }}
                        >
                          Edit
                        </PremiumButton>
                        <PremiumButton
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDeleteSchool(school.id)}
                        >
                          Delete
                        </PremiumButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <PremiumCard>
          <p className="text-slate-600">No schools yet. Create one to get started!</p>
        </PremiumCard>
      )}

      {/* Premium Plan Modal */}
      <PremiumPlanModal
        isOpen={showPlanModal}
        onClose={() => {
          setShowPlanModal(false);
          setSelectedSchoolId(null);
        }}
        plans={plans}
        onSelectPlan={handleSelectPlan}
      />
    </div>
  );
}
