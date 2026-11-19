import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no está configurada en el servidor.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface AnalyzeRunBody {
  fecha?: string;
  tipo?: string;
  distancia_km?: number;
  duracion_min?: number;
  ritmo_formatted?: string;
  notas?: string;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post('/api/analyze-run', async (req: Request, res: Response) => {
    try {
      const body = req.body as AnalyzeRunBody;
      const tipo = typeof body.tipo === 'string' && body.tipo.trim() ? body.tipo.trim() : 'Correr';
      const distancia = Number(body.distancia_km);
      const duracion = Number(body.duracion_min);
      const fecha = typeof body.fecha === 'string' ? body.fecha : '';
      const ritmo = typeof body.ritmo_formatted === 'string' ? body.ritmo_formatted : '';
      const notas = typeof body.notas === 'string' ? body.notas.trim() : '';

      if (!Number.isFinite(distancia) || distancia <= 0) {
        res.status(400).json({ error: 'Ingresa una distancia mayor a 0 km para analizar.' });
        return;
      }

      if (!Number.isFinite(duracion) || duracion <= 0) {
        res.status(400).json({ error: 'Ingresa una duración mayor a 0 minutos para analizar.' });
        return;
      }

      const ai = getAiClient();

      const prompt = [
        `Analiza este entrenamiento recién registrado:`,
        `- Actividad: ${tipo}`,
        fecha ? `- Fecha: ${fecha}` : null,
        `- Distancia: ${distancia.toFixed(2)} km`,
        `- Duración: ${duracion.toFixed(1)} min`,
        ritmo ? `- Ritmo calculado: ${ritmo} min/km` : null,
        notas ? `- Notas del atleta: "${notas}"` : `- Notas del atleta: Sin notas adicionales`,
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'Eres un entrenador experto de running y trail. Responde siempre en español natural, directo y motivador, estilo app deportiva de alto rendimiento. Entrega un comentario breve de entrenamiento de máximo 2 a 3 frases (40 a 65 palabras en total): valora el ritmo y tipo de sesión según los datos/notas, y da una recomendación concreta para recuperación o el próximo entrenamiento. No uses markdown complejo, encabezados ni listas con viñetas.',
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      const analysis = response.text?.trim();
      if (!analysis) {
        res.status(502).json({ error: 'El modelo no devolvió texto de análisis. Intenta nuevamente.' });
        return;
      }

      res.json({ analysis });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error inesperado al analizar el entrenamiento.';
      console.error('Error in /api/analyze-run:', message);

      if (message.includes('GEMINI_API_KEY')) {
        res.status(500).json({
          error:
            'Falta configurar GEMINI_API_KEY en Settings > Secrets para activar el análisis con Gemini.',
        });
        return;
      }

      res.status(500).json({ error: message });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RunTracker Sheets server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
