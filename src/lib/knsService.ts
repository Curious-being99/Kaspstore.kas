
import Graphemer from 'graphemer';
import { ens_normalize } from '@adraffy/ens-normalize';

const splitter = new Graphemer();

export interface KnsRules {
  minLength: number;
  maxLength: number;
  allowedChars: RegExp;
  suffix: string;
}

export const KNS_RULES: KnsRules = {
  minLength: 1,
  maxLength: 100, // Emojis and longer names supported
  allowedChars: /.*/, // Relaxed for emoji support, relying on normalization
  suffix: '.kas'
};

export interface KnsPricing {
  [length: number]: number;
  default: number;
}

export const KNS_PRICING: KnsPricing = {
  1: 4200,
  2: 4200,
  3: 2100,
  4: 525,
  default: 35
};

export const KNS_REGISTRY_ADDRESS = 'kaspa:qyp4nvaq3pdq7609z09fvdgwtc9c7rg07fuw5zgeee7xpr085de59eseqfcmynn';

export const KnsService = {
  normalize(name: string): string {
    try {
      return ens_normalize(name.trim().toLowerCase());
    } catch (e) {
      return name.trim().toLowerCase();
    }
  },

  validateName(name: string): { valid: boolean; error?: string } {
    let cleanName = name.toLowerCase().trim();
    
    // Add .kas if missing for validation consistency
    if (!cleanName.endsWith(KNS_RULES.suffix)) {
      cleanName += KNS_RULES.suffix;
    }

    const domain = cleanName.replace(KNS_RULES.suffix, '');
    
    try {
      ens_normalize(domain);
    } catch (e: any) {
      return { valid: false, error: `Invalid characters: ${e.message || 'Standard normalization failed'}` };
    }

    const length = splitter.countGraphemes(domain);

    if (length < KNS_RULES.minLength) {
      return { valid: false, error: `Domain must be at least ${KNS_RULES.minLength} character` };
    }

    if (length > KNS_RULES.maxLength) {
      return { valid: false, error: `Domain must be at most ${KNS_RULES.maxLength} characters` };
    }

    // Basic sanity check, avoiding forbidden chars like spaces
    if (domain.includes(' ')) {
      return { valid: false, error: "Spaces are not allowed" };
    }

    return { valid: true };
  },

  calculateCost(name: string): number {
    let cleanName = name.toLowerCase().trim();
    if (!cleanName) return 0;

    // Add .kas if missing
    if (!cleanName.endsWith(KNS_RULES.suffix)) {
      cleanName += KNS_RULES.suffix;
    }
    
    const domain = cleanName.replace(KNS_RULES.suffix, '');
    const length = splitter.countGraphemes(domain);

    if (length <= 0) return 0;
    return KNS_PRICING[length] || KNS_PRICING.default;
  },

  generateCreateInscription(name: string) {
    const cleanName = this.normalize(name);
    return {
      p: "kns",
      v: "1",
      op: "create",
      name: cleanName.endsWith('.kas') ? cleanName : `${cleanName}.kas`
    };
  }
};
