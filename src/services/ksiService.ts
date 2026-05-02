import { randomUUID } from 'node:crypto';

/**
 * KSI DID Identity Manager
 * 
 * Implements a decentralized KSI DID identity structure.
 * 
 * SERVER ARCHITECTURE:
 * This server DOES NOT handle private key material.
 * Signing MUST be performed on the client-side using native Web Crypto APIs.
 * 
 * This service provides verification for decentralized identity proofs.
 */

export interface KsiDidDocument {
  id: string; // did:ksi:<uuid>
  controller: string;
  authentication: string[];
  service: Array<{ id: string; type: string; serviceEndpoint: string }>;
}

export interface KaspaKsiLink {
  did: string;
  kaspaAddress: string;
}

export const createKsiDid = (domain: string, userId: string): KsiDidDocument => {
  const uuid = randomUUID();
  return {
    id: `did:ksi:${uuid}`,
    controller: `did:web:${domain}:${userId}`,
    authentication: [`did:ksi:${uuid}#key-1`],
    service: [{ id: 'link', type: 'LinkedDomains', serviceEndpoint: domain }],
  };
};

export const createKaspaKsiLink = (did: string, kaspaAddress: string): KaspaKsiLink => {
  return { did, kaspaAddress };
};

/**
 * Prepares a canonical message for the client to sign for a Kaspa transaction.
 */
export const prepareKaspaTransactionMessage = (did: string, kaspaAddress: string, data: any): string => {
  return JSON.stringify({
    did,
    kaspaAddress,
    transactionData: data,
    timestamp: Date.now()
  });
};

/**
 * Decentralized Signature Verification (Server-Side)
 * 
 * Verifies that a transaction signature was produced by the client-side 
 * private key.
 */
export const verifyKsiSignature = async (
    message: string, 
    signature: ArrayBuffer, 
    publicKey: CryptoKey
): Promise<boolean> => {
  // 1. Convert the message to a Uint8Array
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  // 2. Perform the verification using native Web Crypto API
  return await crypto.subtle.verify(
    "ECDSA",
    publicKey,
    signature,
    data
  );
};
