// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Read salts from environment
const SERVER_SALT = Deno.env.get("DEVICE_HASH_SERVER_SALT") || "dev-server-salt";
const PUBLIC_SALT = Deno.env.get("DEVICE_HASH_PUBLIC_SALT") || "public-salt";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: { ...corsHeaders, 'content-type': 'application/json' } });
    }

    const headers = Object.fromEntries(req.headers.entries());
    const forwardedFor = headers['x-forwarded-for'] || headers['x-real-ip'] || '';
    const ip = (forwardedFor.split(',')[0] || '').trim();

    const body = await req.json().catch(() => ({}));
    const deviceUUID = String(body.device_uuid || '').trim();
    const userAgent = String(body.user_agent || headers['user-agent'] || '').trim();

    // Compute hashes
    const ip_hash = ip ? await sha256Hex(`${ip}:${SERVER_SALT}`) : null;
    const device_hash = await sha256Hex(`${deviceUUID}:${userAgent}:${PUBLIC_SALT}:${SERVER_SALT}`);

    return new Response(JSON.stringify({ ip_hash, device_hash }), { status: 200, headers: { ...corsHeaders, 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error', detail: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } });
  }
}); 