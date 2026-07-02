// Evil Brain Labs: The Registry
// Edge Function: cast_vote
// Stakes a braincoin to vote on a coin's valence

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TRIBUNAL_THRESHOLD = 10

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
    const { coin_id, direction, evidence_url } = await req.json()

    // Validate required fields
    if (!coin_id || !direction) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: coin_id, direction' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate direction
    if (!['toward_good', 'toward_evil'].includes(direction)) {
      return new Response(
        JSON.stringify({ error: 'direction must be "toward_good" or "toward_evil"' }),
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

    // Check if voter is the coin owner (owners self-flip for free, don't vote)
    if (coin.owner_id === user.id) {
      return new Response(
        JSON.stringify({ error: 'Coin owners cannot vote on their own coins. Use self-flip instead.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check braincoin balance
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('braincoin_balance')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (profile.braincoin_balance < 1) {
      return new Response(
        JSON.stringify({ error: 'Insufficient braincoins. You need at least 1 braincoin to vote.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Deduct 1 braincoin
    const { error: deductError } = await supabaseService
      .from('profiles')
      .update({ braincoin_balance: profile.braincoin_balance - 1 })
      .eq('id', user.id)

    if (deductError) throw deductError

    // Calculate pressure contribution
    const is_evidence = !!evidence_url
    const pressureContribution = is_evidence ? 10 : 1

    // Insert vote
    const { data: vote, error: voteError } = await supabaseService
      .from('votes')
      .insert({
        coin_id,
        voter_id: user.id,
        direction,
        stake: 1,
        is_evidence,
        evidence_url: evidence_url || null,
        status: 'pending'
      })
      .select()
      .single()

    if (voteError) throw voteError

    // Update coin pressure
    const newPressure = coin.pressure + pressureContribution
    const underReview = newPressure >= TRIBUNAL_THRESHOLD

    const { error: pressureError } = await supabaseService
      .from('coins')
      .update({ pressure: newPressure })
      .eq('id', coin_id)

    if (pressureError) throw pressureError

    return new Response(
      JSON.stringify({
        message: is_evidence
          ? 'Evidence submitted! (+10 pressure)'
          : 'Vote cast! (+1 pressure)',
        vote,
        new_pressure: newPressure,
        under_tribunal_review: underReview,
        braincoin_balance: profile.braincoin_balance - 1
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
