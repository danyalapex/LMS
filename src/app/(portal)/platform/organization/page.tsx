'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PremiumButton, PremiumCard, PremiumSectionTitle } from '@/components/ui/premium-components';

interface Organization {
  id: string;
  name: string;
  code: string;
  contact_email: string;
  status: string;
  timezone: string;
}

interface Subscription {
  id: string;
  status: string;
  ends_on: string | null;
  subscription_plans?: { name: string; code: string };
}

export default function OrganizationListPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/schools');
        if (!response.ok) throw new Error('Failed to fetch organizations');
        const data = await response.json();
        setOrganizations(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <PremiumSectionTitle title="Organizations" />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {organizations.length === 0 ? (
        <PremiumCard>
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No organizations found</p>
          </div>
        </PremiumCard>
      ) : (
        <div className="grid gap-4">
          {organizations.map((org) => (
            <Link key={org.id} href={`/platform/organization/${org.id}`}>
              <PremiumCard className="hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{org.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">Code: {org.code}</p>
                    <p className="text-sm text-gray-600">Email: {org.contact_email}</p>
                    <p className="text-sm text-gray-600">Timezone: {org.timezone}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        org.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : org.status === 'suspended'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {org.status}
                    </span>
                    <PremiumButton variant="outline" size="sm" className="mt-2">
                      View Details →
                    </PremiumButton>
                  </div>
                </div>
              </PremiumCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
