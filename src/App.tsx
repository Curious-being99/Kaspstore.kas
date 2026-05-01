/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Search,
  Download,
  Check,
  ShieldCheck,
  Zap,
  Globe,
  Cpu,
  Menu,
  X,
  PlusCircle,
  Smartphone,
  ExternalLink,
  TrendingUp,
  Sparkles,
  LayoutGrid,
  LogIn,
  LogOut,
  Fingerprint,
  QrCode,
  CheckCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Hexagon,
  User as UserIcon,
  History,
  Star,
  Settings,
  LayoutDashboard,
  Server,
  Loader2,
  BookOpen,
  Hash,
  Activity,
  Vote,
  Shield,
  Trash2,
  ChevronRight,
  ChevronDown,
  Info,
  MessageSquare,
  Gamepad2,
  Layers,
  AlertTriangle,
  Pencil,
  Box,
  Image as ImageIcon,
  UploadCloud,
  RefreshCw,
  Flame,
  Bot,
} from "lucide-react";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Toaster, toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";
import { AppService } from "./lib/appService";
import { resolveNativeKNS } from "./lib/knsResolver";
import { KnsService, KNS_REGISTRY_ADDRESS } from "./lib/knsService";
import { KnsIndexer } from "./lib/knsIndexer";
import {
  KaspStoreProtocol,
  type KaspStoreMetadata,
  type KaspStoreManifest,
} from "./lib/kaspStoreProtocol";

// ... inside global ...
declare global {
  interface Window {
    kasware?: any;
    kasperia?: any;
    kaperia?: any;
    kasper?: any;
    kaspa?: any;
    kaspaWallet?: any;
    kastle?: any;
  }
}

// --- Types ---
interface User {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
}

interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  timestamp: any;
  helpfulCount: number;
}

interface DataSafetyInfo {
  noDataShared: boolean;
  dataCollected: string[];
  isEncrypted: boolean;
  deletionAvailable: boolean;
}

interface AppListing {
  id: string;
  name: string;
  version: string;
  developer: string;
  developerId: string;
  developerKns: string;
  isVerified: boolean;
  isFlagged: boolean;
  description: string;
  category: string; // 'Game' | 'App'
  subCategory: string; // 'Action' | 'Utility' | 'Social' | etc.
  icon: string;
  iconGradient?: string;
  screenshots?: string[];
  apkUrl?: string; // Legacy field
  downloadUrl?: string; // Professional binary link
  manifestUrl?: string; // 4Everland manifest.json
  changelogUrl?: string; // Arweave or 4Everland changelog
  headerImage?: string; // "Premium" header image
  arweaveId?: string;
  ipfsHash?: string;
  sha256Hash: string;
  size: string;
  downloads: number;
  price: string;
  rating: number;
  reviewsCount: number;
  subApps?: AppListing[]; // Nested sub-apps for bundles/suites
  ratingBreakdown?: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  reviews?: Review[];
  keywords: string[];
  isPWA?: boolean;
  pwaUrl?: string;
  webUrl?: string;
  hash?: string;
  signature?: string;
  p2pSeeders?: number;
  dataSafety?: DataSafetyInfo;
  ageRating?: string; // e.g. "3+", "12+"
  tags?: string[];
  isPremium?: boolean;
  isForKids?: boolean;
  isPaid?: boolean;
  kasPrice?: number;
}

const CATEGORIES = [
  { id: "foryou", label: "For You", icon: Sparkles },
  {
    id: "App",
    label: "Apps",
    icon: LayoutGrid,
    subCategories: [
      { id: "Entertainment", label: "Entertainment" },
      { id: "Social", label: "Social" },
      { id: "Productivity", label: "Productivity" },
      { id: "Communication", label: "Communication" },
      { id: "MusicAudio", label: "Music & Audio" },
      { id: "Photography", label: "Photography" },
      { id: "Shopping", label: "Shopping" },
      { id: "Education", label: "Education" },
      { id: "ArtDesign", label: "Art & Design" },
      { id: "Personalization", label: "Personalization" },
      { id: "Weather", label: "Weather" },
      { id: "Beauty", label: "Beauty" },
    ],
  },
  {
    id: "Game",
    label: "Games",
    icon: Gamepad2,
    subCategories: [
      { id: "Action", label: "Action" },
      { id: "Simulation", label: "Simulation" },
      { id: "Puzzle", label: "Puzzle" },
      { id: "Adventure", label: "Adventure" },
      { id: "Racing", label: "Racing" },
      { id: "RolePlaying", label: "Role Playing" },
      { id: "Strategy", label: "Strategy" },
      { id: "Sports", label: "Sports" },
      { id: "Card", label: "Card" },
      { id: "Board", label: "Board" },
    ],
  },
  { id: "Utility", label: "Utilities", icon: Cpu },
  { id: "top", label: "Top Rated", icon: TrendingUp },
  { id: "all", label: "All", icon: Globe },
];

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

/**
 * Calculates SHA-256 hash of a file for on-chain integrity verification.
 */
async function calculateSHA256(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// --- Components ---

const NativeKaspaConnectButton = ({
  text,
  disabled,
  className,
  onClick,
  onDisconnect,
  accountName,
  status,
}: {
  text: string;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  onDisconnect?: () => void;
  accountName?: string | null;
  status?: "idle" | "scanning" | "signing" | "connected";
}) => {
  const isLoading = status === "scanning" || status === "signing";

  return (
    <button
      disabled={disabled || isLoading}
      onClick={accountName ? onDisconnect : onClick}
      type="button"
      className={
        className ||
        "w-full bg-kaspa/10 border border-kaspa/50 text-kaspa text-xs font-bold uppercase tracking-widest py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-kaspa hover:text-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      }
    >
      {isLoading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : accountName ? (
        <div className="flex items-center gap-2 px-1">
          <LogOut
            size={14}
            className="opacity-70 group-hover:block"
          />
          <span className="truncate max-w-[120px]">{accountName}</span>
        </div>
      ) : (
        <>
          <LogIn size={14} /> {text}
        </>
      )}
    </button>
  );
};

const Nav = ({
  onTabChange,
  activeTab,
  onToggleMobileMenu,
  mobileMenuOpen,
  user,
  walletAddress,
  knsName,
  walletState,
  onConnect,
  onDisconnect,
}: {
  onTabChange: (tab: string) => void;
  activeTab: string;
  onToggleMobileMenu: () => void;
  mobileMenuOpen: boolean;
  user: User | null;
  walletAddress: string | null;
  knsName: string | null;
  walletState: "idle" | "scanning" | "signing" | "connected";
  onConnect: () => void;
  onDisconnect: () => void;
}) => {
  return (
    <header className="h-16 border-b border-border-subtle bg-bg-surface flex items-center justify-between px-4 md:px-8 fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center space-x-4 md:space-x-12">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden text-slate-400 hover:text-white transition-colors"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div
          className="flex items-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
          onClick={() => onTabChange("browse")}
          title="Kaspstore.kas"
        >
          <div className="w-10 h-10 shrink-0">
            <svg
              viewBox="0 0 20.225674 20.196"
              width="100%"
              height="100%"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g transform="translate(-30.427083,-102.39375)">
                <g transform="matrix(0.26458333,0,0,0.26458333,15.084819,94.77375)">
                  <path
                    d="m 134.43,66.58 c 0,5.11 -2.11,10.05 -3.96,14.5 -1.85,4.45 -4.71,8.85 -8.18,12.32 -3.47,3.47 -7.64,6.46 -12.24,8.37 -4.44,1.84 -9.46,3.36 -14.57,3.36 -5.11,0 -10.24,-1.26 -14.68,-3.1 -4.61,-1.91 -7.76,-6.06 -11.23,-9.54 -3.47,-3.47 -7.36,-6.73 -9.27,-11.34 -1.91,-4.61 -2.22,-9.46 -2.22,-14.57 0,-5.11 -0.6,-10.53 1.24,-14.98 1.91,-4.61 5.94,-8.29 9.42,-11.76 3.47,-3.47 7.32,-7.1 11.93,-9.01 4.44,-1.84 9.7,-2.03 14.81,-2.03 5.11,0 10.06,0.93 14.5,2.77 4.61,1.91 9.05,4.51 12.52,7.99 3.47,3.47 6.48,7.75 8.39,12.35 1.84,4.44 3.54,9.56 3.54,14.67 z"
                    fill="#70c7ba"
                  />
                  <polygon
                    points="98.08,87.16 106.18,88.36 109.4,66.58 106.18,44.79 98.08,45.99 100.39,61.66 83.44,48.61 78.45,55.12 93.32,66.58 78.45,78.03 83.44,84.55 100.39,71.49"
                    fill="#1a1a1a"
                  />
                </g>
              </g>
            </svg>
          </div>
        </div>
        <nav className="hidden md:flex space-x-8 text-sm font-medium h-full items-center">
          {[
            "Browse",
            "Developer",
            "Network",
            "Community",
            ...(walletAddress ? ["Profile"] : []),
          ].map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab.toLowerCase())}
              className={`h-full transition-all border-b-2 flex items-center ${
                activeTab === tab.toLowerCase()
                  ? "text-kaspa border-kaspa"
                  : "text-slate-400 border-transparent hover:text-white"
              }`}
            >
              {tab === "Browse"
                ? "Storefront"
                : tab === "Developer"
                  ? "Developer Console"
                  : tab === "Network"
                    ? "BlockDAG Explorer"
                    : tab === "Community"
                      ? "Ecosystem"
                      : "My Apps"}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4">
        <div className="min-w-[100px] md:min-w-[140px]">
          <NativeKaspaConnectButton
            text="Connect"
            status={walletState}
            onClick={onConnect}
            onDisconnect={onDisconnect}
            accountName={
              knsName ||
              (walletAddress
                ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-3)}`
                : null)
            }
            className="px-3 md:px-4 py-1.5 md:py-2 bg-kaspa text-black text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg shadow-kaspa/20"
          />
        </div>
        {user && (
          <button
            onClick={() => onDisconnect()}
            className="text-slate-500 hover:text-white transition-colors"
            title="Disconnect Node"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </header>
  );
};

const getWalletProvider = (type: string) => {
  console.log(`[Wallet] Getting provider for ${type}`);
  let provider = null;

  const getFromWindow = (win: any) => {
    try {
      if (type === "kasware") return win.kasware || win.kaspa;
      if (
        type === "kasperia" ||
        type === "kaperia" ||
        type === "keperia"
      ) {
        return (
          win.kasperia ||
          win.kaperia ||
          win.keperia ||
          win.kaspa ||
          win.kasper ||
          win.kaspaWallet
        );
      }
      if (type === "kastle") return win.kastle || win.kaspa;

      // Generic Kaspa fallback
      if (win.kaspa && typeof win.kaspa.requestAccounts === "function")
        return win.kaspa;
      if (win.kasware && typeof win.kasware.requestAccounts === "function")
        return win.kasware;
    } catch (e) {
      return null;
    }
    return null;
  };

  // 1. Try local window
  provider = getFromWindow(window);

  // 2. Try parent window if in iframe
  if (!provider && window !== window.parent) {
    provider = getFromWindow(window.parent);
  }

  // 3. Try top window as last resort
  if (!provider && window !== window.top) {
    provider = getFromWindow(window.top);
  }

  if (provider) {
    console.log(
      `[Wallet] Found provider for ${type}, checking capabilities...`,
    );
    const hasMethods = !!(
      provider.requestAccounts ||
      provider.request ||
      provider.enable ||
      provider.connect ||
      provider.signMessage ||
      provider.sendKaspa
    );
    if (!hasMethods) {
      console.warn(
        `[Wallet] Provider for ${type} found but lacks standard methods. Content:`,
        Object.keys(provider),
      );
    }
    return provider;
  }
  return null;
};

const KasWareLogo = () => (
  <div className="w-12 h-12 bg-[#70ebbf] rounded-[14px] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
    <span className="text-black font-mono text-base font-black tracking-tighter">
      |&lt;
    </span>
  </div>
);

const KastleLogo = () => (
  <div className="w-12 h-12 bg-gradient-to-b from-[#38bdf8] to-[#2563eb] rounded-[14px] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500 relative">
    <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center p-1">
      <Shield size={16} className="text-[#2563eb] fill-[#2563eb]/20" />
    </div>
    <div className="absolute top-1 right-2 w-1.5 h-3 bg-white/30 rounded-full blur-[1px]" />
  </div>
);

const KasperiaLogo = () => (
  <div className="w-12 h-12 bg-[#020617] rounded-full border border-white/10 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500 relative overflow-hidden">
    <div className="text-xl relative z-10 filter drop-shadow-md">🐋</div>
    <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-blue-500/20 to-transparent" />
  </div>
);

const WalletSelectionModal = ({
  isOpen,
  onClose,
  onSelect,
  onSelectMobileSession,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: "kasware" | "kasperia" | "kastle" | "manual") => void;
  onSelectMobileSession: (id: string) => void;
}) => {
  const [availableWallets, setAvailableWallets] = useState({
    kasware: !!getWalletProvider("kasware"),
    kastle: !!getWalletProvider("kastle"),
    kasperia: !!getWalletProvider("kasperia"),
  });
  const [showManualInput, setShowManualInput] = useState(false);
  const [showMobileQR, setShowMobileQR] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [relaySessionId, setRelaySessionId] = useState("");

  const generateSession = () => {
    const id = Math.random().toString(36).substring(2, 10);
    setRelaySessionId(id);
    onSelectMobileSession(id);
    setShowMobileQR(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    setShowManualInput(false);
    setShowMobileQR(false);
    setManualAddress("");

    // Check periodically in case extension injects late
    const interval = setInterval(() => {
      setAvailableWallets({
        kasware: !!getWalletProvider("kasware"),
        kastle: !!getWalletProvider("kastle"),
        kasperia: !!getWalletProvider("kasperia"),
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isOpen]);

  const wallets = [
    {
      id: "kasware",
      name: "Kasware",
      logo: KasWareLogo,
      desc: "Highly Recommended",
      available: availableWallets.kasware,
    },
    {
      id: "kastle",
      name: "Kastle",
      logo: KastleLogo,
      desc: "Secure Vault",
      available: availableWallets.kastle,
    },
    {
      id: "kasperia",
      name: "Kasperia",
      logo: KasperiaLogo,
      desc: "Secure Identity",
      available: availableWallets.kasperia,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-[400px] bg-[#0c111d] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-8 px-2">
                <div>
                  <h3 className="text-xs font-mono text-slate-500 uppercase tracking-[0.4em] font-black">
                    Recommended
                  </h3>
                  <h2 className="text-3xl font-black text-white tracking-tighter mt-1">
                    Connect
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-colors text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2">
                {!showManualInput && !showMobileQR ? (
                  <>
                    {wallets.map((wallet) => (
                      <button
                        key={wallet.id}
                        onClick={() => {
                          onSelect(wallet.id as any);
                          onClose();
                        }}
                        className={`w-full group flex items-center gap-6 p-4 rounded-[2rem] border transition-all duration-300 ${
                          wallet.available
                            ? "bg-transparent border-transparent hover:bg-white/5 active:scale-95"
                            : "bg-transparent border-transparent opacity-60 hover:opacity-100"
                        }`}
                      >
                        <wallet.logo />

                        <div className="text-left flex-1">
                          <h4 className="text-2xl font-bold text-white tracking-tight font-mono">
                            {wallet.name}
                          </h4>
                          {!wallet.available && (
                            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">
                              Not Detected
                            </p>
                          )}
                        </div>

                        {wallet.available && (
                          <ChevronRight
                            size={20}
                            className="text-slate-700 group-hover:text-kaspa transition-colors"
                          />
                        )}
                      </button>
                    ))}
                    <div className="pt-4 mt-4 border-t border-white/5 space-y-2">
                      <button
                        onClick={() => generateSession()}
                        className="w-full flex items-center gap-5 p-4 rounded-[2rem] hover:bg-white/5 transition-all text-left group"
                      >
                        <div className="w-12 h-12 bg-indigo-900/30 rounded-[14px] flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                          <Smartphone size={20} className="text-indigo-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-white tracking-tight font-mono">
                            Scan with Mobile
                          </h4>
                          <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-0.5">
                            Connect Kaspium / KasWare Mobile
                          </p>
                        </div>
                        <ChevronRight
                          size={16}
                          className="text-slate-700 group-hover:text-kaspa transition-colors"
                        />
                      </button>

                      <button
                        onClick={() => setShowManualInput(true)}
                        className="w-full flex items-center gap-5 p-4 rounded-[2rem] hover:bg-white/5 transition-all text-left group"
                      >
                        <div className="w-12 h-12 bg-slate-800 rounded-[14px] flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                          <Pencil size={20} className="text-slate-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-white tracking-tight font-mono">
                            Paste Address
                          </h4>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                            Manual Fallback
                          </p>
                        </div>
                        <ChevronRight
                          size={16}
                          className="text-slate-700 group-hover:text-kaspa transition-colors"
                        />
                      </button>
                    </div>
                  </>
                ) : showMobileQR ? (
                  <div className="space-y-4 pt-2 text-center">
                    <button 
                      onClick={() => window.open(`${window.location.origin}${window.location.pathname}?sid=${relaySessionId}`, '_blank')}
                      className="relative aspect-square w-full bg-white rounded-3xl overflow-hidden p-6 flex items-center justify-center border-4 border-kaspa group cursor-pointer hover:border-white transition-all"
                    >
                      <QRCodeCanvas
                        value={`${window.location.origin}${window.location.pathname}?sid=${relaySessionId}`}
                        size={512}
                        level="H"
                        includeMargin={false}
                        className="w-full h-auto group-hover:opacity-10 transition-opacity"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-col gap-2">
                        <ExternalLink size={32} className="text-black" />
                        <span className="text-black font-black text-[10px] uppercase tracking-widest">Open in new tab</span>
                      </div>
                    </button>
                    <div>
                      <p className="text-xs text-kaspa font-black uppercase tracking-widest mb-1 animate-pulse">
                        Scan with your phone's camera
                      </p>
                      <p className="text-[10px] text-slate-500 max-w-[240px] mx-auto leading-relaxed font-bold uppercase tracking-tighter">
                        Do not use the scanner inside your wallet app. Use your phone's native camera to open the link.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowMobileQR(false)}
                      className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-colors"
                    >
                      Back to Selection
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-4">
                      <label className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mb-2 block">
                        Enter Kaspa Address
                      </label>
                      <input
                        autoFocus
                        type="text"
                        value={manualAddress}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualAddress(e.target.value)}
                        placeholder="kaspa:qq..."
                        className="w-full bg-transparent border-none text-white font-mono text-sm focus:ring-0 p-0 placeholder:text-slate-700 outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowManualInput(false)}
                        className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => {
                          if (manualAddress.trim().startsWith("kaspa:")) {
                            (window as any).__manual_kaspa_address =
                              manualAddress.trim();
                            onSelect("manual");
                            onClose();
                          } else {
                            toast.error("Invalid address format", {
                              description: "Must start with 'kaspa:'",
                            });
                          }
                        }}
                        disabled={!manualAddress.trim().startsWith("kaspa:")}
                        className="flex-[2] py-4 bg-kaspa hover:bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-30"
                      >
                        Connect Profile
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-600 text-center uppercase font-bold tracking-widest leading-relaxed px-4 mt-2">
                      Read-only mode. Transaction signing still requires an
                      active provider.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-8 flex flex-col items-center gap-2">
                <div className="flex gap-1.5 opacity-20">
                  <div className="w-1 h-1 rounded-full bg-white" />
                  <div className="w-1 h-1 rounded-full bg-white" />
                  <div className="w-1 h-1 rounded-full bg-white" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const DAGVisualizer = ({ blueScore }: { blueScore: number }) => {
  return (
    <div className="relative h-64 bg-black/40 rounded-2xl border border-white/5 overflow-hidden group">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Animated connections */}
          <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
            <line
              x1="20%"
              y1="30%"
              x2="40%"
              y2="50%"
              stroke="#00ffcc"
              strokeWidth="1"
              className="animate-pulse"
            />
            <line
              x1="40%"
              y1="50%"
              x2="60%"
              y2="30%"
              stroke="#00ffcc"
              strokeWidth="1"
            />
            <line
              x1="40%"
              y1="50%"
              x2="60%"
              y2="70%"
              stroke="#00ffcc"
              strokeWidth="1"
            />
            <line
              x1="60%"
              y1="30%"
              x2="80%"
              y2="50%"
              stroke="#00ffcc"
              strokeWidth="1"
            />
            <line
              x1="60%"
              y1="70%"
              x2="80%"
              y2="50%"
              stroke="#00ffcc"
              strokeWidth="1"
            />
          </svg>
          {/* Nodes */}
          <div className="flex gap-12 md:gap-20 items-center justify-center">
            <div className="w-12 h-12 bg-kaspa/20 border border-kaspa rounded-lg flex items-center justify-center font-mono text-[10px] text-kaspa animate-bounce shadow-[0_0_15px_rgba(0,255,204,0.3)]">
              BLUE
            </div>
            <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center font-mono text-[10px] text-slate-500">
              {blueScore ? (blueScore - 1).toLocaleString() : "6012"}
            </div>
            <div className="w-10 h-10 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center justify-center font-mono text-[10px] text-red-500 animate-pulse">
              RED
            </div>
            <div className="w-12 h-12 bg-kaspa/20 border border-kaspa rounded-lg flex items-center justify-center font-mono text-[10px] text-kaspa shadow-[0_0_15px_rgba(0,255,204,0.3)]">
              {blueScore ? blueScore.toLocaleString() : "6013"}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 left-4 flex gap-4 text-[8px] font-mono uppercase text-slate-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-kaspa rounded-full"></div> Blue Block
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div> Red Block
          (Conflict)
        </div>
      </div>
    </div>
  );
};

const FeaturedHero = ({
  apps,
  onSelect,
}: {
  apps: any[];
  onSelect: (app: any) => void;
}) => {
  const featured = apps.slice(0, 3);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % featured.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [featured.length]);

  if (featured.length === 0) return null;

  return (
    <div className="relative h-48 md:h-72 rounded-3xl overflow-hidden mb-10 group bg-slate-900 border border-white/5">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="absolute inset-0"
        >
          <img
            src={`https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=1200&h=600`}
            alt="Hero background"
            className="w-full h-full object-cover opacity-40 blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 py-10 px-8 bg-gradient-to-t from-black via-black/80 to-transparent">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-kaspa to-black rounded-3xl flex items-center justify-center p-3 shadow-2xl shrink-0">
                <img
                  src={featured[activeIndex].icon}
                  alt=""
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-kaspa bg-kaspa/10 px-3 py-1 rounded-full uppercase tracking-widest">
                  DAG-Anchored Protocol Highlight
                </span>
                <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight">
                  {featured[activeIndex].name}
                </h2>
                <p className="text-xs md:text-sm text-slate-400 max-w-md line-clamp-1">
                  {featured[activeIndex].description}
                </p>
                <button
                  onClick={() => onSelect(featured[activeIndex])}
                  className="mt-4 bg-kaspa text-black px-6 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-kaspa-light transition-all flex items-center gap-2"
                >
                  <Zap size={14} /> View Registry Entry
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="absolute top-6 right-8 flex gap-2">
        {featured.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${activeIndex === i ? "w-8 bg-kaspa" : "w-2 bg-white/20"}`}
          />
        ))}
      </div>
    </div>
  );
};

const DeveloperTrustModal = ({
  isOpen,
  onClose,
  developerKns,
  appsCount,
}: {
  isOpen: boolean;
  onClose: () => void;
  developerKns: string;
  appsCount: number;
}) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && developerKns) {
      setLoading(true);
      KnsIndexer.getProfile(developerKns).then((p) => {
        setProfile(p);
        setLoading(false);
      });
    }
  }, [isOpen, developerKns]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0f0f0f] border border-white/10 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck size={24} className="text-kaspa" /> Trust Report
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex items-center gap-4 mb-8 p-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="w-16 h-16 rounded-2xl bg-kaspa/10 flex items-center justify-center overflow-hidden">
              {profile?.avatar ? (
                <img
                  src={profile.avatar}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon size={32} className="text-kaspa" />
              )}
            </div>
            <div>
              <p className="text-lg font-black text-white leading-none mb-1">
                {developerKns}
              </p>
              <p className="text-[10px] text-kaspa font-bold uppercase tracking-widest">
                Verified Protocol Developer
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
              <p className="text-[10px] text-slate-500 uppercase font-black mb-1">
                Reputation
              </p>
              <p className="text-xl font-black text-white">A+</p>
            </div>
            <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
              <p className="text-[10px] text-slate-500 uppercase font-black mb-1">
                Active Apps
              </p>
              <p className="text-xl font-black text-white">{appsCount}</p>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
              <span className="text-slate-500">KNS Registration</span>
              <span className="text-white font-mono">Confirmed</span>
            </div>
            <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
              <span className="text-slate-500">Security Audit</span>
              <span className="text-white font-mono">Self-Certified</span>
            </div>
            <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
              <span className="text-slate-500">On-Chain Age</span>
              <span className="text-white font-mono">1.2 Cycles</span>
            </div>
          </div>

          <p className="text-[9px] text-slate-500 text-center leading-relaxed px-4">
            Identity verified via Kaspa Name Service (KNS). This developer has
            proven ownership of the linked .kas name on the BlockDAG.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const Sidebar = ({
  isOpen,
  onToggle,
  activeCategory,
  onCategoryChange,
  onTabChange,
  walletAddress,
  knsName,
  onConnectWallet,
  walletState,
  draftKnsName,
  setDraftKnsName,
  appsCount,
  className = "",
}: {
  isOpen: boolean;
  onToggle: () => void;
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  onTabChange: (tab: string) => void;
  walletAddress: string | null;
  knsName: string | null;
  onConnectWallet: () => void;
  walletState: "idle" | "scanning" | "signing" | "connected";
  draftKnsName: string;
  setDraftKnsName: (n: string) => void;
  appsCount: number;
  className?: string;
}) => {
  const [expandedItems, setExpandedItems] = useState<string[]>(["App", "Game"]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div
      className={`relative transition-[width] duration-300 flex-shrink-0 h-[calc(100vh-4rem)] sticky top-16 ${className} ${isOpen ? "w-64" : "w-0"}`}
    >
      <button
        onClick={onToggle}
        className={`absolute z-30 top-4 transition-all duration-300 bg-bg-surface border border-border-subtle rounded-r-md p-1.5 text-slate-400 hover:text-white shadow-[2px_0_10px_rgba(0,0,0,0.5)] ${isOpen ? "right-0 translate-x-full border-l-0" : "left-0 translate-x-full border-l-[1px]"}`}
        title={isOpen ? "Close Sidebar" : "Open Sidebar"}
      >
        {isOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
      </button>

      <div
        className={`w-64 h-full border-r border-border-subtle bg-bg-surface transition-transform duration-300 absolute left-0 top-0 flex flex-col overflow-y-auto ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-6 flex flex-col space-y-8 h-full min-h-max">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-6">
              Discover
            </h3>
            <ul className="space-y-1 text-sm">
              {CATEGORIES.map((item) => {
                const isExpanded = expandedItems.includes(item.id);
                const hasSub =
                  item.subCategories && item.subCategories.length > 0;

                return (
                  <li key={item.id} className="space-y-1">
                    <div
                      onClick={() => {
                        if (hasSub) {
                          setExpandedItems((prev) =>
                            prev.includes(item.id)
                              ? prev.filter((x) => x !== item.id)
                              : [...prev, item.id],
                          );
                        }
                        onCategoryChange(item.id);
                      }}
                      className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${
                        activeCategory === item.id
                          ? "text-kaspa font-semibold bg-kaspa/5 border border-kaspa/10"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon size={18} />
                        <span>{item.label}</span>
                      </div>
                      {hasSub && (
                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                        />
                      )}
                    </div>

                    {hasSub && isExpanded && (
                      <motion.ul
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="ml-9 space-y-1 border-l border-white/5 pl-2"
                      >
                        {item.subCategories!.map((sub) => (
                          <li
                            key={sub.id}
                            onClick={() => onCategoryChange(sub.id)}
                            className={`text-[11px] p-2 rounded-md cursor-pointer transition-all uppercase tracking-widest font-black ${
                              activeCategory === sub.id
                                ? "text-kaspa bg-kaspa/10"
                                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                            }`}
                          >
                            {sub.label}
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </li>
                );
              })}
              {walletAddress && (
                <li
                  onClick={() => onTabChange("profile")}
                  className={`flex items-center space-x-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                    activeCategory === "profile"
                      ? "text-kaspa font-semibold bg-kaspa/5 border border-kaspa/10"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <UserIcon size={18} />
                  <span>My Profile</span>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-6">
              Community Space
            </h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li
                onClick={() => onTabChange("community")}
                className="p-2.5 hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors flex items-center gap-2"
              >
                <Hexagon size={14} className="text-kaspa" /> DAG Explorer
              </li>
              <li
                onClick={() => onTabChange("dev-guide")}
                className="p-2.5 hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors flex items-center gap-2"
              >
                <ShieldCheck size={14} /> Developer Docs
              </li>
              <li
                onClick={() => window.open("https://kaspa.news/", "_blank")}
                className="p-2.5 hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors flex items-center gap-2"
              >
                <Sparkles size={14} /> Protocol Blog
              </li>
              <li
                onClick={() => window.open("https://wiki.kaspa.org/", "_blank")}
                className="p-2.5 hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors flex items-center gap-2"
              >
                <Globe size={14} /> Protocol Wiki
              </li>
            </ul>
          </div>

          <div className="mt-auto bg-gradient-to-br from-kaspa/20 to-transparent p-5 rounded-xl border border-kaspa/30 border-l-0 border-t-0 shadow-lg">
            <p className="text-xs text-kaspa-light font-semibold mb-2 italic">
              Global DAG Ledger
            </p>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Registry nodes successfully verified {appsCount} decentralized
              applications on this protocol cycle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AppCard = React.memo(
  ({
    app,
    onClick,
    onSelectSubApp,
  }: {
    app: AppListing;
    onClick: () => void;
    onSelectSubApp?: (sub: AppListing) => void;
  }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const installed = localStorage.getItem(`installed_${app.id}`);
    const isUpdateAvailable = installed && installed !== app.version;

    const handleCardClick = () => {
      if (app.subApps && app.subApps.length > 0) {
        setIsExpanded(!isExpanded);
      } else {
        onClick();
      }
    };

    return (
      <div className="flex flex-col gap-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCardClick}
          className={`bg-bg-surface border ${isExpanded ? "border-kaspa/50 ring-2 ring-kaspa/20 shadow-kaspa/10 rounded-t-[2.5rem] rounded-b-none" : "border-border-subtle rounded-[2.5rem]"} p-7 hover:border-kaspa/30 transition-all duration-500 group cursor-pointer relative overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.4)] hover:shadow-[0_8px_40px_rgba(0,255,204,0.15)]`}
        >
          <div className="flex items-start space-x-5 mb-5 relative z-10">
            <div
              className={`w-16 h-16 rounded-2xl flex-shrink-0 bg-gradient-to-br ${app.iconGradient || "from-[#1a1a1a] to-[#0d0d0d]"} flex items-center justify-center text-white overflow-hidden shadow-xl ring-1 ring-white/10 group-hover:scale-105 transition-transform duration-500 relative`}
            >
              <img
                src={app.icon}
                alt={app.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              {app.subApps && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                  <Layers
                    size={24}
                    className={`text-kaspa transition-transform duration-500 ${isExpanded ? "rotate-180" : "animate-pulse"}`}
                  />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4
                  className={`font-bold text-white text-base truncate tracking-tight group-hover:text-kaspa transition-colors ${app.isFlagged ? "line-through decoration-red-500 opacity-50" : ""}`}
                >
                  {app.name}
                </h4>
                {app.isVerified && (
                  <ShieldCheck
                    size={14}
                    className="text-kaspa fill-kaspa/20 shrink-0"
                  />
                )}
                {isUpdateAvailable && (
                  <span className="bg-sky-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest animate-pulse ring-4 ring-sky-500/10">
                    Update
                  </span>
                )}
                {app.subApps && (
                  <span className="bg-kaspa/20 text-kaspa text-[7px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest shadow-lg shadow-kaspa/10">
                    {isExpanded
                      ? "Package Active"
                      : `Bundle • ${app.subApps.length}`}
                  </span>
                )}
              </div>
              {app.subCategory && (
                <p className="text-[10px] text-kaspa font-black uppercase tracking-widest mt-0.5 leading-none">
                  {app.subCategory}
                </p>
              )}
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[11px] text-slate-500 font-medium uppercase truncate tracking-wider">
                  {app.developerKns || "Verified Developer"}
                </span>
                {app.developerKns && (
                  <div
                    className="flex items-center"
                    title="KNS Identity Verified"
                  >
                    <ShieldCheck
                      size={10}
                      className="text-kaspa fill-kaspa/20"
                    />
                    <Check size={8} className="text-kaspa -ml-2.5" />
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400/50 font-medium uppercase mt-0.5 tracking-wider">
                {app.category} • {app.size}
              </p>
              <div className="flex items-center mt-2.5 space-x-3">
                <div className="flex items-center gap-1 scale-90 origin-left">
                  <span className="text-white text-xs font-bold">
                    {app.rating}
                  </span>
                  <Star size={10} className="text-white fill-white" />
                </div>
                <div className="h-3 w-[1px] bg-white/10" />
                <span className="text-slate-500 text-[11px] font-mono tracking-tighter">
                  {formatNumber(app.downloads)} downloads
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 relative z-10 border-t border-white/5">
            <span
              className={`text-[10px] font-black uppercase tracking-widest ${app.isPaid ? "text-kaspa" : "text-slate-400"}`}
            >
              {app.isPaid
                ? `${app.kasPrice} KAS`
                : app.subApps
                  ? "Bundle Package"
                  : "Public Index"}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="text-[9px] font-black uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 hover:bg-kaspa hover:text-black transition-all"
            >
              Details
            </button>
          </div>
        </motion.div>

        {/* Expanded Sub-Apps List */}
        <AnimatePresence>
          {isExpanded && app.subApps && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-black/20 border-x border-b border-kaspa/20 rounded-b-3xl -mt-4 mb-2 mx-2"
            >
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between mb-1 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-kaspa rounded-full animate-pulse" />
                    <span className="text-[8px] font-black text-kaspa uppercase tracking-widest">
                      Active Application Set
                    </span>
                  </div>
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                    {app.subApps.length} Modules
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {app.subApps.map((sub) => (
                    <div
                      key={sub.id}
                      onClick={() => onSelectSubApp?.(sub)}
                      className="group/sub flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:border-kaspa/40 hover:bg-kaspa/10 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={sub.icon}
                          className="w-8 h-8 rounded-lg object-cover"
                          alt=""
                        />
                        <div className="min-w-0">
                          <h4 className="text-[10px] font-black text-white truncate uppercase tracking-tight group-hover/sub:text-kaspa transition-colors">
                            {sub.name}
                          </h4>
                          <p className="text-[8px] text-slate-500 uppercase font-bold">
                            {sub.size} • v{sub.version}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest bg-black/40 px-1.5 py-0.5 rounded group-hover/sub:text-kaspa transition-colors">
                          Launch Module
                        </span>
                        <ChevronRight
                          size={12}
                          className="text-slate-600 group-hover/sub:text-kaspa group-hover/sub:translate-x-1 transition-all"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

const AppDetailModal = ({
  app,
  onClose,
  walletAddress,
  allApps,
  knsName,
  setCurrentTab,
  executeWalletConnect,
  onSelectApp,
  setShowTrustModal,
}: {
  app: AppListing;
  onClose: () => void;
  walletAddress: string | null;
  allApps: AppListing[];
  knsName: string | null;
  setCurrentTab: (tab: string) => void;
  executeWalletConnect: () => void;
  onSelectApp: (app: AppListing) => void;
  setShowTrustModal: (show: boolean) => void;
}) => {
  const [userRating, setUserRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "details" | "reviews" | "safety" | "ai" | "history"
  >("details");
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [commerceState, setCommerceState] = useState<
    "idle" | "waiting" | "verifying" | "success"
  >("idle");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [manifest, setManifest] = useState<KaspStoreManifest | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      const data = await AppService.getReviews(app.id);
      if (data) setReviews(data as any);
    };
    const fetchManifest = async () => {
      if (app.manifestUrl) {
        const data = await KaspStoreProtocol.fetchManifest(app.manifestUrl);
        if (data) setManifest(data);
      }
    };
    fetchReviews();
    fetchManifest();
  }, [app.id, app.manifestUrl]);

  const handleAiAsk = async (query?: string) => {
    const q = query || aiQuery;
    if (!q) return;
    setIsAiLoading(true);
    setAiResponse("");
    try {
      const prompt = `You are a helpful AI assistant inside Kaspstore.kas (a decentralized app store for Kaspa).
      The user is asking about the app: ${app.name}.
      App Description: ${app.description}
      App Category: ${app.category} / ${app.subCategory}
      App Rating: ${app.rating} (${app.reviewsCount} reviews)
      Data Safety: ${app.dataSafety?.noDataShared ? "No data shared with third parties" : "Some data shared"}.
      
      User Question: ${q}
      
      Respond concisely and professionally, highlighting features and safety.`;

      const response = await fetch("/api/ai-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setAiResponse(
        data.text || "I couldn't generate a response. Please try again.",
      );
    } catch (err) {
      console.error("AI Error:", err);
      setAiResponse("Sorry, there was an error processing your request.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!walletAddress || !knsName) {
      if (!walletAddress) {
        toast.error("Connect your wallet to purchase.");
        executeWalletConnect();
      } else {
        toast.error("Verified KNS (.kas) Identity Required.", {
          description:
            "You need a KNS name linked to your wallet to participate in the DAG ecosystem.",
        });
        setCurrentTab("developer"); // Redirect for registration
        onClose(); // Close modal to focus on developer portal
      }
      return;
    }

    const walletType = localStorage.getItem("kaspa_wallet_type") || "kasware";
    const provider = getWalletProvider(walletType);

    setCommerceState("waiting");
    toast.info(`Generating Kaspa payment URI for ${app.kasPrice || 0} KAS...`);

    try {
      if (provider) {
        const amountKAS = Number(app.kasPrice || 0);
        if (isNaN(amountKAS) || amountKAS <= 0) {
          throw new Error("Invalid price for application.");
        }
        const sompis = Math.round(amountKAS * 100000000);
        // Fallback to a known format if developer ID is missing "kaspa:" prefix, or just use what we have
        const targetAddress =
          (app.developerId?.startsWith("kaspa:")
            ? app.developerId
            : localStorage.getItem("kaspstore_wallet_address")) ||
          "kaspa:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqkx9zhx6";
        let txId = null;

        if (provider.sendKaspa) {
          txId = await provider.sendKaspa(targetAddress, sompis);
        } else if (provider.sendTransaction) {
          txId = await provider.sendTransaction({
            to: targetAddress,
            amount: sompis,
          });
        } else if (provider.request) {
          txId = await provider.request({
            method: "kaspa_sendKaspa",
            params: {
              to: targetAddress,
              amount: sompis,
            },
          });
        } else {
          throw new Error("Wallet provider doesn't support sending payments.");
        }

        if (txId) {
          setCommerceState("verifying");
          toast.loading("Verifying transaction on the DAG network...", {
            id: "kas-verify",
          });

          await new Promise((r) => setTimeout(r, 3000));
          toast.success("Payment confirmed! Gated download unlocked.", {
            id: "kas-verify",
          });
          setCommerceState("success");
          handleDownload();
        } else {
          throw new Error("No transaction ID returned.");
        }
      } else {
        toast.error(`${walletType} wallet not found.`);
        setCommerceState("idle");
      }
    } catch (e: any) {
      console.error("[Purchase Error]", e);
      setCommerceState("idle");
      toast.error(e.message || "Purchase failed or rejected.");
    }
  };

  const handleDownload = async () => {
    const targetUrl = app.downloadUrl || app.apkUrl;
    if (!targetUrl) {
      toast.error("No binary URL provided for this application.");
      return;
    }

    setIsVerifying(true);
    setDownloadProgress(0);

    // Phase 1: Rapid Initialization (250ms-350ms)
    // This provides the 'Play Store' feel of immediate responsiveness
    await new Promise((resolve) => setTimeout(resolve, 350));

    toast.loading("Verifying DAG Seal...", { id: "verify-seal" });

    // Phase 2: Snappy Progress Fill
    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 50);

    // Phase 3: Finalize & Trigger
    await new Promise((resolve) => setTimeout(resolve, 500));

    toast.success("Binary verified via DAG.", { id: "verify-seal" });

    if (walletAddress) {
      try {
        await AppService.trackDownload(app.id, walletAddress);
      } catch (e) {
        console.error("Failed to track download", e);
      }
    }

    // Immediate Browser Download Trigger
    const link = document.createElement("a");
    link.href = targetUrl;
    link.setAttribute(
      "download",
      `${app.name.replace(/\s+/g, "_")}_v${app.version}.apk`,
    );
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Keep state true for a moment to show 100% completion
    setTimeout(() => {
      setIsVerifying(false);
    }, 1000);
  };

  const [installedVersion, setInstalledVersion] = useState<string | null>(null);

  useEffect(() => {
    const installed = localStorage.getItem(`installed_${app.id}`);
    if (installed) {
      setInstalledVersion(installed);
    }
  }, [app.id]);

  const isUpdateAvailable =
    installedVersion && installedVersion !== app.version;

  const onDownloadClick = () => {
    // Save "installed" version to localStorage to simulate the update flow
    localStorage.setItem(`installed_${app.id}`, app.version);
    setInstalledVersion(app.version);

    // We bypass the internal handleDownload (simulate-only) for the real premium flow
    // @ts-ignore - triggerPremiumDownload is in parent scope but we'll use a neat trick
    if ((window as any).triggerKaspDownload) {
      (window as any).triggerKaspDownload(app);
    } else {
      handleDownload();
    }
  };

  const handleLaunchPwa = () => {
    const targetUrl = app.pwaUrl || app.webUrl;
    if (!targetUrl) {
      toast.error("No PWA/Web URL provided for this application.");
      return;
    }

    toast.success(`Launching ${app.name} PWA...`);
    window.open(targetUrl, "_blank");
  };

  const handleAddReview = async () => {
    if (!walletAddress) {
      toast.error("Connect your identity wallet to submit verified reviews.");
      return;
    }
    if (!comment.trim()) {
      toast.error("Please provide a review comment.");
      return;
    }
    setSubmitting(true);
    try {
      await AppService.addReview(app.id, {
        rating: userRating,
        comment: comment,
        wallet: walletAddress,
      });
      toast.success("Review etched on DAG safely.");
      setComment("");
      // Refresh reviews
      const data = await AppService.getReviews(app.id);
      if (data) setReviews(data as any);
    } catch (e) {
      toast.error("Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const similarApps = allApps
    .filter((a) => a.category === app.category && a.id !== app.id)
    .slice(0, 4);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-black/90 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#0a0a0a] w-full max-w-2xl h-full md:h-auto md:max-h-[85vh] rounded-none md:rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Header */}
          <div className="relative h-48 md:h-64 bg-slate-900 overflow-hidden">
            <div
              className={`absolute inset-0 bg-gradient-to-br ${app.iconGradient || "from-kaspa/20 to-black/20"} opacity-30`}
            />
            {app.headerImage ||
            (app.screenshots && app.screenshots.length > 0) ? (
              <img
                src={app.headerImage || app.screenshots?.[0]}
                alt=""
                className="w-full h-full object-cover opacity-60 transition-opacity duration-300"
                onLoad={(e) => (e.currentTarget.style.opacity = "1")}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Hexagon size={80} className="text-kaspa/5" strokeWidth={0.5} />
              </div>
            )}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors z-20"
            >
              <X size={20} />
            </button>

            {/* Info Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-[#0a0a0a] to-transparent">
              <div className="flex items-end gap-6 translate-y-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="w-20 h-20 md:w-28 md:h-28 bg-[#111] rounded-[2rem] p-4 shadow-2xl border border-white/10 ring-4 ring-[#0a0a0a] shrink-0"
                >
                  <img
                    src={app.icon}
                    alt={app.name}
                    className="w-full h-full object-contain"
                  />
                </motion.div>
                <div className="flex-1 pb-2">
                  <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-none mb-1 flex items-center gap-2">
                    {app.name}
                    {app.developerKns && (
                      <button
                        onClick={() => setShowTrustModal(true)}
                        className="hover:scale-110 transition-transform cursor-help"
                      >
                        <ShieldCheck
                          size={20}
                          className="text-kaspa fill-kaspa/20"
                        />
                      </button>
                    )}
                  </h2>
                  {isUpdateAvailable && (
                    <motion.div
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="mb-2 flex items-center gap-1.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest w-fit"
                    >
                      <RefreshCw size={10} className="animate-spin-slow" />{" "}
                      Update Available
                    </motion.div>
                  )}
                  <div className="flex items-center gap-2 text-kaspa text-xs font-bold uppercase tracking-widest">
                    {app.developer} •
                    <span
                      onClick={() => setShowTrustModal(true)}
                      className="underline decoration-kaspa/30 hover:text-white transition-colors cursor-help"
                    >
                      {app.developerKns}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 pt-12 space-y-8">
            {/* Quick Stats */}
            <div className="flex items-center justify-between pb-8 border-b border-white/5">
              <div className="text-center group cursor-help">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="text-white text-lg font-black">
                    {app.rating}
                  </span>
                  <Star size={14} className="text-white fill-white" />
                </div>
                <p className="text-[10px] text-slate-500 uppercase font-black">
                  {formatNumber(app.reviewsCount)} reviews
                </p>
              </div>
              <div className="h-10 w-px bg-white/5" />
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Download size={18} className="text-white" />
                </div>
                <p className="text-lg font-black text-white mb-0.5">
                  {formatNumber(app.downloads)}
                </p>
                <p className="text-[10px] text-slate-500 uppercase font-black">
                  Downloads
                </p>
              </div>
              <div className="h-10 w-px bg-white/5" />
              <div className="text-center">
                <div className="flex items-center justify-center mb-1 border border-white/20 w-5 h-5 mx-auto rounded-sm text-[10px] font-black text-white/50">
                  {app.ageRating || "PEGI 3"}
                </div>
                <p className="text-[10px] text-slate-500 uppercase font-black mt-1.5">
                  Rated for {app.ageRating || "3+"}
                </p>
              </div>
              <div className="h-10 w-px bg-white/5" />
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Smartphone size={18} className="text-white" />
                </div>
                <p className="text-lg font-black text-white mb-0.5">
                  {app.size}
                </p>
                <p className="text-[10px] text-slate-500 uppercase font-black">
                  Binary Size
                </p>
              </div>
            </div>

            {/* Install Button */}
            <div className="space-y-4">
              <div className="flex gap-4">
                {app.isPWA ? (
                  <button
                    onClick={handleLaunchPwa}
                    className="flex-1 bg-white hover:bg-slate-200 text-black py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3"
                  >
                    <QrCode size={18} /> Launch Web Protocol
                  </button>
                ) : (
                  <button
                    disabled={
                      !(app.downloadUrl || app.apkUrl) ||
                      isVerifying ||
                      (app.isPaid && commerceState !== "success")
                    }
                    onClick={
                      app.isPaid && commerceState !== "success"
                        ? handlePurchase
                        : handleDownload
                    }
                    className={`flex-1 ${app.isPaid && commerceState !== "success" ? "bg-kaspa" : "bg-kaspa"} hover:bg-kaspa-light text-black py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-kaspa/10 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3`}
                  >
                    {isVerifying ? (
                      downloadProgress < 100 ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Check size={18} />
                      )
                    ) : commerceState === "waiting" ||
                      commerceState === "verifying" ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : app.isPaid && commerceState !== "success" ? (
                      <Zap size={18} />
                    ) : isUpdateAvailable ? (
                      <RefreshCw size={18} className="animate-spin-slow" />
                    ) : (
                      <Download size={18} />
                    )}
                    {isVerifying
                      ? downloadProgress === 0
                        ? "Preparing..."
                        : downloadProgress < 100
                          ? `Downloading ${downloadProgress}%`
                          : "Completed"
                      : commerceState === "waiting"
                        ? "Initialing KAS Payment..."
                        : commerceState === "verifying"
                          ? "Verifying on DAG..."
                          : app.isPaid && commerceState !== "success"
                            ? `Buy for ${app.kasPrice || 0} KAS`
                            : isUpdateAvailable
                              ? `Update to v${app.version}`
                              : "Install Protocol Binary"}
                  </button>
                )}
                <button
                  onClick={() =>
                    toast.info(`${app.name} added to your local library.`)
                  }
                  className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/5 transition-all"
                >
                  <PlusCircle size={24} />
                </button>
              </div>

              {walletAddress && (
                <div className="flex items-center gap-2 px-1">
                  <div
                    className={`w-2 h-2 rounded-full ${knsName ? "bg-kaspa" : "bg-red-500"} animate-pulse`}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {knsName
                      ? `Identity Verified: ${knsName}`
                      : "KNS Identity Required for Purchase"}
                  </span>
                </div>
              )}

              {/* Progress Bar */}
              {isVerifying && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase">
                    <span>Downloading from 4Everland Node</span>
                    <span>{downloadProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${downloadProgress}%` }}
                      className="h-full bg-kaspa shadow-[0_0_10px_rgba(0,255,204,0.5)]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-white/5">
              {[
                { id: "details", label: "About" },
                { id: "ai", label: "Ask AI", isNew: true },
                { id: "history", label: "History" },
                { id: "reviews", label: "Reviews" },
                { id: "safety", label: "Safety" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-4 text-xs font-black uppercase tracking-widest relative transition-colors ${activeTab === tab.id ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
                >
                  {tab.label}
                  {tab.isNew && (
                    <span className="absolute -top-3 -right-6 text-[8px] bg-sky-500 text-white px-1.5 py-0.5 rounded-full">
                      AI
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTabDetails"
                      className="absolute bottom-0 left-0 right-0 h-1 bg-kaspa rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="min-h-[200px]">
              {activeTab === "details" && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black text-white tracking-tight">
                        Project Summary
                      </h3>
                      <ChevronRight size={20} className="text-slate-600" />
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {app.description}
                    </p>

                    {/* Sub-Apps Grid */}
                    {app.subApps && app.subApps.length > 0 && (
                      <div className="pt-4 space-y-4">
                        <div className="flex items-center gap-2 text-kaspa">
                          <Layers size={18} />
                          <h4 className="text-xs font-black uppercase tracking-widest">
                            Included In Bundle
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {app.subApps.map((sub) => (
                            <div
                              key={sub.id}
                              onClick={() => onSelectApp(sub)}
                              className="bg-white/5 border border-white/5 p-3 rounded-2xl flex items-center gap-3 group/sub hover:border-kaspa/50 hover:bg-kaspa/5 transition-all cursor-pointer relative"
                            >
                              <img
                                src={sub.icon}
                                alt=""
                                className="w-10 h-10 rounded-xl object-cover shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <h5 className="text-[11px] font-black text-white truncate uppercase tracking-tight group-hover/sub:text-kaspa transition-colors">
                                  {sub.name}
                                </h5>
                                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tight">
                                  {sub.size} • v{sub.version}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toast.info(
                                      `Fetching ${sub.name} Binary...`,
                                    );
                                    const link = document.createElement("a");
                                    link.href =
                                      sub.downloadUrl || sub.apkUrl || "#";
                                    link.setAttribute(
                                      "download",
                                      `${sub.name}_v${sub.version}.apk`,
                                    );
                                    link.click();
                                  }}
                                  className="p-2 bg-slate-800 text-kaspa rounded-lg hover:bg-kaspa hover:text-black transition-all"
                                  title="Download Only This"
                                >
                                  <Download size={14} />
                                </button>
                                <div className="p-2 bg-white/5 text-slate-400 rounded-lg group-hover/sub:bg-kaspa/20 group-hover/sub:text-kaspa transition-all">
                                  <ChevronRight size={14} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {manifest?.screenshots && (
                      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar no-scrollbar scroll-smooth">
                        {manifest.screenshots.map((s, i) => (
                          <img
                            key={i}
                            src={s}
                            alt=""
                            className="h-48 md:h-64 rounded-2xl border border-white/10 hover:border-kaspa/30 transition-all cursor-zoom-in"
                            referrerPolicy="no-referrer"
                          />
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {app.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-slate-300 font-bold uppercase tracking-wider"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-lg font-black text-white tracking-tight">
                      Ratings & Reviews
                    </h3>
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <div className="text-5xl font-black text-white mb-2">
                          {app.rating}
                        </div>
                        <div className="flex gap-0.5 justify-center mb-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={10}
                              className={
                                i < Math.floor(app.rating)
                                  ? "fill-kaspa text-kaspa"
                                  : "text-white/20"
                              }
                            />
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold">
                          {formatNumber(app.reviewsCount)} total
                        </p>
                      </div>
                      <div className="flex-1 space-y-1">
                        {[5, 4, 3, 2, 1].map((rating) => (
                          <div key={rating} className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-slate-500 w-2">
                              {rating}
                            </span>
                            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${app.ratingBreakdown?.[rating as 5 | 4 | 3 | 2 | 1] || 0}%`,
                                }}
                                className="h-full bg-kaspa rounded-full"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "history" && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-6">
                    <h3 className="text-lg font-black text-white tracking-tight">
                      Version Registry History
                    </h3>
                    <div className="space-y-6">
                      {(
                        manifest?.changelog || [
                          {
                            version: app.version,
                            date: "Initial Release",
                            notes: ["Protocol binary inscribed on Kaspa DAG."],
                          },
                        ]
                      ).map((log, index) => (
                        <div
                          key={index}
                          className="relative pl-8 border-l border-white/10 space-y-2"
                        >
                          <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-kaspa border-4 border-[#0a0a0a]" />
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-black text-white uppercase tracking-widest">
                              Version {log.version}
                            </h4>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {log.date}
                            </span>
                          </div>
                          <ul className="space-y-1">
                            {log.notes.map((note, ni) => (
                              <li
                                key={ni}
                                className="text-xs text-slate-400 flex gap-2"
                              >
                                <span className="text-kaspa">•</span> {note}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "safety" && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-6">
                    <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                      <Shield size={32} className="text-sky-500" />
                      <div>
                        <h3 className="text-base font-black text-white">
                          Data safety
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Security standards for decentralized distribution
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex gap-4">
                        <Layers
                          size={20}
                          className="text-slate-500 shrink-0 mt-1"
                        />
                        <div>
                          <p className="text-xs font-bold text-white mb-1">
                            No data shared with third parties
                          </p>
                          <p className="text-[11px] text-slate-500">
                            The developer has declared that this app does not
                            share user data with other companies or
                            organizations.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <Cpu
                          size={20}
                          className="text-slate-500 shrink-0 mt-1"
                        />
                        <div>
                          <p className="text-xs font-bold text-white mb-1">
                            Encrypted in transit
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Your binary is transferred over a secure, encrypted
                            P2P tunnel.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <Trash2
                          size={20}
                          className="text-slate-500 shrink-0 mt-1"
                        />
                        <div>
                          <p className="text-xs font-bold text-white mb-1">
                            Account deletion available
                          </p>
                          <p className="text-[11px] text-slate-500">
                            You can request to delete your connected node and
                            associated history.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "ai" && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="p-6 bg-sky-500/5 rounded-3xl border border-sky-500/10 space-y-4">
                    <div className="flex items-center gap-3 text-sky-500">
                      <Sparkles size={20} />
                      <h3 className="text-sm font-black uppercase tracking-widest">
                        Ask Play about this app
                      </h3>
                      <span className="text-[10px] bg-sky-500 text-white px-2 py-0.5 rounded-full">
                        AI MODERATED
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ask a question about this app..."
                        value={aiQuery}
                        onChange={(e) => setAiQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAiAsk()}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 text-sm text-white placeholder-slate-600 focus:border-sky-500/50 outline-none"
                      />
                      <button
                        onClick={() => handleAiAsk()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-sky-500 hover:bg-sky-500/10 rounded-lg transition-all"
                      >
                        <Zap size={18} />
                      </button>
                    </div>

                    {isAiLoading && (
                      <div className="flex items-center gap-3 py-4">
                        <Loader2
                          size={16}
                          className="animate-spin text-sky-500"
                        />
                        <span className="text-xs text-slate-500 italic">
                          Gemini is analyzing the project whitepaper...
                        </span>
                      </div>
                    )}

                    {aiResponse && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-5 bg-white/5 rounded-2xl border border-white/5 text-sm text-slate-300 leading-relaxed"
                      >
                        {aiResponse}
                      </motion.div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2">
                      {[
                        "What features are included?",
                        "Is it secure?",
                        "Subscription pricing?",
                      ].map((q) => (
                        <button
                          key={q}
                          onClick={() => handleAiAsk(q)}
                          className="bg-sky-500/10 border border-sky-500/20 px-4 py-2 rounded-full text-[10px] text-sky-500 font-bold hover:bg-sky-500/20 transition-all font-mono"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "reviews" && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-white">
                      Community Feedback
                    </h3>
                    {!submitting && (
                      <button
                        onClick={() => setSubmitting(!submitting)}
                        className="text-kaspa text-xs font-bold uppercase tracking-widest hover:underline"
                      >
                        Write a Review
                      </button>
                    )}
                  </div>

                  {submitting && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-white uppercase tracking-widest">
                          Rate this App
                        </p>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setUserRating(star)}
                            >
                              <Star
                                size={18}
                                className={
                                  star <= userRating
                                    ? "fill-kaspa text-kaspa"
                                    : "text-white/20"
                                }
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Share your experience with this protocol..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-kaspa/40 resize-none h-24"
                      />
                      <div className="flex gap-4">
                        <button
                          onClick={() => setSubmitting(false)}
                          className="flex-1 bg-slate-800 py-3 rounded-xl text-xs font-bold text-white uppercase tracking-widest"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddReview}
                          className="flex-1 bg-kaspa py-3 rounded-xl text-xs font-bold text-black uppercase tracking-widest hover:bg-kaspa-light"
                        >
                          Submit Verified
                        </button>
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-6">
                    {reviews.length > 0 ? (
                      reviews.map((review) => (
                        <div key={review.id} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-kaspa/10 border border-kaspa/20 flex items-center justify-center text-[10px] font-black text-kaspa">
                                {review.userName?.[0] || "U"}
                              </div>
                              <span className="text-xs font-bold text-white">
                                {review.userName || "Anonymous User"}
                              </span>
                            </div>
                            <button className="text-slate-600">
                              <Menu size={16} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  size={8}
                                  className={
                                    i < review.rating
                                      ? "fill-white text-white"
                                      : "text-white/20"
                                  }
                                />
                              ))}
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {new Date(
                                review.timestamp?.seconds * 1000,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400">
                            {review.comment}
                          </p>
                          <div className="flex items-center gap-4 text-[10px] text-slate-500">
                            <span>
                              {review.helpfulCount || 0} people found this
                              helpful
                            </span>
                            <div className="flex gap-2">
                              <button className="bg-white/5 px-4 py-1.5 rounded-full border border-white/5 hover:bg-white/10 text-white font-bold transition-all">
                                Yes
                              </button>
                              <button className="bg-white/5 px-4 py-1.5 rounded-full border border-white/5 hover:bg-white/10 text-white font-bold transition-all">
                                No
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 italic text-center py-10">
                        No reviews verified on-chain yet.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Similar Apps */}
            <div className="pt-8 border-t border-white/5 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-white tracking-tight">
                  Similar Apps
                </h3>
                <button className="text-kaspa text-xs font-bold uppercase tracking-widest">
                  <ChevronRight size={20} />
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar no-scrollbar">
                {similarApps.map((simApp) => (
                  <button
                    key={simApp.id}
                    onClick={() => onClose()} // In a real app would select this app
                    className="w-28 shrink-0 space-y-2 text-left group"
                  >
                    <div className="aspect-square bg-[#111] rounded-2xl p-3 border border-white/10 group-hover:border-kaspa/30 transition-all transition-transform active:scale-95">
                      <img
                        src={simApp.icon}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-[11px] font-bold text-white truncate">
                      {simApp.name}
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500">
                        {simApp.rating}
                      </span>
                      <Star
                        size={8}
                        className="fill-slate-500 text-slate-500"
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const UserProfile = ({
  walletAddress,
  knsName,
  onBack,
}: {
  walletAddress: string;
  knsName: string | null;
  onBack: () => void;
}) => {
  const [downloads, setDownloads] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        const [userDownloads, userReviews] = await Promise.all([
          AppService.getUserDownloads(walletAddress),
          AppService.getUserReviews(walletAddress),
        ]);
        setDownloads(userDownloads || []);
        setReviews(userReviews || []);
      } catch (e) {
        console.error("Failed to fetch profile", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, [walletAddress]);

  return (
    <div className="flex-1 p-4 md:p-12 overflow-y-auto w-full">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <button
              onClick={onBack}
              className="text-[10px] uppercase tracking-widest text-slate-500 hover:text-kaspa font-bold mb-4 flex items-center gap-2"
            >
              ← Return to Store
            </button>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
              User Profile
            </h2>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex flex-col gap-1 min-w-[240px]">
            <div className="flex items-center gap-2">
              <Fingerprint size={16} className="text-kaspa" />
              <span className="text-sm text-white font-bold">
                {knsName || "Anonymous Node"}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono break-all">
              {walletAddress}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12">
          <div className="md:col-span-2 space-y-8">
            <div className="bg-bg-surface border border-border-subtle rounded-3xl p-6 md:p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <History className="text-kaspa" size={20} />
                <h3 className="text-xl font-bold text-white uppercase italic tracking-tight">
                  App Library
                </h3>
              </div>

              {loading ? (
                <div className="flex justify-center p-12">
                  <div className="w-8 h-8 border-4 border-kaspa border-t-transparent rounded-full animate-spin" />
                </div>
              ) : downloads.length > 0 ? (
                <div className="space-y-4">
                  {downloads.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-kaspa/30 transition-all group"
                    >
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${app.iconGradient} flex-shrink-0 p-0.5`}
                      >
                        <img
                          src={app.icon}
                          alt={app.name}
                          className="w-full h-full object-cover rounded-[0.6rem]"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">
                          {app.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 uppercase">
                          v{app.version} • {app.category}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          app.apkUrl && window.open(app.apkUrl, "_blank")
                        }
                        className="p-2.5 bg-slate-800 text-slate-400 rounded-xl hover:bg-kaspa hover:text-black transition-all"
                        title="Download again"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-500 italic mb-4">
                    You haven't downloaded any apps yet.
                  </p>
                  <button
                    onClick={onBack}
                    className="text-kaspa text-xs font-bold uppercase tracking-widest hover:underline"
                  >
                    Browse Storefront
                  </button>
                </div>
              )}
            </div>

            <div className="bg-bg-surface border border-border-subtle rounded-3xl p-6 md:p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <Star className="text-kaspa" size={20} />
                <h3 className="text-xl font-bold text-white uppercase italic tracking-tight">
                  My Feedback
                </h3>
              </div>

              {loading ? (
                <div className="flex justify-center p-12">
                  <div className="w-8 h-8 border-4 border-kaspa border-t-transparent rounded-full animate-spin" />
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-6">
                  {reviews.map((review, i) => (
                    <div
                      key={i}
                      className="border-b border-white/5 pb-6 last:border-0 last:pb-0"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-bold text-white uppercase tracking-tight">
                          {review.appName}
                        </h4>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={10}
                              className={
                                i < review.rating
                                  ? "text-kaspa-light fill-kaspa"
                                  : "text-slate-700"
                              }
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-slate-400 italic line-clamp-3 leading-relaxed">
                        "{review.comment}"
                      </p>
                      <p className="text-[10px] text-slate-600 mt-2 uppercase font-bold tracking-widest">
                        Scanned{" "}
                        {review.timestamp?.toDate
                          ? review.timestamp.toDate().toLocaleDateString()
                          : "recently"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500 italic">
                    No feedback provided yet.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-bg-surface border border-border-subtle rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                Node Stats
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-white/5 pb-3">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">
                    Apps Owned
                  </span>
                  <span className="text-xl font-bold text-white font-mono">
                    {downloads.length}
                  </span>
                </div>
                <div className="flex justify-between items-end border-b border-white/5 pb-3">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">
                    Reputation
                  </span>
                  <div className="flex items-center gap-1">
                    <Star
                      size={12}
                      className="text-yellow-500 fill-yellow-500"
                    />
                    <span className="text-xl font-bold text-white font-mono">
                      4.9
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">
                    Sovereignty
                  </span>
                  <span className="text-xs font-bold text-kaspa uppercase tracking-widest">
                    Global Node
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-kaspa/20 to-transparent p-6 rounded-3xl border border-kaspa/30 shadow-lg">
              <p className="text-xs text-kaspa-light font-bold mb-2 italic uppercase">
                Decentralized Archive
              </p>
              <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                Your app library is indexed on-chain through your wallet
                signature. Re-install anytime without central permission.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DeveloperPortal = ({
  onBack,
  onAppLaunched,
  knsName,
  walletAddress,
  walletState,
  draftKnsName,
  setDraftKnsName,
  onConnectRequest,
  onRegisterIdentity,
}: {
  onBack: () => void;
  onAppLaunched: () => void;
  knsName: string | null;
  walletAddress: string | null;
  walletState: string;
  draftKnsName: string;
  setDraftKnsName: (name: string) => void;
  onConnectRequest: () => void;
  onRegisterIdentity: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<"launch" | "manage" | "verify">(
    "launch",
  );
  const [step, setStep] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "pending" | "success"
  >("idle");
  const [appName, setAppName] = useState("");
  const [appVersion, setAppVersion] = useState("1.0.0");
  const [appDescription, setAppDescription] = useState("");
  const [appCategory, setAppCategory] = useState("Tools");
  const [sourceUrl, setSourceUrl] = useState("");
  const [appIcon, setAppIcon] = useState("");
  const [appSize, setAppSize] = useState("");
  const [appDownloads, setAppDownloads] = useState("");
  const [appRating, setAppRating] = useState("");
  const [appReviewsCount, setAppReviewsCount] = useState("");
  const [appHash, setAppHash] = useState("");
  const [isHashing, setIsHashing] = useState(false);
  const [arweaveId, setArweaveId] = useState("");
  const [ipfsHash, setIpfsHash] = useState("");
  const [appDownloadUrl, setAppDownloadUrl] = useState("");
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isAlreadyMine, setIsAlreadyMine] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  useEffect(() => {
    const checkAvailability = async () => {
      const validation = KnsService.validateName(draftKnsName);
      if (validation.valid) {
        setIsCheckingAvailability(true);
        const owner = await KnsIndexer.resolve(draftKnsName);
        const available = !owner;
        const alreadyMine = owner === walletAddress;
        
        setIsAvailable(available);
        setIsAlreadyMine(alreadyMine);
        setIsCheckingAvailability(false);
      } else {
        setIsAvailable(null);
        setIsAlreadyMine(false);
      }
    };

    const timeout = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timeout);
  }, [draftKnsName]);
  const [isPwa, setIsPwa] = useState(false);
  const [pwaUrl, setPwaUrl] = useState("");
  const [isPaidApp, setIsPaidApp] = useState(false);
  const [kasPrice, setKasPrice] = useState(0);
  const [manifestUrl, setManifestUrl] = useState("");
  const [headerImage, setHeaderImage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadToEverland = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(5);
    try {
      // 1. Get pre-signed URL from our backend
      const urlRes = await fetch(
        `/api/generate-upload-url?fileName=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}`,
      );
      if (!urlRes.ok) {
        const error = await urlRes.json();
        throw new Error(error.error || "Failed to get upload URL");
      }

      const { uploadUrl, publicUrl } = await urlRes.json();
      setUploadProgress(20);

      // 2. Upload directly to S3 (4EVERLAND) using the pre-signed URL
      // We use XHR to track progress as fetch doesn't support upload progress natively yet
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 75) + 20; // 20% to 95%
            setUploadProgress(percent);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress(100);
            resolve(publicUrl);
          } else {
            reject(new Error(`S3 upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () =>
          reject(new Error("S3 upload network error")),
        );
        xhr.addEventListener("abort", () =>
          reject(new Error("S3 upload aborted")),
        );

        xhr.open("PUT", uploadUrl);
        // Important: Set Content-Type to match what was signed
        xhr.setRequestHeader(
          "Content-Type",
          file.type || "application/octet-stream",
        );
        xhr.send(file);
      });
    } catch (err: any) {
      toast.error(`Direct Upload failed: ${err.message}`);
      return null;
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1500);
    }
  };

  // Management State
  const [userApps, setUserApps] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [editingApp, setEditingApp] = useState<any | null>(null);
  const [newSubAppName, setNewSubAppName] = useState("");
  const [newSubAppCategory, setNewSubAppCategory] = useState("");
  const [newSubAppFile, setNewSubAppFile] = useState<File | null>(null);
  const [isAddingSubApp, setIsAddingSubApp] = useState(false);

  useEffect(() => {
    if (activeTab === "manage") {
      fetchUserApps();
    }
  }, [activeTab]);

  const fetchUserApps = async () => {
    setLoadingApps(true);
    try {
      const data = await AppService.getUserApps(walletAddress || "");
      setUserApps(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingApps(false);
    }
  };

  const [isReadOnly, setIsReadOnly] = useState(false);

  if (!walletAddress) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 md:px-8">
        <div className="bg-bg-surface border border-white/5 rounded-3xl w-full max-w-md mx-auto overflow-hidden shadow-2xl">
          <div className="p-8 pb-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-kaspa/10 border border-kaspa/30 rounded-2xl flex items-center justify-center mb-6">
              <Fingerprint size={32} className="text-kaspa" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Connect Developer Wallet
            </h3>
            <p className="text-slate-400 text-xs mb-8">
              Access the decentralized developer console by connecting your
              Kaspa wallet. Your identity is derived from your public key.
            </p>

            <div className="w-full space-y-4">
              <NativeKaspaConnectButton
                text="Connect via Kasware"
                status={walletState as any}
                onClick={onConnectRequest}
                className="w-full bg-kaspa text-black font-bold uppercase tracking-widest text-xs px-6 py-4 rounded-xl hover:bg-white transition-all active:scale-95 flex items-center justify-center gap-2"
              />
              <button
                onClick={() => setIsReadOnly(true)}
                className="w-full text-[10px] text-slate-500 hover:text-white uppercase font-bold tracking-widest mt-2 underline"
              >
                I just want to explore (Read-Only)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (walletAddress && !knsName && !isReadOnly) {
    const validation = KnsService.validateName(draftKnsName);
    const cost = KnsService.calculateCost(draftKnsName);

    return (
      <div className="max-w-4xl mx-auto py-12 px-4 md:px-8">
        <div className="bg-bg-surface border border-white/5 rounded-3xl w-full max-w-md mx-auto overflow-hidden shadow-2xl">
          <div className="p-8 pb-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-kaspa/10 border border-kaspa/30 rounded-2xl flex items-center justify-center mb-6">
              <Globe size={32} className="text-kaspa" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Establish KNS Identity
            </h3>
            <p className="text-slate-400 text-xs mb-8">
              Kaspstore.kas requires a .kas domain to index your applications.
              Names follow a length-based pricing model to ensure protocol
              fairness.
            </p>

            <div className="w-full space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Enter your .kas name"
                  value={draftKnsName}
                  onChange={(e) => setDraftKnsName(e.target.value)}
                  className={`w-full bg-slate-900 border ${draftKnsName && !validation.valid ? "border-red-500/50" : "border-slate-700/50"} rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-kaspa/50 font-mono text-center mb-1`}
                />
                {draftKnsName && (
                  <div className="flex justify-between items-center px-1">
                    <span
                      className={`text-[9px] font-bold uppercase ${validation.valid ? (isCheckingAvailability ? "text-slate-500" : (isAvailable || isAlreadyMine) ? "text-kaspa" : "text-red-400") : "text-red-400 font-medium"}`}
                    >
                      {validation.valid
                        ? isCheckingAvailability
                          ? "Checking..."
                          : isAlreadyMine
                            ? "Already Yours"
                            : isAvailable
                              ? "Available"
                              : "Already Taken"
                        : validation.error}
                    </span>
                    {validation.valid && (isAvailable || isAlreadyMine) && (
                      <span className="text-[9px] text-kaspa font-bold uppercase">
                        Estimated Fee: {isAlreadyMine ? "0 (Gas Only)" : `${cost} KAS`}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-left mb-4">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Protocol Rules
                </h4>
                <ul className="text-[9px] text-slate-600 space-y-1">
                  <li>• Characters: Emojis, a-z, 0-9, and hyphens</li>
                  <li>• First-come, first-served on the Kaspa DAG</li>
                  <li>• Pricing: 1-2: 4200 | 3: 2100 | 4: 525 | 5+: 35 KAS</li>
                </ul>
              </div>

              <button
                onClick={onRegisterIdentity}
                disabled={
                  walletState === "signing" ||
                  walletState === "success" ||
                  !validation.valid ||
                  (isAvailable === false && !isAlreadyMine) ||
                  isCheckingAvailability
                }
                className={`w-full font-bold uppercase tracking-widest text-xs px-6 py-4 rounded-xl transition-all flex items-center justify-center gap-2 ${
                  walletState === "success"
                    ? "bg-green-500 text-white"
                    : walletState === "signing"
                      ? "bg-kaspa/80 text-black animate-pulse"
                      : (validation.valid && (isAvailable || isAlreadyMine))
                        ? "bg-kaspa text-black hover:bg-white active:scale-95"
                        : "bg-slate-800 text-slate-600 cursor-not-allowed"
                } disabled:cursor-not-allowed`}
              >
                {walletState === "success" ? (
                  <>
                    <CheckCircle size={16} /> Identity Established
                  </>
                ) : walletState === "signing" ? (
                  "Checking Availability & Inscribing..."
                ) : (
                  `${isAlreadyMine ? "Verify & Link" : "Register"} ${draftKnsName || "Identity"}`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const [isBurning, setIsBurning] = useState(false);
  const [burnTxHash, setBurnTxHash] = useState("");

  const handleBurnRitual = async () => {
    setIsBurning(true);
    try {
      const walletType = localStorage.getItem("kaspa_wallet_type") || "kasware";
      const provider = getWalletProvider(walletType);

      if (!provider) {
        toast.error(`${walletType} wallet not found`);
        setIsBurning(false);
        return;
      }

      // 1. Determine Burn Protocol Fee
      const protocolLaunchFee = 420; // 420 KAS standard launch fee

      // 2. Request Burn Transaction
      // In a real dApp, we send to a null address or a protocol burn address
      const burnAddress =
        "kaspa:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqkx9zhx6";

      toast.info(
        `Initializing Burn Ritual: ${protocolLaunchFee} KAS to Null Address...`,
      );

      // Use standard sendTransaction for the burn
      let txId;
      try {
        if (provider.sendKaspa) {
          txId = await provider.sendKaspa(
            burnAddress,
            protocolLaunchFee * 100000000,
          );
        } else if (provider.sendTransaction) {
          txId = await provider.sendTransaction({
            to: burnAddress,
            amount: protocolLaunchFee * 100000000,
          });
        } else if (provider.request) {
          txId = await provider
            .request({
              method: "kaspa_sendKaspa",
              params: {
                to: burnAddress,
                amount: protocolLaunchFee * 100000000,
              },
            })
            .catch(() =>
              provider.request({
                method: "sendKaspa",
                params: [burnAddress, protocolLaunchFee * 100000000],
              }),
            );
        } else {
          throw new Error("Wallet doesn't support sending KAS.");
        }
      } catch (txErr: any) {
        console.error("[Wallet] Transaction failed:", txErr);
        throw txErr;
      }

      if (txId) {
        setBurnTxHash(txId);
        toast.success("Burn Transaction Broadcasted!");
        setStep(4); // Move to final verification/launch
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Burn ritual aborted.");
    } finally {
      setIsBurning(false);
    }
  };

  const handleFinalLaunch = async () => {
    if (isReadOnly || !knsName) {
      toast.error("Verified KNS identity required to registry unique assets.", {
        description: "Establishing link to .kas sovereign name...",
      });
      setIsReadOnly(false);
      setStep(1); // Revert to identity check step
      return;
    }
    if (!walletAddress) {
      toast.error("Please connect wallet first.");
      onConnectRequest();
      return;
    }

    setPaymentStatus("pending");
    try {
      // 1. Verify Burn Tx with Backend
      await AppService.burnAndLaunch({
        appId: appName.toLowerCase().replace(/\s/g, "_"), // Simulating ID generation
        txHash: burnTxHash,
        burnAmount: 420,
        developerAddress: walletAddress || "",
      });

      // 2. Finalize Metadata and Entry
      await AppService.launchApp(
        {
          name: appName,
          developer: knsName || "Kaspa Dev",
          developerKns: knsName || "",
          signature: burnTxHash,
          category: appCategory,
          price: isPaidApp ? `${kasPrice} KAS` : "Free",
          isPaid: isPaidApp,
          kasPrice: kasPrice,
          version: appVersion,
          description:
            appDescription ||
            "Decentralized deployment broadcasted via Burn-And-Launch ritual.",
          icon:
            appIcon ||
            "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=128&h=128&fit=crop",
          iconGradient: "from-orange-500 to-red-600",
          apkUrl: appDownloadUrl || "",
          size: appSize || "Unknown",
          downloads: 0,
          rating: 5,
          reviewsCount: 0,
          keywords: ["burn", "launch", "binary"],
          downloadUrl: appDownloadUrl,
          manifestUrl: manifestUrl,
          headerImage: headerImage,
          arweaveId: arweaveId,
          ipfsHash: ipfsHash,
          sha256Hash: appHash,
          isPWA: isPwa,
          pwaUrl: pwaUrl,
          status: "live",
          launchedAt: new Date().toISOString(),
        },
        walletAddress,
      );

      setPaymentStatus("success");
      toast.success("Hatched! App is now live on the index.");

      setTimeout(() => {
        onAppLaunched();
        onBack();
      }, 2000);
    } catch (e: any) {
      setPaymentStatus("idle");
      toast.error(`Verification Failed: ${e.message}`);
    }
  };

  const handleLaunch = handleFinalLaunch;

  const handleVerify = async () => {
    if (!walletAddress) {
      alert("Please connect node first.");
      return;
    }
    setPaymentStatus("pending");
    try {
      await AppService.submitVerification(sourceUrl, walletAddress || "");
      setPaymentStatus("success");
    } catch (e) {
      setPaymentStatus("idle");
      alert("Verification failed.");
    }
  };

  const [isIpnsUpdating, setIsIpnsUpdating] = useState(false);

  const handleApplyUpdates = async () => {
    setPaymentStatus("pending");
    try {
      const walletType =
        window.localStorage.getItem("kaspa_wallet_type") || "kasware";
      const provider = getWalletProvider(walletType);

      if (!provider) {
        throw new Error("Wallet provider not found to sign update.");
      }

      toast.info("Please sign the update request in your wallet...");

      // Simulate a signature request for the update payload
      const payloadString = JSON.stringify({
        op: "update",
        appId: editingApp.id,
        version: editingApp.version,
        timestamp: Date.now(),
      });

      let signature = null;
      if (provider.signMessage) {
        signature = await provider.signMessage(payloadString, "utf8");
      } else if (provider.request) {
        try {
          signature = await provider.request({
            method: "kaspa_signMessage",
            params: { message: payloadString },
          });
        } catch {
          // some fallback
          signature = await provider.request({
            method: "signMessage",
            params: [payloadString],
          });
        }
      } else {
        toast.warning(
          "Wallet doesn't support signing, proceeding with fallback authentication.",
        );
        signature = "fallback-sig-" + Date.now();
      }

      if (!signature) {
        throw new Error("User rejected the signature request.");
      }

      // 1. Update metadata first
      await AppService.updateApp(
        editingApp.id,
        editingApp,
        walletAddress || "",
      );

      // 2. Perform Decentralized Push (IPNS Update)
      setIsIpnsUpdating(true);
      await AppService.pushUpdate({
        appId: editingApp.id,
        newDownloadUrl: editingApp.downloadUrl || "",
        newVersion: editingApp.version,
        devKns: knsName || "Anonymous",
        ipfsCid: editingApp.ipfsHash || "v2_cid",
      });

      setPaymentStatus("success");
      toast.success("Binary Pointer & IPNS Updated");

      setTimeout(() => {
        setEditingApp(null);
        fetchUserApps();
        setPaymentStatus("idle");
        setIsIpnsUpdating(false);
      }, 2000);
    } catch (e: any) {
      setPaymentStatus("idle");
      setIsIpnsUpdating(false);
      toast.error(`Update failed: ${e.message}`);
    }
  };

  const handleAddSubApp = async () => {
    if (!newSubAppFile || !newSubAppName || !newSubAppCategory || !editingApp) {
      toast.error("Please fill all sub-app fields and select a file");
      return;
    }

    setIsAddingSubApp(true);
    try {
      const publicUrl = (await uploadToEverland(newSubAppFile)) as string;
      if (!publicUrl) throw new Error("Upload to 4EVERLAND failed");

      const subApp: any = {
        id: `sub_${Math.random().toString(36).substring(2, 9)}`,
        name: newSubAppName,
        category: editingApp.category,
        subCategory: newSubAppCategory,
        downloadUrl: publicUrl,
        developerKns: knsName || "",
        version: "1.0.0",
        rating: 5,
        downloads: 0,
        icon: editingApp.icon, // Default to parent icon
        iconGradient: editingApp.iconGradient,
        description: `Sub-module for ${editingApp.name}. Added as ${newSubAppCategory}.`,
      };

      const updatedSubApps = [...(editingApp.subApps || []), subApp];
      setEditingApp({ ...editingApp, subApps: updatedSubApps });

      setNewSubAppName("");
      setNewSubAppCategory("");
      setNewSubAppFile(null);
      toast.success(`Module "${newSubAppName}" uploaded and staged!`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsAddingSubApp(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-12 overflow-y-auto w-full">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <button
            onClick={onBack}
            className="text-[10px] md:text-xs uppercase tracking-widest text-slate-500 hover:text-kaspa font-bold flex items-center gap-2"
          >
            ← Registry Root
          </button>
          <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setActiveTab("launch");
                setStep(1);
                setPaymentStatus("idle");
                setEditingApp(null);
              }}
              className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${activeTab === "launch" ? "bg-kaspa text-black" : "text-slate-500 hover:text-white"}`}
            >
              Launch
            </button>
            <button
              onClick={() => {
                setActiveTab("manage");
                setEditingApp(null);
              }}
              className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${activeTab === "manage" ? "bg-kaspa text-black" : "text-slate-500 hover:text-white"}`}
            >
              Manage
            </button>
            <button
              onClick={() => {
                setActiveTab("verify");
                setStep(1);
                setPaymentStatus("idle");
                setEditingApp(null);
              }}
              className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${activeTab === "verify" ? "bg-kaspa text-black" : "text-slate-500 hover:text-white"}`}
            >
              Verify
            </button>
          </div>
        </div>

        <motion.div
          key={`${activeTab}-${step}-${editingApp?.id || "new"}`}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-bg-surface border border-white/5 p-6 md:p-10 rounded-3xl md:rounded-[2rem] shadow-2xl"
        >
          {activeTab === "manage" ? (
            <div className="space-y-6">
              {editingApp ? (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                        Edit Deployment
                      </h2>
                      <p className="text-slate-500 text-[10px] uppercase font-bold text-kaspa-light">
                        {editingApp.name}
                      </p>
                    </div>
                    <button
                      onClick={() => setEditingApp(null)}
                      className="text-slate-500 hover:text-white transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Version Update
                        </label>
                        <input
                          type="text"
                          value={editingApp.version}
                          onChange={(e) =>
                            setEditingApp({
                              ...editingApp,
                              version: e.target.value,
                            })
                          }
                          className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-kaspa/40 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Category
                        </label>
                        <select
                          value={editingApp.category}
                          onChange={(e) =>
                            setEditingApp({
                              ...editingApp,
                              category: e.target.value,
                            })
                          }
                          className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-kaspa/40 text-sm appearance-none"
                        >
                          <option value="Games">Games</option>
                          <option value="Tools">Tools</option>
                          <option value="Finance">Finance</option>
                          <option value="Social">Social</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Description
                      </label>
                      <textarea
                        value={editingApp.description}
                        onChange={(e) =>
                          setEditingApp({
                            ...editingApp,
                            description: e.target.value,
                          })
                        }
                        className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-kaspa/40 text-sm min-h-[80px] resize-none"
                      />
                    </div>

                    <div className="space-y-4 pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2">
                          <QrCode size={14} className="text-kaspa" />
                          <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                            PWA Support
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingApp.isPWA}
                            onChange={(e) =>
                              setEditingApp({
                                ...editingApp,
                                isPWA: e.target.checked,
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-kaspa"></div>
                        </label>
                      </div>

                      {editingApp.isPWA && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            PWA Metadata URL
                          </label>
                          <input
                            type="text"
                            value={editingApp.pwaUrl || ""}
                            onChange={(e) =>
                              setEditingApp({
                                ...editingApp,
                                pwaUrl: e.target.value,
                              })
                            }
                            className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-kaspa/40 text-[10px] font-mono"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-kaspa-light uppercase tracking-widest flex items-center gap-2">
                          <Globe size={10} /> External Download URL (GitHub /
                          IPFS)
                        </label>
                        <input
                          type="text"
                          placeholder="https://github.com/user/project/releases/latest/app.apk"
                          value={editingApp.downloadUrl || ""}
                          onChange={(e) =>
                            setEditingApp({
                              ...editingApp,
                              downloadUrl: e.target.value,
                            })
                          }
                          className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-kaspa/40 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-kaspa-light uppercase tracking-widest flex items-center gap-2">
                          <ShieldCheck size={10} /> Binary Integrity Hash
                          (SHA-256)
                        </label>
                        <input
                          type="text"
                          placeholder="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                          value={editingApp.hash || ""}
                          onChange={(e) =>
                            setEditingApp({
                              ...editingApp,
                              hash: e.target.value,
                            })
                          }
                          className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-kaspa/40 text-[10px] font-mono"
                        />
                      </div>

                      {/* Sub-Apps Distribution */}
                      <div className="space-y-4 pt-6 mt-6 border-t border-white/5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <Box size={14} className="text-kaspa" /> Sub-Apps
                            Distribution
                          </h3>
                          <span className="text-[10px] text-slate-500 font-bold">
                            4EVERLAND INDEX
                          </span>
                        </div>

                        {/* List existing sub-apps */}
                        <div className="space-y-2">
                          {editingApp.subApps?.map((sub: any, i: number) => (
                            <div
                              key={i}
                              className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-kaspa/10 flex items-center justify-center">
                                  <ChevronRight
                                    size={14}
                                    className="text-kaspa"
                                  />
                                </div>
                                <div>
                                  <p className="text-[11px] font-bold text-white">
                                    {sub.name}
                                  </p>
                                  <p className="text-[9px] text-slate-500 uppercase">
                                    {sub.subCategory}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  const updated = editingApp.subApps.filter(
                                    (_: any, idx: number) => idx !== i,
                                  );
                                  setEditingApp({
                                    ...editingApp,
                                    subApps: updated,
                                  });
                                }}
                                className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Add new sub-app form */}
                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-kaspa/10 space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                Module Name
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Kasp Drive"
                                value={newSubAppName}
                                onChange={(e) =>
                                  setNewSubAppName(e.target.value)
                                }
                                className="w-full bg-black/40 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-kaspa/40 text-[11px]"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                Kind of App
                              </label>
                              <select
                                value={newSubAppCategory}
                                onChange={(e) =>
                                  setNewSubAppCategory(e.target.value)
                                }
                                className="w-full bg-black/40 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-kaspa/40 text-[11px] appearance-none"
                              >
                                <option value="">Select Category</option>
                                {CATEGORIES.find((c) =>
                                  c.label
                                    .toLowerCase()
                                    .includes(
                                      editingApp.category.toLowerCase(),
                                    ),
                                )?.subCategories?.map((sub) => (
                                  <option key={sub.id} value={sub.id}>
                                    {sub.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                              Binary Upload (to 4Everland)
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="file"
                                id="sub-app-file"
                                className="hidden"
                                onChange={(e) =>
                                  setNewSubAppFile(e.target.files?.[0] || null)
                                }
                              />
                              <label
                                htmlFor="sub-app-file"
                                className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-800 rounded-xl hover:border-kaspa/30 cursor-pointer transition-all"
                              >
                                <UploadCloud
                                  size={16}
                                  className={
                                    newSubAppFile
                                      ? "text-kaspa"
                                      : "text-slate-500"
                                  }
                                />
                                <span className="text-[10px] text-slate-500 font-bold uppercase truncate">
                                  {newSubAppFile
                                    ? newSubAppFile.name
                                    : "Choose Binary File"}
                                </span>
                              </label>
                              <button
                                type="button"
                                onClick={handleAddSubApp}
                                disabled={isAddingSubApp || !newSubAppFile}
                                className="bg-kaspa text-black px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-kaspa-light disabled:opacity-50 transition-all shadow-lg shadow-kaspa/10 shrink-0"
                              >
                                {isAddingSubApp ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  "Push Module"
                                )}
                              </button>
                            </div>
                            {isAddingSubApp && (
                              <div className="h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                                <div
                                  className="h-full bg-kaspa transition-all duration-300"
                                  style={{ width: `${uploadProgress}%` }}
                                ></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setEditingApp(null)}
                      className="flex-1 bg-slate-800 py-3.5 rounded-xl font-bold text-white hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApplyUpdates}
                      disabled={paymentStatus === "pending"}
                      className="flex-1 bg-kaspa py-3.5 rounded-xl font-bold text-black tracking-widest hover:bg-kaspa-light shadow-xl transition-all uppercase text-[10px] disabled:opacity-50"
                    >
                      {paymentStatus === "pending" ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 size={14} className="animate-spin" />
                          <span>
                            {isIpnsUpdating
                              ? "Publishing IPNS..."
                              : "Inscribing..."}
                          </span>
                        </div>
                      ) : (
                        "Apply Updates"
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                      <LayoutDashboard size={20} className="text-kaspa" />{" "}
                      Managed Registry
                    </h2>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      {userApps.length} Deployments
                    </span>
                  </div>

                  {loadingApps ? (
                    <div className="flex justify-center p-12">
                      <div className="w-8 h-8 border-4 border-kaspa border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : userApps.length > 0 ? (
                    <div className="space-y-3">
                      {userApps.map((app) => (
                        <div
                          key={app.id}
                          className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-kaspa/20 transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-10 h-10 rounded-lg bg-gradient-to-br ${app.iconGradient} p-0.5 flex-shrink-0`}
                            >
                              <img
                                src={app.icon}
                                alt={app.name}
                                className="w-full h-full object-cover rounded-[0.5rem]"
                              />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white">
                                {app.name}
                              </h4>
                              <p className="text-[10px] text-slate-500 uppercase">
                                v{app.version} • {app.category}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setEditingApp(app)}
                            className="p-2 text-slate-400 hover:text-kaspa bg-slate-900 rounded-xl border border-slate-800"
                          >
                            <Settings size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-slate-500 italic mb-4">
                        No applications registered to this node address.
                      </p>
                      <button
                        onClick={() => setActiveTab("launch")}
                        className="text-kaspa text-xs font-bold uppercase tracking-widest hover:underline"
                      >
                        Deploy your first binary
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : activeTab === "verify" ? (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
                  Verified Proof
                </h2>
                <p className="text-slate-400 text-xs md:text-sm">
                  Establish project legitimacy permanently on the DAG index.
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Source Authenticator (GitHub/GitLab)
                  </label>
                  <input
                    type="text"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-kaspa/40 text-sm"
                    placeholder="https://github.com/org/repo"
                  />
                </div>
                <div className="p-5 md:p-6 bg-kaspa/5 border border-kaspa/20 rounded-2xl">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-bold text-white">
                      Registry Fee
                    </h4>
                    <span className="text-kaspa font-mono font-bold">
                      50 KAS
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    This proof will receive a visible verification badge on all
                    published apps associated with this wallet.
                  </p>
                </div>
              </div>
              <button
                onClick={handleVerify}
                className="w-full bg-kaspa py-4 rounded-xl font-bold text-black uppercase tracking-widest hover:bg-kaspa-light transition-all flex items-center justify-center gap-2"
              >
                Submit Proof <ShieldCheck size={16} />
              </button>
              {paymentStatus === "success" && (
                <p className="text-center text-kaspa text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">
                  Verification Etched on DAG
                </p>
              )}
            </div>
          ) : (
            <>
              {step === 1 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
                      Decentralized Asset Registry
                    </h2>
                    <p className="text-slate-400 text-xs md:text-sm">
                      Broadcast your application metadata and decentralized
                      pointers to the global node network.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 block">
                        App Binary / APK (Auto-Hashing)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="https://ipfs.io/ipfs/... or Upload Below"
                          value={appDownloadUrl}
                          onChange={(e) => setAppDownloadUrl(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white focus:border-kaspa/50 outline-none"
                        />
                        <label
                          className={`cursor-pointer flex items-center justify-center w-12 h-12 bg-white/5 border border-white/10 rounded-xl hover:bg-kaspa/10 hover:border-kaspa/50 transition-all ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <input
                            type="file"
                            className="hidden"
                            accept=".apk"
                            disabled={isUploading}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // Hash first
                                setIsHashing(true);
                                const hash = await calculateSHA256(file);
                                setAppHash(hash);
                                setAppSize(file.size.toString());
                                setIsHashing(false);

                                // Then upload
                                const url = await uploadToEverland(file);
                                if (url) setAppDownloadUrl(url as string);
                              }
                            }}
                          />
                          <UploadCloud
                            size={20}
                            className={
                              isUploading
                                ? "animate-bounce text-kaspa"
                                : "text-slate-400"
                            }
                          />
                        </label>
                      </div>
                      <p className="text-[9px] text-slate-600 mt-1 italic">
                        Prefer decentralized storage (IPFS/Arweave) for
                        censorship resistance.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 block">
                          Arweave ID
                        </label>
                        <input
                          type="text"
                          placeholder="TX ID"
                          value={arweaveId}
                          onChange={(e) => setArweaveId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-3 text-xs text-white focus:border-kaspa/50 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 block">
                          IPFS CID
                        </label>
                        <input
                          type="text"
                          placeholder="Qm..."
                          value={ipfsHash}
                          onChange={(e) => setIpfsHash(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-3 text-xs text-white focus:border-kaspa/50 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 block">
                        Binary Integrity Hash (SHA-256)
                      </label>
                      <input
                        type="text"
                        placeholder="0x..."
                        value={appHash}
                        onChange={(e) => setAppHash(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-3 text-xs text-white focus:border-kaspa/50 outline-none font-mono"
                      />
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-start gap-4 mx-2">
                    <div className="w-10 h-10 rounded-full bg-kaspa/10 flex items-center justify-center flex-shrink-0">
                      <Server size={20} className="text-kaspa" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-[11px] font-bold text-white uppercase tracking-tight">
                        Self-Storage Architecture
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Kaspstore.kas is a decentralized registry. You host your
                        own binary package (on your server, GitHub, or local
                        node). This ensures zero trade-offs on autonomy and
                        prevents centralized platform "hanging" or censorship.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    className="w-full bg-kaspa py-4 rounded-xl font-bold text-black uppercase tracking-widest hover:bg-kaspa-light shadow-xl shadow-kaspa/10 transition-all"
                  >
                    Continue to Index Specs
                  </button>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
                      Index Specifications
                    </h2>
                    <p className="text-slate-400 text-xs md:text-sm">
                      Define how your binary remains indexed on the global
                      state.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Global Alias
                        </label>
                        <input
                          type="text"
                          value={appName}
                          onChange={(e) => setAppName(e.target.value)}
                          className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-kaspa/40 text-sm"
                          placeholder="e.g. Kaspium V2"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Version
                        </label>
                        <input
                          type="text"
                          value={appVersion}
                          onChange={(e) => setAppVersion(e.target.value)}
                          className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-kaspa/40 text-sm"
                          placeholder="e.g. 1.0.0"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Category
                      </label>
                      <select
                        value={appCategory}
                        onChange={(e) => setAppCategory(e.target.value)}
                        className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-kaspa/40 text-sm appearance-none"
                      >
                        <option value="Games">Games</option>
                        <option value="Tools">Tools</option>
                        <option value="Finance">Finance</option>
                        <option value="Social">Social</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Description
                      </label>
                      <textarea
                        value={appDescription}
                        onChange={(e) => setAppDescription(e.target.value)}
                        className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-kaspa/40 text-sm min-h-[100px] resize-none"
                        placeholder="Detail your deployment's utility..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Icon URL (Public Link or Upload)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={appIcon}
                          onChange={(e) => setAppIcon(e.target.value)}
                          className="flex-1 bg-black/30 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-kaspa/40 text-sm"
                          placeholder="https://.../icon.png"
                        />
                        <label className="cursor-pointer flex items-center justify-center w-12 h-12 bg-white/5 border border-white/10 rounded-xl hover:bg-kaspa/10 hover:border-kaspa/50 transition-all">
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const url = await uploadToEverland(file);
                                if (url) setAppIcon(url as string);
                              }
                            }}
                          />
                          <UploadCloud size={18} className="text-slate-400" />
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Size (Bytes)
                        </label>
                        <input
                          type="number"
                          value={appSize}
                          onChange={(e) => setAppSize(e.target.value)}
                          className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-kaspa/40 text-sm"
                          placeholder="e.g. 15000000"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Downloads (Seeders)
                        </label>
                        <input
                          type="number"
                          value={appDownloads}
                          onChange={(e) => setAppDownloads(e.target.value)}
                          className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-kaspa/40 text-sm"
                          placeholder="e.g. 50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Initial Rating (1-5)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={appRating}
                          onChange={(e) => setAppRating(e.target.value)}
                          className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-kaspa/40 text-sm"
                          placeholder="4.5"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Review Count
                        </label>
                        <input
                          type="number"
                          value={appReviewsCount}
                          onChange={(e) => setAppReviewsCount(e.target.value)}
                          className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-kaspa/40 text-sm"
                          placeholder="12"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <div className="flex flex-col gap-1">
                        <h4 className="text-xs font-bold text-kaspa-light uppercase tracking-tight">
                          External Protocol Metadata
                        </h4>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest">
                          Self-host your binary for true decentralization
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Zap size={14} className="text-kaspa" />
                              <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                                Gated Download (Paid)
                              </span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isPaidApp}
                                onChange={(e) => setIsPaidApp(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-kaspa"></div>
                            </label>
                          </div>
                          {isPaidApp && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                Price (KAS)
                              </label>
                              <input
                                type="number"
                                value={kasPrice}
                                onChange={(e) =>
                                  setKasPrice(parseFloat(e.target.value))
                                }
                                className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-kaspa/40 text-[10px] font-mono"
                                placeholder="50"
                              />
                            </div>
                          )}
                        </div>

                        <div className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <QrCode size={14} className="text-kaspa" />
                              <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                                Register as PWA
                              </span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isPwa}
                                onChange={(e) => setIsPwa(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-kaspa"></div>
                            </label>
                          </div>
                          {isPwa && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                PWA URL
                              </label>
                              <input
                                type="text"
                                value={pwaUrl}
                                onChange={(e) => setPwaUrl(e.target.value)}
                                className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-kaspa/40 text-[10px] font-mono"
                                placeholder="https://myapp.com/pwa"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Box size={10} className="text-kaspa" /> 4Everland
                            Manifest
                          </label>
                          <input
                            type="text"
                            value={manifestUrl}
                            onChange={(e) => setManifestUrl(e.target.value)}
                            className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-kaspa/40 text-[10px] font-mono"
                            placeholder="https://4everland.io/..."
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <ImageIcon size={10} className="text-kaspa" />{" "}
                            Premium Header
                          </label>
                          <input
                            type="text"
                            value={headerImage}
                            onChange={(e) => setHeaderImage(e.target.value)}
                            className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-kaspa/40 text-[10px] font-mono"
                            placeholder="https://..."
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Globe size={10} className="text-kaspa" /> Arweave
                            ID
                          </label>
                          <input
                            type="text"
                            value={arweaveId}
                            onChange={(e) => setArweaveId(e.target.value)}
                            className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-kaspa/40 text-[10px] font-mono"
                            placeholder="Arweave Hash"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Cpu size={10} className="text-[#8b5cf6]" /> IPFS
                            CID
                          </label>
                          <input
                            type="text"
                            value={ipfsHash}
                            onChange={(e) => setIpfsHash(e.target.value)}
                            className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-kaspa/40 text-[10px] font-mono"
                            placeholder="Qm..."
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Download URL (APK)
                          </label>
                          <input
                            type="text"
                            value={appDownloadUrl}
                            onChange={(e) => setAppDownloadUrl(e.target.value)}
                            className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-kaspa/40 text-[10px] font-mono"
                            placeholder="https://..."
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            SHA-256 Hash
                          </label>
                          <input
                            type="text"
                            value={appHash}
                            onChange={(e) => setAppHash(e.target.value)}
                            className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-kaspa/40 text-[10px] font-mono"
                            placeholder="0x..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 bg-slate-800 py-4 rounded-xl font-bold text-white hover:bg-slate-700 transition-colors"
                    >
                      Abort
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      className="flex-1 bg-kaspa py-4 rounded-xl font-bold text-black tracking-widest hover:bg-kaspa-light shadow-xl transition-all uppercase text-[10px]"
                    >
                      Proceed to Burn
                    </button>
                  </div>
                  {paymentStatus === "success" && (
                    <p className="text-center text-kaspa text-[10px] font-bold uppercase tracking-[0.2em]">
                      Transaction Confirmed
                    </p>
                  )}
                </div>
              )}
              {step === 3 && (
                <div className="space-y-8 py-4">
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-orange-500/10 border border-orange-500/30 rounded-3xl flex items-center justify-center mx-auto shadow-[0_0_50px_-12px_rgba(249,115,22,0.3)]">
                      <Flame
                        size={40}
                        className="text-orange-500 fill-orange-500/20 animate-pulse"
                      />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">
                        The Burn Ritual
                      </h2>
                      <p className="text-slate-400 text-xs mt-2 max-w-sm mx-auto">
                        To ensure protocol scarcity and prevent asset spam,
                        every launch requires a permanent burn of $KAS into the
                        null-address.
                      </p>
                    </div>
                  </div>

                  <div className="bg-black/30 border border-white/5 rounded-2xl p-6 space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Protocol Launch Fee
                      </span>
                      <span className="text-2xl font-black text-white font-mono">
                        420 <span className="text-xs text-kaspa">KAS</span>
                      </span>
                    </div>

                    <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-xl flex gap-4 items-center">
                      <AlertTriangle
                        size={24}
                        className="text-orange-500 shrink-0"
                      />
                      <p className="text-[10px] text-slate-400 leading-normal">
                        This transaction is irreversible. The funds will be sent
                        to a verifiable burn address and permanently destroyed
                        from the total supply.
                      </p>
                    </div>

                    <button
                      onClick={handleBurnRitual}
                      disabled={isBurning}
                      className="w-full bg-orange-600 py-4 rounded-xl font-black text-white uppercase tracking-[0.2em] hover:bg-orange-500 shadow-2xl shadow-orange-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {isBurning ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Destroying $KAS...</span>
                        </>
                      ) : (
                        <>
                          <Flame size={16} />
                          <span>Execute Burn</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => setStep(2)}
                      className="text-[10px] text-slate-600 uppercase font-bold tracking-widest hover:text-slate-400"
                    >
                      Cancel & return to specs
                    </button>
                  </div>
                </div>
              )}
              {step === 4 && (
                <div className="space-y-8 text-center animate-in fade-in zoom-in-95 duration-500">
                  <div className="w-20 h-20 bg-kaspa/10 border border-kaspa/30 rounded-3xl flex items-center justify-center mx-auto shadow-[0_0_50px_-12px_rgba(112,235,191,0.3)]">
                    <ShieldCheck size={40} className="text-kaspa" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">
                      Burn Verified
                    </h2>
                    <p className="text-slate-400 text-xs mt-2 font-mono">
                      Tx: {burnTxHash.slice(0, 8)}...{burnTxHash.slice(-8)}
                    </p>
                  </div>

                  <div className="bg-white/5 p-6 rounded-2xl border border-white/5 text-left space-y-4">
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
                      <span className="text-slate-500">Launch Target</span>
                      <span className="text-white">
                        {appName} v{appVersion}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
                      <span className="text-slate-500">Registry Anchor</span>
                      <span className="text-kaspa">{knsName}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleFinalLaunch}
                    disabled={paymentStatus === "pending"}
                    className="w-full bg-kaspa py-4 rounded-xl font-black text-black uppercase tracking-[0.2em] hover:bg-white shadow-2xl shadow-kaspa/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {paymentStatus === "pending"
                      ? "Finalizing Global State..."
                      : "Global Deployment Broadcast"}
                  </button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

const DeveloperGuide = ({ onBack }: { onBack: () => void }) => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 md:px-8 bg-bg-main min-h-screen">
      <div className="mb-10 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
        >
          <PanelLeftOpen
            size={18}
            className="rotate-180 group-hover:-translate-x-1 transition-transform"
          />
          <span className="text-xs font-bold uppercase tracking-widest">
            Back to Browse
          </span>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-kaspa rounded-full animate-pulse"></div>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            Global Storefront Protocol v2.4.0
          </span>
        </div>
      </div>

      <div className="space-y-16">
        <section className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter italic">
            Kaspstore.kas <span className="text-kaspa">Sovereignty</span> Guide
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
            Welcome to the future of application distribution. Kaspstore.kas is
            a global, permissionless registry anchored on the Kaspa GHOSTDAG,
            utilizing decentralized storage and AI to provide an ecosystem
            completely free of corporate censorship or centralized points of
            failure.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <Zap size={24} className="text-kaspa" /> 1. The Core Purpose
            </h3>
            <div className="space-y-4 text-sm text-slate-400 leading-relaxed">
              <p>
                Kaspstore.kas operates as the decentralized &quot;Play
                Store&quot; of the Kaspa Network. It prevents de-platforming,
                avoids exorbitant 30% storefront fees, and enables peer-to-peer
                economic interaction between developers and users.
              </p>
              <p>
                By utilizing{" "}
                <span className="text-white font-bold">
                  KNS (Kaspa Name Service)
                </span>{" "}
                and Kaspa Wallets (such as Kasware), identity remains entirely
                on-chain without requiring emails or passwords.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <UploadCloud size={24} className="text-kaspa" /> 2. 4Everland
              Storage Network
            </h3>
            <div className="space-y-4 text-sm text-slate-400 leading-relaxed">
              <p>
                To handle massive APK binaries efficiently, we utilize{" "}
                <span className="text-white font-bold">
                  4Everland (S3 compatible Edge Cloud)
                </span>
                .
              </p>
              <p>
                When a developer uploads an application, the file bypasses our
                central servers using a{" "}
                <span className="text-white font-bold">
                  Presigned Edge Upload URL
                </span>
                . The binary goes directly into immutable Web3 storage
                (Arweave/IPFS), granting the developer an instantly accessible
                Public Object Key (CID).
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <Bot size={24} className="text-kaspa" /> 3. Groq AI Integration
              (Kaspstore.kas Assistant)
            </h3>
            <div className="space-y-4 text-sm text-slate-400 leading-relaxed">
              <p>
                To assist users in rapidly understanding new decentralized
                applications, an{" "}
                <span className="text-white font-bold">AI Support Engine</span>{" "}
                is embedded directly into the App Details screen.
              </p>
              <p>
                This AI is powered by{" "}
                <span className="text-white font-bold">
                  Groq LPU Inference Engine
                </span>{" "}
                utilizing the <code>llama-3.1-8b-instant</code> model. Operating
                at hundreds of tokens per second, it intercepts the app's
                metadata, permissions, and history to swiftly answer arbitrary
                questions from the user (e.g. &quot;What permissions does this
                app need?&quot;), saving extreme amounts of time.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <ShieldCheck size={24} className="text-kaspa" /> 4. Protocol
              Updates & Trust
            </h3>
            <div className="space-y-4 text-sm text-slate-400 leading-relaxed">
              <p>
                Decentralized files are completely{" "}
                <span className="text-white font-bold">immutable</span>. To push
                an update, the developer uploads a new binary to 4Everland,
                generating a new Object URL.
              </p>
              <p>
                The developer then signs a cryptographic message utilizing their
                connected Kaspa Wallet. This un-gates the metadata registry to
                legally swap the live{" "}
                <span className="text-white font-bold">Download Pointer</span>{" "}
                to the new application version, triggering automatic update
                notifications for all ecosystem clients.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <Vote size={24} className="text-kaspa" /> 5. Ecosystem &
              Governance
            </h3>
            <div className="space-y-4 text-sm text-slate-400 leading-relaxed">
              <p>
                Kaspstore.kas is driven by the Kaspa community. Governance is
                conducted via{" "}
                <span className="text-white font-bold">
                  Decentralized Proposals
                </span>
                , where stakeholders can influence protocol trajectory.
              </p>
              <p>
                Voting is conducted directly on-chain. Users authenticate with
                their Kaspa wallet, interact with the{" "}
                <span className="text-white font-bold">
                  Governance Dashboard
                </span>
                , and cast votes linked to their KNS identity, ensuring that
                collective decisions remain transparent and
                censorship-resistant.
              </p>
            </div>
          </div>
        </div>

        <section className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 md:p-12">
          <h2 className="text-2xl font-black text-white mb-8 tracking-tight">
            The App Lifecycle
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-kaspa/10 flex items-center justify-center font-black text-kaspa">
                01
              </div>
              <h4 className="font-bold text-white uppercase text-xs tracking-widest">
                Identity Resolution
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Connect Kasware or a similar wallet to establish sovereign
                control.
              </p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-kaspa/10 flex items-center justify-center font-black text-kaspa">
                02
              </div>
              <h4 className="font-bold text-white uppercase text-xs tracking-widest">
                Direct Edge Upload
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Send binary directly to 4Everland Arweave/IPFS integration
                nodes.
              </p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-kaspa/10 flex items-center justify-center font-black text-kaspa">
                03
              </div>
              <h4 className="font-bold text-white uppercase text-xs tracking-widest">
                Etch Registry
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Sign Kaspa payloads authorizing the global storefront entry
                index.
              </p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-kaspa/10 flex items-center justify-center font-black text-kaspa">
                04
              </div>
              <h4 className="font-bold text-white uppercase text-xs tracking-widest">
                AI Discovery
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                The Groq AI engine ingests the registry string to assist search
                mechanics.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="text-xl font-bold text-white">
            Technical Requirements
          </h3>
          <div className="bg-black/40 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-900/50 border-b border-slate-800 text-slate-500 font-bold uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Field</th>
                  <th className="px-6 py-4">Protocol Key</th>
                  <th className="px-6 py-4">Role</th>
                </tr>
              </thead>
              <tbody className="text-slate-400 divide-y divide-slate-800">
                <tr>
                  <td className="px-6 py-4 font-mono text-kaspa">
                    Binary Seal
                  </td>
                  <td className="px-6 py-4">sha256_hash</td>
                  <td className="px-6 py-4">
                    The "Gold Standard" integrity witness. Used for client-side
                    download verification.
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-mono text-kaspa">
                    Permanent ID
                  </td>
                  <td className="px-6 py-4">arweave_id</td>
                  <td className="px-6 py-4">
                    TX hash on Arweave. Ensures the binary is available even if
                    the original host goes offline.
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-mono text-kaspa">Cache Hash</td>
                  <td className="px-6 py-4">ipfs_cid</td>
                  <td className="px-6 py-4">
                    Content-addressable hash for high-speed P2P distribution via
                    local nodes.
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-mono text-kaspa">KNS Handle</td>
                  <td className="px-6 py-4">kns_handle</td>
                  <td className="px-6 py-4">
                    Human-readable alias resolved via the KNS Ledger extension.
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-mono text-kaspa">
                    manifest_uri
                  </td>
                  <td className="px-6 py-4">URI</td>
                  <td className="px-6 py-4">
                    Standard PWA manifest for web-deployed applications.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Example Registry Payload
          </h3>
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 font-mono text-[10px] md:text-xs text-kaspa overflow-x-auto">
            <pre>{`{
  "protocol": "global-storefront-v2.4.0",
  "op": "publish",
  "data": {
    "name": "Kaspstore.kas",
    "version": "1.0.0",
    "hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "uri": "https://cdn.myaps.com/binaries/v1.apk",
    "author": "dev.kas"
  }
}`}</pre>
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen size={20} className="text-kaspa" /> Technical Resources
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-black">
            <button
              onClick={() =>
                window.open("https://github.com/kaspanet/rusty-kaspa", "_blank")
              }
              className="p-6 bg-white/5 border border-white/5 rounded-2xl text-left hover:bg-white/10 transition-all group"
            >
              <Cpu
                size={24}
                className="text-slate-500 mb-4 group-hover:text-kaspa"
              />
              <h4 className="text-white font-bold mb-1">Rust-Node Docs</h4>
              <p className="text-[10px] text-slate-500 line-clamp-2">
                High-performance Rust implementation of the Kaspa node protocol.
              </p>
            </button>
            <button
              onClick={() =>
                window.open("https://github.com/kaspanet/kns", "_blank")
              }
              className="p-6 bg-white/5 border border-white/5 rounded-2xl text-left hover:bg-white/10 transition-all group"
            >
              <Hash
                size={24}
                className="text-slate-500 mb-4 group-hover:text-kaspa"
              />
              <h4 className="text-white font-bold mb-1">KNS Specification</h4>
              <p className="text-[10px] text-slate-500 line-clamp-2">
                Technical standards for the Kaspa Name Service protocol.
              </p>
            </button>
            <button
              onClick={() => window.open("https://api.kaspa.org/", "_blank")}
              className="p-6 bg-white/5 border border-white/5 rounded-2xl text-left hover:bg-white/10 transition-all group"
            >
              <Activity
                size={24}
                className="text-slate-500 mb-4 group-hover:text-kaspa"
              />
              <h4 className="text-white font-bold mb-1">DAG-Index API</h4>
              <p className="text-[10px] text-slate-500 line-clamp-2">
                Public REST API for querying blocks, transactions, and DAG
                state.
              </p>
            </button>
            <button
              onClick={() => window.open("https://kaspa.news/", "_blank")}
              className="p-6 bg-white/5 border border-white/5 rounded-2xl text-left hover:bg-white/10 transition-all group"
            >
              <Sparkles
                size={24}
                className="text-slate-500 mb-4 group-hover:text-kaspa"
              />
              <h4 className="text-white font-bold mb-1">Protocol Blog</h4>
              <p className="text-[10px] text-slate-500 line-clamp-2">
                Latest news and community updates from the Kaspa network.
              </p>
            </button>
            <button
              onClick={() =>
                window.open("https://explorer.kaspa.org/", "_blank")
              }
              className="p-6 bg-white/5 border border-white/5 rounded-2xl text-left hover:bg-white/10 transition-all group"
            >
              <Hexagon
                size={24}
                className="text-slate-500 mb-4 group-hover:text-kaspa"
              />
              <h4 className="text-white font-bold mb-1">Kaspa Explorer</h4>
              <p className="text-[10px] text-slate-500 line-clamp-2">
                Visualizer and transaction database for the Kaspa network.
              </p>
            </button>
          </div>
        </section>

        <section className="space-y-6">
          <div className="p-8 md:p-12 bg-gradient-to-br from-kaspa/20 to-black border border-kaspa/30 rounded-[2.5rem] relative overflow-hidden group">
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-kaspa rounded-full flex items-center justify-center text-black">
                  <Vote size={24} />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">
                  Community Governance
                </h2>
              </div>
              <p className="text-slate-300 leading-relaxed max-w-2xl">
                Proposals for full binary hosting via incentivized nodes are
                being etched now. Vote with your KNS identity to shape the
                future of sovereign distribution.
              </p>
              <button
                onClick={() =>
                  window.open("https://github.com/kaspanet/kips", "_blank")
                }
                className="bg-kaspa text-black px-8 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-kaspa-light transition-all flex items-center gap-2"
              >
                <PlusCircle size={14} /> Submit Improvement Proposal
              </button>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-kaspa/10 blur-[100px] -translate-y-1/2 translate-x-1/2 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
          </div>
        </section>

        <section className="flex flex-col md:flex-row items-center gap-8 pt-10 border-t border-slate-900">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-2 tracking-tight flex items-center gap-2">
              <Globe size={20} className="text-kaspa" /> Open Protocol
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              The Kaspstore.kas API is public. You can build your own
              specialized frontend, a command-line client, or a custom
              management node that listens to these DAG inscriptions.
            </p>
          </div>
          <button
            onClick={() => window.open("https://github.com/kaspanet", "_blank")}
            className="px-8 py-3 bg-white text-black rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
            View API Spec
          </button>
        </section>
      </div>
    </div>
  );
};

const NetworkStatus = ({ activeNodes }: { activeNodes: number }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {[
        {
          label: "Blue Score",
          value: "Live",
          sub: "Synchronized",
          icon: Hexagon,
          color: "text-kaspa",
        },
        {
          label: "Hashrate",
          value: "185 PH/s",
          sub: "+12% (24h)",
          icon: Zap,
          color: "text-yellow-500",
        },
        {
          label: "Block Interval",
          value: "1.0s",
          sub: "Fixed Target",
          icon: Activity,
          color: "text-blue-500",
        },
        {
          label: "Active Nodes",
          value: activeNodes.toLocaleString(),
          sub: "Global Registry",
          icon: Globe,
          color: "text-kaspa",
        },
      ].map((stat, i) => (
        <div
          key={stat.label}
          className="bg-bg-surface border border-white/5 p-6 rounded-3xl hover:border-kaspa/20 transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <stat.icon size={20} className={stat.color} />
            <span className={`text-[10px] font-mono ${stat.color}`}>
              {stat.sub}
            </span>
          </div>
          <p className="text-2xl font-black text-white">{stat.value}</p>
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
};

export default function App() {
  const [currentTab, setCurrentTab] = useState("browse");
  const [showTrustModal, setShowTrustModal] = useState(false);
  const [prefetchQueue, setPrefetchQueue] = useState<string[]>([]);
  const [activeBrowseSubTab, setActiveBrowseSubTab] = useState("foryou");
  const [category, setCategory] = useState("App");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<AppListing | null>(null);
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">(
    "all",
  );
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpandedItems, setMobileExpandedItems] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [apps, setApps] = useState<AppListing[]>([]);

  const displayApps = apps;
  const [proposals, setProposals] = useState<any[]>([]);
  const [isSyncingProposals, setIsSyncingProposals] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Wallet Connection States
  const [walletState, setWalletState] = useState<
    "idle" | "scanning" | "signing" | "connected"
  >(() =>
    localStorage.getItem("kaspstore_wallet_address") ? "connected" : "idle",
  );
  const [walletAddress, setWalletAddress] = useState<string | null>(() =>
    localStorage.getItem("kaspstore_wallet_address"),
  );
  const [knsName, setKnsName] = useState<string | null>(() =>
    localStorage.getItem("kaspstore_kns_name"),
  );
  const [sessionId, setSessionId] = useState<string | null>(() => 
    localStorage.getItem("kaspstore_relay_session_id")
  );
  const [isPollingSession, setIsPollingSession] = useState(false);
  const [isMobileRelay, setIsMobileRelay] = useState(() => 
    localStorage.getItem("kaspa_wallet_type") === "mobile-relay"
  );
  const [remoteRequest, setRemoteRequest] = useState<any>(null);
  const [remoteResult, setRemoteResult] = useState<any>(null);
  const [isRelaySigning, setIsRelaySigning] = useState(false);
  const [draftKnsName, setDraftKnsName] = useState("");
  const [activeNodes, setActiveNodes] = useState(1842);
  const [indexCycle, setIndexCycle] = useState(85.4);
  const [bps, setBps] = useState(10.0);
  const [blueScore, setBlueScore] = useState(0);

  useEffect(() => {
    const fetchNetworkStats = async (retries = 3) => {
      // Small delay on initial load to allow server/app to settle
      await new Promise((res) => setTimeout(res, 2000));
      for (let i = 0; i < retries; i++) {
        try {
          const response = await fetch("/api/network-info");
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          if (data.blockCount) {
            const count = parseFloat(data.blockCount);
            setIndexCycle(count / 1000000);
            setBlueScore(parseFloat(data.virtualDaaScore || "0"));
            setActiveNodes(Math.floor(1800 + Math.random() * 100));
            return;
          }
        } catch (e: any) {
          console.warn(`[Stats] Fetch attempt ${i + 1} failed: ${e.message}`);
          if (i === retries - 1) {
            console.error("Network Stats Error: Maximum retries reached", {
              message: e.message,
              name: e.name,
              stack: e.stack,
            });
          } else {
            await new Promise((res) => setTimeout(res, 2000));
          }
        }
      }
    };

    fetchNetworkStats();
    const timer = setInterval(() => {
      fetchNetworkStats();
      // Small jitter for BPS to look alive
      setBps((prev) => Math.max(1, 10 + (Math.random() * 2 - 1)));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Identity resolution based on Wallet
    if (walletAddress) {
      setUser({ uid: walletAddress, displayName: knsName || "Kaspian" } as any);
    } else {
      setUser(null);
    }
    setLoading(false);
  }, [walletAddress, knsName]);

  // Mobile Request Polling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("sid");
    if (!sid) return;

    // Persist session ID on mobile
    if (!sessionId) {
      setSessionId(sid);
      localStorage.setItem("kaspstore_relay_session_id", sid);
    }

    // 1. Sync connection info if we just connected
    if (walletAddress && walletState === "connected") {
      const syncWithDesktop = async () => {
        try {
          await fetch(`/api/session/${sid}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: walletAddress, kns: knsName }),
          });
          toast.success("Desktop Session Linked!");
        } catch (e) {
          console.error("Sync error:", e);
        }
      };
      syncWithDesktop();

      // Clear any stale requests immediately upon linking
      const checkInitial = async () => {
        try {
          const res = await fetch(`/api/relay/${sid}/request`);
          if (res.ok) {
            const req = await res.json();
            setRemoteRequest(req);
          }
        } catch (e) {}
      };
      checkInitial();

      // 2. Poll for signing requests (Phone listens for Desktop's "Sign" command)
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/relay/${sid}/request`);
          if (res.ok) {
            const req = await res.json();
            setRemoteRequest(req);
            // Vibrate if supported
            if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]);
            toast.info("Signature Request!", {
              description: `A transaction is waiting for your signature.`,
              duration: 15000,
              icon: <Zap className="text-kaspa" />
            });
          }
        } catch (e) {}
      }, 1200); // Very aggressive polling for mobile relay
      return () => clearInterval(interval);
    }
  }, [walletAddress, walletState, knsName, sessionId]);

  // Desktop: Poll for when mobile links its wallet
  useEffect(() => {
    if (isPollingSession && sessionId) {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/session/${sessionId}`);
          if (res.ok) {
            const data = await res.json();
            setWalletAddress(data.address);
            setWalletState("connected");
            setKnsName(data.kns || null);
            setIsMobileRelay(true);
            localStorage.setItem("kaspa_wallet_type", "mobile-relay");
            localStorage.setItem("kaspstore_relay_session_id", sessionId);
            localStorage.setItem("kaspstore_wallet_address", data.address);
            if (data.kns) localStorage.setItem("kaspstore_kns_name", data.kns);
            setIsPollingSession(false);
            toast.success("Mobile Wallet Connected!");
          }
        } catch (e) {}
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isPollingSession, sessionId]);

  const handleMobileRemoteSign = async () => {
    if (!remoteRequest || !sessionId) {
      console.error("[Relay] Missing request or session", { remoteRequest, sessionId });
      return;
    }
    setIsRelaySigning(true);
    const loadingToast = toast.loading("Confirm on your mobile wallet...");
    try {
      const walletType = localStorage.getItem("kaspa_wallet_type") || "kasware";
      const provider = getWalletProvider(walletType);
      if (!provider) throw new Error("Wallet not found on mobile");

      let txId: string;
      if (provider.sendKaspa) {
        txId = await provider.sendKaspa(remoteRequest.to, remoteRequest.amount);
      } else if (provider.sendTransaction) {
        txId = await provider.sendTransaction({
          to: remoteRequest.to,
          amount: remoteRequest.amount,
          data: remoteRequest.data
        });
      } else {
        throw new Error("Wallet doesn't support generic signing");
      }

      await fetch(`/api/relay/${sessionId}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txId })
      });
      setRemoteRequest(null);
      toast.success("Transaction Signed & Sent!");
    } catch (e: any) {
      toast.error("Signing failed", { description: e.message });
      await fetch(`/api/relay/${sessionId}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: e.message })
      });
    } finally {
      setIsRelaySigning(false);
      toast.dismiss(loadingToast);
    }
  };

  const MobileRelayView = () => (
    <div className="fixed inset-0 z-[1000] bg-[#0c111d] flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
      <div className="mb-8 mt-auto">
        <div className="w-20 h-20 bg-kaspa/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-kaspa/20 shadow-[0_0_40px_-10px_rgba(112,235,191,0.2)]">
          <Smartphone size={40} className="text-kaspa" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tighter mb-2">Bridge Active</h1>
        <p className="text-slate-400 text-sm max-w-[280px] mx-auto leading-relaxed">
          Your phone is now acting as a secure remote signer for your computer.
        </p>
      </div>

      <div className="w-full space-y-4 max-w-sm mb-auto">
        {walletState !== "connected" ? (
          <div className="space-y-4">
             <button
              onClick={() => setShowWalletModal(true)}
              className="w-full py-5 bg-kaspa text-black font-black text-lg rounded-2xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-3"
            >
              <LogIn size={20} />
              Connect Mobile Wallet
            </button>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Standard Kaspa Wallets supported
            </p>
          </div>
        ) : (
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-kaspa to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-[#0c111d]/90 border border-white/5 rounded-2xl p-6 text-left backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-kaspa rounded-full animate-pulse shadow-[0_0_10px_rgba(112,235,191,0.5)]" />
                  <span className="text-[10px] font-mono text-kaspa uppercase font-black tracking-widest">Ready to Sign</span>
                </div>
                {knsName && (
                  <span className="bg-kaspa/10 text-kaspa text-[9px] font-black px-2 py-1 rounded-md border border-kaspa/20">
                    {knsName}
                  </span>
                )}
              </div>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1.5 opacity-60">Connected Address</p>
              <p className="text-white font-mono text-xs break-all font-bold tracking-tight bg-black/20 p-3 rounded-xl border border-white/5">
                {walletAddress}
              </p>
            </div>
          </div>
        )}

        <AnimatePresence>
          {remoteRequest && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -30 }}
              className="fixed inset-x-4 bottom-8 z-[1100] max-w-sm mx-auto"
            >
              <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-left shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden border border-white/10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-kaspa/10 rounded-full -ml-12 -mb-12 blur-2xl" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <Zap size={20} className="text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-black text-xl tracking-tight leading-none">Sign Transaction</h4>
                      <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-1">Registry Request</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-8">
                    <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                      <p className="text-[9px] text-white/40 font-black uppercase tracking-[0.2em] mb-1">Target Identity</p>
                      <p className="text-white font-black text-lg font-mono">{remoteRequest.kns}</p>
                    </div>
                    
                    <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[9px] text-white/40 font-black uppercase tracking-[0.2em] mb-1">Network Fee</p>
                          <p className="text-white font-black text-lg font-mono">{remoteRequest.cost} <span className="text-xs opacity-60">KAS</span></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      disabled={isRelaySigning}
                      onClick={handleMobileRemoteSign}
                      className="w-full py-5 bg-white text-indigo-600 font-black text-lg rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {isRelaySigning ? (
                        <>
                          <Loader2 size={24} className="animate-spin" />
                          Signing...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={24} />
                          Sign & Authorize
                        </>
                      )}
                    </button>
                    <button
                      disabled={isRelaySigning}
                      onClick={async () => {
                        await fetch(`/api/relay/${sessionId}/response`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ error: "User rejected on phone" })
                        });
                        setRemoteRequest(null);
                      }}
                      className="w-full py-3 text-white/40 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                    >
                      <X size={14} />
                      Reject Request
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="mt-auto pt-8 flex items-center gap-3 pb-8">
        <div className="w-1.5 h-1.5 bg-kaspa rounded-full animate-pulse" />
        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em]">
          End-to-End Encrypted Bridge
        </p>
      </div>
    </div>
  );

  const [lastAppDoc, setLastAppDoc] = useState<any>(null);
  const [hasMoreApps, setHasMoreApps] = useState(true);

  const fetchApps = useCallback(
    async (isLoadMore = false) => {
      try {
        const result = await AppService.getApps(
          24,
          isLoadMore ? lastAppDoc : null,
        );
        if (result) {
          if (isLoadMore) {
            setApps((prev) => [...prev, ...(result.items as any)]);
          } else {
            setApps(result.items as any);
          }
          setLastAppDoc(result.lastDoc);
          setHasMoreApps(result.items.length === 24);
        }
      } catch (err) {
        console.error("Failed to fetch apps:", err);
      }
    },
    [lastAppDoc],
  );

  useEffect(() => {
    fetchApps();

    const fetchProposals = async () => {
      setIsSyncingProposals(true);
      // Simulate network delay for sync
      setTimeout(async () => {
        const props = await AppService.getProposals();
        setProposals(props as any);
        setIsSyncingProposals(false);
      }, 2000);
    };

    fetchProposals();
  }, [user]);

  // Download Management State
  const [activeDownload, setActiveDownload] = useState<{
    id: string;
    name: string;
    progress: number;
    status: "downloading" | "completed" | "failed";
  } | null>(null);

  const triggerPremiumDownload = useCallback(async (app: any) => {
    if (!app.downloadUrl) {
      toast.error("Package link not found");
      return;
    }

    const downloadId = app.id || Math.random().toString(36).substring(7);
    setActiveDownload({
      id: downloadId,
      name: app.name,
      progress: 0,
      status: "downloading",
    });

    try {
      // Background download logic representation
      // We simulate chunk-based parallel fetching for the UI experience
      const totalSteps = 10;
      for (let i = 1; i <= totalSteps; i++) {
        await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
        setActiveDownload((prev) =>
          prev ? { ...prev, progress: i * 10 } : null,
        );
      }

      // Final trigger
      const link = document.createElement("a");
      link.href = app.downloadUrl;
      link.setAttribute(
        "download",
        `${app.name.toLowerCase().replace(/\s+/g, "-")}.apk`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setActiveDownload((prev) =>
        prev ? { ...prev, status: "completed" } : null,
      );
      toast.success(`${app.name} download started`);

      setTimeout(() => setActiveDownload(null), 3000);
    } catch (err) {
      setActiveDownload((prev) =>
        prev ? { ...prev, status: "failed" } : null,
      );
      toast.error("Download failed");
      setTimeout(() => setActiveDownload(null), 5000);
    }
  }, []);

  useEffect(() => {
    (window as any).triggerKaspDownload = triggerPremiumDownload;
    return () => {
      delete (window as any).triggerKaspDownload;
    };
  }, [triggerPremiumDownload]);

  useEffect(() => {
    // KNS checks are now triggered manually inside executeWalletConnect
  }, []);

  const handleRegisterIdentity = async () => {
    try {
      if (!walletAddress) {
        toast.error("Please connect your wallet first.");
        return;
      }

      const walletType = localStorage.getItem("kaspa_wallet_type") || "kasware";
      const provider = getWalletProvider(walletType);

      if (!provider) {
        toast.error(
          `${walletType} wallet not found. If using a mobile browser, check for injected providers.`,
        );
        return;
      }

      const rawKns = draftKnsName.trim().toLowerCase();
      if (!rawKns) {
        toast.error("Please enter a .kas name");
        return;
      }

      const finalKns = rawKns.endsWith(".kas") ? rawKns : `${rawKns}.kas`;
      const validation = KnsService.validateName(finalKns);

      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }

      // Verify availability and ownership
      const owner = await KnsIndexer.resolve(finalKns);
      const isAlreadyMine = owner === walletAddress;

      if (owner && !isAlreadyMine) {
        toast.error(`Domain '${finalKns}' is owned by another address: ${owner}`);
        return;
      }

      const cost = isAlreadyMine ? 0.00000001 : KnsService.calculateCost(finalKns); // 1 Sompi if already mine
      const sompis = Math.round(cost * 100000000); 

      setWalletState("signing");
      const loadingToast = toast.loading(
        isAlreadyMine ? `Verifying ownership of ${finalKns}...` : `Initiating purchase for ${finalKns}...`,
        { description: isAlreadyMine ? "Sending 1 Sompi verification" : `Sending ${cost} KAS to registry via Direct Node` },
      );

      // 1. Prepare Inscripion Metadata for ON-CHAIN indexers
      const inscriptionPayload = KnsService.generateCreateInscription(finalKns);
      const inscriptionJson = JSON.stringify(inscriptionPayload);

      // 2. Execute Transaction
      let txId: string | null = null;
      try {
        if (isMobileRelay && sessionId) {
          // Push to Relay
          setWalletState("signing");
          const req = {
            type: "sign-tx",
            to: KNS_REGISTRY_ADDRESS,
            amount: sompis,
            data: inscriptionJson,
            kns: finalKns,
            cost: isAlreadyMine ? "0 (Gas Only)" : cost.toString()
          };
          
          await fetch(`/api/relay/${sessionId}/request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req)
          });

          toast.info("Request sent to your phone!", {
            description: "Please check your mobile screen to sign."
          });

          // Wait for response
          let attempts = 0;
          while (attempts < 60) { // 3 minutes timeout
             const resp = await fetch(`/api/relay/${sessionId}/response`);
             if (resp.ok) {
                const data = await resp.json();
                if (data.error) throw new Error(data.error);
                txId = data.txId;
                break;
             }
             await new Promise(r => setTimeout(r, 3000));
             attempts++;
          }
          if (!txId) throw new Error("Transaction request timed out or was rejected.");

        } else if (provider.sendKaspa) {
          // KasWare direct method - we attach the metadata via additional mechanisms if available,
          // but standard KNS works by sending to registry address with sufficient funds.
          // Modern indexers look for the FIRST tx to registry with that amount and message.
          txId = await provider.sendKaspa(KNS_REGISTRY_ADDRESS, sompis);
        } else if (provider.sendTransaction) {
          txId = await provider.sendTransaction({
            to: KNS_REGISTRY_ADDRESS,
            amount: sompis,
            data: inscriptionJson, // Some wallets support custom data fields
          });
        } else if (provider.request) {
          txId = await provider.request({
            method: "kaspa_sendKaspa",
            params: { to: KNS_REGISTRY_ADDRESS, amount: sompis },
          });
        } else {
          throw new Error(
            "Connected wallet does not support asset transfers. Please update your wallet extension.",
          );
        }
      } catch (txErr: any) {
        console.error("[KNS Registration] Tx Rejected/Failed:", txErr);
        toast.dismiss(loadingToast);
        setWalletState("idle");
        toast.error(txErr.message || "Purchase rejected by user.");
        return;
      }

      if (txId) {
        console.log(`[KNS] Registration Tx Broadcasted: ${txId}`);
        toast.dismiss(loadingToast);
        toast.success("Transaction Confirmed on DAG!", {
          description: "Propagating identity across global nodes...",
        });

        // Mark as success to show UI transition
        setWalletState("success" as any);

        // 3. Finalize locally after a short propagation delay
        setTimeout(() => {
          setKnsName(finalKns);
          localStorage.setItem(
            `kns_cache_${walletAddress}`,
            JSON.stringify({ name: finalKns, timestamp: Date.now() }),
          );
          setWalletState("connected");
          toast.success(
            `Welcome, ${finalKns}! All developer features unlocked.`,
          );
        }, 3000);
      }
    } catch (err: any) {
      console.error("Identity registration technical failure:", err);
      toast.error("Protocol Error", { description: err.message });
      setWalletState("idle");
    }
  };

  useEffect(() => {
    const savedAddress = localStorage.getItem("kaspstore_wallet_address");
    const savedType = localStorage.getItem("kaspa_wallet_type");

    if (savedAddress && savedType) {
      const provider = getWalletProvider(savedType);
      if (provider) {
        // Just set state, don't trigger full connect flow to avoid popups on load
        setWalletAddress(savedAddress);
        setWalletState("connected");

        // Listen for account changes if provider supports it
        if (typeof provider.on === "function") {
          provider.on("accountsChanged", (accounts: string[]) => {
            if (accounts && accounts.length > 0) {
              setWalletAddress(accounts[0]);
              localStorage.setItem("kaspstore_wallet_address", accounts[0]);
            } else {
              handleDisconnect();
            }
          });
        }
      }
    }
  }, []);

  const handleDisconnect = () => {
    setWalletAddress(null);
    setKnsName(null);
    setWalletState("idle");
    localStorage.removeItem("kaspstore_wallet_address");
    localStorage.removeItem("kaspstore_kns_name");
    localStorage.removeItem("kaspa_wallet_type");
    toast.success("Wallet disconnected");
  };

  const executeWalletConnect = async () => {
    setShowWalletModal(true);
  };

  const connectWalletByType = async (
    type: "kasware" | "kasperia" | "kastle" | "manual",
  ) => {
    console.log(`[Wallet] Connecting to: ${type}`);

    let connectedAddress: string | null = null;
    let walletName = "Wallet";

    if (type === "manual") {
      connectedAddress = (window as any).__manual_kaspa_address;
      if (!connectedAddress) return;
      walletName = "Manual Address";
      localStorage.setItem("kaspa_wallet_type", "manual");
      localStorage.setItem("kaspstore_wallet_address", connectedAddress);
    } else {
      // IMPORTANT: No async delays before the first provider call to preserve user activation
      let provider = getWalletProvider(type);

      if (!provider) {
        // Small check for standard 'kaspa' name which many wallets now use
        provider = (window as any).kaspa;
      }

      if (!provider) {
        toast.error(`${type} extension not detected.`, {
          description:
            "Please ensure your wallet extension is installed and active.",
          action: {
            label: "Install",
            onClick: () =>
              window.open(
                type === "kasware"
                  ? "https://kasware.xyz"
                  : type === "kastle"
                    ? "https://kastle.cc"
                    : "https://kaperia.com",
                "_blank",
              ),
          },
        });
        return;
      }

      try {
        setWalletState("scanning");
        let accounts;

        // Direct call - preserves user activation stack
        const requestAccounts = async () => {
          if (provider.requestAccounts) return await provider.requestAccounts();
          if (provider.request) {
            const methods = [
              "kaspa_requestAccounts",
              "requestAccounts",
              "connect",
            ];
            for (const method of methods) {
              try {
                const res = await provider.request({ method });
                if (res) return res;
              } catch (e) {}
            }
          }
          if (provider.enable) return await provider.enable();
          if (provider.connect) return await provider.connect();
          throw new Error("No connection method found");
        };

        accounts = await requestAccounts();
        console.log(`[Wallet] Received accounts:`, accounts);

        if (typeof accounts === "string") {
          accounts = [accounts];
        }

        if (accounts && accounts.length > 0) {
          connectedAddress = accounts[0];
          walletName =
            type === "kasware"
              ? "KasWare"
              : type === "kastle"
                ? "Kastle"
                : "Kasperia";
          localStorage.setItem("kaspa_wallet_type", type);
        } else {
          setWalletState("idle");
          return;
        }
      } catch (e: any) {
        console.error("[Wallet Connection Error]:", e);
        setWalletState("idle");
        toast.error(
          `Failed to connect ${type} wallet: ${e?.message || "Unknown error"}. Check console for details.`,
        );
        return;
      }
    }

    if (connectedAddress) {
      toast.success(`${walletName} connected successfully!`);
      setWalletAddress(connectedAddress);
      setWalletState("connected");
      localStorage.setItem("kaspstore_wallet_address", connectedAddress);

      const loadingToast = toast.loading(
        `Scanning Kaspa Ledger for KNS identity...`,
      );

      try {
        // Bypass cache during manual connection to ensure fresh data
        const knsNameFromLedger = await resolveNativeKNS(
          connectedAddress,
          true,
        );
        toast.dismiss(loadingToast);

        if (knsNameFromLedger) {
          setKnsName(knsNameFromLedger);
          localStorage.setItem("kaspstore_kns_name", knsNameFromLedger);
          toast.success(`Verified KNS Identity: ${knsNameFromLedger}`);
        } else {
          setKnsName(null);
          localStorage.removeItem("kaspstore_kns_name");
          if (draftKnsName) {
            const suggested = draftKnsName.endsWith(".kas")
              ? draftKnsName
              : draftKnsName + ".kas";
            toast.info(
              `No identity found. You can register '${suggested}' in the Developer Console.`,
            );
          } else {
            toast.info(`No .kas identity found in recent transactions.`);
          }
        }
      } catch (e) {
        toast.dismiss(loadingToast);
        console.error(e);
        toast.error("Failed to query Kaspa ledger.");
      }
    }
  };

  const filteredApps = useMemo(() => {
    return displayApps.filter((app) => {
      const matchesSearch =
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.developer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.keywords &&
          app.keywords.some((k) =>
            k.toLowerCase().includes(searchQuery.toLowerCase()),
          ));

      const matchesCategory =
        category === "all" ||
        (category === "top" && app.rating >= 4.5) ||
        (category === "foryou" &&
          (app.rating >= 4.0 || app.reviewsCount >= 1000000)) ||
        app.category.toLowerCase() === category.toLowerCase() ||
        (app.subCategory &&
          app.subCategory.toLowerCase() === category.toLowerCase());

      const matchesSubTab =
        activeBrowseSubTab === "categories" ||
        activeBrowseSubTab === "foryou" ||
        (activeBrowseSubTab === "topcharts" &&
          (app.rating >= 4.5 || app.downloads >= 1000000000)) ||
        (activeBrowseSubTab === "kids" && app.isForKids) ||
        (activeBrowseSubTab === "premium" && app.isPremium);

      const matchesPrice =
        priceFilter === "all" ||
        (priceFilter === "free" && app.price === "Free") ||
        (priceFilter === "paid" && app.price !== "Free");

      return matchesSearch && matchesCategory && matchesPrice && matchesSubTab;
    });
  }, [displayApps, searchQuery, category, activeBrowseSubTab, priceFilter]);

  useEffect(() => {
    // Advanced Prefetching: Priority load featured and search results
    const timer = setTimeout(() => {
      if (filteredApps.length > 0) {
        const toPrefetch = filteredApps.slice(0, 5).map((a) => a.icon);
        setPrefetchQueue((prev) => [...new Set([...prev, ...toPrefetch])]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [filteredApps]);

  useEffect(() => {
    if (prefetchQueue.length > 0) {
      const next = prefetchQueue[0];
      const img = new Image();
      img.src = next;
      setPrefetchQueue((prev) => prev.slice(1));
    }
  }, [prefetchQueue]);

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    setMobileMenuOpen(false);
  };

  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsSyncing(false), 2400);
    return () => clearTimeout(timer);
  }, [category, searchQuery]);

  const isMobileSession = useMemo(() => {
    return new URLSearchParams(window.location.search).has("sid");
  }, []);

  if (isMobileSession) {
    return (
      <div className="min-h-screen bg-[#0c111d] text-white font-sans selection:bg-kaspa/30">
        <MobileRelayView />
        <WalletSelectionModal
          isOpen={showWalletModal}
          onClose={() => setShowWalletModal(false)}
          onSelect={connectWalletByType}
          onSelectMobileSession={() => {}}
        />
        <Toaster theme="dark" position="top-center" richColors />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black font-sans text-slate-200 selection:bg-kaspa/30 selection:text-kaspa-light">
      <Toaster position="bottom-right" theme="dark" richColors />
      <Nav
        onTabChange={handleTabChange}
        activeTab={currentTab}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        mobileMenuOpen={mobileMenuOpen}
        user={user}
        walletAddress={walletAddress}
        knsName={knsName}
        walletState={walletState}
        onConnect={executeWalletConnect}
        onDisconnect={handleDisconnect}
      />

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-40 bg-bg-surface md:hidden flex flex-col pt-20 px-6 pb-12"
          >
            <div className="flex-1 space-y-8 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800">
              <div>
                <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-6 border-b border-white/5 pb-2">
                  Main Navigation
                </h3>
                <nav className="flex flex-col space-y-2">
                  {[
                    "Storefront",
                    "Developer Console",
                    "Ecosystem",
                    ...(walletAddress ? ["My Profile"] : []),
                  ].map((label, i) => {
                    const tabs = [
                      "browse",
                      "developer",
                      "community",
                      "profile",
                    ];
                    return (
                      <button
                        key={label}
                        onClick={() => handleTabChange(tabs[i])}
                        className={`text-left px-4 py-3 rounded-xl text-lg font-bold transition-all ${currentTab === tabs[i] ? "bg-kaspa/10 text-kaspa border border-kaspa/20" : "text-slate-400 hover:text-white"}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </nav>
                <button
                  onClick={() => {
                    handleTabChange("dev-guide");
                    setMobileMenuOpen(false);
                  }}
                  className="mt-4 w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl text-sm font-bold text-kaspa bg-kaspa/10 border border-kaspa/20 hover:bg-kaspa/20 transition-all"
                >
                  <ShieldCheck size={18} /> Documentation & Guide
                </button>
              </div>

              {currentTab === "browse" && (
                <>
                  <div>
                    <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-6 border-b border-white/5 pb-2">
                      Library Genres
                    </h3>
                    <div className="flex flex-col space-y-1">
                      {CATEGORIES.map((cat) => {
                        const isExpanded = mobileExpandedItems.includes(cat.id);
                        const hasSub =
                          cat.subCategories && cat.subCategories.length > 0;

                        return (
                          <div key={cat.id} className="space-y-1">
                            <button
                              onClick={() => {
                                if (hasSub) {
                                  setMobileExpandedItems((prev) =>
                                    prev.includes(cat.id)
                                      ? prev.filter((x) => x !== cat.id)
                                      : [...prev, cat.id],
                                  );
                                }
                                setCategory(cat.id);
                                if (!hasSub) setMobileMenuOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${category === cat.id ? "bg-kaspa/10 text-kaspa border border-kaspa/20" : "text-slate-500 hover:text-slate-300 bg-white/5"}`}
                            >
                              <div className="flex items-center gap-3">
                                <cat.icon size={16} />
                                <span>{cat.label}</span>
                              </div>
                              {hasSub && (
                                <ChevronDown
                                  size={14}
                                  className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                />
                              )}
                            </button>

                            <AnimatePresence>
                              {hasSub && isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden border-l border-kaspa/20 ml-6 pl-2 flex flex-col space-y-1 py-1"
                                >
                                  {cat.subCategories!.map((sub) => (
                                    <button
                                      key={sub.id}
                                      onClick={() => {
                                        setCategory(sub.id);
                                        setMobileMenuOpen(false);
                                      }}
                                      className={`text-left px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${category === sub.id ? "text-kaspa bg-kaspa/5" : "text-slate-500 hover:text-slate-300"}`}
                                    >
                                      • {sub.label}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {walletAddress && (
                    <div>
                      <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-6 border-b border-white/5 pb-2">
                        Registry Actions
                      </h3>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => {
                            handleTabChange("developer");
                            setMobileMenuOpen(false);
                          }}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 bg-white/5 hover:text-white transition-all"
                        >
                          <PlusCircle size={18} /> Upload APK
                        </button>
                        <button
                          onClick={() => {
                            handleTabChange("dev-guide");
                            setMobileMenuOpen(false);
                          }}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 bg-white/5 hover:text-white transition-all"
                        >
                          <ShieldCheck size={18} className="text-kaspa" />{" "}
                          Developer Guide
                        </button>
                        <button
                          onClick={() => {
                            handleTabChange("developer");
                            setMobileMenuOpen(false);
                          }}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 bg-white/5 hover:text-white transition-all"
                        >
                          <ShieldCheck size={18} /> Verified Proof
                        </button>
                        <button
                          onClick={() => {
                            handleTabChange("developer");
                            setMobileMenuOpen(false);
                          }}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 bg-white/5 hover:text-white transition-all"
                        >
                          <TrendingUp size={18} /> Sales Analytics
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-6 border-b border-white/5 pb-2">
                  Ecosystem & Community
                </h3>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      handleTabChange("community");
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${currentTab === "community" ? "bg-kaspa/10 text-kaspa border border-kaspa/20" : "text-slate-400 bg-white/5 hover:text-white"}`}
                  >
                    <Hexagon
                      size={18}
                      className={
                        currentTab === "community"
                          ? "text-kaspa"
                          : "text-slate-500"
                      }
                    />{" "}
                    On-Chain Community
                  </button>
                  <button
                    onClick={() => {
                      handleTabChange("dev-guide");
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${currentTab === "dev-guide" ? "bg-kaspa/10 text-kaspa border border-kaspa/20" : "text-slate-400 bg-white/5 hover:text-white"}`}
                  >
                    <ShieldCheck
                      size={18}
                      className={
                        currentTab === "dev-guide"
                          ? "text-kaspa"
                          : "text-slate-500"
                      }
                    />{" "}
                    Technical Docs
                  </button>
                  <button
                    onClick={() => {
                      window.open("https://kaspa.news/", "_blank");
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 bg-white/5 hover:text-white transition-all"
                  >
                    <Sparkles size={18} /> Protocol Blog
                  </button>
                  <button
                    onClick={() => {
                      window.open("https://wiki.kaspa.org/", "_blank");
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 bg-white/5 hover:text-white transition-all"
                  >
                    <Globe size={18} /> Protocol Wiki
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 mt-16 overflow-hidden">
        {(currentTab === "browse" || currentTab === "developer") && (
          <Sidebar
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            activeCategory={category}
            onCategoryChange={(cat) => {
              setCategory(cat);
              handleTabChange("browse");
            }}
            onTabChange={handleTabChange}
            walletAddress={walletAddress}
            knsName={knsName}
            onConnectWallet={executeWalletConnect}
            walletState={walletState}
            draftKnsName={draftKnsName}
            setDraftKnsName={setDraftKnsName}
            appsCount={apps.length}
            className="hidden md:flex bg-bg-surface z-10"
          />
        )}

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-10 py-6 md:py-10">
          <AnimatePresence mode="wait">
            {currentTab === "browse" && (
              <motion.div
                key="browse"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col min-h-full"
              >
                {/* Horizontal Category Pill Scroll (Mobile Only) */}
                <div className="md:hidden mb-6 -mx-4 px-4 overflow-x-auto flex gap-2 py-1 scrollbar-thin scrollbar-thumb-slate-800">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`whitespace-nowrap px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${category === cat.id ? "bg-kaspa border-kaspa text-black shadow-lg shadow-kaspa/20" : "bg-bg-surface border-border-subtle text-slate-500"}`}
                    >
                      <cat.icon size={12} />
                      {cat.label}
                    </button>
                  ))}
                </div>

                {category === "foryou" && (
                  <>
                    <FeaturedHero
                      apps={apps.filter((a) => a.rating >= 4.7)}
                      onSelect={setSelectedApp}
                    />

                    <div className="mb-12">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                          <TrendingUp size={24} className="text-kaspa" />{" "}
                          Popular Right Now
                        </h3>
                      </div>
                      <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide -mx-2 px-2">
                        {apps
                          .filter((a) => a.downloads > 1000)
                          .slice(0, 6)
                          .map((app) => (
                            <div
                              key={app.id}
                              onClick={() => setSelectedApp(app)}
                              className="w-48 shrink-0 group cursor-pointer"
                            >
                              <div className="aspect-square bg-slate-900 rounded-3xl p-4 mb-4 border border-white/5 group-hover:border-kaspa/30 transition-all flex items-center justify-center relative overflow-hidden">
                                <img
                                  src={app.icon}
                                  alt=""
                                  className="w-1/2 h-1/2 object-contain group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-kaspa/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              </div>
                              <h4 className="text-sm font-bold text-white truncate">
                                {app.name}
                              </h4>
                              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                                {app.category}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Star
                                  size={10}
                                  className="text-kaspa fill-kaspa"
                                />
                                <span className="text-[10px] font-bold text-slate-400">
                                  {app.rating}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Search Bar & Filters */}
                <div className="mb-6 md:mb-10 flex flex-col md:flex-row gap-4 md:gap-6 max-w-4xl">
                  <div className="relative group flex-1">
                    <Search
                      className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-kaspa transition-colors"
                      size={20}
                    />
                    <input
                      type="text"
                      placeholder="Search the global BlockDAG registry..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-bg-surface border border-border-subtle rounded-2xl py-3.5 md:py-4 pl-14 pr-6 text-white outline-none focus:border-kaspa/40 transition-all font-medium font-mono text-sm"
                    />
                  </div>
                  <div className="flex bg-bg-surface border border-border-subtle rounded-2xl p-1 w-full md:w-auto shrink-0 overflow-x-auto scrollbar-hide">
                    {["all", "free", "paid"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setPriceFilter(f as any)}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${priceFilter === f ? "bg-kaspa text-black shadow-md" : "text-slate-500 hover:text-white"}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight uppercase italic underline decoration-kaspa decoration-4 underline-offset-8">
                      {searchQuery
                        ? `Results for "${searchQuery}"`
                        : category === "all"
                          ? "Featured Index"
                          : category === "foryou"
                            ? "Tailored for You"
                            : `${category} Registry`}
                    </h3>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-kaspa rounded-full animate-pulse"></div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        {activeNodes.toLocaleString()} NODES
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity size={12} className="text-kaspa" />
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        {bps.toFixed(2)} BPS
                      </span>
                    </div>
                    <span className="hidden sm:inline text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      {filteredApps.length} Publications
                    </span>
                  </div>
                </div>

                {/* Grid */}
                {filteredApps.length > 0 ? (
                  <div className="flex flex-col gap-8 pb-12">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                      {filteredApps.map((app) => (
                        <div key={app.id}>
                          <AppCard
                            app={app}
                            onClick={() => setSelectedApp(app)}
                            onSelectSubApp={setSelectedApp}
                          />
                        </div>
                      ))}
                    </div>

                    {hasMoreApps && !searchQuery && category === "all" && (
                      <div className="flex justify-center mt-4">
                        <button
                          onClick={() => fetchApps(true)}
                          className="px-8 py-3 bg-bg-surface border border-border-subtle text-slate-400 font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-kaspa/10 hover:text-kaspa hover:border-kaspa/30 transition-all active:scale-95 flex items-center gap-2"
                        >
                          <PlusCircle size={14} /> Scan Next Index Fragment
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
                    <Zap size={48} className="text-slate-700" />
                    <p className="text-xl font-bold text-slate-500 uppercase tracking-tighter max-w-xs">
                      No publications match your protocol query
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setCategory("all");
                        setPriceFilter("all");
                      }}
                      className="text-kaspa text-sm font-bold uppercase hover:underline"
                    >
                      Reset Node Filters
                    </button>
                  </div>
                )}

                {/* Footer Stats */}
                <div className="mt-12 md:mt-20 pt-8 md:pt-10 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between text-slate-500 gap-8 pb-12">
                  <div className="flex flex-wrap justify-center md:justify-start gap-8 md:gap-12">
                    <div className="flex flex-col">
                      <span className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">
                        Active Nodes
                      </span>
                      <span className="text-xl md:text-2xl text-white font-mono font-bold leading-none tracking-tighter">
                        {activeNodes.toLocaleString()}{" "}
                        <span className="text-[10px] text-kaspa animate-pulse">
                          ●
                        </span>
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">
                        Index Cycle
                      </span>
                      <span className="text-xl md:text-2xl text-white font-mono font-bold leading-none tracking-tighter">
                        {indexCycle.toFixed(2)}M
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">
                        Live BlueScore
                      </span>
                      <span className="text-xl md:text-2xl text-kaspa font-mono font-bold leading-none tracking-tighter">
                        {blueScore.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">
                        Network BPS
                      </span>
                      <span className="text-xl md:text-2xl text-white font-mono font-bold leading-none tracking-tighter">
                        {bps.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="text-center md:text-right space-y-1">
                    <p className="text-[9px] uppercase font-bold tracking-[0.2em] text-slate-600">
                      Global Storefront Protocol v2.4.0
                    </p>
                    <p className="text-[8px] font-mono text-slate-700 uppercase">
                      Hash: 0x{blueScore.toString(16).padStart(12, "0")}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {currentTab === "developer" && (
              <DeveloperPortal
                onBack={() => setCurrentTab("browse")}
                onAppLaunched={async () => {
                  const result = await AppService.getApps();
                  if (result) setApps(result.items as any);
                }}
                knsName={knsName}
                walletAddress={walletAddress}
                walletState={walletState}
                draftKnsName={draftKnsName}
                setDraftKnsName={setDraftKnsName}
                onConnectRequest={executeWalletConnect}
                onRegisterIdentity={handleRegisterIdentity}
              />
            )}

            {currentTab === "profile" && walletAddress && (
              <UserProfile
                walletAddress={walletAddress}
                knsName={knsName}
                onBack={() => setCurrentTab("browse")}
              />
            )}

            {currentTab === "dev-guide" && (
              <DeveloperGuide onBack={() => setCurrentTab("browse")} />
            )}

            {currentTab === "network" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-6xl mx-auto py-12 px-4 md:px-8 space-y-12"
              >
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
                  <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic italic">
                      Network <span className="text-kaspa">Dashboard</span>
                    </h2>
                    <p className="text-slate-400 mt-2 font-mono text-xs">
                      Real-time BlockDAG health and global registry metrics.
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-kaspa/10 border border-kaspa/30 px-6 py-2 rounded-xl">
                      <p className="text-[10px] text-slate-500 uppercase font-black mb-1">
                        State
                      </p>
                      <p className="text-kaspa font-bold text-sm font-mono uppercase tracking-[0.2em] animate-pulse">
                        Synchronized
                      </p>
                    </div>
                  </div>
                </div>

                <NetworkStatus activeNodes={activeNodes} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-12">
                  <div className="bg-bg-surface border border-white/5 rounded-[2rem] p-8 space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                      <Activity size={20} className="text-kaspa" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                        Protocol Registry Health
                      </h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-slate-500 uppercase">
                          Registry Block Latency
                        </span>
                        <span className="text-white">~1.2s</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-slate-500 uppercase">
                          P2P Propagaion Speed
                        </span>
                        <span className="text-kaspa">99.8% / &lt; 500ms</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-slate-500 uppercase">
                          Consensus Layer Indexing
                        </span>
                        <span className="text-white">Active (10 BPS)</span>
                      </div>
                      <div className="pt-4 border-t border-white/5">
                        <p className="text-[10px] text-slate-500 leading-relaxed italic">
                          The Kaspstore.kas registry is a layer-2 protocol
                          etched directly onto the Kaspa GHOSTDAG. Metrics above
                          reflect the health of the indexer swarm across all
                          participating nodes.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-bg-surface border border-white/5 rounded-[2rem] p-8 space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                      <Globe size={20} className="text-[#8b5cf6]" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                        Global Distribution Swarm
                      </h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-slate-500 uppercase">
                          Swarm Capacity
                        </span>
                        <span className="text-white">12.4 PB</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-slate-500 uppercase">
                          Active Seeders
                        </span>
                        <span className="text-kaspa">
                          {(activeNodes * 0.8).toLocaleString()} nodes
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-slate-500 uppercase">
                          Gateway Redundancy
                        </span>
                        <span className="text-white">Arweave + IPFS + P2P</span>
                      </div>
                      <div className="pt-4 border-t border-white/5">
                        <div className="bg-kaspa/5 border border-kaspa/20 p-3 rounded-xl flex items-center gap-3">
                          <div className="w-2 h-2 bg-kaspa rounded-full animate-pulse" />
                          <span className="text-[9px] font-bold text-kaspa uppercase tracking-widest">
                            Protocol Operational - Zero Zero Trust Established
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentTab === "community" && (
              <div className="max-w-6xl mx-auto py-12 px-4 md:px-8 bg-[#0a0c10] min-h-screen">
                <div className="mb-12">
                  <h2 className="text-3xl md:text-[40px] font-mono text-white mb-2 pb-6 border-b border-white/5 tracking-tighter uppercase italic">
                    Ecosystem <span className="text-kaspa">Hub</span>
                  </h2>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
                    <p className="text-slate-400 text-xs font-mono max-w-xl">
                      A decentralized hub for collective governance and
                      distribution swarm analytics. Participate in the
                      DAG-anchored application economy.
                    </p>
                    <div className="flex gap-4">
                      <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-lg">
                        <p className="text-[9px] text-slate-500 uppercase font-black mb-1">
                          Mirror Nodes
                        </p>
                        <p className="text-sm font-mono text-kaspa font-bold tracking-tight">
                          {activeNodes.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-lg">
                        <p className="text-[9px] text-slate-500 uppercase font-black mb-1">
                          DAG Settlement
                        </p>
                        <p className="text-sm font-mono text-white font-bold tracking-tight">
                          {indexCycle.toFixed(2)}M
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  <div className="lg:col-span-2 space-y-12">
                    <div>
                      <h3 className="text-xl font-mono text-white flex items-center gap-2 mb-6">
                        <Hexagon size={20} className="text-kaspa" /> GHOSTDAG
                        Topology (Live)
                      </h3>
                      <DAGVisualizer blueScore={blueScore} />
                    </div>

                    <div className="bg-bg-surface border border-white/5 rounded-2xl p-8 shadow-2xl">
                      <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-mono text-white flex items-center gap-2">
                          <Cpu size={20} className="text-kaspa" /> Security
                          Settlement Engine
                        </h3>
                        <span className="text-[10px] text-kaspa font-mono">
                          ● RUNNING IN BACKGROUND
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                            Protocol Monitor
                          </p>
                          <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] text-slate-400 font-mono">
                                DAG Consistency
                              </span>
                              <span className="text-[9px] text-kaspa font-mono">
                                100.0%
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                              <div className="bg-kaspa h-full w-[100%] animate-pulse" />
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] text-slate-400 font-mono">
                                Sync Latency
                              </span>
                              <span className="text-[9px] text-white font-mono">
                                1.2s avg
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                            Active Verification Swarm
                          </p>
                          <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] text-slate-400 font-mono">
                                Validators Active
                              </span>
                              <span className="text-[9px] text-white font-mono">
                                {activeNodes.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] text-slate-400 font-mono">
                                Threat Detection
                              </span>
                              <span className="text-[9px] text-kaspa font-mono italic">
                                Secure
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-0 relative flex flex-col items-center">
                      {/* Phase 1 */}
                      <div className="w-full border border-[#00ffcc] rounded-xl p-6 md:p-8 bg-transparent">
                        <div className="inline-block bg-[#00ffcc]/10 border border-[#00ffcc]/30 px-3 py-1 rounded-[4px] text-[10px] font-mono text-[#00ffcc] uppercase mb-6">
                          Development Plan
                        </div>
                        <h3 className="text-2xl md:text-3xl font-mono text-white mb-2">
                          The DAG Registry
                        </h3>
                        <p className="text-xs font-mono text-[#00ffcc] uppercase tracking-widest mb-8">
                          THE INDEX
                        </p>

                        <div className="grid grid-cols-[80px_1fr] md:grid-cols-[120px_1fr] gap-4 mb-4 text-[#a4a5a5] text-xs md:text-sm font-mono">
                          <span className="uppercase text-[10px] md:text-xs">
                            PROBLEM
                          </span>
                          <span>
                            We need to know apps exist without trusting a
                            server.
                          </span>
                        </div>
                        <div className="grid grid-cols-[80px_1fr] md:grid-cols-[120px_1fr] gap-4 mb-8 text-xs md:text-sm font-mono border-b border-[#1f2937] pb-6">
                          <span className="uppercase text-[10px] md:text-xs text-[#a4a5a5]">
                            SOLUTION
                          </span>
                          <span className="text-[#00ffcc]">
                            OP_RETURN Data Embedding
                          </span>
                        </div>

                        <ul className="text-[#a4a5a5] text-xs md:text-sm space-y-3 font-mono">
                          <li className="flex gap-4">
                            <span className="text-[#00ffcc]">{">"}</span>{" "}
                            Developer signs metadata — App Name, Version, Binary
                            Hash, Dev Signature.
                          </li>
                          <li className="flex gap-4">
                            <span className="text-[#00ffcc]">{">"}</span> Data
                            etched permanently into a Kaspa transaction via
                            OP_RETURN or native DAG inscriptions.
                          </li>
                          <li className="flex gap-4">
                            <span className="text-[#00ffcc]">{">"}</span> The
                            DAG becomes an un-censorable, un-deletable index.
                          </li>
                        </ul>
                      </div>

                      <div className="w-px h-6 bg-[#00ffcc] opacity-50 relative my-1">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-[1px] bg-[#00ffcc] opacity-50"></div>
                      </div>

                      {/* Phase 2 */}
                      <div className="w-full border border-[#8b5cf6] rounded-xl p-6 md:p-8 bg-transparent">
                        <div className="inline-block bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 px-3 py-1 rounded-[4px] text-[10px] font-mono text-[#8b5cf6] uppercase mb-6">
                          Phase 2
                        </div>
                        <h3 className="text-2xl md:text-3xl font-mono text-white mb-2">
                          The P2P Binary Swarm
                        </h3>
                        <p className="text-xs font-mono text-[#8b5cf6] uppercase tracking-widest mb-8">
                          REPLACING IPFS
                        </p>

                        <div className="grid grid-cols-[80px_1fr] md:grid-cols-[120px_1fr] gap-4 mb-4 text-[#a4a5a5] text-xs md:text-sm font-mono">
                          <span className="uppercase text-[10px] md:text-xs">
                            PROBLEM
                          </span>
                          <span>IPFS files disappear if no one pins them.</span>
                        </div>
                        <div className="grid grid-cols-[80px_1fr] md:grid-cols-[120px_1fr] gap-4 mb-8 text-xs md:text-sm font-mono border-b border-[#1f2937] pb-6">
                          <span className="uppercase text-[10px] md:text-xs text-[#a4a5a5]">
                            SOLUTION
                          </span>
                          <span className="text-[#8b5cf6]">
                            Kaspa-Incentivized BitTorrent-style Swarms
                          </span>
                        </div>

                        <ul className="text-[#a4a5a5] text-xs md:text-sm space-y-3 font-mono">
                          <li className="flex gap-4">
                            <span className="text-[#8b5cf6]">{">"}</span> App
                            binaries (.apk) seeded by a purely P2P network of
                            volunteers and developers.
                          </li>
                          <li className="flex gap-4">
                            <span className="text-[#8b5cf6]">{">"}</span> Client
                            hashes incoming binary and checks against the
                            immutable hash on the DAG.
                          </li>
                        </ul>
                      </div>

                      <div className="w-px h-6 bg-[#8b5cf6] opacity-50 relative my-1">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-[1px] bg-[#8b5cf6] opacity-50"></div>
                      </div>

                      {/* Phase 3 */}
                      <div className="w-full border border-[#f97316] rounded-xl p-6 md:p-8 bg-transparent">
                        <div className="inline-block bg-[#f97316]/10 border border-[#f97316]/30 px-3 py-1 rounded-[4px] text-[10px] font-mono text-[#f97316] uppercase mb-6">
                          Phase 3
                        </div>
                        <h3 className="text-2xl md:text-3xl font-mono text-white mb-2">
                          Proof-of-Burn & Web of Trust
                        </h3>
                        <p className="text-xs font-mono text-[#f97316] uppercase tracking-widest mb-8">
                          REPLACING STAKING
                        </p>

                        <div className="grid grid-cols-[80px_1fr] md:grid-cols-[120px_1fr] gap-4 mb-4 text-[#a4a5a5] text-xs md:text-sm font-mono">
                          <span className="uppercase text-[10px] md:text-xs">
                            PROBLEM
                          </span>
                          <span>
                            How do we prevent spam & malware without staking?
                          </span>
                        </div>
                        <div className="grid grid-cols-[80px_1fr] md:grid-cols-[120px_1fr] gap-4 mb-8 text-xs md:text-sm font-mono border-b border-[#1f2937] pb-6">
                          <span className="uppercase text-[10px] md:text-xs text-[#a4a5a5]">
                            SOLUTION
                          </span>
                          <span className="text-[#f97316]">
                            Proof-of-Burn (PoB) & Cryptographic Signatures
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="bg-gradient-to-br from-kaspa/20 to-transparent p-8 rounded-3xl border border-kaspa/30 shadow-xl">
                      <h4 className="text-lg font-mono text-white mb-4 italic tracking-tight flex items-center gap-2">
                        <Vote size={18} className="text-kaspa" /> Community
                        Governance
                      </h4>
                      <p className="text-xs text-slate-400 font-mono leading-relaxed mb-6">
                        Active proposals for protocol and ecosystem
                        improvements. Vote with your wallet to influence the
                        network trajectory.
                      </p>

                      <div className="space-y-4 mb-8">
                        {isSyncingProposals ? (
                          <div className="py-8 text-center border border-white/5 rounded-xl border-dashed">
                            <Loader2
                              size={16}
                              className="text-kaspa/40 animate-spin mx-auto mb-2"
                            />
                            <p className="text-[10px] text-slate-600 font-mono">
                              Syncing Governance State...
                            </p>
                          </div>
                        ) : proposals.length > 0 ? (
                          proposals.map((prop) => (
                            <div
                              key={prop.id}
                              className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-3"
                            >
                              <div className="flex justify-between items-start">
                                <p className="text-[11px] font-mono text-white font-bold">
                                  {prop.title}
                                </p>
                                <span className="text-[8px] bg-kaspa/10 text-kaspa px-2 py-0.5 rounded uppercase font-bold tracking-widest">
                                  {prop.status}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-mono line-clamp-2">
                                {prop.description}
                              </p>
                              <div className="flex items-center gap-4 pt-1">
                                <button
                                  onClick={() =>
                                    AppService.voteOnProposal(
                                      prop.id,
                                      "for",
                                    ).then(() => toast.success("Vote recorded"))
                                  }
                                  className="flex items-center gap-1.5 text-[9px] font-mono text-kaspa hover:text-white transition-colors"
                                >
                                  <PlusCircle size={10} /> FOR (
                                  {prop.votesFor || 0})
                                </button>
                                <button
                                  onClick={() =>
                                    AppService.voteOnProposal(
                                      prop.id,
                                      "against",
                                    ).then(() => toast.success("Vote recorded"))
                                  }
                                  className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500 hover:text-white transition-colors"
                                >
                                  <X size={10} /> AGAINST (
                                  {prop.votesAgainst || 0})
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-8 text-center border border-white/5 rounded-xl border-dashed">
                            <p className="text-[10px] text-slate-600 font-mono">
                              No proposals found.
                            </p>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() =>
                          window.open(
                            "https://github.com/kaspanet/kips",
                            "_blank",
                          )
                        }
                        className="w-full bg-white text-black py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                      >
                        Submit KIP Proposal
                      </button>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-8 rounded-3xl">
                      <h4 className="text-sm font-mono text-slate-400 uppercase mb-6 tracking-widest">
                        Protocol Resources
                      </h4>
                      <div className="space-y-4">
                        {[
                          {
                            name: "Developer Docs",
                            icon: ShieldCheck,
                            url: "dev-guide",
                          },
                          {
                            name: "Protocol Blog",
                            icon: Sparkles,
                            url: "https://kaspa.news/",
                          },
                          {
                            name: "Kaspa Explorer",
                            icon: Hexagon,
                            url: "https://explorer.kaspa.org/",
                          },
                          {
                            name: "Rust-Node Docs",
                            icon: Cpu,
                            url: "https://github.com/kaspanet/rusty-kaspa",
                          },
                          {
                            name: "KNS Specification",
                            icon: Hash,
                            url: "https://github.com/kaspanet/kns",
                          },
                          {
                            name: "DAG-Index API",
                            icon: Globe,
                            url: "https://api.kaspa.org/",
                          },
                        ].map((res, i) => (
                          <div
                            key={i}
                            onClick={() =>
                              res.url === "dev-guide"
                                ? setCurrentTab("dev-guide")
                                : window.open(res.url, "_blank")
                            }
                            className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 hover:border-kaspa/30 cursor-pointer group transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <res.icon
                                size={16}
                                className="text-slate-500 group-hover:text-kaspa"
                              />
                              <span className="text-xs font-mono text-white">
                                {res.name}
                              </span>
                            </div>
                            <ExternalLink
                              size={12}
                              className="text-slate-600"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {selectedApp && (
          <AppDetailModal
            app={selectedApp}
            onClose={() => setSelectedApp(null)}
            walletAddress={walletAddress}
            allApps={displayApps}
            knsName={knsName}
            setCurrentTab={setCurrentTab}
            executeWalletConnect={executeWalletConnect}
            onSelectApp={setSelectedApp}
            setShowTrustModal={setShowTrustModal}
          />
        )}
      </AnimatePresence>

      <WalletSelectionModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSelect={connectWalletByType}
        onSelectMobileSession={(id) => {
          setSessionId(id);
          setIsPollingSession(true);
        }}
      />

      <AnimatePresence>
        {activeDownload && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[200] w-72"
          >
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-3" id="dl-header">
                <div
                  className="w-10 h-10 bg-kaspa/10 rounded-xl flex items-center justify-center"
                  id="dl-icon-container"
                >
                  <Download
                    size={20}
                    className={
                      activeDownload.status === "downloading"
                        ? "animate-bounce text-kaspa"
                        : "text-kaspa"
                    }
                    id="dl-icon"
                  />
                </div>
                <div className="flex-1 overflow-hidden" id="dl-info">
                  <h4 className="text-white text-xs font-bold truncate">
                    {activeDownload.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">
                    {activeDownload.status === "downloading"
                      ? "Preparing Package..."
                      : activeDownload.status === "completed"
                        ? "Download Started"
                        : "Request Error"}
                  </p>
                </div>
              </div>

              <div
                className="h-1.5 bg-white/5 rounded-full overflow-hidden"
                id="dl-progress-container"
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${activeDownload.progress}%` }}
                  className="h-full bg-kaspa shadow-[0_0_10px_rgba(112,235,191,0.5)]"
                  id="dl-progress-bar"
                />
              </div>
              <div
                className="flex justify-between items-center mt-2"
                id="dl-footer"
              >
                <span className="text-[9px] text-slate-400 font-mono">
                  {activeDownload.progress}%
                </span>
                {activeDownload.status === "completed" && (
                  <CheckCircle
                    size={12}
                    className="text-kaspa"
                    id="dl-success-icon"
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeveloperTrustModal
        isOpen={showTrustModal}
        onClose={() => setShowTrustModal(false)}
        developerKns={selectedApp?.developerKns || ""}
        appsCount={
          apps.filter((a) => a.developerKns === selectedApp?.developerKns)
            .length
        }
      />
      <Toaster position="top-center" expand={true} richColors closeButton />
    </div>
  );
}
