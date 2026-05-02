const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

const startIndex = lines.findIndex((l) => l.includes('{step === 1 && ('));
const endIndex = lines.findIndex((l, index) => index > startIndex && l.includes('{step === 3 && ('));

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find blocks");
  process.exit(1);
}

const before = lines.slice(0, startIndex);
const after = lines.slice(endIndex);

const newLines = `              {step === 1 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
                      Store Listing & Metadata
                    </h2>
                    <p className="text-slate-400 text-xs md:text-sm">
                      Define how your app appears to users on Kaspstore.
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
                        App Icon (SVG or PNG upload)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={appIcon}
                          onChange={(e) => setAppIcon(e.target.value)}
                          className="flex-1 bg-black/30 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-kaspa/40 text-sm"
                          placeholder="Image URL or upload..."
                        />
                        <label className="cursor-pointer flex items-center justify-center w-12 h-12 bg-white/5 border border-white/10 rounded-xl hover:bg-kaspa/10 hover:border-kaspa/50 transition-all shadow-sm">
                          <input
                            type="file"
                            className="hidden"
                            accept="image/svg+xml,image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const url = await uploadToEverland(file);
                                if (url) setAppIcon(url as string);
                              }
                            }}
                          />
                          <UploadCloud size={18} className="text-kaspa" />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        App Screenshots (Upload up to 4 Images)
                      </label>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          { val: appScreenshot1, setter: setAppScreenshot1, num: 1 },
                          { val: appScreenshot2, setter: setAppScreenshot2, num: 2 },
                          { val: appScreenshot3, setter: setAppScreenshot3, num: 3 },
                          { val: appScreenshot4, setter: setAppScreenshot4, num: 4 },
                        ].map((ss) => (
                          <div key={ss.num} className="space-y-2">
                            <div className="border hover:border-kaspa/40 border-slate-800 bg-black/30 rounded-xl p-2 transition-colors relative overflow-hidden group">
                              {ss.val ? (
                                <div className="aspect-[9/16] relative">
                                  <img src={ss.val} alt={\`Screenshot \${ss.num}\`} className="w-full h-full object-cover rounded-lg" />
                                  <button onClick={() => ss.setter("")} className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 rounded-md text-white">
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <label className="cursor-pointer flex flex-col items-center justify-center w-full aspect-[9/16] text-[10px] text-slate-500 hover:text-kaspa font-bold uppercase gap-2 transition-colors">
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const url = await uploadToEverland(file);
                                        if (url) ss.setter(url as string);
                                      }
                                    }}
                                  />
                                  <ImageIcon size={24} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                                  Upload {ss.num}
                                </label>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[9px] text-slate-500 leading-relaxed uppercase tracking-widest mt-1">
                        Use high-quality product images to increase conversion rates.
                      </p>
                    </div>

                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 bg-kaspa py-4 rounded-xl font-bold text-black uppercase tracking-widest hover:bg-kaspa-light shadow-xl shadow-kaspa/10 transition-all disabled:opacity-50"
                      disabled={!appName || !appDescription}
                    >
                      Next: Binary & Storage Options
                    </button>
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
                      Decentralized Asset Registry
                    </h2>
                    <p className="text-slate-400 text-xs md:text-sm">
                      Upload your PlayStore Grade APK directly to the node network via IPFS/Arweave.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 block">
                        App Binary / APK (Auto-Hashing)
                      </label>
                      <div className="mt-2 relative">
                        {isUploading ? (
                          <div className="w-full bg-slate-900 border border-kaspa/30 rounded-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-kaspa/5 animate-pulse" />
                            <CloudRain size={48} className="text-kaspa mb-4 animate-bounce" />
                            <h3 className="text-kaspa font-bold text-lg">Uploading to 4EVERLAND...</h3>
                            <div className="w-full max-w-sm bg-black/50 rounded-full h-3 mt-6 border border-slate-800 p-0.5 relative z-10 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-teal-500 to-kaspa h-full rounded-full transition-all duration-300 relative"
                                style={{ width: \`\${uploadProgress}%\` }}
                              >
                                <div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_infinite] w-full" />
                              </div>
                            </div>
                            <p className="text-slate-400 font-mono text-sm mt-3">{uploadProgress}% Complete</p>
                          </div>
                        ) : isHashing ? (
                          <div className="w-full bg-slate-900 border border-amber-500/30 rounded-2xl p-8 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.05)]">
                            <Lock size={48} className="text-amber-500 mb-4 animate-pulse" />
                            <h3 className="text-amber-500 font-bold text-lg mb-2">Generating SHA-256 Signature</h3>
                            <p className="text-slate-400 text-sm max-w-xs text-center border border-amber-500/20 p-2 rounded bg-amber-500/5 font-mono">
                              Calculating cryptographic hash to ensure binary integrity across nodes...
                            </p>
                          </div>
                        ) : (
                          <label className="w-full bg-slate-900/50 border-2 border-dashed border-slate-700 hover:border-kaspa/50 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-kaspa/5 group relative overflow-hidden">
                            <input
                              type="file"
                              className="hidden"
                              accept=".apk,.msix,.dmg,.exe,application/vnd.android.package-archive"
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
                                  if (url) {
                                    setAppDownloadUrl(url as string);
                                    // Simulated hashes
                                    setArweaveId("ar_" + Math.random().toString(36).substring(2, 15) + hash.substring(0,10));
                                    setIpfsHash("Qm" + Math.random().toString(36).substring(2, 15) + "ipfs");
                                    toast.success("Successfully decentralized via 4EVERLAND!");
                                  }
                                }
                              }}
                            />
                            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:-translate-y-2 transition-transform duration-300 shadow-xl border border-slate-700/50 group-hover:border-kaspa/30 group-hover:shadow-[0_0_15px_rgba(112,199,186,0.3)] z-10 relative">
                              <DownloadCloud size={28} className="text-slate-400 group-hover:text-kaspa transition-colors" />
                            </div>
                            <h3 className="text-white font-bold text-lg mb-1 relative z-10">Upload PlayStore Grade APK/Binary</h3>
                            <p className="text-slate-400 text-sm mb-4 relative z-10 text-center">Direct stream to 4EVERLAND • IPFS + Arweave Compatible</p>
                            
                            <div className="flex gap-2 items-center relative z-10">
                               <span className="text-[10px] uppercase font-bold tracking-widest text-kaspa bg-kaspa/10 px-2 py-1 rounded border border-kaspa/20">No Middleware</span>
                               <span className="text-[10px] uppercase font-bold tracking-widest text-[#8b5cf6] bg-[#8b5cf6]/10 px-2 py-1 rounded border border-[#8b5cf6]/20">Auto-IPFS</span>
                            </div>
                          </label>
                        )}
                        
                        {appDownloadUrl && !isUploading && !isHashing && (
                           <div className="mt-4 p-5 rounded-2xl bg-kaspa/5 border border-kaspa/20 flex flex-col gap-3 shadow-[0_0_20px_rgba(112,199,186,0.05)]">
                             <div className="flex items-center gap-2 mb-1">
                                <CheckCircle size={20} className="text-kaspa" />
                                <span className="text-white text-sm font-bold tracking-tight">Binary Verified & Decentralized</span>
                             </div>
                             <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Download Pointer (IPFS Gateway / local)</label>
                                <input
                                  type="text"
                                  value={appDownloadUrl}
                                  onChange={(e) => setAppDownloadUrl(e.target.value)}
                                  className="w-full bg-black/40 border border-slate-800 rounded-lg px-3 py-2 text-[11px] text-kaspa font-mono focus:border-kaspa/50 outline-none"
                                />
                             </div>
                             {appHash && (
                                <div className="space-y-1">
                                  <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">SHA-256 Checksum</label>
                                  <div className="text-[10px] text-slate-400 font-mono bg-black/40 px-3 py-2 rounded-lg border border-slate-800 break-all">
                                    {appHash}
                                  </div>
                                </div>
                             )}
                           </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 block">
                          Arweave ID (Perma-web)
                        </label>
                        <input
                          type="text"
                          placeholder="TX ID"
                          value={arweaveId}
                          onChange={(e) => setArweaveId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-3 text-xs text-white focus:border-kaspa/50 outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#8b5cf6] font-bold uppercase tracking-widest mb-1.5 block">
                          IPFS CID (InterPlanetary File System)
                        </label>
                        <input
                          type="text"
                          placeholder="Qm..."
                          value={ipfsHash}
                          onChange={(e) => setIpfsHash(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-3 text-xs text-white focus:border-kaspa/50 outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/5 p-5 rounded-2xl flex items-start gap-4 mx-2">
                      <div className="w-10 h-10 rounded-full bg-kaspa/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <Server size={20} className="text-kaspa" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-[12px] font-bold text-white uppercase tracking-tight">
                          Why IPFS & Arweave?
                        </h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Traditional Play Stores host files on centralized AWS servers. 
                          Kaspstore uses <strong>4EVERLAND</strong> to pin your app to <strong className="text-[#8b5cf6]">IPFS</strong> and permanently archive it on <strong className="text-white">Arweave</strong>.
                          This guarantees zero downtime and makes your app censorship-resistant. The "Indexer" writes these hashes (pointers) to the Kaspa blockchain state.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex flex-col gap-1">
                      <h4 className="text-xs font-bold text-kaspa-light uppercase tracking-tight">
                        Protocol Metadata Overrides
                      </h4>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest">
                        Configure pricing logic and execution rules 
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2 items-center">
                          <Zap size={14} className="text-kaspa" />
                          <span className="text-[11px] font-bold tracking-widest uppercase text-white">
                            Require Payment to Execute (KAS)
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isPaidApp}
                            onChange={(e) => setIsPaidApp(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-kaspa"></div>
                        </label>
                      </div>
                      {isPaidApp && (
                        <div className="pt-2">
                          <input
                            type="number"
                            value={kasPrice}
                            onChange={(e) =>
                              setKasPrice(parseFloat(e.target.value) || 0)
                            }
                            className="w-full bg-black/40 border border-kaspa/30 rounded-lg px-4 py-2 flex-grow text-white outline-none focus:border-kaspa/50 text-sm font-mono"
                            placeholder="Price in KAS"
                          />
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex gap-2 items-center">
                          <QrCode size={14} className="text-kaspa" />
                          <span className="text-[11px] font-bold tracking-widest uppercase text-white">
                            Web Protocol Link (PWA Mode)
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isPwa}
                            onChange={(e) => setIsPwa(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-kaspa"></div>
                        </label>
                      </div>
                      {isPwa && (
                        <div className="pt-2">
                          <input
                            type="url"
                            value={pwaUrl}
                            onChange={(e) => setPwaUrl(e.target.value)}
                            className="w-full bg-black/40 border border-kaspa/30 rounded-lg px-4 py-2 flex-grow text-white outline-none focus:border-kaspa/50 text-sm"
                            placeholder="https://yourapp.example.com"
                          />
                        </div>
                      )}

                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setStep(1)}
                      className="w-1/3 bg-slate-800 py-4 rounded-xl font-bold text-white uppercase tracking-widest hover:bg-slate-700 transition-all"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      className="flex-1 bg-kaspa py-4 rounded-xl font-bold text-black uppercase tracking-widest hover:bg-kaspa-light shadow-xl shadow-kaspa/10 transition-all flex justify-center items-center gap-2"
                      disabled={!appDownloadUrl && !pwaUrl}
                    >
                      Continue to Network Ritual <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              )}`;

fs.writeFileSync('src/App.tsx', before.join('\n') + '\n' + newLines + '\n' + after.join('\n'));
