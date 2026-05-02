import React, { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

interface Review {
  comment: string;
  rating: number;
  userName: string;
}

export const ReviewSummary = ({ reviews }: { reviews: Review[] }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSummary = async () => {
    if (reviews.length === 0) return;
    setIsLoading(true);
    
    try {
      const prompt = `Summarize these app reviews, identifying recurring themes, common praises, and frequent criticisms. Keep it concise (max 3 sentences):
      ${reviews.map(r => `[Rating: ${r.rating}] ${r.comment}`).join("\n")}`;

      const response = await fetch("/api/ai-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      });

      if (!response.ok) throw new Error("API error");
      const data = await response.json();
      setSummary(data.text);
    } catch (error) {
      console.error("Summary error:", error);
      setSummary("Could not generate summary.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-6">
      {!summary && !isLoading && (
        <button 
          onClick={fetchSummary}
          className="flex items-center gap-2 text-kaspa text-xs font-black uppercase tracking-widest hover:text-kaspa-light transition-colors"
        >
          <Sparkles size={14} />
          AI Review Summary
        </button>
      )}
      {isLoading && (
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <Loader2 size={14} className="animate-spin" />
          Analyzing reviews...
        </div>
      )}
      {summary && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-kaspa text-[10px] font-black uppercase tracking-widest">
            <Sparkles size={12} />
            AI Summary
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">{summary}</p>
        </div>
      )}
    </div>
  );
};
