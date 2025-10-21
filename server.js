const express = require('express');
require('dotenv').config();
const OpenAI = require('openai');

const app = express();
const port = 4000;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(express.json());
app.use(express.static(__dirname));

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
    console.error('❌ Error en callOpenAI:', error);
    throw error;
  }
}

/* -----------------------------------------------------
   LIMPIAR HISTORIAL
----------------------------------------------------- */
function cleanHistory(history) {
  return history
    .filter(msg => msg.sender === 'user' || msg.sender === 'ia')
    .map(msg => ({
      role: msg.sender === 'user' ? 'Estudiante' : 'IA Oponente',
      content: msg.content
        .replace(/<br\s*\/?>/gm, '\n')
        .replace(/<\/?strong>/g, '')
        .trim()
    }));
}

/* -----------------------------------------------------
   ENDPOINT 1: OPONENTE IA (con nivel de dificultad)
----------------------------------------------------- */
app.post('/api/debate', async (req, res) => {
  const { topic, role, history, lastArgument } = req.body;
  console.log(`\n🎯 OPONENTE IA - Tema: "${topic}", Rol: "${role}"`);

  try {
    // Extraer nivel de dificultad si viene incluido
    const match = topic.match(/Nivel:\s*(Inicial|Medio|Avanzado)/i);
    const level = match ? match[1].toLowerCase() : 'medio';

    // Contexto del historial
    const cleanedHistory = cleanHistory(history);
    let context = `DEBATE SOBRE: "${topic}"\n\n`;
    cleanedHistory.forEach(msg => {
      context += `${msg.role}: ${msg.content}\n\n`;
    });

    // Reglas base
    const systemRules = `
Eres un sistema de debate académico con tres roles:
1. Estudiante (Usuario humano) – elige una postura (A favor o En contra).
2. IA Oponente – defiende la postura contraria a la del estudiante.
3. Mediador – evalúa y determina un ganador al finalizar.

INSTRUCCIONES GENERALES:
- El debate tiene máximo 10 turnos (5 por participante) o 10 minutos.
- Las respuestas deben ser claras, coherentes, sin usar asteriscos ni formato Markdown.
- No uses símbolos ** ni listas innecesarias.
- Las intervenciones deben sonar humanas y argumentativas.
`;

    // Ajuste según nivel
    let levelGuidelines = "";
    if (level === "inicial") {
      levelGuidelines = `
NIVEL INICIAL:
- Usa frases simples y ejemplos cotidianos.
- Argumentos breves (2-3 oraciones).
- Evita vocabulario técnico o citas académicas.
`;
    } else if (level === "medio") {
      levelGuidelines = `
NIVEL MEDIO:
- Usa un tono equilibrado, razonado y respetuoso.
- 3-5 oraciones por intervención.
- Puedes usar ejemplos o comparaciones sencillas.
`;
    } else {
      levelGuidelines = `
NIVEL AVANZADO:
- Usa un lenguaje formal, estructurado y profundo.
- 4-6 oraciones con lógica y contraargumentos sólidos.
- Puedes citar teorías o conceptos si corresponde.
`;
    }

    // Prompt final
    const prompt = `
${systemRules}
${levelGuidelines}

TEMA: "${topic.replace(/\| Nivel:.*/i, '').trim()}"
TU POSTURA: ${role}
POSTURA DEL OPONENTE: ${role === 'A favor' ? 'En contra' : 'A favor'}

HISTORIAL DEL DEBATE:
${context}

ÚLTIMO ARGUMENTO DEL ESTUDIANTE:
"${lastArgument}"

Responde solo con tu intervención como IA Oponente.
No repitas instrucciones ni reglas. No uses **asteriscos**.
`;

    const response = await callOpenAI(prompt, 500);

    // Limpieza final (quitar posibles ** o caracteres raros)
    const cleanResponse = response.replace(/\*/g, '').trim();

    res.json({ response: cleanResponse });

  } catch (error) {
    res.status(500).json({ error: 'Error al generar respuesta: ' + error.message });
  }
});

/* -----------------------------------------------------
   ENDPOINT 2: MEDIADOR IA (veredicto final)
----------------------------------------------------- */
app.post('/api/judge_turn', async (req, res) => {
  const { topic, opponentRole, history } = req.body;
  console.log(`\n⚖️ MEDIADOR - Evaluando veredicto final...`);

  try {
    const cleanedHistory = cleanHistory(history);
    let debateContext = `DEBATE FINAL: "${topic}"\n\n`;
    cleanedHistory.forEach((msg, i) => {
      debateContext += `${i + 1}. ${msg.role}: ${msg.content}\n\n`;
    });

    const prompt = `
Eres el MEDIADOR de un debate académico.

${debateContext}

Analiza objetivamente los argumentos de ambas partes y redacta un veredicto académico final.

INSTRUCCIONES:
1. Declara quién gana (Estudiante o IA Oponente).
2. Justifica brevemente (claridad, evidencia, coherencia o persuasión).
3. Termina con la frase: "La verdad se construye en el diálogo razonado. Fin del debate."
Usa un tono solemne, justo y educativo.
`;

    const verdict = await callOpenAI(prompt, 400);
    const cleanVerdict = verdict.replace(/\*/g, '').trim();
    res.json({ nextTurn: 'end', verdict: cleanVerdict });

  } catch (error) {
    res.status(500).json({ error: 'Error al generar veredicto: ' + error.message });
  }
});

/* -----------------------------------------------------
   INICIAR SERVIDOR
----------------------------------------------------- */
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});
