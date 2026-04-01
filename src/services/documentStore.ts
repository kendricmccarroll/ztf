// src/services/documentStore.ts
import { v4 as uuidv4 } from 'uuid';
import { ethers } from 'ethers';
import type { CoSignDocument, SignatureRecord, SigningPayload } from '../types/document';

const STORE_KEY = 'cosign_documents';

function load(): Record<string, CoSignDocument> {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function save(docs: Record<string, CoSignDocument>) {
  localStorage.setItem(STORE_KEY, JSON.stringify(docs));
}

export function createDocument(
  title: string,
  content: string,
  createdByAddress: string
): CoSignDocument {
  const id = uuidv4();
  const contentHash = ethers.utils.id(content); // keccak256
  const doc: CoSignDocument = {
    id,
    title,
    content,
    contentHash,
    createdAt: Date.now(),
    createdByAddress,
    signatures: [],
    status: 'waiting_creator',
  };
  const docs = load();
  docs[id] = doc;
  save(docs);
  return doc;
}

export function getDocument(id: string): CoSignDocument | null {
  return load()[id] ?? null;
}

export function addSignature(
  documentId: string,
  record: SignatureRecord
): CoSignDocument | null {
  const docs = load();
  const doc = docs[documentId];
  if (!doc) return null;

  // Prevent duplicate signatures
  if (doc.signatures.some(s => s.signerAddress.toLowerCase() === record.signerAddress.toLowerCase())) {
    return doc;
  }

  doc.signatures.push(record);
  doc.status = doc.signatures.length >= 2 ? 'fully_executed' : 'waiting_counterparty';
  save(docs);
  return doc;
}

/**
 * Build the payload a signer commits to, then hash it for personal_sign.
 * Using the same pattern as tutorial-2's step-up auth signature.
 */
export function buildSigningPayload(
  doc: CoSignDocument,
  signerAddress: string
): { payload: SigningPayload; signedPayload: string } {
  const payload: SigningPayload = {
    documentId: doc.id,
    contentHash: doc.contentHash,
    title: doc.title,
    signerAddress,
    timestamp: Date.now(),
  };
  // Sort keys for deterministic serialisation
  const signedPayload = JSON.stringify(
    payload,
    (Object.keys(payload) as (keyof SigningPayload)[]).sort()
  );
  return { payload, signedPayload };
}

/**
 * Verify a signature client-side using ethers.
 * Same check a third party would run independently.
 */
export function verifySignature(
  signedPayload: string,
  signature: string,
  expectedAddress: string
): boolean {
  try {
    const recovered = ethers.utils.verifyMessage(signedPayload, signature);
    return recovered.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}