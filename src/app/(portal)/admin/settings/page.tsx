import {
  deletePaymentMethodAction,
  saveDefaultGradingPolicyAction,
  saveFeeSettingsAction,
  savePaymentMethodAction,
} from "@/app/actions/lms";
import {
  WorkspaceSection,
  WorkspaceShell,
} from "@/components/admin/workspace-shell";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { requireIdentity, requireRole } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/lms/format";
import { DEFAULT_GRADING_BANDS } from "@/lib/lms/grading";
import {
  getDefaultOrganizationGradingPolicy,
  getOrganizationFeeSettings,
  listOrganizationGradingPolicies,
  listOrganizationPaymentMethods,
} from "@/lib/lms/queries";

export default async function AdminSettingsPage() {
  await requireRole(["admin", "finance"]);
  const identity = await requireIdentity();

  const [feeSettings, paymentMethods, gradingPolicies, defaultPolicy] =
    await Promise.all([
      getOrganizationFeeSettings(identity.organizationId),
      listOrganizationPaymentMethods(identity.organizationId),
      listOrganizationGradingPolicies(identity.organizationId),
      getDefaultOrganizationGradingPolicy(identity.organizationId),
    ]);

  const activePaymentMethods = paymentMethods.filter((method) => method.enabled).length;
  const currentBands =
    defaultPolicy?.bands && defaultPolicy.bands.length > 0
      ? defaultPolicy.bands
      : DEFAULT_GRADING_BANDS;

  return (
    <WorkspaceShell
      eyebrow="School rules"
      title="School grading, fee, and payment settings"
      description="Each school can now run its own grading scale, fee collection rules, and accepted payment methods without affecting any other tenant."
      stats={[
        {
          label: "Active grading policy",
          value: defaultPolicy?.policy_name ?? "Default percentage scale",
          helper: "Used when teachers record new grades.",
          tone: "accent",
        },
        {
          label: "Pass mark",
          value: `${defaultPolicy?.pass_mark ?? 50}%`,
          helper: "Current pass threshold for the active grading scale.",
          tone: "neutral",
        },
        {
          label: "Currency",
          value: feeSettings.currency_code,
          helper: "Default billing currency for invoices and fee views.",
          tone: "neutral",
        },
        {
          label: "Enabled methods",
          value: String(activePaymentMethods),
          helper: "Payment methods currently available to finance teams.",
          tone: "warn",
        },
      ]}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_420px]">
        <div className="space-y-5">
          <WorkspaceSection
            title="Default grading policy"
            description="When you save this form, the school gets a new active grading policy version. Older recorded grades keep their original policy reference."
            tone="accent"
          >
            <form action={saveDefaultGradingPolicyAction} className="space-y-4">
              <div className="form-grid">
                <label className="field">
                  <span className="field-label">Policy name</span>
                  <input
                    name="policy_name"
                    defaultValue={defaultPolicy?.policy_name ?? "Default percentage scale"}
                    className="field-input"
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">Pass mark</span>
                  <input
                    name="pass_mark"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    defaultValue={defaultPolicy?.pass_mark ?? 50}
                    className="field-input"
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">Decimal precision</span>
                  <input
                    name="decimal_precision"
                    type="number"
                    min="0"
                    max="4"
                    defaultValue={defaultPolicy?.decimal_precision ?? 2}
                    className="field-input"
                    required
                  />
                </label>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">Scale bands</p>
                  <span className="chip">Versioned per save</span>
                </div>

                <div className="space-y-3">
                  {currentBands.map((band, index) => (
                    <div
                      key={`${band.band_label}-${index}`}
                      className="grid gap-3 rounded-[24px] border border-[color:var(--border)] bg-white/75 p-4 md:grid-cols-[0.8fr_1fr_1fr_1fr_1.5fr]"
                    >
                      <label className="field">
                        <span className="field-label">Band</span>
                        <input
                          name="band_label"
                          defaultValue={band.band_label}
                          className="field-input"
                          required
                        />
                      </label>
                      <label className="field">
                        <span className="field-label">Min %</span>
                        <input
                          name="band_min_percentage"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          defaultValue={band.min_percentage}
                          className="field-input"
                          required
                        />
                      </label>
                      <label className="field">
                        <span className="field-label">Max %</span>
                        <input
                          name="band_max_percentage"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          defaultValue={band.max_percentage}
                          className="field-input"
                          required
                        />
                      </label>
                      <label className="field">
                        <span className="field-label">Points</span>
                        <input
                          name="band_grade_points"
                          type="number"
                          min="0"
                          max="10"
                          step="0.01"
                          defaultValue={band.grade_points ?? ""}
                          className="field-input"
                        />
                      </label>
                      <label className="field">
                        <span className="field-label">Remarks</span>
                        <input
                          name="band_remarks"
                          defaultValue={band.remarks ?? ""}
                          className="field-input"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <FormSubmitButton pendingLabel="Saving policy...">
                Publish grading policy
              </FormSubmitButton>
            </form>
          </WorkspaceSection>

          <WorkspaceSection
            title="Policy history"
            description="Recent grading policy versions for this school."
          >
            <div className="space-y-3">
              {gradingPolicies.length > 0 ? (
                gradingPolicies.map((policy) => (
                  <article
                    key={policy.id}
                    className="rounded-[24px] border border-[color:var(--border)] bg-white/80 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-950">
                          {policy.policy_name}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Saved {formatDate(policy.created_at)} with pass mark {policy.pass_mark}%.
                        </p>
                      </div>
                      <span className="chip">
                        {policy.is_default ? "Active default" : "Archived version"}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {policy.bands.map((band) => (
                        <span key={band.id} className="chip">
                          {band.band_label}: {band.min_percentage}-{band.max_percentage}%
                        </span>
                      ))}
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <p className="text-lg font-semibold text-slate-950">No grading history yet.</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Save the first school grading policy to start version tracking.
                  </p>
                </div>
              )}
            </div>
          </WorkspaceSection>
        </div>

        <div className="space-y-5">
          <WorkspaceSection
            title="Fee collection policy"
            description="These rules affect invoices, payment validation, and how fee totals are shown."
          >
            <form action={saveFeeSettingsAction} className="space-y-4">
              <div className="form-grid">
                <label className="field">
                  <span className="field-label">Currency code</span>
                  <input
                    name="currency_code"
                    defaultValue={feeSettings.currency_code}
                    className="field-input"
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">Receipt prefix</span>
                  <input
                    name="receipt_prefix"
                    defaultValue={feeSettings.receipt_prefix}
                    className="field-input"
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">Late fee grace days</span>
                  <input
                    name="late_fee_grace_days"
                    type="number"
                    min="0"
                    defaultValue={feeSettings.late_fee_grace_days}
                    className="field-input"
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">Late fee amount</span>
                  <input
                    name="late_fee_flat_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={feeSettings.late_fee_flat_amount}
                    className="field-input"
                    required
                  />
                </label>
                <label className="field field-span-2">
                  <span className="field-label">Partial payments</span>
                  <label className="flex items-center gap-3 rounded-[24px] border border-[color:var(--border)] bg-white/80 px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="allow_partial_payments"
                      defaultChecked={feeSettings.allow_partial_payments}
                    />
                    Allow finance teams to record less than the remaining invoice balance.
                  </label>
                </label>
              </div>

              <div className="rounded-[24px] border border-[color:var(--border)] bg-white/75 p-4 text-sm text-slate-600">
                Current example: 10,000 becomes{" "}
                <span className="font-semibold text-slate-950">
                  {formatMoney(10000, feeSettings.currency_code)}
                </span>{" "}
                across school fee pages.
              </div>

              <FormSubmitButton pendingLabel="Saving fee policy...">
                Save fee policy
              </FormSubmitButton>
            </form>
          </WorkspaceSection>

          <WorkspaceSection
            title="Accepted payment methods"
            description="Enable only the payment methods this school actually uses."
          >
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <form
                  key={method.id || method.method_code}
                  action={savePaymentMethodAction}
                  className="space-y-3 rounded-[24px] border border-[color:var(--border)] bg-white/80 p-4"
                >
                  <input type="hidden" name="method_id" value={method.id} />
                  <div className="form-grid">
                    <label className="field">
                      <span className="field-label">Code</span>
                      <input
                        name="method_code"
                        defaultValue={method.method_code}
                        className="field-input"
                        required
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Label</span>
                      <input
                        name="label"
                        defaultValue={method.label}
                        className="field-input"
                        required
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Sort order</span>
                      <input
                        name="sort_order"
                        type="number"
                        min="1"
                        defaultValue={method.sort_order}
                        className="field-input"
                        required
                      />
                    </label>
                    <label className="field field-span-2">
                      <span className="field-label">Instructions</span>
                      <textarea
                        name="instructions"
                        defaultValue={method.instructions ?? ""}
                        rows={2}
                        className="field-textarea"
                      />
                    </label>
                    <label className="field field-span-2">
                      <span className="field-label">Enabled</span>
                      <label className="flex items-center gap-3 rounded-[24px] border border-[color:var(--border)] bg-white/80 px-4 py-3 text-sm text-slate-700">
                        <input type="checkbox" name="enabled" defaultChecked={method.enabled} />
                        Make this payment method available in the school finance workflow.
                      </label>
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <FormSubmitButton variant="secondary" pendingLabel="Saving...">
                      Save method
                    </FormSubmitButton>
                    {method.id ? (
                      <FormSubmitButton
                        variant="danger"
                        pendingLabel="Removing..."
                        formAction={deletePaymentMethodAction}
                      >
                        Delete
                      </FormSubmitButton>
                    ) : null}
                  </div>
                </form>
              ))}

              <form
                action={savePaymentMethodAction}
                className="space-y-3 rounded-[24px] border border-dashed border-[color:var(--border)] bg-white/65 p-4"
              >
                <p className="text-sm font-semibold text-slate-950">Add custom method</p>
                <div className="form-grid">
                  <label className="field">
                    <span className="field-label">Code</span>
                    <input
                      name="method_code"
                      className="field-input"
                      placeholder="jazzcash"
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Label</span>
                    <input
                      name="label"
                      className="field-input"
                      placeholder="JazzCash"
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Sort order</span>
                    <input
                      name="sort_order"
                      type="number"
                      min="1"
                      defaultValue={paymentMethods.length + 1}
                      className="field-input"
                      required
                    />
                  </label>
                  <label className="field field-span-2">
                    <span className="field-label">Instructions</span>
                    <textarea
                      name="instructions"
                      rows={2}
                      className="field-textarea"
                      placeholder="Tell finance staff what proof or reference to capture."
                    />
                  </label>
                  <input type="hidden" name="enabled" value="true" />
                </div>
                <FormSubmitButton pendingLabel="Adding...">
                  Add payment method
                </FormSubmitButton>
              </form>
            </div>
          </WorkspaceSection>
        </div>
      </div>
    </WorkspaceShell>
  );
}
