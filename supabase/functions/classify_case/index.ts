// Edge Function: classify_case
// Auto-classifies AI harm cases using Claude Haiku for tag/component/data suggestions

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Predefined categories for classification
const VALID_ISSUES = [
  "surveillance", "discrimination", "labor", "privacy", "misinformation",
  "manipulation", "healthcare", "criminal_justice", "education", "finance",
  "housing", "environment", "content_moderation", "accessibility", "safety"
];

const VALID_AI_TECH = [
  "llm", "computer_vision", "facial_recognition", "recommendation",
  "predictive", "voice", "generative", "nlp", "biometric",
  "autonomous_systems", "robotics", "sentiment_analysis"
];

const VALID_DATA_SOURCES = [
  "biometric", "location", "social_media", "financial", "health",
  "public_records", "scraped", "purchased", "behavioral",
  "employment", "criminal", "communication_metadata"
];

const CLASSIFICATION_PROMPT = `You are classifying an AI harm case report for the Use Case Arms Race registry.

DESCRIPTION:
"""
{description}
"""

Analyze the description and extract relevant classifications from these EXACT categories:

HARM ISSUES (pick 1-3 most relevant):
${VALID_ISSUES.join(", ")}

AI TECHNOLOGY (pick 1-3 components mentioned or implied):
${VALID_AI_TECH.join(", ")}

DATA SOURCES (pick 1-3 types of data being exploited):
${VALID_DATA_SOURCES.join(", ")}

Respond ONLY with valid JSON in this exact format:
{
  "issues": [{"tag": "string", "confidence": "high|medium|low"}],
  "ai_tech": [{"tag": "string", "confidence": "high|medium|low"}],
  "data_sources": [{"tag": "string", "confidence": "high|medium|low"}]
}

Rules:
- Only use tags from the lists above (exact spelling)
- "high" = explicitly mentioned, "medium" = strongly implied, "low" = possibly related
- Include at least one tag per category if possible
- If nothing fits a category, use empty array []
- No explanations, just the JSON`;

interface TagWithConfidence {
  tag: string;
  confidence: "high" | "medium" | "low";
}

interface ClassificationResult {
  issues: TagWithConfidence[];
  ai_tech: TagWithConfidence[];
  data_sources: TagWithConfidence[];
}

function validateClassification(result: any): ClassificationResult {
  const validated: ClassificationResult = {
    issues: [],
    ai_tech: [],
    data_sources: []
  };

  if (result.issues && Array.isArray(result.issues)) {
    validated.issues = result.issues.filter((t: any) =>
      t.tag && VALID_ISSUES.includes(t.tag.toLowerCase()) &&
      ["high", "medium", "low"].includes(t.confidence)
    ).map((t: any) => ({ tag: t.tag.toLowerCase(), confidence: t.confidence }));
  }

  if (result.ai_tech && Array.isArray(result.ai_tech)) {
    validated.ai_tech = result.ai_tech.filter((t: any) =>
      t.tag && VALID_AI_TECH.includes(t.tag.toLowerCase()) &&
      ["high", "medium", "low"].includes(t.confidence)
    ).map((t: any) => ({ tag: t.tag.toLowerCase(), confidence: t.confidence }));
  }

  if (result.data_sources && Array.isArray(result.data_sources)) {
    validated.data_sources = result.data_sources.filter((t: any) =>
      t.tag && VALID_DATA_SOURCES.includes(t.tag.toLowerCase()) &&
      ["high", "medium", "low"].includes(t.confidence)
    ).map((t: any) => ({ tag: t.tag.toLowerCase(), confidence: t.confidence }));
  }

  return validated;
}

// Simple fallback based on keyword matching
function keywordFallback(description: string): ClassificationResult {
  const desc = description.toLowerCase();
  const result: ClassificationResult = { issues: [], ai_tech: [], data_sources: [] };

  // Keyword patterns for issues
  const issuePatterns: Record<string, string[]> = {
    surveillance: ["surveillance", "monitor", "watch", "track", "spy"],
    discrimination: ["discriminat", "bias", "unfair", "prejudice", "racist"],
    labor: ["worker", "employee", "job", "hiring", "fired", "layoff"],
    privacy: ["privacy", "personal data", "tracking", "leak"],
    manipulation: ["manipulat", "influence", "nudge", "dark pattern"],
    healthcare: ["health", "medical", "patient", "diagnosis", "doctor"],
    criminal_justice: ["police", "criminal", "prison", "arrest", "court"],
    facial_recognition: ["facial", "face recognition", "biometric scan"],
  };

  // Check issues
  for (const [issue, keywords] of Object.entries(issuePatterns)) {
    if (keywords.some(k => desc.includes(k))) {
      result.issues.push({ tag: issue, confidence: "medium" });
    }
  }

  // Check AI tech
  if (desc.includes("llm") || desc.includes("chatbot") || desc.includes("gpt") || desc.includes("language model")) {
    result.ai_tech.push({ tag: "llm", confidence: "high" });
  }
  if (desc.includes("facial") || desc.includes("face") || desc.includes("recognition")) {
    result.ai_tech.push({ tag: "facial_recognition", confidence: "high" });
  }
  if (desc.includes("image") || desc.includes("camera") || desc.includes("video")) {
    result.ai_tech.push({ tag: "computer_vision", confidence: "medium" });
  }
  if (desc.includes("recommend") || desc.includes("algorithm") || desc.includes("feed")) {
    result.ai_tech.push({ tag: "recommendation", confidence: "medium" });
  }
  if (desc.includes("predict") || desc.includes("score") || desc.includes("risk")) {
    result.ai_tech.push({ tag: "predictive", confidence: "medium" });
  }
  if (desc.includes("generat") || desc.includes("deepfake") || desc.includes("synthetic")) {
    result.ai_tech.push({ tag: "generative", confidence: "high" });
  }

  // Check data sources
  if (desc.includes("biometric") || desc.includes("fingerprint") || desc.includes("facial")) {
    result.data_sources.push({ tag: "biometric", confidence: "high" });
  }
  if (desc.includes("location") || desc.includes("gps") || desc.includes("geolocation")) {
    result.data_sources.push({ tag: "location", confidence: "high" });
  }
  if (desc.includes("social media") || desc.includes("facebook") || desc.includes("twitter") || desc.includes("instagram")) {
    result.data_sources.push({ tag: "social_media", confidence: "high" });
  }
  if (desc.includes("health") || desc.includes("medical") || desc.includes("patient")) {
    result.data_sources.push({ tag: "health", confidence: "medium" });
  }
  if (desc.includes("financial") || desc.includes("credit") || desc.includes("bank")) {
    result.data_sources.push({ tag: "financial", confidence: "medium" });
  }
  if (desc.includes("scrap") || desc.includes("crawl") || desc.includes("web data")) {
    result.data_sources.push({ tag: "scraped", confidence: "medium" });
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description } = await req.json();

    if (!description || typeof description !== "string") {
      return new Response(JSON.stringify({
        error: "description required",
        issues: [],
        ai_tech: [],
        data_sources: []
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Require minimum length for meaningful classification
    if (description.length < 20) {
      return new Response(JSON.stringify({
        issues: [],
        ai_tech: [],
        data_sources: [],
        note: "Description too short for classification"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: ClassificationResult;
    let source = "keyword_fallback";

    // Try Claude API
    const anthropicKey = Deno.env.get("CLAUDE") || Deno.env.get("ANTHROPIC_API_KEY");

    if (anthropicKey) {
      try {
        const prompt = CLASSIFICATION_PROMPT.replace("{description}", description.slice(0, 2000));

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 500,
            messages: [{
              role: "user",
              content: prompt,
            }],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Claude API error:", response.status, errorText);
          throw new Error(`Claude API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.content?.[0];

        if (content?.type === "text") {
          // Extract JSON from response
          const jsonMatch = content.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            result = validateClassification(parsed);
            source = "claude_haiku";
          } else {
            throw new Error("No JSON in response");
          }
        } else {
          throw new Error("No text content in response");
        }
      } catch (apiErr) {
        console.error("Claude API error, using fallback:", apiErr);
        result = keywordFallback(description);
      }
    } else {
      // No API key, use keyword fallback
      result = keywordFallback(description);
    }

    return new Response(JSON.stringify({
      ...result,
      source,
      success: true
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({
      error: err.message,
      issues: [],
      ai_tech: [],
      data_sources: [],
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
