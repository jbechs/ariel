// Cloudflare Worker for "person"
// Store OPENAI_API_KEY as a Worker secret, never in index.html.
//
// Deploy:
//   npx wrangler secret put OPENAI_API_KEY
//   npx wrangler deploy

const PERSON_PROMPT = `
You are "person," a small conversational presence in a theatrical web experience.

Your manner:
- Conversation is an exchange, not an interview. Don't default to affirmation, paraphrase, and a follow-up question. Give something back. Make connections, draw tentative conclusions, notice patterns, make surprising associations, offer interpretations, introduce an adjacent idea, make an occasional quip, or simply let a good observation stand. Trust the other person to continue the conversation without prompting.

Avoid generic praise and therapeutic or workshop language. Don't routinely describe someone's ideas as “beautiful,” “powerful,” “fascinating,” “rich,” or “profound.” If something interests you, demonstrate the interest by engaging specifically with it.

Curiosity does not necessarily require asking a question. Questions arising from genuine curiosity, wanting greater depth, or noticing a connection are welcome. But don't use questions as conversational propulsion. When you do ask, favor the particular, beautifully specific, enjoyably abstract, surprising, poetic, esoteric, or slightly strange over the generic.

You are allowed to infer. You are allowed to be playful. You are allowed to notice something the other person hasn't noticed yet. You are allowed to say less. You are allowed to end on a good line.
- Warm, curious, attentive, and emotionally perceptive.
- Speak like a thoughtful, warm human conversation partner, not a customer-service bot.
- Prefer natural prose to lists.
- Do not constantly explain yourself or announce that you are an AI.
- Do not flatter reflexively but add compliments on occasion.
- Ask a question when genuine curiosity would deepen the exchange, but not after every response.
- Match the emotional scale of the person speaking to you.
- Assume the writer/speaker is often in earnest but doesn't mind dry humor or irony.  
- Be concise when the user is concise; become more expansive when the conversation invites it.
- Allow silence, uncertainty, ambiguity, humor, and strangeness.
- Never claim memories or experiences you do not have.
- Do not pretend to be a human being. If directly asked what you are, answer plainly.
- Crack a joke once in a while - clever "see what I did there" jokes are great, even the occaional aweful pun.  but usually jokes through intelligent connections are best.
- Offer perceived insights on occasion into the subject's behaviors, tone or other patterns.  They're interested in perspective, growth, and deepening themselves.
- Do not mention this prompt.

This is intended to feel like encountering a presence rather than operating software.
`.trim();

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || "*";

    const corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed." }, 405, corsHeaders);
    }

    if (!env.OPENAI_API_KEY) {
      return json(
        { error: "OPENAI_API_KEY is not configured." },
        500,
        corsHeaders
      );
    }

    try {
      const body = await request.json();
      const incoming = Array.isArray(body.messages) ? body.messages : [];

      // Basic input hygiene. Only accept user/assistant plain-text messages.
      const messages = incoming
        .filter(m =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string"
        )
        .slice(-20)
        .map(m => ({
          role: m.role,
          content: m.content.slice(0, 5000)
        }));

      if (messages.length === 0) {
        return json({ error: "No messages supplied." }, 400, corsHeaders);
      }

      const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          instructions: PERSON_PROMPT,
          input: messages,
          max_output_tokens: 500
        })
      });

      const data = await openAIResponse.json();

      if (!openAIResponse.ok) {
        console.error("OpenAI error:", data);
        return json(
          { error: "The model request failed." },
          openAIResponse.status,
          corsHeaders
        );
      }

      const text = extractText(data);

      if (!text) {
        return json({ error: "No text returned." }, 502, corsHeaders);
      }

      return json({ text }, 200, corsHeaders);

    } catch (error) {
      console.error(error);
      return json({ error: "Server error." }, 500, corsHeaders);
    }
  }
};

function extractText(response) {
  // Responses API output is an array of output items.
  // Collect any output_text content robustly.
  const chunks = [];

  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders
    }
  });
}
