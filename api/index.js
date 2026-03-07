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

        // Parse PDF text
        const pdfData = await pdfParse(req.file.buffer);
        let extractedText = pdfData.text;

        // Truncate text if too long to save token cost and prevent errors
        if (extractedText.length > 50000) {
            extractedText = extractedText.substring(0, 50000) + '...[TRUNCATED]';
        }

        // Prompt for Gemini AI
        const prompt = `
You are an expert legal aide, skilled in deeply analyzing legal contracts and policies. 
Your goal is to parse the provided text of a legal document and output a structured JSON analysis.

Analyze the contract for:
1. "risky_clauses": Find any predatory or excessively risky clauses (e.g., auto-renewal without notice, waived rights, arbitration clauses, hidden fees, data selling, indemnification requirements). For each, extract the original text, provide a "simplified" explanation of what it actually means, and assign a "risk_level" (Low, Medium, High).
2. "summary": A brief, plain English summary of what the document as a whole entails.
3. "key_points": A short list of the most critical takeaways for the user.

Format your response strictly as a JSON object matching this structure:
{
  "summary": "Plain text summary here",
  "key_points": ["point 1", "point 2", "point 3"],
  "risky_clauses": [
    {
      "original_text": "Original complex text",
      "simplified": "What this actually means",
      "risk_level": "High/Medium/Low",
      "reason": "Why this is risky"
    }
  ]
}

Document Text to analyze:
${extractedText}
`;

        // Request generation
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let resultText = response.text();

        let jsonResult;
        try {
            // Remove potential markdown blocks
            const cleanText = resultText.replace(/```json\n?|```/g, '').trim();
            jsonResult = JSON.parse(cleanText);
        } catch (e) {
            console.error('JSON Parse Error:', e, 'Raw Text:', resultText);
            return res.status(500).json({ error: 'AI returned invalid formatting', details: e.message });
        }

        return res.json({ success: true, data: jsonResult });
    } catch (error) {
        console.error('Error during analysis:', error);
        return res.status(500).json({ error: 'Failed to analyze document', details: error.message });
    }
});

if (process.env.NODE_ENV !== 'production' && require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Backend server running locally on http://localhost:${PORT}`);
    });
}

module.exports = app;
