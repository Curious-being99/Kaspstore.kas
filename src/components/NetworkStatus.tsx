import React, { useState, useEffect } from 'react';
import { Activity, Database, Cpu, Hash, ArrowUpRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface NetworkStats {
  blockCount: string;
  headerCount: string;
  blueScore: string;
  difficulty: number;
  mempoolSize: number;
  bps: number;
  lastUpdated: Date;
}

export const NetworkStatus = () => {
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      // Fetch from local proxy to avoid CORS and handle endpoints correctly
      const res = await fetch('/api/network-info');
      
      if (!res.ok) {
         throw new Error(`Proxy returned ${res.status}`);
      }

      const data = await res.json();

      setStats({
        blockCount: data.blockCount || '0',
        headerCount: data.headerCount || '0',
        blueScore: data.virtualDaaScore || data.blueScore || '0',
        difficulty: data.difficulty || 0,
        mempoolSize: Number(data.mempoolSize) || 0,
        bps: 10.0, // Default for currently active Kaspa network
        lastUpdated: new Date()
      });
      setError(null);
    } catch (err: any) {
      console.error('NetworkStatus fetch error:', {
        message: err.message,
        name: err.name
      });
      setError(err.message.includes('status: 500') ? 'Network API Busy' : 'Link Unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Poll every 5s for real-time feel
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="bg-bg-surface border border-kaspa/20 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[200px]">
        <Loader2 className="text-kaspa animate-spin mb-4" size={32} />
        <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">Syncing with BlockDAG...</p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="bg-bg-surface border border-red-500/20 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[200px]">
        <Activity className="text-red-500 mb-4" size={32} />
        <p className="text-xs text-red-500 font-mono uppercase tracking-widest">{error}</p>
        <button onClick={fetchStats} className="mt-4 text-[10px] text-slate-400 hover:text-white uppercase font-bold tracking-widest">Retry Connection</button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard 
        label="Blue Score" 
        value={Number(stats?.blueScore).toLocaleString()} 
        icon={<Hash size={18} className="text-kaspa" />}
        desc="Network Weight"
      />
      <StatCard 
        label="Block Count" 
        value={Number(stats?.blockCount).toLocaleString()} 
        icon={<Database size={18} className="text-kaspa" />}
        desc="Total DAG Entities"
      />
      <StatCard 
        label="Mempool Size" 
        value={stats?.mempoolSize.toLocaleString() || '0'} 
        icon={<Activity size={18} className="text-kaspa" />}
        desc="Pending Transactions"
        highlight={stats?.mempoolSize && stats.mempoolSize > 100 ? 'text-yellow-500' : ''}
      />
      <StatCard 
        label="Network BPS" 
        value={stats?.bps.toFixed(2) || '0.00'} 
        icon={<Cpu size={18} className="text-kaspa" />}
        desc="Blocks Per Second"
      />
    </div>
  );
};

const StatCard = ({ label, value, icon, desc, highlight = '' }: { label: string, value: string, icon: React.ReactNode, desc: string, highlight?: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-bg-surface border border-white/5 rounded-2xl p-5 hover:border-kaspa/30 transition-all group relative overflow-hidden"
  >
    <div className="flex items-center justify-between mb-4">
      <div className="p-2.5 bg-kaspa/10 rounded-xl">
        {icon}
      </div>
      <ArrowUpRight size={14} className="text-slate-700 group-hover:text-kaspa transition-colors" />
    </div>
    <div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <h4 className={`text-2xl font-mono font-black tracking-tighter ${highlight || 'text-white'}`}>
        {value}
      </h4>
      <p className="text-[10px] text-slate-600 font-mono mt-1">{desc}</p>
    </div>
    <div className="absolute -right-2 -bottom-2 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
       {icon}
    </div>
  </motion.div>
);
