import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeCodeForTokens, getCallbackUrl, saveSwiggyToken } from "@/lib/swiggy-oauth";

/**
 * OAuth callback: Swiggy redirects here with ?code=...&state=...
 * Validates state, exchanges the code (PKCE), stores the access token.
 */
export async function GET(req: Request): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  if (error) {
    console.error(
      "[Swiggy OAuth] Authorization error:",
      error,
      url.searchParams.get("error_description"),
    );
    return NextResponse.redirect(new URL("/dashboard?swiggy=denied", url.origin));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return new Response("Missing code or state", { status: 400 });
  }

  const store = await cookies();
  const verifier = store.get("swiggy_pkce_verifier")?.value;
  const expectedState = store.get("swiggy_oauth_state")?.value;
  store.delete("swiggy_pkce_verifier");
  store.delete("swiggy_oauth_state");

  if (!verifier || !expectedState || state !== expectedState) {
    return new Response("Invalid OAuth state", { status: 400 });
  }

  try {
    const callbackUrl = getCallbackUrl(url.origin);
    const tokens = await exchangeCodeForTokens({ code, verifier, callbackUrl });
    await saveSwiggyToken(userId, tokens);
    return NextResponse.redirect(new URL("/dashboard?swiggy=connected", url.origin));
  } catch (error) {
    console.error("[Swiggy OAuth] Token exchange failed:", error);
    return NextResponse.redirect(new URL("/dashboard?swiggy=failed", url.origin));
  }
}
