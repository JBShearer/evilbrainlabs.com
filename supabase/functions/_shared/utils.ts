// Shared utilities for Evil Brain Labs edge functions
// Used by all edge functions for consistent auth, rate limiting, and error handling

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// =============================================================================
// CORS Headers
// =============================================================================

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =============================================================================
// Response Helpers
// =============================================================================

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

export function rateLimitResponse(): Response {
  return jsonResponse(
    { error: "Rate limit exceeded. Please wait before trying again." },
    429
  );
}

export function unauthorizedResponse(): Response {
  return jsonResponse({ error: "Authentication required" }, 401);
}

// =============================================================================
// Supabase Client Helpers
// =============================================================================

export function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

export function getAnonClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );
}

// =============================================================================
// Auth Helpers
// =============================================================================

interface AuthResult {
  user: { id: string; email?: string } | null;
  error: string | null;
}

export async function getAuthUser(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null, error: "Missing or invalid authorization header" };
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = getAnonClient();

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: error?.message || "Invalid token" };
  }

  return { user: { id: user.id, email: user.email }, error: null };
}

export async function requireAuth(req: Request): Promise<{ id: string; email?: string }> {
  const { user, error } = await getAuthUser(req);
  if (!user) {
    throw new AuthError(error || "Authentication required");
  }
  return user;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

// =============================================================================
// Rate Limiting
// =============================================================================

interface RateLimitOptions {
  limit?: number;        // Max calls per minute (default: 30)
  dailyLimit?: number;   // Max calls per day (optional)
  dailyAction?: string;  // Action type for daily limit tracking
}

export async function checkRateLimit(
  userId: string,
  functionName: string,
  options: RateLimitOptions = {}
): Promise<{ allowed: boolean; message?: string }> {
  const { limit = 30, dailyLimit, dailyAction } = options;
  const supabase = getServiceClient();

  // Check per-minute rate limit
  const { data: minuteAllowed, error: minuteError } = await supabase
    .rpc("check_rate_limit", {
      p_user_id: userId,
      p_function_name: functionName,
      p_limit: limit,
    });

  if (minuteError) {
    console.error("Rate limit check failed:", minuteError);
    // Fail open on error (allow the request but log it)
    return { allowed: true };
  }

  if (!minuteAllowed) {
    return { allowed: false, message: `Rate limit exceeded: max ${limit} requests per minute` };
  }

  // Check daily limit if specified
  if (dailyLimit && dailyAction) {
    const { data: dailyAllowed, error: dailyError } = await supabase
      .rpc("check_daily_limit", {
        p_user_id: userId,
        p_action_type: dailyAction,
        p_limit: dailyLimit,
      });

    if (dailyError) {
      console.error("Daily limit check failed:", dailyError);
      return { allowed: true };
    }

    if (!dailyAllowed) {
      return { allowed: false, message: `Daily limit exceeded: max ${dailyLimit} ${dailyAction} actions per day` };
    }
  }

  return { allowed: true };
}

// =============================================================================
// Standard Edge Function Wrapper
// =============================================================================

type EdgeHandler = (
  req: Request,
  user: { id: string; email?: string },
  supabase: SupabaseClient
) => Promise<Response>;

interface EdgeOptions {
  requireAuth?: boolean;
  rateLimit?: RateLimitOptions;
  functionName: string;
}

export function createEdgeHandler(handler: EdgeHandler, options: EdgeOptions) {
  return async (req: Request): Promise<Response> => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Auth check
      let user: { id: string; email?: string } | null = null;

      if (options.requireAuth !== false) {
        try {
          user = await requireAuth(req);
        } catch (e) {
          if (e instanceof AuthError) {
            return unauthorizedResponse();
          }
          throw e;
        }
      } else {
        const { user: authUser } = await getAuthUser(req);
        user = authUser;
      }

      // Rate limit check (only if authenticated)
      if (user && options.rateLimit) {
        const { allowed, message } = await checkRateLimit(
          user.id,
          options.functionName,
          options.rateLimit
        );

        if (!allowed) {
          return jsonResponse({ error: message }, 429);
        }
      }

      // Get service client for the handler
      const supabase = getServiceClient();

      // Execute handler
      return await handler(req, user!, supabase);

    } catch (err) {
      console.error(`Error in ${options.functionName}:`, err);

      if (err instanceof AuthError) {
        return unauthorizedResponse();
      }

      return errorResponse(
        err instanceof Error ? err.message : "Internal server error",
        500
      );
    }
  };
}

// =============================================================================
// Feature Flags
// =============================================================================

export const FLAGS = {
  MINT_V2: Deno.env.get("FLAG_MINT_V2") === "true",
  PORTFOLIO: Deno.env.get("FLAG_PORTFOLIO") === "true",
  BATTLES: Deno.env.get("FLAG_BATTLES") === "true",
  REALTIME: Deno.env.get("FLAG_REALTIME") === "true",
  QUESTS: Deno.env.get("FLAG_QUESTS") === "true",
  SCRATCH: Deno.env.get("FLAG_SCRATCH") === "true",
  REPLAYS: Deno.env.get("FLAG_REPLAYS") === "true",
};

export function requireFlag(flag: keyof typeof FLAGS): void {
  if (!FLAGS[flag]) {
    throw new Error(`Feature ${flag} is not enabled`);
  }
}
