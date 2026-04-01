
// src/types/document.ts

export type DocumentStatus =
  | 'waiting_creator'
  | 'waiting_counterparty'
  | 'fully_executed';

/**
 * The structured payload each signer commits to.
 * Stored as JSON, signed via personal_sign (same mechanism as tutorial-2 step-up auth).
 */
export interface SigningPayload {
  documentId: string;
  contentHash: string;  // ethers.utils.id(content) — keccak256 of the text
  title: string;
  signerAddress: string;
  timestamp: number;
}

export interface SignatureRecord {
  signerAddress: string;
  /** The exact JSON string passed to personal_sign — kept for third-party verification */
  signedPayload: string;
  /** Hex ECDSA signature returned by the wallet */
  signature: string;
  signedAt: number;
}

export interface CoSignDocument {
  id: string;
  title: string;
  content: string;
  contentHash: string;
  createdAt: number;
  createdByAddress: string;
  signatures: SignatureRecord[];
  status: DocumentStatus;
}