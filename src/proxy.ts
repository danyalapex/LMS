import { NextResponse, type NextRequest } from "next/server";

// Minimal proxy/middleware: avoid heavy server libs here to keep middleware bundle small.
export async function proxy(request: NextRequest) {
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
