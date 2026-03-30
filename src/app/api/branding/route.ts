import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const DEFAULT = {
  brand_name: null,
  primary_color: "#4f46e5",
  secondary_color: "#0f172a",
  accent_color: "#16a34a",
  logo_url: null,
};

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(DEFAULT);
    }

    const admin = createSupabaseAdminClient();

    const { data: appUser } = await admin
      .from("users")
      .select("organization_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!appUser?.organization_id) {
      return NextResponse.json(DEFAULT);
    }

    const { data: branding, error } = await admin
      .from("organization_branding")
      .select("brand_name, primary_color, secondary_color, accent_color, logo_url")
      .eq("organization_id", appUser.organization_id)
      .maybeSingle();

    if (error || !branding) return NextResponse.json(DEFAULT);

    return NextResponse.json({
      brand_name: branding.brand_name ?? null,
      primary_color: branding.primary_color ?? DEFAULT.primary_color,
      secondary_color: branding.secondary_color ?? DEFAULT.secondary_color,
      accent_color: branding.accent_color ?? DEFAULT.accent_color,
      logo_url: branding.logo_url ?? null,
    });
  } catch (err) {
    return NextResponse.json(DEFAULT);
  }
}
