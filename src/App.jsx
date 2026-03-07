import { useState } from 'react';
import axios from 'axios';
import { Upload, FileText, AlertTriangle, ShieldCheck, ChevronRight, CheckCircle2, AlertCircle, FileWarning } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type !== 'application/pdf') {
                setError('Only PDF files are supported currently.');
                return;
            }
            setFile(selectedFile);
            setResult(null);
            setError('');
        }
    };

    const onDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = () => {
        setIsDragging(false);
    };

    const onDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            if (droppedFile.type !== 'application/pdf') {
                setError('Only PDF files are supported currently.');
                return;
            }
            setFile(droppedFile);
            setResult(null);
            setError('');
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('document', file);

        try {
            const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '');
            const response = await axios.post(`${API_URL}/api/analyze`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setResult(response.data.data);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to analyze the document. Please ensure the backend is running and the file is valid.');
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
        <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans selection:bg-indigo-500/30 overflow-x-hidden">

            {/* Background aesthetics */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.2, 0.3, 0.2],
                    }}
                    transition={{ duration: 8, repeat: Infinity }}
                    className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/20 blur-[120px]"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.2, 0.3, 0.2],
                    }}
                    transition={{ duration: 10, repeat: Infinity, delay: 1 }}
                    className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-rose-600/20 blur-[120px]"
                />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-20">

                <header className="text-center space-y-4 mb-12 md:mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 text-indigo-400 font-medium text-sm mb-2"
                    >
                        <ShieldCheck className="w-4 h-4" />
                        AI-Powered Legal Guardian
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight"
                    >
                        Understand Contracts in <br className="hidden sm:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-rose-400">Plain English</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-base sm:text-lg md:text-xl text-slate-400 max-w-3xl mx-auto px-4"
                    >
                        Upload any legal document. Our AI scans for hidden traps, simplifies complex jargon, and highlights risky clauses instantly.
                    </motion.p>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">

                    {/* Upload Section */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="lg:col-span-5 flex flex-col gap-6"
                    >
                        <div className="glass-panel rounded-[2rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden group transition-all">

                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-50" />

                            <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-3 relative z-10">
                                <span className="p-2 rounded-xl bg-indigo-500/10">
                                    <FileText className="text-indigo-400 w-6 h-6" />
                                </span>
                                Analyze Document
                            </h2>

                            <div
                                onDragOver={onDragOver}
                                onDragLeave={onDragLeave}
                                onDrop={onDrop}
                                className={`relative flex flex-col items-center justify-center w-full h-72 border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-500 ${isDragging ? 'border-indigo-400 bg-indigo-400/10 scale-[1.02]' : file ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-slate-700 hover:border-indigo-500 hover:bg-slate-800/50'}`}
                            >
                                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-6">
                                        {file ? (
                                            <>
                                                <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-4">
                                                    <ShieldCheck className="w-8 h-8 text-indigo-400" />
                                                </div>
                                                <p className="mb-2 text-sm sm:text-base text-slate-200 font-semibold truncate max-w-[250px]">{file.name}</p>
                                                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB • PDF Document</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-indigo-500/10 transition-colors">
                                                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                                                </div>
                                                <p className="mb-2 text-sm sm:text-base text-slate-300">
                                                    <span className="font-bold text-indigo-400">Click to upload</span>
                                                    <span className="hidden sm:inline"> or drag & drop</span>
                                                </p>
                                                <p className="text-xs text-slate-500">Fast AI analysis • PDF only</p>
                                            </>
                                        )}
                                    </div>
                                    <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                                </label>

                                {isDragging && (
                                    <div className="absolute inset-0 bg-indigo-500/10 backdrop-blur-[2px] rounded-3xl flex items-center justify-center">
                                        <p className="text-indigo-400 font-bold text-lg animate-bounce">Drop file here</p>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3"
                                >
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    {error}
                                </motion.div>
                            )}

                            <button
                                onClick={handleUpload}
                                disabled={!file || loading}
                                className={`mt-6 w-full py-4 px-6 rounded-2xl font-bold text-white transition-all duration-500 flex items-center justify-center gap-2 group ${!file || loading ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5' : 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.5)] active:scale-[0.98]'}`}
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Analyzing Intelligence...</span>
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        <span>Simplify Terms Now</span>
                                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>

                    {/* Results Section */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="lg:col-span-7 flex flex-col min-h-[500px]"
                    >
                        <AnimatePresence mode="wait">
                            {!result ? (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="glass-panel rounded-[2rem] p-8 flex-1 flex flex-col items-center justify-center text-center border-dashed border-slate-700/50"
                                >
                                    <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-6 animate-pulse-slow">
                                        <ShieldCheck className="w-10 h-10 text-slate-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-300 mb-2">Awaiting Document</h3>
                                    <p className="text-slate-500 max-w-sm mx-auto leading-relaxed">
                                        Once you upload a contract, our AI will disassemble its complex clauses here.
                                    </p>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="results"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="glass-panel rounded-[2rem] p-6 sm:p-8 shadow-2xl flex-1 space-y-8 overflow-y-auto max-h-[85vh] custom-scrollbar"
                                >

                                    {/* Summary */}
                                    <section>
                                        <h3 className="text-lg sm:text-xl font-bold text-indigo-400 mb-4 flex items-center gap-3">
                                            <span className="p-1.5 rounded-lg bg-indigo-500/10"><FileText className="w-5 h-5" /></span>
                                            Executive Summary
                                        </h3>
                                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 text-slate-300 leading-relaxed text-sm sm:text-base">
                                            {result.summary || "No summary available."}
                                        </div>
                                    </section>

                                    {/* Key Points */}
                                    <section>
                                        <h3 className="text-lg sm:text-xl font-bold text-purple-400 mb-4 flex items-center gap-3">
                                            <span className="p-1.5 rounded-lg bg-purple-500/10"><CheckCircle2 className="w-5 h-5" /></span>
                                            Core Insights
                                        </h3>
                                        <div className="grid gap-3">
                                            {(result.key_points || []).map((point, idx) => (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.1 * idx }}
                                                    key={idx}
                                                    className="flex items-start gap-3 bg-slate-900/30 border border-slate-800/50 p-4 rounded-2xl"
                                                >
                                                    <div className="mt-1">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                    </div>
                                                    <span className="text-slate-300 text-sm sm:text-base">{point}</span>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </section>

                                    {/* Risky Clauses */}
                                    <section>
                                        <h3 className="text-lg sm:text-xl font-bold text-rose-400 mb-4 flex items-center gap-3">
                                            <span className="p-1.5 rounded-lg bg-rose-500/10"><AlertTriangle className="w-5 h-5" /></span>
                                            Critical Risk Analysis
                                        </h3>

                                        {(!result.risky_clauses || result.risky_clauses.length === 0) ? (
                                            <div className="p-8 text-center border-2 border-emerald-500/20 bg-emerald-500/5 rounded-[1.5rem] text-emerald-400 font-medium">
                                                <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                                <p>Excellent! No predatory clauses found in this document.</p>
                                            </div>
                                        ) : (
                                            <div className="grid gap-4 sm:gap-6">
                                                {result.risky_clauses.map((clause, idx) => (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 15 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.1 * idx }}
                                                        key={idx}
                                                        className={`border rounded-2xl p-5 sm:p-6 transition-all bg-slate-900/40 ${getRiskColor(clause.risk_level)}`}
                                                    >
                                                        <div className="flex items-center justify-between mb-5">
                                                            <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-xs">
                                                                {getRiskIcon(clause.risk_level)}
                                                                {clause.risk_level} Risk Level
                                                            </div>
                                                        </div>

                                                        <div className="space-y-5">
                                                            <div className="relative">
                                                                <span className="text-[10px] uppercase font-black text-slate-500 mb-2 block tracking-widest">Original Legal Text</span>
                                                                <p className="text-xs sm:text-sm italic opacity-70 pl-4 border-l-2 border-current leading-relaxed">{clause.original_text}</p>
                                                            </div>

                                                            <div className="bg-white/5 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/5">
                                                                <span className="text-[10px] uppercase font-black text-indigo-400 mb-2 block tracking-widest">Simplified Translation</span>
                                                                <p className="font-semibold text-slate-100 text-sm sm:text-base leading-snug">{clause.simplified}</p>
                                                            </div>

                                                            {clause.reason && (
                                                                <div className="px-1">
                                                                    <span className="text-[10px] uppercase font-black opacity-40 mb-1 block tracking-widest">Warning Basis</span>
                                                                    <p className="text-xs sm:text-sm text-slate-400">{clause.reason}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                    </section>

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
