// Evil Brain Labs: The Registry
// Edge Function: self_flip
// Allows coin owner to flip their own coin for free

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

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

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
    const { coin_id } = await req.json()

    if (!coin_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: coin_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the coin
    const { data: coin, error: coinError } = await supabaseService
      .from('coins')
      .select('*')
      .eq('id', coin_id)
      .single()

    if (coinError || !coin) {
      return new Response(
        JSON.stringify({ error: 'Coin not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify ownership
    if (coin.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'You can only flip your own coins' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate new valence (flip it)
    const from_valence = coin.current_valence
    const to_valence = from_valence === 'good' ? 'evil' : 'good'

    // Record the flip
    const { data: flip, error: flipError } = await supabaseService
      .from('flips')
      .insert({
        coin_id,
        from_valence,
        to_valence,
        is_self_flip: true,
        flipped_by: user.id
      })
      .select()
      .single()

    if (flipError) throw flipError

    // Update coin valence
    const { error: updateError } = await supabaseService
      .from('coins')
      .update({ current_valence: to_valence })
      .eq('id', coin_id)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({
        message: `Coin flipped from ${from_valence} to ${to_valence}`,
        flip,
        new_valence: to_valence
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
