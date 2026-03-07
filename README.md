# AI-Powered Legal Document Simplifier

This project strictly follows the required specifications to simplify legal documents using Artificial Intelligence and help users understand important clauses easily.

## Features
- **📤 Upload PDF button**: Users can upload complex legal PDFs.
- **📄 Document preview**: Extract textual content entirely on backend.
- **⚠ Highlight risky clauses**: Our system leverages Gemini AI to pinpoint predatory clauses.
- **📝 Show simplified explanation**: Complex jargon is translated into plain English.
- **📊 Risk level indicator**: Automatically assigns High, Medium, or Low risk to each extracted clause.

## Architecture
- **Frontend**: Designed with React (Vite workflow for speed), specialized dark-mode glassmorphism styling utilizing `tailwindcss` and micro-animations via `framer-motion`. Built for robust UX.
- **Backend**: Scalable Node.js + Express setup. Utilizes `@google/genai` (official SDK) for natural language reasoning, and `pdf-parse` for data extraction.

## Setup Instructions

### 1. Prerequisites
- Node.js (v18+ recommended)
- A **Google Gemini API Key** (You can obtain one from Google AI Studio).

### 2. Backend Setup
1. Open the `.env` file located in the `backend/` directory:
   `c:\Users\preet\Desktop\projects\legal-doc-simplifier\backend\.env`
2. Replace `YOUR_GEMINI_API_KEY_HERE` with your actual Gemini API key.
3. Open a terminal and run the backend:
   ```bash
   cd c:\Users\preet\Desktop\projects\legal-doc-simplifier\backend
   npm install
   node index.js
   ```
   *The backend will start running on port 5000.*

### 3. Frontend Setup
1. Open a new terminal and run the frontend:
   ```bash
   cd c:\Users\preet\Desktop\projects\legal-doc-simplifier\frontend
   npm install
   npm run dev
   ```
2. The UI will start on `http://localhost:5173`. Open this URL in your browser.

## Tech Stack Used
- HTML, CSS, JavaScript
- React.js (Vite)
- Tailwind CSS
- Node.js
- Express.js
- Google Gemini API
- PDF-Parse
