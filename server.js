// server.js
const express = require("express");
const OpenAI = require("openai");
require("dotenv").config();
const path = require("path");
const app = express();
const PORT = process.env.PORT || 4000;

// Configura cliente OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ----------------------
//   RUTA: /api/debate
// ----------------------
app.post("/api/debate", async (req, res) => {
  const { topic, role, history, lastArgument } = req.body;

  try {
    const messages = [
      {
        role: "system",
        content: `Eres un experto académico en debates educativos. 
        Tu papel es representar la postura "${role}" sobre el tema indicado. 
        Responde con argumentos sólidos, breves y coherentes, 
        sin incluir lenguaje ofensivo ni redundante. 
        Limita tus respuestas a 3 o 4 líneas.`,
      },
      {
        role: "user",
        content: `Tema del debate: ${topic}\nÚltimo argumento del estudiante: ${lastArgument}`,
      },
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 200,
    });

    const responseText =
      completion.choices[0].message.content || "No hay respuesta generada.";
    res.json({ response: responseText });
  } catch (error) {
    console.error("Error en /api/debate:", error);
    res.status(500).json({ response: "Error generando respuesta del debate." });
  }
});

// ----------------------
//   RUTA: /api/judge_turn
// ----------------------
app.post("/api/judge_turn", async (req, res) => {
  const { topic, opponentRole, history } = req.body;

  try {
    const formatted = history
      .map((h) => `${h.sender.toUpperCase()}: ${h.content}`)
      .join("\n");

    const messages = [
      {
        role: "system",
        content: `Eres un mediador imparcial de debates académicos. 
        Debes analizar los argumentos del estudiante y de la IA Oponente 
        para decidir quién presentó un razonamiento más claro, coherente y fundamentado.
        Tu respuesta debe comenzar con: "Veredicto Académico Final: Ganador ...", 
        y luego explicar brevemente por qué.`,
      },
      {
        role: "user",
        content: `Tema: ${topic}\n\nHistorial del debate:\n${formatted}`,
      },
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 300,
    });

    const verdict =
      completion.choices[0].message.content ||
      "Veredicto no disponible. Error al analizar.";
    res.json({ verdict });
  } catch (error) {
    console.error("Error en /api/judge_turn:", error);
    res.status(500).json({ verdict: "Error generando veredicto." });
  }
});

// ----------------------
//   SERVIDOR EN MARCHA
// ----------------------
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
