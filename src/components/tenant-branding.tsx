import TenantBrandingClient from "./tenant-branding-client";

const DEFAULT = {
  brand_name: null,
  primary_color: "#4f46e5",
  secondary_color: "#0f172a",
  accent_color: "#16a34a",
  logo_url: null,
};

export default function TenantBranding() {
  const css = `:root{--brand-primary:${DEFAULT.primary_color};--brand-secondary:${DEFAULT.secondary_color};--brand-accent:${DEFAULT.accent_color};}`;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <TenantBrandingClient />
    </>
  );
}
