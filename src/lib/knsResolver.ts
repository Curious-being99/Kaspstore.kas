import { KnsIndexer } from './knsIndexer';

export async function resolveNativeKNS(address: string): Promise<string | null> {
    if (!address) return null;

    const cacheKey = `kns_cache_${address}`;
    const cached = localStorage.getItem(cacheKey);
    
    // 1. Check Local Cache
    if (cached) {
        try {
            const { name, timestamp } = JSON.parse(cached);
            const isNull = name === null;
            const ttl = isNull ? 5 * 60 * 1000 : 24 * 60 * 60 * 1000; 
            
            if (Date.now() - timestamp < ttl) {
                return name; 
            }
        } catch (e) {
            localStorage.removeItem(cacheKey);
        }
    }

    // 2. Fetch from KNS Indexer
    try {
        const foundName = await KnsIndexer.getPrimaryName(address);

        if (foundName && typeof foundName === 'string' && foundName.endsWith('.kas')) {
            console.log(`[KNS Resolver] Successfully resolved: ${foundName}`);
            localStorage.setItem(cacheKey, JSON.stringify({ name: foundName, timestamp: Date.now() }));
            return foundName;
        }

        // Cache the negative result
        localStorage.setItem(cacheKey, JSON.stringify({ name: null, timestamp: Date.now() }));
        return null;

    } catch (error) {
        console.error("[KNS Resolver] Resolution failed:", error);
        return null; 
    }
}
