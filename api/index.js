require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenAI } = require('@google/genai');
const db = require('./db');

const app = express();

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());

// Request logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Initialize database
db.initDb();

// Verify API key on startup
if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is not set in .env file!');
    console.error('   Please create a .env file in the project root with: GEMINI_API_KEY=your_key_here');
}

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
        database: db.isMongo() ? 'mongodb' : 'json-file',
        hasApiKey: !!process.env.GEMINI_API_KEY,
        timestamp: new Date().toISOString()
    });
});

// History endpoint - Get all past analyses
app.get('/api/history', async (req, res) => {
    try {
        const history = await db.getAllAnalyses();
        res.json({ success: true, data: history });
    } catch (err) {
        console.error('❌ Error fetching history:', err.message);
        res.status(500).json({ error: 'Failed to retrieve analysis history.' });
    }
});

// History endpoint - Delete a past analysis
app.delete('/api/history/:id', async (req, res) => {
    try {
        const result = await db.deleteAnalysis(req.params.id);
        if (result) {
            res.json({ success: true, message: 'Analysis deleted successfully.' });
        } else {
            res.status(404).json({ error: 'Analysis not found.' });
        }
    } catch (err) {
        console.error('❌ Error deleting analysis:', err.message);
        res.status(500).json({ error: 'Failed to delete analysis.' });
    }
});

app.post('/api/analyze', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded.' });
        }

        let reqApiKey = req.body?.apiKey;

        // Extract from headers if not found in body
        if (!reqApiKey && req.headers) {
            reqApiKey = req.headers['x-api-key'] || req.headers['x-gemini-key'];
            if (!reqApiKey && req.headers['authorization']) {
                const authHeader = req.headers['authorization'];
                if (authHeader.startsWith('Bearer ')) {
                    reqApiKey = authHeader.substring(7).trim();
                } else {
                    reqApiKey = authHeader.trim();
                }
            }
        }

        // Fall back to environment variable
        reqApiKey = (reqApiKey || process.env.GEMINI_API_KEY || '').trim();

        if (!reqApiKey || reqApiKey === 'your_gemini_api_key_here') {
            return res.status(500).json({
                error: 'Gemini API key not provided or invalid. Please add your key in the UI.'
            });
        }
        
        const ai = new GoogleGenAI({ apiKey: reqApiKey });

        console.log(`📄 Analyzing PDF: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB) using provided API key`);

        const prompt = `You are an expert legal aide. Carefully analyze this entire legal document and output a structured JSON analysis.

1. "document_type": The type of legal document (e.g., "NDA", "Employment Contract", "Terms of Service").

2. "risk_score": Overall risk score from 1 to 10 (number, 10 = extremely risky).

3. "summary": A concise plain English overview of what this document is about, who the parties are, and the main purpose.

4. "key_points": An array of the 5-8 most important things someone should know before signing.

5. "risky_clauses": Find ALL predatory, unfair, or risky clauses (e.g., auto-renewal, waived rights, hidden fees, data selling, unlimited liability, one-sided termination, arbitration clauses, broad indemnification). 
   Each clause must have:
   - "original_text": The exact text from the document (quote it directly)
   - "simplified": A plain English explanation of what it means
   - "risk_level": Either "High", "Medium", or "Low"
   - "reason": Why this clause is risky or concerning

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no extra text.

Output format:
{
  "document_type": "...",
  "risk_score": 7,
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
            model: 'gemini-2.5-flash',
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

        console.log(`✅ Analysis complete: ${jsonResult.risky_clauses?.length || 0} risky clauses found. Saving to database...`);
        
        // Save to Database
        const savedDoc = await db.saveAnalysis({
            fileName: req.file.originalname,
            fileSize: req.file.size,
            document_type: jsonResult.document_type || 'Legal Document',
            risk_score: jsonResult.risk_score || 0,
            summary: jsonResult.summary || '',
            key_points: jsonResult.key_points || [],
            risky_clauses: jsonResult.risky_clauses || []
        });

        return res.json({ success: true, data: savedDoc });

    } catch (error) {
        console.error('❌ Error during analysis:', error.message);

        let errorMsg = 'Failed to analyze document. Please try again.';

        if (error.message?.includes('API key') || error.message?.includes('INVALID_ARGUMENT')) {
            errorMsg = 'Invalid or missing Gemini API key. Please check your .env file or your UI key settings.';
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

// Error handler for multer and other errors
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.message);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    if (err.message === 'Only PDF files are supported.') {
        return res.status(400).json({ error: err.message });
    }
    
    res.status(err.status || 500).json({
        error: err.message || 'An internal server error occurred.',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
    console.log(`   API key: ${process.env.GEMINI_API_KEY ? '✅ Found' : '❌ MISSING - add to .env'}\n`);
});

module.exports = app;
