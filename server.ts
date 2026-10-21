import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Allow large payloads for high-resolution microscope imagery
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString()
  });
});

// AI Cell Counting & Deep Morphological Inspection Endpoint
app.post('/api/analyze-cells-ai', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', cellType = 'Mammalian Cell Culture', chamberType = 'Neubauer Hemocytometer', dilutionFactor = 2 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured',
        message: 'Configure your GEMINI_API_KEY in Settings -> Secrets to unlock AI Deep Morphological Analysis. Built-in CV engine is active.'
      });
    }

    const ai = new GoogleGenAI();
    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

    const prompt = `You are an expert bioscience automated cytometer and cell biologist specializing in Trypan Blue exclusion assays.
Analyze this microscope brightfield image of cells stained with Trypan Blue.

Biological & Optical context:
- Staining: Trypan Blue exclusion assay (diazo dye)
- Viable cells: Intact plasma membrane excludes trypan blue; appears bright/translucent with refringent optical halo around edges.
- Non-viable / Dead cells: Damaged membrane allows dye uptake; stained dark blue/purple with dark nucleus/cytoplasm.
- Debris: Non-cellular fragments, dye precipitates, fibers, or dust (irregular, no typical circular cell morphology).
- Cell culture type: ${cellType}
- Chamber: ${chamberType} (Dilution factor: ${dilutionFactor}x)

Please detect the cells in this field of view, classify them, and provide quantitative viability and morphological metrics.
Return ONLY valid JSON in the exact schema below (no markdown fences, no explanatory text outside JSON):
{
  "detectedCells": [
    {
      "id": "c1",
      "xPercent": 45.2,
      "yPercent": 32.1,
      "radiusPercent": 2.5,
      "type": "viable",
      "diameterMicrons": 14.5,
      "confidence": 0.95,
      "morphology": "Clear refractive halo, round, intact membrane"
    }
  ],
  "viableCount": 18,
  "deadCount": 3,
  "debrisCount": 2,
  "viabilityPercent": 85.7,
  "clumpingPercent": 10.0,
  "meanDiameterMicrons": 15.2,
  "morphologyNotes": "Uniform cell suspension with healthy spherical morphology. Minimal dye precipitation noted.",
  "qualityAssessment": "Good brightfield contrast, even illumination, low background debris.",
  "recommendedAction": "Viability is optimal (>80%) for downstream transfection, cryopreservation, or passaging."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    });

    const responseText = response.text || '{}';
    let parsedResult;
    try {
      parsedResult = JSON.parse(responseText);
    } catch {
      // If there are markdown code fences, strip them
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleaned);
    }

    return res.json({
      success: true,
      data: parsedResult
    });
  } catch (error: any) {
    console.error('AI Cell Analysis error:', error);
    return res.status(500).json({
      error: 'AI Analysis failed',
      details: error.message || String(error)
    });
  }
});

// Configure Vite in development or static serve in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TrypanVision server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
