#!/usr/bin/env node
// Run: node generate-all-art.js
// Generates card art for all 640 cards in batches

const SUPABASE_URL = "https://aslcrwmbdtvimjrexxzw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbGNyd21iZHR2aW1qcmV4eHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNDA0NjgsImV4cCI6MjA5NjcxNjQ2OH0.XYG0LrgA_92h7dGjw0aamX53WIrwQaqPHNHQLe8p9ls";

const BATCH_SIZE = 15;  // Cards per batch
const DELAY_MS = 2000;  // Delay between batches (2 seconds)

async function runBatch() {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/batch-generate-art`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ batch_size: BATCH_SIZE }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response.json();
}

async function main() {
  console.log('🎨 Starting batch art generation for all cards...\n');

  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalFailed = 0;
  let batchNum = 0;

  while (true) {
    batchNum++;
    console.log(`\n📦 Batch ${batchNum}...`);

    try {
      const result = await runBatch();

      if (result.message === "No pending cards found" || result.total_pending === 0) {
        console.log('✅ All cards have art! Done.');
        break;
      }

      totalProcessed += result.processed || 0;
      totalSuccess += result.successful || 0;
      totalFailed += result.failed || 0;

      console.log(`   Processed: ${result.processed}, Success: ${result.successful}, Failed: ${result.failed}`);
      console.log(`   AI generated: ${result.ai_generated}, Fallback: ${result.geometric_fallback}`);
      console.log(`   Remaining: ${result.remaining}`);

      if (result.remaining <= 0) {
        console.log('\n✅ All done!');
        break;
      }

      // Safety limit
      if (batchNum >= 50) {
        console.log('\n⚠️  Reached 50 batch limit. Run again to continue.');
        break;
      }

      // Wait before next batch
      console.log(`   Waiting ${DELAY_MS/1000}s...`);
      await new Promise(r => setTimeout(r, DELAY_MS));

    } catch (err) {
      console.error(`❌ Batch ${batchNum} failed:`, err.message);
      console.log('   Waiting 5s before retry...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total processed: ${totalProcessed}`);
  console.log(`   Successful: ${totalSuccess}`);
  console.log(`   Failed: ${totalFailed}`);
}

main().catch(console.error);
