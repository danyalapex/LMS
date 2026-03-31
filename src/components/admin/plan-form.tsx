import { useState } from "react";
import { PremiumButton, PremiumInput } from "@/components/ui/premium-components";

interface PlanFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
  isLoading?: boolean;
}

export function PlanForm({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}: PlanFormProps) {
  const [code, setCode] = useState(initialData?.code || "");
  const [name, setName] = useState(initialData?.name || "");
  const [price, setPrice] = useState(initialData?.monthly_price_pkr || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [features, setFeatures] = useState(
    (initialData?.features || []).join(", ")
  );
  const [branding, setBranding] = useState(
    initialData?.includes_personal_branding || false
  );
  const [active, setActive] = useState(initialData?.active !== false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      code,
      name,
      monthly_price_pkr: parseInt(price),
      description,
      features: features.split(",").map((f: string) => f.trim()),
      includes_personal_branding: branding,
      active,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Plan Code</label>
          <PremiumInput
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g., basic"
            required
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Plan Name</label>
          <PremiumInput
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Basic Pack"
            required
            disabled={isLoading}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Price (PKR)</label>
        <PremiumInput
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="5000"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Plan description"
          disabled={isLoading}
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Features (comma-separated)</label>
        <textarea
          value={features}
          onChange={(e) => setFeatures(e.target.value)}
          placeholder="Feature 1, Feature 2, Feature 3"
          disabled={isLoading}
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
        />
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={branding}
            onChange={(e) => setBranding(e.target.checked)}
            disabled={isLoading}
            className="mr-2 w-4 h-4"
          />
          <span className="text-sm text-slate-700">Includes Personal Branding</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            disabled={isLoading}
            className="mr-2 w-4 h-4"
          />
          <span className="text-sm text-slate-700">Active</span>
        </label>
      </div>

      <div className="flex gap-2 justify-end">
        <PremiumButton type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancel
        </PremiumButton>
        <PremiumButton type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? "Saving..." : initialData ? "Update Plan" : "Create Plan"}
        </PremiumButton>
      </div>
    </form>
  );
}
