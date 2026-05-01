
const KNS_BASE_URL = '/api/kns-proxy';

export interface KnsAsset {
  inscriptionId: string;
  inscriptionNumber: number;
  name: string;
  owner: string;
  mimetype: string;
  status: string;
  verified: boolean;
  createBlockTime: number;
}

export interface KnsProfile {
  website?: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  github?: string;
  email?: string;
}

export const KnsIndexer = {
  /**
   * Checks if a domain is available for registration
   */
  async checkAvailability(domain: string): Promise<boolean> {
    try {
      const name = domain.toLowerCase().endsWith('.kas') ? domain.toLowerCase() : `${domain.toLowerCase()}.kas`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s for frontend to allow backend retries to finish
      
      // Try the check endpoint first
      const checkResponse = await fetch(`${KNS_BASE_URL}/domains/check/${encodeURIComponent(name)}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (checkResponse.ok) {
        const data = await checkResponse.json();
        if (data && (data.available === true || data.status === 'available')) {
          return true;
        }
        if (data && (data.available === false || data.status === 'registered' || data.status === 'taken')) {
          return false;
        }
      }

      // Fallback: If check endpoint is not conclusive or fails (e.g. 404), 
      // try to resolve the domain. If it returns 404, it's likely available.
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 35000);
      const resolveResponse = await fetch(`${KNS_BASE_URL}/domains/${encodeURIComponent(name)}`, { signal: controller2.signal });
      clearTimeout(timeoutId2);
      
      if (resolveResponse.status === 404) {
        // Not found means available in most name services
        return true;
      }
      
      if (resolveResponse.ok) {
        const data = await resolveResponse.json();
        // If we get data back with an owner, it's taken
        return !(data?.owner || data?.result?.owner || data?.address);
      }

      // If everything fails, default to true for "resilience" (let the wallet try and fail if actually taken)
      // but log it so we know there's an issue
      console.warn('KNS Indexer: Could not determine availability, defaulting to true');
      return true;
    } catch (e: any) {
      console.error('KNS Indexer Check failed:', e);
      // Default to true so we don't block the user if the indexer is down
      return true;
    }
  },

  /**
   * Fetches the primary name for a given address
   */
  async getPrimaryName(address: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);
      const response = await fetch(`${KNS_BASE_URL}/addresses/${address}/primary-name`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) return null;
      const data = await response.json();
      return data?.name || data?.result?.name || null;
    } catch (e) {
      console.error('KNS Indexer Primary Name failed:', e);
      return null;
    }
  },

  /**
   * Resolves a domain to its owner address
   */
  async resolveDomain(domain: string): Promise<string | null> {
    try {
      const name = domain.toLowerCase().endsWith('.kas') ? domain.toLowerCase() : `${domain.toLowerCase()}.kas`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);
      const response = await fetch(`${KNS_BASE_URL}/domains/${encodeURIComponent(name)}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) return null;
      const data = await response.json();
      return data?.owner || data?.result?.owner || data?.address || null;
    } catch (e) {
      console.error('KNS Indexer Resolve Domain failed:', e);
      return null;
    }
  },

  /**
   * Fetches assets owned by an address
   */
  async getAssetsByOwner(address: string): Promise<KnsAsset[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);
      const response = await fetch(`${KNS_BASE_URL}/addresses/${address}/assets`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) return [];
      const data = await response.json();
      return data?.assets || data?.result?.assets || [];
    } catch (e) {
      console.error('KNS Indexer Get Assets failed:', e);
      return [];
    }
  },

  /**
   * Fetches profile details for a domain
   */
  async getProfile(domain: string): Promise<KnsProfile | null> {
    try {
      const name = domain.toLowerCase().endsWith('.kas') ? domain.toLowerCase() : `${domain.toLowerCase()}.kas`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);
      const response = await fetch(`${KNS_BASE_URL}/profiles/${encodeURIComponent(name)}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) return null;
      const data = await response.json();
      return data?.profile || data?.result || null;
    } catch (e) {
      console.error('KNS Indexer Get Profile failed:', e);
      return null;
    }
  }
};
