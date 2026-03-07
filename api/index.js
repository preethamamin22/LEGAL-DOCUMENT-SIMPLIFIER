require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());

// Set up Google GenAI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Set up file upload destination (memory)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/api/analyze', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded.' });
        }

        // Check file size (Vercel limit for serverless is 4.5MB, locally it's memory limited)
        if (req.file.size > 10 * 1024 * 1024) {
            return res.status(400).json({ error: 'File size too large. Maximum is 10MB.' });
        }

        // Gemini 1.5 Flash supports native PDF analysis. 
        // This is much more accurate for scanned documents than pdf-parse.
        const model = ai.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        // Prompt for the AI
        const prompt = `
            You are an expert legal aide. Analyze this entire legal document and output a structured JSON analysis.
            1. "risky_clauses": Find predatory/risky clauses (e.g., auto-renewal, waived rights, hidden fees, data selling). 
               Each must have: "original_text", "simplified" explanation, "risk_level" (Low, Medium, High), and "reason".
            2. "summary": A brief, plain English overview.
            3. "key_points": Most critical takeaways.

            Output format (JSON only):
            {
              "summary": "...",
              "key_points": ["...", "..."],
              "risky_clauses": [
                {
                  "original_text": "...",
                  "simplified": "...",
                  "risk_level": "...",
                  "reason": "..."
                }
              ]
            }
        `;

        // Send binary PDF data to Gemini
        const result = await model.generateContent([
            {
                inlineData: {
                    data: req.file.buffer.toString('base64'),
                    mimeType: "application/pdf"
                }
            },
            prompt
        ]);

        const response = await result.response;
        const resultText = response.text();

        let jsonResult;
        try {
            // Remove markdown blocks if present
            const cleanText = resultText.replace(/```json\n?|```/g, '').trim();
            jsonResult = JSON.parse(cleanText);
        } catch (e) {
            console.error('JSON Parse Error:', e, 'Raw Text:', resultText);
            return res.status(500).json({
                error: 'AI returned invalid formatting',
                details: e.message,
                raw: resultText.substring(0, 100)
            });
        }

        return res.json({ success: true, data: jsonResult });
    } catch (error) {
        console.error('Error during analysis:', error);

        // Better error user messaging
        let errorMsg = 'Failed to analyze document';
        if (error.message.includes('API key')) {
            errorMsg = 'Missing or invalid Gemini API Key. Please configure it in .env locally.';
        } else if (error.message.includes('quota')) {
            errorMsg = 'AI quota exceeded. Please try again in 1 minute.';
        }

        return res.status(500).json({ error: errorMsg, details: error.message });
    }
});

if (process.env.NODE_ENV !== 'production' && require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Backend server running locally on http://localhost:${PORT}`);
    });
}

module.exports = app;
