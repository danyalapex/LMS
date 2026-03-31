import { useState } from "react";
import { PremiumButton, PremiumInput } from "@/components/ui/premium-components";

interface SchoolFormProps {
  onSubmit: (data: { name: string; code: string; contact_email: string; status: string }) => void;
  onCancel: () => void;
  initialData?: any;
  isLoading?: boolean;
}

export function SchoolForm({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}: SchoolFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [code, setCode] = useState(initialData?.code || "");
  const [contactEmail, setContactEmail] = useState(initialData?.contact_email || "");
  const [status, setStatus] = useState(initialData?.status || "active");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      code,
      contact_email: contactEmail,
      status,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">School Name</label>
        <PremiumInput
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter school name"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">School Code</label>
        <PremiumInput
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter school code"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
        <PremiumInput
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="school@email.com"
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          disabled={isLoading}
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="flex gap-2 justify-end">
        <PremiumButton type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancel
        </PremiumButton>
        <PremiumButton type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? "Saving..." : initialData ? "Update School" : "Create School"}
        </PremiumButton>
      </div>
    </form>
  );
}
