import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const DEFAULT = {
      primary_color: "#4f46e5",
      secondary_color: "#0f172a",
      accent_color: "#16a34a",
      brand_name: null,
    };

    if (!user) {
      const css = `:root{--brand-primary:${DEFAULT.primary_color};--brand-secondary:${DEFAULT.secondary_color};--brand-accent:${DEFAULT.accent_color};}`;
      return NextResponse.json({ css });
    }

    const admin = createSupabaseAdminClient();
    const { data: appUser } = await admin
      .from("users")
      .select("organization_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!appUser?.organization_id) {
      const css = `:root{--brand-primary:${DEFAULT.primary_color};--brand-secondary:${DEFAULT.secondary_color};--brand-accent:${DEFAULT.accent_color};}`;
      return NextResponse.json({ css });
    }

    const { data: branding, error } = await admin
      .from("organization_branding")
      .select("brand_name, primary_color, secondary_color, accent_color, logo_url")
      .eq("organization_id", appUser.organization_id)
      .maybeSingle();

    if (error || !branding) {
      const css = `:root{--brand-primary:${DEFAULT.primary_color};--brand-secondary:${DEFAULT.secondary_color};--brand-accent:${DEFAULT.accent_color};}`;
      return NextResponse.json({ css });
    }

    const primary = branding.primary_color ?? DEFAULT.primary_color;
    const secondary = branding.secondary_color ?? DEFAULT.secondary_color;
    const accent = branding.accent_color ?? DEFAULT.accent_color;
    const brandName = branding.brand_name ? JSON.stringify(branding.brand_name) : null;

    const css = `:root{--brand-primary:${primary};--brand-secondary:${secondary};--brand-accent:${accent};${
      brandName ? `--brand-name:${brandName};` : ""
    }}`;

    return NextResponse.json({ css });
  } catch (err) {
    console.error("[branding] error", err);
    const css = `:root{--brand-primary:#4f46e5;--brand-secondary:#0f172a;--brand-accent:#16a34a;}`;
    return NextResponse.json({ css });
  }
}
