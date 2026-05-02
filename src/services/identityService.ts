
/**
 * Simple, Secure Local Identity & Signing Service
 * Uses Web Crypto API for browser-native identity creation and signing.
 * No UI, no external wallet required.
 */

// Generate a keypair
export const generateIdentity = async () => {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true, // extractable
    ['sign', 'verify']
  );
  return keyPair;
};

// Sign data
export const signData = async (privateKey: CryptoKey, data: string) => {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);
  const signature = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' },
    },
    privateKey,
    encodedData
  );
  return signature;
};

// Verify data
export const verifyData = async (publicKey: CryptoKey, signature: ArrayBuffer, data: string) => {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);
  return await crypto.subtle.verify(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' },
    },
    publicKey,
    signature,
    encodedData
  );
};
