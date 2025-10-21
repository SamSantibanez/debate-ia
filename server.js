// ===============================
// 🎯 Servidor Debate IA - Render
// ===============================

const express = require("express");
require("dotenv").config();
const OpenAI = require("openai");
const cors = require("cors");

const app = express();

// Render asigna el puerto automáticamente
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Inicializar cliente OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* -----------------------------------------------------
   FUNCIÓN: Llamar a OpenAI
----------------------------------------------------- */
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
    console.error("❌ Error en callOpenAI:", error);
    throw error;
  }
}

/* -----------------------------------------------------
   LIMPIAR HISTORIAL
----------------------------------------------------- */
function cleanHistory(history) {
  return history
    .filter((msg) => msg.sender === "user" || msg.sender === "ia")
    .map((msg) => ({
      role: msg.sender === "user" ? "Estudiante" : "IA Oponente",
      content: msg.content
        .replace(/<br\s*\/?>/gm, "\n")
        .replace(/<\/?strong>/g, "")
        .trim(),
    }));
}

/* -----------------------------------------------------
   ENDPOINT 1: OPONENTE IA
----------------------------------------------------- */
app.post("/api/debate", async (req, res) => {
  const { topic, role, history, lastArgument } = req.body;
  console.log(`🎯 Debate: "${topic}" (${role})`);

  try {
    const match = topic.match(/Nivel:\s*(Inicial|Medio|Avanzado)/i);
    const level = match ? match[1].toLowerCase() : "medio";

    const cleanedHistory = cleanHistory(history);
    let context = `DEBATE SOBRE: "${topic}"\n\n`;
    cleanedHistory.forEach((msg) => {
      context += `${msg.role}: ${msg.content}\n\n`;
    });

    const systemRules = `
Eres un sistema de debate académico con tres roles:
1. Estudiante – humano que elige una postura (A favor o En contra)
2. IA Oponente – defiende la postura contraria
3. Moderador – evalúa y determina un ganador al final

REGLAS:
- Máximo 10 turnos (5 por participante).
- Responde de forma clara, sin formato Markdown ni asteriscos.
`;

    let levelGuidelines = "";
    if (level === "inicial") {
      levelGuidelines = `
NIVEL INICIAL:
- Frases simples y ejemplos cotidianos.
- Argumentos breves (2-3 oraciones).
`;
    } else if (level === "medio") {
      levelGuidelines = `
NIVEL MEDIO:
- Tono equilibrado y razonado.
- 3-5 oraciones por intervención.
`;
    } else {
      levelGuidelines = `
NIVEL AVANZADO:
- Lenguaje formal y estructurado.
- 4-6 oraciones con lógica y contraargumentos sólidos.
`;
    }

    const prompt = `
${systemRules}
${levelGuidelines}

TEMA: "${topic.replace(/\| Nivel:.*/i, "").trim()}"
TU POSTURA: ${role}
POSTURA DEL OPONENTE: ${role === "A favor" ? "En contra" : "A favor"}

HISTORIAL DEL DEBATE:
${context}

ÚLTIMO ARGUMENTO DEL ESTUDIANTE:
"${lastArgument}"

Responde solo con tu intervención como IA Oponente.
`;

    const response = await callOpenAI(prompt, 500);
    res.json({ response: response.replace(/\*/g, "").trim() });
  } catch (error) {
    res.status(500).json({ error: "Error al generar respuesta: " + error.message });
  }
});

/* -----------------------------------------------------
   ENDPOINT 2: MODERADOR (veredicto final)
----------------------------------------------------- */
app.post("/api/judge_turn", async (req, res) => {
  const { topic, opponentRole, history } = req.body;
  console.log("⚖️ Generando veredicto...");

  try {
    const cleanedHistory = cleanHistory(history);
    let debateContext = `DEBATE FINAL: "${topic}"\n\n`;
    cleanedHistory.forEach((msg, i) => {
      debateContext += `${i + 1}. ${msg.role}: ${msg.content}\n\n`;
    });

    const prompt = `
Eres el MODERADOR de un debate académico.
${debateContext}

Analiza objetivamente los argumentos y redacta un veredicto académico final.

INSTRUCCIONES:
1. Declara quién gana (Estudiante o IA Oponente).
2. Justifica brevemente.
3. Termina con: "La verdad se construye en el diálogo razonado. Fin del debate."
`;

    const verdict = await callOpenAI(prompt, 400);
    res.json({ nextTurn: "end", verdict: verdict.replace(/\*/g, "").trim() });
  } catch (error) {
    res.status(500).json({ error: "Error al generar veredicto: " + error.message });
  }
});

/* -----------------------------------------------------
   INICIAR SERVIDOR
----------------------------------------------------- */
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Servidor corriendo en Render en el puerto ${port}`);
});
