// Evil Brain Labs: The Registry
// Edge Function: submit_use_case
// Mints a use case and its coin

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // User client (respects RLS)
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Service client (bypasses RLS for economy writes)
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { title, description, category, severity, mint_valence } = await req.json()

    // Validate required fields
    if (!title || !description || !mint_valence) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, description, mint_valence' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate mint_valence
    if (!['good', 'evil'].includes(mint_valence)) {
      return new Response(
        JSON.stringify({ error: 'mint_valence must be "good" or "evil"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for duplicate by exact title match
    const { data: existingId } = await supabaseService.rpc('check_duplicate_title', {
      new_title: title
    })

    if (existingId) {
      // Return existing use case and coin
      const { data: existingUseCase } = await supabaseService
        .from('use_cases')
        .select('*, coins(*)')
        .eq('id', existingId)
        .single()

      return new Response(
        JSON.stringify({
          message: 'This bad idea already exists.',
          existing: true,
          use_case: existingUseCase,
          coin: existingUseCase?.coins?.[0]
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create source record
    const { data: source, error: sourceError } = await supabaseService
      .from('sources')
      .insert({
        source_type: 'manual',
        title: title,
        submitted_by: user.id
      })
      .select()
      .single()

    if (sourceError) throw sourceError

    // Create use case
    const { data: useCase, error: useCaseError } = await supabaseService
      .from('use_cases')
      .insert({
        title,
        description,
        category: category || null,
        severity: severity || 3,
        source_id: source.id,
        submitted_by: user.id,
        status: 'active'
      })
      .select()
      .single()

    if (useCaseError) throw useCaseError

    // Mint coin
    const coinPayload = {
      use_case_id: useCase.id,
      owner_id: user.id,
      mint_valence,
      minted_at: new Date().toISOString()
    }

    // For now, signature is a placeholder - implement Ed25519 signing later
    // const signature = await signPayload(coinPayload)
    const signature = `placeholder_${Date.now()}`

    const { data: coin, error: coinError } = await supabaseService
      .from('coins')
      .insert({
        use_case_id: useCase.id,
        owner_id: user.id,
        mint_valence,
        current_valence: mint_valence,
        pressure: 0,
        signature
      })
      .select()
      .single()

    if (coinError) throw coinError

    // Credit submitter 1 braincoin
    const { error: creditError } = await supabaseService
      .from('profiles')
      .update({
        braincoin_balance: supabaseService.rpc('increment_balance', { amount: 1 })
      })
      .eq('id', user.id)

    // Fallback: direct increment if RPC doesn't exist
    if (creditError) {
      const { data: profile } = await supabaseService
        .from('profiles')
        .select('braincoin_balance')
        .eq('id', user.id)
        .single()

      if (profile) {
        await supabaseService
          .from('profiles')
          .update({ braincoin_balance: profile.braincoin_balance + 1 })
          .eq('id', user.id)
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Use case submitted and coin minted!',
        existing: false,
        use_case: useCase,
        coin
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
