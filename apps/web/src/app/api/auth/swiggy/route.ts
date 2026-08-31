import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  buildAuthorizeUrl,
  createPkcePair,
  createState,
  getCallbackUrl,
  getOrRegisterClientId,
} from "@/lib/swiggy-oauth";

/**
 * Starts the Swiggy OAuth 2.1 + PKCE flow:
 * registers the client via DCR (first run only), then redirects to the
 * Swiggy consent UI (phone + OTP).
 */
export async function GET(req: Request): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const origin = new URL(req.url).origin;
    const callbackUrl = getCallbackUrl(origin);
    const clientId = await getOrRegisterClientId(origin);
    const pkce = createPkcePair();
    const state = createState();

    const store = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 600, // 10 minutes: authorization code lives 120s, this is generous
    };
    store.set("swiggy_pkce_verifier", pkce.verifier, cookieOptions);
    store.set("swiggy_oauth_state", state, cookieOptions);

    return NextResponse.redirect(
      buildAuthorizeUrl({ clientId, callbackUrl, challenge: pkce.challenge, state }),
    );
  } catch (error) {
    console.error("[Swiggy OAuth] Failed to start authorization:", error);
    return new Response("Failed to start Swiggy authorization", { status: 502 });
  }
}
