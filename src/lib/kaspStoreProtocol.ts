
export interface KaspStoreMetadata {
  p: "kaspstore-v1";
  op: "list" | "update";
  name: string;
  version: string;
  description: string;
  category: string;
  subCategory: string;
  icon: string; // ipfs:// or https://
  banner?: string;
  manifest?: string; // URL to manifest.json on 4Everland/IPFS
  sha256: string;
  price: string; // e.g. "Free" or "50"
  developerIdentity: string;
  timestamp: number;
}

export interface KaspStoreManifest {
  icon: string;
  headerImage: string;
  screenshots: string[];
  changelog: {
    version: string;
    date: string;
    notes: string[];
  }[];
  dataSafety: {
    noDataShared: boolean;
    dataCollected: string[];
    isEncrypted: boolean;
    deletionAvailable: boolean;
  };
}

export const KaspStoreProtocol = {
  generateInscription(app: Partial<KaspStoreMetadata>) {
    return {
      p: "kaspstore-v1",
      op: "list",
      ...app,
      timestamp: Date.now()
    };
  },

  async fetchManifest(url: string): Promise<KaspStoreManifest | null> {
    try {
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (e) {
      console.error("Failed to fetch Kaspstore.kas manifest:", e);
      return null;
    }
  }
};
