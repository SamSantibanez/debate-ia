// ===============================
// 🎯 Servidor Debate IA - Render
// ===============================

const express = require("express");
require("dotenv").config();
const OpenAI = require("openai");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 4000; // ⚠️ IMPORTANTE: usar puerto dinámico

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- Función general para llamar a OpenAI ---
async function callOpenAI(prompt, maxTokens = 500) {
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: maxTokens,
    });
    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error("❌ Error en OpenAI:", error);
    throw error;
  }
}

// --- Limpiar historial del chat ---
function cleanHistory(history) {
  return history
    .filter((msg) => msg.sender === "user" || msg.sender === "ia")
    .map((msg) => ({
      role: msg.sender === "user" ? "Estudiante" : "IA Oponente",
      content: msg.content.replace(/<br\s*\/?>/gm, "\n").trim(),
    }));
}

// --- Endpoint 1: IA Oponente ---
app.post("/api/debate", async (req, res) => {
  const { topic, role, history, lastArgument } = req.body;
  console.log(`🎯 Tema: "${topic}" | Rol IA: ${role}`);

  try {
    const context = cleanHistory(history)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const prompt = `
Eres una IA oponente en un debate académico sobre "${topic}".
Tu rol es ${role}. Responde con argumentos sólidos, sin asteriscos, ni formato Markdown.
Historial del debate:
${context}

Último argumento del estudiante: "${lastArgument}"
Responde como IA Oponente.`;

    const reply = await callOpenAI(prompt, 400);
    res.json({ response: reply });
  } catch (error) {
    res.status(500).json({ error: "Error al generar respuesta." });
  }
});

// --- Endpoint 2: Moderador (veredicto) ---
app.post("/api/judge_turn", async (req, res) => {
  const { topic, opponentRole, history } = req.body;
  console.log("⚖️ Analizando veredicto...");

  try {
    const context = cleanHistory(history)
      .map((m, i) => `${i + 1}. ${m.role}: ${m.content}`)
      .join("\n");

    const prompt = `
Eres el moderador de un debate académico sobre "${topic}".
Analiza objetivamente los argumentos del estudiante y la IA.
Declara quién gana y por qué. Termina con:
"La verdad se construye en el diálogo razonado. Fin del debate.".

${context}
`;

    const verdict = await callOpenAI(prompt, 300);
    res.json({ verdict: verdict });
  } catch (error) {
    res.status(500).json({ error: "Error al generar veredicto." });
  }
});

// --- Iniciar servidor ---
app.listen(port, "0.0.0.0", () =>
  console.log(`🚀 Servidor corriendo en puerto ${port}`)
);
