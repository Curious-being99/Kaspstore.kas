import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Send, 
  X, 
  Bot, 
  User, 
  Loader2, 
  ChevronRight,
  BookOpen,
  Zap,
  ShieldCheck,
  MessageSquare
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello Researcher. I am K-Assistant. How can I assist your Kaspstore journey today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    const newMessages = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) throw new Error("Protocol error");

      const data = await response.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.text }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "Protocol bypass detected. Connection reset. (AI Service Unavailable)" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-kaspa text-black rounded-2xl shadow-2xl shadow-kaspa/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
        whileHover={{ rotate: [0, -5, 5, 0] }}
      >
        <Sparkles size={24} className="group-hover:animate-pulse" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full border-2 border-kaspa flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-kaspa rounded-full animate-ping" />
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-[400px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-120px)] bg-slate-950 border border-white/10 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,00,0,0.8)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 bg-slate-900/50 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-kaspa/10 rounded-xl flex items-center justify-center border border-kaspa/30">
                  <Bot size={20} className="text-kaspa" />
                </div>
                <div>
                  <h4 className="text-white font-black text-xs uppercase tracking-widest">K-Assistant</h4>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-kaspa rounded-full animate-pulse" />
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Kaspstore Ecosystem</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Chat Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar"
            >
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex gap-3 max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      m.role === "user" ? "bg-slate-800 border-white/5" : "bg-kaspa/10 border-kaspa/20"
                    }`}>
                      {m.role === "user" ? <User size={14} className="text-slate-400" /> : <Bot size={14} className="text-kaspa" />}
                    </div>
                    <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                      m.role === "user" 
                        ? "bg-kaspa text-black font-bold" 
                        : "bg-white/5 text-slate-300 border border-white/5"
                    }`}>
                      {m.content}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-kaspa/10 border border-kaspa/20">
                      <Loader2 size={14} className="text-kaspa animate-spin" />
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 text-slate-500 text-xs font-medium italic">
                      Querying DAG knowledge...
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              {messages.length === 1 && (
                <div className="grid grid-cols-1 gap-2 p-2">
                   <button 
                    onClick={() => { setInput("How do I register a .ks identity?"); }}
                    className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 hover:border-kaspa/30 transition-all group text-left"
                   >
                     <div className="flex items-center gap-3">
                        <ShieldCheck size={14} className="text-kaspa" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Identity Setup</span>
                     </div>
                     <ChevronRight size={12} className="text-slate-600 group-hover:text-kaspa" />
                   </button>
                   <button 
                    onClick={() => { setInput("How can I launch a new app?"); }}
                    className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 hover:border-kaspa/30 transition-all group text-left"
                   >
                     <div className="flex items-center gap-3">
                        <Zap size={14} className="text-kaspa" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Launch Guide</span>
                     </div>
                     <ChevronRight size={12} className="text-slate-600 group-hover:text-kaspa" />
                   </button>
                   <button 
                    onClick={() => { setInput("What is the Trust Center?"); }}
                    className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 hover:border-kaspa/30 transition-all group text-left"
                   >
                     <div className="flex items-center gap-3">
                        <BookOpen size={14} className="text-kaspa" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase">System Docs</span>
                     </div>
                     <ChevronRight size={12} className="text-slate-600 group-hover:text-kaspa" />
                   </button>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-6 bg-slate-900/50 border-t border-white/5">
              <div className="relative flex items-center">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask K-Assistant..."
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-kaspa/50 transition-all"
                />
                <MessageSquare size={16} className="absolute left-4 text-slate-600" />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-3 p-2 bg-kaspa text-black rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Send size={16} />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Powered by Groq DAG Engine</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
