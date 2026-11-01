const defaultGroqModel = "llama-3.3-70b-versatile";

export async function generateGroqJson(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured; cannot use the Groq fallback.");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || defaultGroqModel,
      messages: [
        {
          role: "system",
          content: "Follow the user instructions exactly. Return only a valid JSON object, without markdown fences or additional text.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorBody = (await response.text()).slice(0, 1000);
    throw new Error(`Groq returned HTTP ${response.status}: ${errorBody}`);
  }

  const result: unknown = await response.json();
  if (
    typeof result !== "object" ||
    result === null ||
    !("choices" in result) ||
    !Array.isArray(result.choices) ||
    typeof result.choices[0] !== "object" ||
    result.choices[0] === null ||
    !("message" in result.choices[0]) ||
    typeof result.choices[0].message !== "object" ||
    result.choices[0].message === null ||
    !("content" in result.choices[0].message) ||
    typeof result.choices[0].message.content !== "string"
  ) {
    throw new Error("Groq returned an invalid chat-completion response.");
  }

  return result.choices[0].message.content;
}
