
import { ens_normalize } from '@adraffy/ens-normalize';
import Graphemer from 'graphemer';

const splitter = new Graphemer();

export interface KsiIdentity {
  p: "ksi-v1";
  op: "reg";
  name: string;
  address: string;
  timestamp: number;
}

export const KSI_RULES = {
  minLength: 3,
  maxLength: 32,
  suffix: '.ks',
};

export const KsiService = {
  normalize(name: string): string {
    let clean = name.trim().toLowerCase();
    if (clean.endsWith(KSI_RULES.suffix)) {
      clean = clean.substring(0, clean.length - KSI_RULES.suffix.length);
    }
    return clean + KSI_RULES.suffix;
  },

  validateName(name: string): { valid: boolean; error?: string } {
    const normalized = this.normalize(name);
    const domain = normalized.replace(KSI_RULES.suffix, '');
    
    if (domain.length < KSI_RULES.minLength) {
      return { valid: false, error: `Name must be at least ${KSI_RULES.minLength} characters` };
    }
    if (domain.length > KSI_RULES.maxLength) {
      return { valid: false, error: `Name must be at most ${KSI_RULES.maxLength} characters` };
    }
    if (!/^[a-z0-9-]+$/.test(domain)) {
      return { valid: false, error: "Only lowercase letters, numbers, and hyphens allowed" };
    }
    return { valid: true };
  },

  /**
   * Generates the raw proof object to be signed
   */
  createProofPayload(name: string, address: string): KsiIdentity {
    return {
      p: "ksi-v1",
      op: "reg",
      name: this.normalize(name),
      address,
      timestamp: Date.now()
    };
  },

  /**
   * The message to be signed by the user to prove ownership
   */
  getMessageToSign(payload: KsiIdentity): string {
    return `[KSI Identity Proof]\nProtocol: ${payload.p}\nHandle: ${payload.name}\nOwner: ${payload.address}\nIssued: ${new Date(payload.timestamp).toISOString()}\nSession: Permanent`;
  },

  /**
   * Stores the session certificate locally and registers it in the 'global' registry.
   */
  saveSession(address: string, proof: KsiIdentity, signature: string) {
    const certificate = {
      proof,
      signature,
      version: "1.0.0"
    };
    
    // Personal local storage
    localStorage.setItem(`ksi_session_${address}`, JSON.stringify(certificate));
    localStorage.setItem(`ksi_active_session`, address);

    // Global Mock Registry (simulating Kaspa KRC-20 Indexer state)
    try {
      const globalRegJson = localStorage.getItem('ksi_global_registry');
      const globalReg = globalRegJson ? JSON.parse(globalRegJson) : {};
      
      // First-come, first-serve lock
      if (!globalReg[proof.name]) {
        globalReg[proof.name] = {
          owner: address,
          timestamp: proof.timestamp
        };
        localStorage.setItem('ksi_global_registry', JSON.stringify(globalReg));
      }
    } catch(e) {
      console.warn("Global registry simulation failed", e);
    }
  },

  /**
   * Retrieves the active session address
   */
  getActiveSessionAddress(): string | null {
    return localStorage.getItem(`ksi_active_session`);
  },

  /**
   * Clears the active session
   */
  clearSession() {
    const active = this.getActiveSessionAddress();
    if (active) {
      localStorage.removeItem(`ksi_session_${active}`);
    }
    localStorage.removeItem(`ksi_active_session`);
  },

  /**
   * Returns the owner address of a .ks name from the global registry
   */
  async resolveOwner(name: string): Promise<string | null> {
    try {
      const globalRegJson = localStorage.getItem('ksi_global_registry');
      if (!globalRegJson) return null;
      const globalReg = JSON.parse(globalRegJson);
      
      const normalizedName = this.normalize(name);
      return globalReg[normalizedName]?.owner || null;
    } catch {
      return null;
    }
  },

  /**
   * Returns the .ks name associated with a Kaspa address
   */
  async resolveIdentity(address: string): Promise<string | null> {
    const timeout = new Promise<null>((resolve) => setTimeout(() => {
        console.warn("KsiService resolveIdentity timed out");
        resolve(null);
    }, 3000));

    const task = (async () => {
        try {
          const saved = localStorage.getItem(`ksi_session_${address}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            const isValid = await this.verifyProof(parsed.proof, parsed.signature, address);
            if (isValid) return parsed.proof.name;
            
            this.clearSession();
          }
          return null;
        } catch (e) {
          console.error("resolveIdentity error:", e);
          return null;
        }
    })();

    return Promise.race([task, timeout]);
  },

  /**
   * Verifies a KSI identity proof (Simulation of core logic)
   */
  async verifyProof(payload: any, signature: string, address: string): Promise<boolean> {
    // 1. Reconstruct the message
    const msg = this.getMessageToSign(payload);
    
    // 2. In production, we use a library like 'bitcoinjs-message' or 'kaspa-wallet-core'
    // to verify that the 'signature' of 'msg' belongs to 'address'.
    console.log("[KSI Verification] Verifying Proof for:", payload.name);
    
    // For this build, we return true if signature exists
    return !!signature && (payload.address === address);
  }
};
