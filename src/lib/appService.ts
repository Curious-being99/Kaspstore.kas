// --- Decentralized Local Relay ---
const LOCAL_STORAGE_KEY = 'kaspstore_local_node_data';

interface LocalNodeData {
  dapps: Record<string, any>;
  reviews: Record<string, any[]>;
  downloads: Record<string, any[]>;
  verifications: any[];
  proposals: any[];
}

const getLocalNode = (): LocalNodeData => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) {
      return {
        dapps: {},
        reviews: {},
        downloads: {},
        verifications: [],
        proposals: []
      };
    }
    const parsed = JSON.parse(data);
    // Basic validation
    if (!parsed || typeof parsed !== 'object') throw new Error("Invalid structure");
    return {
      dapps: parsed.dapps || {},
      reviews: parsed.reviews || {},
      downloads: parsed.downloads || {},
      verifications: parsed.verifications || [],
      proposals: parsed.proposals || []
    };
  } catch (e) {
    console.error("Local Node corrupted, resetting:", e);
    return {
      dapps: {},
      reviews: {},
      downloads: {},
      verifications: [],
      proposals: []
    };
  }
};

const saveLocalNode = (data: LocalNodeData) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
};

export const AppService = {
  async getApps(limitCount: number = 20, lastDoc?: any) {
    const node = getLocalNode();
    const apps = Object.values(node.dapps).sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    
    // Pagination simulation
    const startIdx = lastDoc ? apps.findIndex(a => a.id === lastDoc.id) + 1 : 0;
    const paginated = apps.slice(startIdx, startIdx + limitCount);

    return {
      items: paginated,
      lastDoc: paginated.length > 0 ? paginated[paginated.length - 1] : null
    };
  },

  async getReviews(appId: string) {
    const node = getLocalNode();
    return node.reviews[appId] || [];
  },

  async addReview(appId: string, review: { rating: number, comment: string, wallet: string }) {
    const node = getLocalNode();
    if (!node.reviews[appId]) node.reviews[appId] = [];
    
    const newReview = {
      ...review,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString()
    };
    
    node.reviews[appId].unshift(newReview);
    saveLocalNode(node);
  },

  async launchApp(appData: any, walletAddress: string) {
    const node = getLocalNode();
    const appId = Math.random().toString(36).substring(7);
    
    const newApp = {
      ...appData,
      id: appId,
      developerId: walletAddress,
      isVerified: appData.isVerified || false,
      isFlagged: false,
      downloads: appData.downloads || 0,
      rating: appData.rating || 0,
      reviewsCount: appData.reviewsCount || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    node.dapps[appId] = newApp;
    saveLocalNode(node);
    return appId;
  },

  async trackDownload(appId: string, wallet: string) {
    const node = getLocalNode();
    
    // Increment app downloads
    if (node.dapps[appId]) {
      node.dapps[appId].downloads = (node.dapps[appId].downloads || 0) + 1;
    }

    // Save to user history
    if (!node.downloads[wallet]) node.downloads[wallet] = [];
    node.downloads[wallet].unshift({
      appId,
      timestamp: new Date().toISOString()
    });

    saveLocalNode(node);
  },

  async getUserDownloads(wallet: string) {
    const node = getLocalNode();
    const downloadRecords = node.downloads[wallet] || [];
    
    return downloadRecords.map(record => {
      const app = node.dapps[record.appId];
      if (!app) return null;
      return { ...app, downloadDate: record.timestamp };
    }).filter(Boolean);
  },

  async getUserApps(walletAddress: string) {
    const node = getLocalNode();
    return Object.values(node.dapps)
      .filter(app => app.developerId === walletAddress)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async updateApp(appId: string, updates: any, walletAddress: string) {
    const node = getLocalNode();
    const app = node.dapps[appId];
    
    if (!app) throw new Error("App not found");
    if (app.developerId !== walletAddress) throw new Error("Unauthorized");

    node.dapps[appId] = {
      ...app,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    saveLocalNode(node);
  },

  async getProposals() {
    const node = getLocalNode();
    return node.proposals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async voteOnProposal(proposalId: string, type: 'for' | 'against') {
    const node = getLocalNode();
    const proposal = node.proposals.find(p => p.id === proposalId);
    if (!proposal) throw new Error("Proposal not found");

    if (type === 'for') proposal.votesFor = (proposal.votesFor || 0) + 1;
    else proposal.votesAgainst = (proposal.votesAgainst || 0) + 1;

    saveLocalNode(node);
  },

  async getUserReviews(wallet: string) {
    const node = getLocalNode();
    const allReviews: any[] = [];
    
    Object.entries(node.reviews).forEach(([appId, reviews]) => {
      const userReviews = reviews.filter(r => r.wallet === wallet);
      userReviews.forEach(r => {
        const app = node.dapps[appId];
        allReviews.push({
          ...r,
          appId,
          appName: app?.name || 'Unknown App'
        });
      });
    });

    return allReviews.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  async submitVerification(sourceUrl: string, walletAddress: string) {
    const node = getLocalNode();
    node.verifications.unshift({
      walletAddress,
      sourceUrl,
      status: 'pending',
      timestamp: new Date().toISOString()
    });
    saveLocalNode(node);
  },

  async burnAndLaunch(data: { appId: string, txHash: string, burnAmount: number, developerAddress: string }) {
    try {
      const response = await fetch('/api/burn-and-launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Burn verification failed');
      return result;
    } catch (e) {
      console.error("Burn Service Error:", e);
      throw e;
    }
  },

  async pushUpdate(updates: { appId: string, newDownloadUrl: string, newVersion: string, devKns: string, ipfsCid?: string }) {
    const response = await fetch('/api/push-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return response.json();
  }
};

