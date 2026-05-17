const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

const FILE_DB_PATH = path.join(__dirname, '../data/history.json');
let useMongo = false;
let AnalysisModel = null;

// Ensure local data directory exists for file fallback
async function ensureDir() {
    try {
        await fs.mkdir(path.dirname(FILE_DB_PATH), { recursive: true });
    } catch (err) {
        // Ignored if already exists
    }
}

// Initialize Database connection
async function initDb() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/legal-doc-simplifier';
    
    // Schema definition for Mongoose
    const AnalysisSchema = new mongoose.Schema({
        fileName: { type: String, required: true },
        fileSize: { type: Number, required: true },
        document_type: { type: String },
        risk_score: { type: Number },
        summary: { type: String },
        key_points: [{ type: String }],
        risky_clauses: [{
            original_text: String,
            simplified: String,
            risk_level: String,
            reason: String
        }],
        createdAt: { type: Date, default: Date.now }
    });

    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 3000 // Timeout after 3s to fallback quickly
        });
        AnalysisModel = mongoose.model('Analysis', AnalysisSchema);
        useMongo = true;
        console.log('✅ Connected to MongoDB successfully!');
    } catch (error) {
        console.warn('⚠️ MongoDB connection failed. Falling back to local JSON database.');
        console.warn('Reason:', error.message);
        useMongo = false;
        await ensureDir();
    }
}

// Helper to read file database
async function readJsonDb() {
    await ensureDir();
    try {
        const data = await fs.readFile(FILE_DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        console.error('Error reading JSON DB:', error.message);
        return [];
    }
}

// Helper to write to file database
async function writeJsonDb(data) {
    await ensureDir();
    await fs.writeFile(FILE_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// Uniform Database functions
async function saveAnalysis(analysisData) {
    if (useMongo && AnalysisModel) {
        const doc = new AnalysisModel(analysisData);
        return await doc.save();
    } else {
        const db = await readJsonDb();
        const newRecord = {
            _id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
            ...analysisData,
            createdAt: new Date().toISOString()
        };
        db.unshift(newRecord); // Add to beginning
        try {
            await writeJsonDb(db);
        } catch (e) {
            console.warn('⚠️ Could not save history to file (read-only filesystem?). Returning document anyway.', e.message);
        }
        return newRecord;
    }
}

async function getAllAnalyses() {
    if (useMongo && AnalysisModel) {
        return await AnalysisModel.find().sort({ createdAt: -1 });
    } else {
        return await readJsonDb();
    }
}

async function deleteAnalysis(id) {
    if (useMongo && AnalysisModel) {
        return await AnalysisModel.findByIdAndDelete(id);
    } else {
        let db = await readJsonDb();
        const initialLength = db.length;
        db = db.filter(item => item._id !== id);
        if (db.length !== initialLength) {
            try {
                await writeJsonDb(db);
            } catch (e) {
                console.warn('⚠️ Could not delete from file (read-only filesystem?)', e.message);
            }
            return true;
        }
        return null;
    }
}

module.exports = {
    initDb,
    saveAnalysis,
    getAllAnalyses,
    deleteAnalysis,
    isMongo: () => useMongo
};
