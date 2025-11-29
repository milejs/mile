import { NextResponse, NextRequest } from "next/server";

export const config = {
  matcher: [
    // Exclude API routes, mile path, static files, image optimizations, and .png files
    "/((?!api|mile|_next/static|_next/image|.*\\.png$).*)",
  ],
};

export async function proxy(request: NextRequest) {
  const api = new URL(
    `/api/mile/handle-redirect?pathname=${encodeURIComponent(request.nextUrl.pathname)}`,
    request.nextUrl.origin,
  );

  try {
    const res = await fetch(api);
    if (res.ok) {
      const redirectResult = await res.json();
      console.info("redirectResult", redirectResult);

      if (redirectResult && redirectResult.data) {
        const redirect_data = redirectResult.data;
        if (redirect_data?.status === "redirect") {
          const statusCode = redirect_data.status_code;
          return NextResponse.redirect(
            redirect_data.destination_path,
            statusCode,
          );
        }
      }
    }
  } catch (error) {
    console.error(error);
  }

  // No redirect found, continue without redirecting
  return NextResponse.next();
}
