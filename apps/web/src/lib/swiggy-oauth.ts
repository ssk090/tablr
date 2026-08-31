import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@tablr/database";

/**
 * Swiggy MCP OAuth 2.1 + PKCE client (direct developer flow).
 * Docs: https://mcp.swiggy.com/builders/docs/start/authenticate/
 *
 * - Dynamic Client Registration (RFC 7591) at POST /auth/register
 * - Authorization: GET /auth/authorize (PKCE S256)
 * - Token exchange: POST /auth/token (JSON body)
 * - No refresh grant in v1: access token lives 5 days, re-run authorization after expiry.
 */

const MCP_BASE_URL = process.env.SWIGGY_MCP_BASE_URL ?? "https://mcp.swiggy.com";
export const SWIGGY_CALLBACK_PATH = "/api/auth/callback/swiggy";
const SCOPE = "mcp:tools mcp:resources mcp:prompts";

export interface PkcePair {
  readonly verifier: string;
  readonly challenge: string;
}

export function createPkcePair(): PkcePair {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function createState(): string {
  return randomBytes(16).toString("base64url");
}

/**
 * The callback URL for the current origin. Must exact-match the URI
 * allowlisted with Swiggy (email builders@swiggy.in to add URIs).
 */
export function getCallbackUrl(origin: string): string {
  return `${origin}${SWIGGY_CALLBACK_PATH}`;
}

/**
 * Register (or reuse) the OAuth client via Dynamic Client Registration.
 * client_id is stored in Postgres so we register once per redirect URI set.
 */
export async function getOrRegisterClientId(origin: string): Promise<string> {
  const existing = await prisma.swiggyOAuthClient.findFirst();
  if (existing) return existing.clientId;

  const callbackUrl = getCallbackUrl(origin);
  const redirectUris = [callbackUrl];
  const prodOrigin = process.env.NEXT_PUBLIC_APP_URL;
  if (prodOrigin && !redirectUris.includes(`${prodOrigin}${SWIGGY_CALLBACK_PATH}`)) {
    redirectUris.push(`${prodOrigin}${SWIGGY_CALLBACK_PATH}`);
  }

  const response = await fetch(`${MCP_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "Tablr",
      redirect_uris: redirectUris,
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: SCOPE,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Swiggy DCR failed (${response.status}): ${body}`);
  }
  const data = (await response.json()) as { client_id?: string };
  if (!data.client_id) {
    throw new Error("Swiggy DCR response missing client_id");
  }
  await prisma.swiggyOAuthClient.create({ data: { clientId: data.client_id } });
  return data.client_id;
}

export function buildAuthorizeUrl(params: {
  readonly clientId: string;
  readonly callbackUrl: string;
  readonly challenge: string;
  readonly state: string;
}): string {
  const url = new URL(`${MCP_BASE_URL}/auth/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.callbackUrl);
  url.searchParams.set("code_challenge", params.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", params.state);
  url.searchParams.set("scope", SCOPE);
  return url.toString();
}

export interface SwiggyTokens {
  readonly accessToken: string;
  readonly expiresIn: number;
}

export async function exchangeCodeForTokens(params: {
  readonly code: string;
  readonly verifier: string;
  readonly callbackUrl: string;
}): Promise<SwiggyTokens> {
  const response = await fetch(`${MCP_BASE_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: params.code,
      code_verifier: params.verifier,
      redirect_uri: params.callbackUrl,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Swiggy token exchange failed (${response.status}): ${body}`);
  }
  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) {
    throw new Error("Swiggy token response missing access_token");
  }
  return { accessToken: data.access_token, expiresIn: data.expires_in ?? 432000 };
}

/**
 * Save the access token for a profile. Called from the OAuth callback.
 */
export async function saveSwiggyToken(profileId: string, tokens: SwiggyTokens): Promise<void> {
  const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
  await prisma.swiggyAuth.upsert({
    where: { profileId },
    update: { accessToken: tokens.accessToken, expiresAt },
    create: { profileId, accessToken: tokens.accessToken, expiresAt },
  });
}
