import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, AlertTriangle, ShieldCheck,
  ChevronRight, CheckCircle2, AlertCircle, Key,
  Eye, EyeOff, X, Zap, Scale, FileWarning, BarChart3, Lock, DownloadCloud
} from "lucide-react";

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("gemini_api_key") || "");
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");
  const [progress, setProgress] = useState(0);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch all recent analyses
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch("/api/history");
      const data = await response.json();
      if (response.ok && data.success) {
        setHistory(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const saveApiKey = () => {
    const key = tempApiKey.trim();
    if (!key) return;
    localStorage.setItem("gemini_api_key", key);
    setApiKey(key);
    setShowApiModal(false);
    setTempApiKey("");
    setError("");
  };

  const removeApiKey = () => {
    localStorage.removeItem("gemini_api_key");
    setApiKey("");
    setResult(null);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setError("Only PDF files are supported.");
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File too large. Maximum size is 10MB.");
        return;
      }
      setFile(selectedFile);
      setResult(null);
      setError("");
    }
  };

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (droppedFile.type !== "application/pdf") { setError("Only PDF files are supported."); return; }
      setFile(droppedFile);
      setResult(null);
      setError("");
    }
  };

  const simulateProgress = useCallback(() => {
    setProgress(0);
    const steps = [10, 25, 40, 60, 75, 88];
    steps.forEach((val, i) => {
      setTimeout(() => setProgress(val), i * 800);
    });
  }, []);

  const handleAnalyze = async () => {
    if (!file) return;
    if (!apiKey) { setShowApiModal(true); return; }

    setLoading(true);
    setError("");
    setResult(null);
    simulateProgress();

    try {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("apiKey", apiKey);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error(`Server returned an unexpected response (${response.status}). Please try again.`);
      }

      if (!response.ok) {
         let msg = data.error || "Analysis failed.";
         if (msg.includes("API key")) msg = "Invalid API key. Please check your Gemini API key.";
         throw new Error(msg);
      }

      setProgress(100);
      setTimeout(() => { 
        setResult(data.data); 
        setLoading(false); 
        fetchHistory(); // Refresh history lists!
      }, 400);

    } catch (err) {
      setError(err.message || "Failed to analyze document. Please try again.");
      setLoading(false);
      setProgress(0);
    }
  };

  const handleDeleteHistory = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this analysis from history?")) return;

    try {
      const response = await fetch(`/api/history/${id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        setHistory(prev => prev.filter(item => item._id !== id));
        if (result && result._id === id) {
          setResult(null);
        }
      } else {
        alert("Failed to delete analysis.");
      }
    } catch (err) {
      console.error("Error deleting history:", err);
      alert("An error occurred while deleting.");
    }
  };

  const scoreColor = (score) => {
    if (score >= 7) return "#f43f5e";
    if (score >= 4) return "#f59e0b";
    return "#10b981";
  };

  const handleDownloadReport = () => {
    if (!result) return;
    
    let reportTxt = `LEGAL DOCUMENT ANALYSIS REPORT\n`;
    reportTxt += `Document Type: ${result.document_type || "Unknown Document"}\n`;
    reportTxt += `Risk Score: ${result.risk_score || "N/A"}/10\n\n`;
    reportTxt += `--- EXECUTIVE SUMMARY ---\n${result.summary || "No summary available."}\n\n`;
    
    if (result.key_points && result.key_points.length > 0) {
      reportTxt += `--- KEY POINTS ---\n`;
      result.key_points.forEach((pt, i) => { reportTxt += `${i + 1}. ${pt}\n`; });
      reportTxt += `\n`;
    }
    
    if (result.risky_clauses && result.risky_clauses.length > 0) {
      reportTxt += `--- CRITICAL RISKS DETECTED (${result.risky_clauses.length}) ---\n`;
      result.risky_clauses.forEach((clause) => {
        reportTxt += `\n[${clause.risk_level.toUpperCase()} RISK]\n`;
        reportTxt += `Original Text: ${clause.original_text}\n`;
        reportTxt += `Plain English: ${clause.simplified}\n`;
        if (clause.reason) reportTxt += `Reason: ${clause.reason}\n`;
      });
    } else {
      reportTxt += `--- CRITICAL RISKS DETECTED (0) ---\nNo major predatory clauses were detected.\n`;
    }
    
    const blob = new Blob([reportTxt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Legal_Analysis_Report_${new Date().getTime()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-slate-100 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-indigo-600/10 blur-[120px] mix-blend-screen opacity-70" />
        <div className="absolute top-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-purple-600/10 blur-[120px] mix-blend-screen opacity-70" />
        <div className="absolute -bottom-[20%] left-[20%] w-[80vw] h-[80vw] rounded-full bg-rose-600/10 blur-[120px] mix-blend-screen opacity-40" />
      </div>

      <AnimatePresence>
        {showApiModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowApiModal(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-[2rem] shadow-2xl p-6 sm:p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                    <Key className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Gemini API Key</h3>
                    <p className="text-sm text-slate-400">Required for analysis</p>
                  </div>
                </div>
                <button onClick={() => setShowApiModal(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400 hover:text-white" />
                </button>
              </div>

              <div className="space-y-4 mb-8">
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                  <h4 className="text-sm font-semibold text-indigo-300 mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Get Free Unlimited Key
                  </h4>
                  <ol className="text-sm text-slate-300 space-y-2 list-decimal pl-4">
                    <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 underline font-medium">aistudio.google.com</a></li>
                    <li>Sign in with Google</li>
                    <li>Click <strong>Create API Key</strong></li>
                  </ol>
                </div>
                
                <div className="relative">
                  <input type={showApiKey ? "text" : "password"} placeholder="AIzaSy..." value={tempApiKey} onChange={(e) => setTempApiKey(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveApiKey()} className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm sm:text-base" autoFocus />
                  <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 justify-center">
                  <Lock className="w-3 h-3" /> Stored locally. Never sent to our servers.
                </p>
              </div>

              <button onClick={saveApiKey} disabled={!tempApiKey.trim()} className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 border border-transparent shadow-[0_0_20px_rgba(79,70,229,0.3)]">
                Save API Key
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12 lg:py-16 pb-20">
        <header className="text-center space-y-6 mb-10 md:mb-16">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 text-indigo-300 font-medium text-sm backdrop-blur-md shadow-sm">
            <Scale className="w-4 h-4" /> Autonomous Legal Analyst
          </motion.div>
          
          <motion.h1 initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.5 }} className="text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-tight">
            Understand Any Contract in
            <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-rose-400"> Plain English</span>
          </motion.h1>
          
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl mx-auto px-2">
            Upload any PDF agreement. Our AI models scan for hidden traps, simplify legal jargon, and flag predatory clauses in seconds.
          </motion.p>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 border border-slate-800 text-sm backdrop-blur-sm shadow-sm transition-all hover:bg-slate-800">
              {apiKey ? (
                 <>
                   <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                   <span className="text-slate-300 font-medium mr-1 sm:mr-2 text-xs sm:text-sm">API Key Active</span>
                   <button onClick={() => { setTempApiKey(apiKey); setShowApiModal(true); }} className="text-indigo-400 hover:text-indigo-300 font-medium text-xs sm:text-sm">Edit</button>
                   <span className="text-slate-600 hidden sm:inline">|</span>
                   <button onClick={removeApiKey} className="text-slate-500 hover:text-rose-400" title="Remove Key"><X className="w-3.5 h-3.5" /></button>
                 </>
              ) : (
                 <>
                   <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]"></div>
                   <span className="text-slate-300 font-medium mr-1 text-xs sm:text-sm">Missing API Key</span>
                   <button onClick={() => { setTempApiKey(""); setShowApiModal(true); }} className="text-indigo-400 hover:text-indigo-300 font-bold inline-flex items-center gap-1 text-xs sm:text-sm">
                     Add Free Key <ChevronRight className="w-3 h-3" />
                   </button>
                 </>
              )}
            </div>
          </motion.div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-5 w-full flex flex-col gap-6">
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] p-5 sm:p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
              
              <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-3 text-white">
                <span className="p-2 sm:p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400"><FileText className="w-5 h-5 sm:w-6 sm:h-6" /></span>
                Upload Document
              </h2>

              <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onClick={() => fileInputRef.current?.click()} className={`relative flex flex-col items-center justify-center w-full min-h-[200px] sm:min-h-[240px] border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-300 overflow-hidden ${isDragging ? 'border-indigo-400 bg-indigo-900/20 scale-[1.02]' : file ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/50'}`}>
                {file ? (
                  <div className="flex flex-col items-center justify-center p-4 sm:p-6 text-center z-10 w-full px-8">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-600/20 flex items-center justify-center mb-4 shadow-inner shrink-0">
                      <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-400" />
                    </div>
                    <p className="mb-1.5 text-sm sm:text-lg text-white font-bold truncate max-w-full block px-2 break-all">{file.name}</p>
                    <p className="text-[10px] sm:text-xs text-slate-400 mb-4 bg-slate-900 px-3 py-1 rounded-full whitespace-nowrap">{(file.size / 1024 / 1024).toFixed(2)} MB • PDF</p>
                    <button className="text-xs sm:text-sm text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium bg-rose-500/10 px-3 py-1.5 rounded-lg transition-colors" onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); setError(""); }}>
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Remove File
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center z-10">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-slate-800/80 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all duration-500 shadow-lg group-hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)] shrink-0">
                      <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <p className="mb-2 text-sm sm:text-lg text-slate-300">
                      <span className="font-bold text-indigo-400">Click to upload</span> <span className="hidden sm:inline">or drag & drop</span>
                    </p>
                    <p className="text-xs sm:text-sm text-slate-500">PDF documents only • Max 10MB</p>
                  </div>
                )}
                {isDragging && <div className="absolute inset-0 bg-indigo-500/10 backdrop-blur-sm flex items-center justify-center z-20"><p className="text-indigo-300 font-bold text-lg sm:text-xl animate-bounce shadow-sm px-6 py-2 bg-slate-900/80 rounded-full">Drop it here!</p></div>}
                <input ref={fileInputRef} type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0 }} className="mt-5 overflow-hidden">
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs sm:text-sm flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                      <p className="leading-snug">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {loading && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-5 overflow-hidden">
                    <div className="bg-slate-900 rounded-full h-1.5 sm:h-2 mb-2 overflow-hidden shadow-inner border border-slate-800">
                      <motion.div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 shadow-[0_0_10px_#6366f1]" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
                    </div>
                    <p className="text-[10px] sm:text-xs font-medium text-indigo-300 text-right animate-pulse tracking-wide">Analyzing document... {progress}%</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button onClick={handleAnalyze} disabled={!file || loading} className={`mt-6 w-full py-3 sm:py-4 px-6 rounded-2xl font-bold text-sm sm:text-base text-white transition-all duration-300 flex items-center justify-center gap-2 group relative overflow-hidden ${!file || loading ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_40px_-10px_rgba(99,102,241,0.6)] hover:shadow-[0_0_60px_-15px_rgba(99,102,241,0.8)] border border-indigo-400/50'}`}>
                {loading ? (
                  <><div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /><span>Extracting Insights...</span></>
                ) : (
                  <>
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform text-white/90" />
                    <span className="tracking-wide">{apiKey ? "Analyze Document" : "Add Key & Analyze"}</span>
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1.5 transition-transform opacity-70" />
                  </>
                )}
              </button>
            </div>

            {/* Analysis History Box */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[400px]">
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
              
              <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center justify-between text-white shrink-0">
                <span className="flex items-center gap-3">
                  <span className="p-1.5 sm:p-2 rounded-xl bg-purple-500/20 text-purple-400"><BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" /></span>
                  Analysis History
                </span>
                {history.length > 0 && (
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full border border-slate-700/50 font-bold">{history.length}</span>
                )}
              </h2>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3 min-h-[150px]">
                {loadingHistory && history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-500 h-full">
                    <div className="w-6 h-6 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-2" />
                    <p className="text-xs">Loading history...</p>
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 flex flex-col items-center justify-center h-full">
                    <p className="text-sm font-medium">No recent analyses</p>
                    <p className="text-xs text-slate-600 mt-1">Your simplified documents will show here.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 pr-1">
                    {history.map((item) => (
                      <motion.div
                        key={item._id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.01 }}
                        onClick={() => {
                          setResult(item);
                          setFile(null); // Clear pending upload when showing loaded doc
                        }}
                        className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex items-start gap-3.5 relative group/item overflow-hidden ${result?._id === item._id ? 'bg-indigo-600/10 border-indigo-500/40 shadow-[0_0_15px_-5px_rgba(99,102,241,0.2)]' : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-900/40 hover:border-slate-700/50'}`}
                      >
                        {/* Risk Score badge */}
                        <div className="flex flex-col items-center justify-center shrink-0 w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-xs font-black relative" style={{ color: scoreColor(item.risk_score) }}>
                          {item.risk_score}
                          <span className="text-[6px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Risk</span>
                        </div>
                        
                        <div className="flex-1 min-w-0 pr-6">
                           <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">{item.document_type || "NDA"}</p>
                           <p className="text-xs font-bold text-white truncate">{item.fileName}</p>
                           <p className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                             <span>{(item.fileSize / 1024).toFixed(1)} KB</span>
                             <span>•</span>
                             <span>{new Date(item.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                           </p>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => handleDeleteHistory(e, item._id)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 transition-all opacity-0 group-hover/item:opacity-100"
                          title="Delete"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-7 w-full flex flex-col h-full min-h-[400px] sm:min-h-[500px]">
            <AnimatePresence mode="wait">
              {!result ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 bg-slate-900/30 backdrop-blur-sm border-2 border-dashed border-slate-700/50 rounded-[2rem] p-6 sm:p-8 flex flex-col items-center justify-center text-center min-h-[350px]">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-800/40 flex items-center justify-center mb-6 shadow-inner relative">
                     <FileWarning className="w-8 h-8 sm:w-10 sm:h-10 text-slate-500" />
                     <div className="absolute inset-0 border border-slate-700/50 rounded-full animate-[ping_3s_ease-in-out_infinite] opacity-20"></div>
                  </div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-300 mb-2 sm:mb-3">Awaiting Document</h3>
                  <p className="text-slate-500 max-w-[260px] sm:max-w-sm mx-auto leading-relaxed text-xs sm:text-base">Upload a PDF lease, NDA, or terms of service. Our AI will automatically disassemble complex clauses.</p>
                </motion.div>
              ) : (
                <motion.div key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] p-5 sm:p-8 shadow-2xl flex flex-col space-y-6 sm:space-y-8 overflow-y-auto max-h-[85vh] custom-scrollbar">
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 pb-4 border-b border-slate-800">
                    <div className="min-w-0 flex-1">
                      <span className="inline-block px-2 sm:px-3 py-1 rounded-full bg-slate-800 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 border border-slate-700/50">Document Detected</span>
                      <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white truncate max-w-full">{result.document_type || "Legal Document"}</h3>
                    </div>
                    {result.risk_score !== undefined && (
                      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto shrink-0">
                        <button onClick={handleDownloadReport} className="flex items-center gap-2 px-4 py-3 sm:py-4 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/20 transition-colors text-xs sm:text-sm font-bold w-full sm:w-auto justify-center shadow-inner mt-2 sm:mt-0">
                          <DownloadCloud className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="shrink-0">Download Report</span>
                        </button>
                        <div className="flex items-center gap-3 bg-slate-950/50 p-3 sm:p-4 rounded-2xl border border-slate-800/50 shadow-inner w-full sm:w-auto sm:min-w-[160px] justify-center">
                          <div className="relative w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="4" />
                              <circle cx="18" cy="18" r="15.9" fill="none" stroke={scoreColor(result.risk_score)} strokeWidth="4" strokeDasharray={`${(result.risk_score / 10) * 100} 100`} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                            </svg>
                            <span className="absolute font-black text-lg sm:text-xl" style={{ color: scoreColor(result.risk_score) }}>{result.risk_score}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-slate-500 font-bold text-[10px] sm:text-xs uppercase tracking-wider">Risk Score</span>
                            <span className="text-slate-300 font-medium text-xs sm:text-sm">out of 10</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <section>
                    <h4 className="text-base sm:text-lg font-bold text-indigo-300 mb-3 sm:mb-4 flex items-center gap-2">
                       <div className="p-1 sm:p-1.5 bg-indigo-500/20 rounded-lg"><FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" /></div>
                       Executive Summary
                    </h4>
                    <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-slate-300 leading-relaxed text-xs sm:text-sm md:text-base font-medium shadow-inner">
                      {result.summary || "No summary available."}
                    </div>
                  </section>

                  {result.key_points?.length > 0 && (
                    <section>
                      <h4 className="text-base sm:text-lg font-bold text-purple-300 mb-3 sm:mb-4 flex items-center gap-2">
                        <div className="p-1 sm:p-1.5 bg-purple-500/20 rounded-lg"><CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" /></div>
                        Core Insights
                      </h4>
                      <div className="grid gap-2.5 sm:gap-3">
                        {result.key_points.map((point, idx) => (
                          <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * idx }} className="flex items-start gap-2 sm:gap-3 bg-slate-900/50 border border-slate-800/50 p-3 sm:p-4 rounded-xl hover:bg-slate-800/50 transition-colors">
                            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0 mt-0.5 opacity-80" />
                            <span className="text-slate-200 text-xs sm:text-sm md:text-base leading-snug">{point}</span>
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  )}

                  <section>
                    <div className="flex items-center justify-between mb-4 sm:mb-5">
                      <h4 className="text-base sm:text-lg font-bold text-rose-300 flex items-center gap-2">
                        <div className="p-1 sm:p-1.5 bg-rose-500/20 rounded-lg"><AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" /></div>
                        Critical Risk Analysis
                      </h4>
                      {result.risky_clauses?.length > 0 && (
                        <span className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-rose-500/20 text-rose-300 text-[10px] sm:text-xs font-bold border border-rose-500/20 whitespace-nowrap">
                          {result.risky_clauses.length} Flagged
                        </span>
                      )}
                    </div>

                    {!result.risky_clauses?.length ? (
                      <div className="p-6 sm:p-8 text-center border-2 border-emerald-500/20 bg-emerald-500/5 rounded-2xl text-emerald-400 font-medium">
                        <ShieldCheck className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50 text-emerald-500" />
                        <p className="text-base sm:text-lg">Clean Document!</p>
                        <p className="text-emerald-500/70 text-xs sm:text-sm mt-1">No major predatory clauses were detected by the AI.</p>
                      </div>
                    ) : (
                      <div className="space-y-4 sm:space-y-6">
                        {result.risky_clauses.map((clause, idx) => {
                          const getStyles = (level) => {
                            switch (level?.toLowerCase()) {
                              case "high": return { border: "border-rose-500/30", bg: "bg-rose-500/10", text: "text-rose-400", icon: <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> };
                              case "medium": return { border: "border-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-400", icon: <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> };
                              default: return { border: "border-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-400", icon: <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> };
                            }
                          };
                          const styles = getStyles(clause.risk_level);
                          
                          return (
                            <motion.div key={idx} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * idx }} className={`border bg-slate-900/60 rounded-2xl p-4 sm:p-6 overflow-hidden relative shadow-md ${styles.border}`}>
                              <div className={`absolute left-0 top-0 bottom-0 w-1 sm:w-1.5 ${styles.bg.replace('/10', '/50')}`} />
                              
                              <div className="flex items-center justify-between mb-4 pl-1 sm:pl-2">
                                <div className={`flex items-center gap-1.5 sm:gap-2 font-black uppercase tracking-widest text-[10px] sm:text-xs px-2.5 py-1 sm:px-3 rounded-full ${styles.bg} ${styles.text}`}>
                                  {styles.icon} {clause.risk_level} Risk
                                </div>
                              </div>

                              <div className="space-y-4 sm:space-y-5 pl-1 sm:pl-2">
                                <div>
                                  <span className="text-[9px] sm:text-[11px] uppercase font-bold text-slate-500 mb-1.5 block tracking-widest">Original Legal Text</span>
                                  <p className="text-xs sm:text-sm font-mono opacity-60 pl-3 sm:pl-4 border-l-2 border-slate-700 leading-relaxed bg-slate-950/30 p-2 sm:p-3 rounded-r-xl line-clamp-3 hover:line-clamp-none transition-all cursor-pointer break-words">{clause.original_text}</p>
                                </div>
                                <div className="bg-indigo-500/5 backdrop-blur-md p-3 sm:p-5 rounded-xl border border-indigo-500/10 shadow-inner">
                                  <span className="text-[9px] sm:text-[11px] uppercase font-bold text-indigo-400 mb-1.5 sm:mb-2 block tracking-widest flex items-center gap-1"><Scale className="w-3 h-3" /> Plain English Translation</span>
                                  <p className="font-semibold text-white text-sm sm:text-base leading-snug">{clause.simplified}</p>
                                </div>
                                {clause.reason && (
                                  <div>
                                    <span className="text-[9px] sm:text-[11px] uppercase font-bold text-rose-400/70 mb-1 sm:mb-1.5 block tracking-widest">Why This is Dangerous</span>
                                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{clause.reason}</p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
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
