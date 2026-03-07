import { useState } from 'react';
import axios from 'axios';
import { Upload, FileText, AlertTriangle, ShieldCheck, ChevronRight, CheckCircle2, AlertCircle, FileWarning } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setResult(null);
            setError('');
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        setError('');

        // We send to backend
        const formData = new FormData();
        formData.append('document', file);

        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const response = await axios.post(`${API_URL}/api/analyze`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            // Expected backend response: { success: true, data: { summary, key_points, risky_clauses: [{original_text, simplified, risk_level, reason}] } }
            setResult(response.data.data);
        } catch (err) {
            console.error(err);
            setError('Failed to analyze the document. Please ensure the backend is running and the file is valid.');
        } finally {
            setLoading(false);
        }
    };

    const getRiskColor = (level) => {
        switch (level?.toLowerCase()) {
            case 'high': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            default: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
        }
    };

    const getRiskIcon = (level) => {
        switch (level?.toLowerCase()) {
            case 'high': return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'medium': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            default: return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500/30">

            {/* Background aesthetics */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-rose-600/20 blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 md:py-20">

                <header className="text-center space-y-4 mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 text-indigo-400 font-medium text-sm mb-4"
                    >
                        <ShieldCheck className="w-4 h-4" />
                        AI-Powered Legal Guardian
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl md:text-6xl font-extrabold tracking-tight"
                    >
                        Understand Contracts in <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-rose-400">Plain English</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-slate-400 max-w-2xl mx-auto"
                    >
                        Upload any legal document. Our AI scans for hidden traps, simplifies complex jargon, and highlights risky clauses instantly.
                    </motion.p>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Upload Section */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="lg:col-span-5 flex flex-col gap-6"
                    >
                        <div className="glass-panel rounded-3xl p-8 shadow-2xl relative overflow-hidden group transition-all hover:bg-slate-800/40">

                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <FileText className="text-indigo-400" />
                                Analyze Document
                            </h2>

                            <label
                                className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${file ? 'border-indigo-400 bg-indigo-400/5' : 'border-slate-700 hover:border-indigo-500 hover:bg-slate-800/50'}`}
                            >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                                    {file ? (
                                        <>
                                            <FileWarning className="w-12 h-12 text-indigo-400 mb-4" />
                                            <p className="mb-2 text-sm text-slate-300 font-medium"><span className="font-bold">{file.name}</span></p>
                                            <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB • Ready to analyze</p>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-12 h-12 text-slate-500 mb-4 group-hover:text-indigo-400 transition-colors" />
                                            <p className="mb-2 text-sm text-slate-400"><span className="font-semibold text-slate-300">Click to upload</span> or drag and drop</p>
                                            <p className="text-xs text-slate-500">PDF, DOCX up to 10MB</p>
                                        </>
                                    )}
                                </div>
                                <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                            </label>

                            {error && (
                                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleUpload}
                                disabled={!file || loading}
                                className={`mt-6 w-full py-4 px-6 rounded-xl font-bold text-white transition-all duration-300 flex items-center justify-center gap-2 ${!file || loading ? 'bg-slate-700 cursor-not-allowed opacity-50' : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 relative overflow-hidden group'}`}
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Analyzing Document...
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-5 h-5" />
                                        Reveal Hidden Risks
                                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>

                    {/* Results Section */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="lg:col-span-7 flex flex-col"
                    >
                        <AnimatePresence mode="wait">
                            {!result ? (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="glass-panel rounded-3xl p-8 flex-1 flex flex-col items-center justify-center text-center border-dashed border-slate-700 h-full min-h-[400px]"
                                >
                                    <ShieldCheck className="w-16 h-16 text-slate-700 mb-4" />
                                    <h3 className="text-xl font-semibold text-slate-400 mb-2">Awaiting Document</h3>
                                    <p className="text-slate-500 max-w-sm">
                                        Upload a legal document to see a simplified summary, key takeaways, and a breakdown of risky clauses.
                                    </p>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="results"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="glass-panel rounded-3xl p-8 shadow-2xl flex-1 space-y-8 overflow-y-auto max-h-[80vh] custom-scrollbar"
                                >

                                    {/* Summary */}
                                    <div>
                                        <h3 className="text-xl font-bold text-indigo-400 mb-3 flex items-center gap-2">
                                            <FileText className="w-5 h-5" /> Detailed Summary
                                        </h3>
                                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 text-slate-300 leading-relaxed">
                                            {result.summary || "No summary available."}
                                        </div>
                                    </div>

                                    {/* Key Points */}
                                    <div>
                                        <h3 className="text-xl font-bold text-indigo-400 mb-3 flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5" /> Key Takeaways
                                        </h3>
                                        <ul className="grid gap-3">
                                            {(result.key_points || []).map((point, idx) => (
                                                <motion.li
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.1 * idx }}
                                                    key={idx}
                                                    className="flex items-start gap-3 bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl"
                                                >
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                                    <span className="text-slate-300">{point}</span>
                                                </motion.li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Risky Clauses */}
                                    <div>
                                        <h3 className="text-xl font-bold text-rose-400 mb-3 flex items-center gap-2">
                                            <AlertTriangle className="w-5 h-5" /> Predatory & Risky Clauses
                                        </h3>

                                        {(!result.risky_clauses || result.risky_clauses.length === 0) ? (
                                            <div className="p-6 text-center border border-emerald-500/20 bg-emerald-500/5 rounded-2xl text-emerald-400 font-medium flex items-center justify-center gap-2">
                                                <ShieldCheck className="w-5 h-5" />
                                                No high-risk clauses detected. Looks good!
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {result.risky_clauses.map((clause, idx) => (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: 0.1 * idx }}
                                                        key={idx}
                                                        className={`border rounded-2xl p-5 transform transition-all duration-300 hover:shadow-lg ${getRiskColor(clause.risk_level)}`}
                                                    >
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-sm">
                                                                {getRiskIcon(clause.risk_level)}
                                                                {clause.risk_level} RISK
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <div>
                                                                <span className="text-xs uppercase font-bold text-slate-500 mb-1 block">Legal Jargon (Original)</span>
                                                                <p className="text-sm italic opacity-80 pl-3 border-l-2 border-current">{clause.original_text}</p>
                                                            </div>

                                                            <div className="bg-slate-900/40 p-4 rounded-xl">
                                                                <span className="text-xs uppercase font-bold w-full mb-1 block opacity-70">Plain English Meaning</span>
                                                                <p className="font-medium text-slate-100">{clause.simplified}</p>
                                                            </div>

                                                            {clause.reason && (
                                                                <div>
                                                                    <span className="text-xs uppercase font-bold opacity-70 mb-1 block">Why it's Risky</span>
                                                                    <p className="text-sm">{clause.reason}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </main>
            </div>

        </div>
    );
}

export default App;
