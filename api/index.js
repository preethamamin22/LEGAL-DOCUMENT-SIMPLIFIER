require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenAI } = require('@google/genai');

const app = express();

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());

// Verify API key on startup
if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is not set in .env file!');
    console.error('   Please create a .env file in the project root with: GEMINI_API_KEY=your_key_here');
}

// Set up Google GenAI with the new SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'missing' });

// Set up file upload to memory
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are supported.'));
        }
    }
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        hasApiKey: !!process.env.GEMINI_API_KEY,
        timestamp: new Date().toISOString()
    });
});

app.post('/api/analyze', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded.' });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({
                error: 'Gemini API key not configured. Please add GEMINI_API_KEY to your .env file.'
            });
        }

        console.log(`📄 Analyzing PDF: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);

        const prompt = `You are an expert legal aide. Carefully analyze this entire legal document and output a structured JSON analysis.

1. "risky_clauses": Find ALL predatory, unfair, or risky clauses (e.g., auto-renewal, waived rights, hidden fees, data selling, unlimited liability, one-sided termination, arbitration clauses, broad indemnification). 
   Each clause must have:
   - "original_text": The exact text from the document (quote it directly)
   - "simplified": A plain English explanation of what it means
   - "risk_level": Either "High", "Medium", or "Low"
   - "reason": Why this clause is risky or concerning

2. "summary": A concise plain English overview of what this document is about, who the parties are, and the main purpose.

3. "key_points": An array of the 5-8 most important things someone should know before signing.

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no extra text.

Output format:
{
  "summary": "...",
  "key_points": ["...", "..."],
  "risky_clauses": [
    {
      "original_text": "...",
      "simplified": "...",
      "risk_level": "High|Medium|Low",
      "reason": "..."
    }
  ]
}`;

        // Use the new @google/genai SDK - models.generateContent
        const result = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            inlineData: {
                                data: req.file.buffer.toString('base64'),
                                mimeType: 'application/pdf'
                            }
                        },
                        {
                            text: prompt
                        }
                    ]
                }
            ],
            config: {
                responseMimeType: 'application/json',
            }
        });

        const resultText = result.text;

        let jsonResult;
        try {
            // Remove markdown blocks if the model still wraps in them
            const cleanText = resultText.replace(/```json\n?|```/g, '').trim();
            jsonResult = JSON.parse(cleanText);
        } catch (e) {
            console.error('JSON Parse Error:', e.message);
            console.error('Raw AI Response:', resultText.substring(0, 300));
            return res.status(500).json({
                error: 'AI returned invalid JSON format. Please try again.',
                details: e.message
            });
        }

        console.log(`✅ Analysis complete: ${jsonResult.risky_clauses?.length || 0} risky clauses found.`);
        return res.json({ success: true, data: jsonResult });

    } catch (error) {
        console.error('❌ Error during analysis:', error.message);

        let errorMsg = 'Failed to analyze document. Please try again.';

        if (error.message?.includes('API key') || error.message?.includes('INVALID_ARGUMENT')) {
            errorMsg = 'Invalid or missing Gemini API key. Please check your .env file.';
        } else if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
            errorMsg = 'API quota exceeded. Please wait a moment and try again.';
        } else if (error.message?.includes('SAFETY')) {
            errorMsg = 'The document was blocked by safety filters. Please try a different document.';
        } else if (error.message?.includes('too large') || error.message?.includes('FILE_TOO_LARGE')) {
            errorMsg = 'PDF is too large. Please use a file under 10MB.';
        }

        return res.status(500).json({ error: errorMsg, details: error.message });
    }
});

// Error handler for multer
app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    if (err.message === 'Only PDF files are supported.') {
        return res.status(400).json({ error: err.message });
    }
    next(err);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
    console.log(`   API key: ${process.env.GEMINI_API_KEY ? '✅ Found' : '❌ MISSING - add to .env'}\n`);
});

module.exports = app;
