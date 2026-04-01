// src/hooks/useCoSign.ts
import { useState, useCallback } from 'react';
import type { ISignClient } from '@walletconnect/types';
import { ethers } from 'ethers';

import {
  getDocument,
  addSignature,
  buildSigningPayload,
  verifySignature,
} from '../services/documentStore';
import type { CoSignDocument } from '../types/document';

export type SignStep =
  | 'idle'
  | 'awaiting_wallet'
  | 'verifying'
  | 'success'
  | 'error';

export function useCoSign(
  signClient: ISignClient | null,
  topic: string | null,
  walletAddress: string | null
) {
  const [doc, setDoc] = useState<CoSignDocument | null>(null);
  const [signStep, setSignStep] = useState<SignStep>('idle');
  const [signError, setSignError] = useState<string | null>(null);

  const loadDocument = useCallback((id: string) => {
    const found = getDocument(id);
    setDoc(found);
    return found;
  }, []);

  const refreshDocument = useCallback((id: string) => {
    setDoc(getDocument(id));
  }, []);

  const signDocument = useCallback(async () => {
    if (!doc || !signClient || !topic || !walletAddress) return;

    setSignStep('awaiting_wallet');
    setSignError(null);

    try {
      const { signedPayload } = buildSigningPayload(doc, walletAddress);

      // personal_sign — exactly the same call as tutorial-2 step-up auth
      const hexMessage = ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(signedPayload)
      );

      const signature = await signClient.request<string>({
        topic,
        chainId: 'eip155:1',
        request: {
          method: 'personal_sign',
          params: [hexMessage, walletAddress],
        },
      });

      setSignStep('verifying');

      // Verify before storing — same defensive pattern as tutorial-2
      const valid = verifySignature(signedPayload, signature, walletAddress);
      if (!valid) {
        throw new Error('Signature verification failed: recovered address mismatch');
      }

      const updated = addSignature(doc.id, {
        signerAddress: walletAddress,
        signedPayload,
        signature,
        signedAt: Date.now(),
      });

      setDoc(updated);
      setSignStep('success');
    } catch (err) {
      const msg = (err as Error).message ?? 'Unknown error';
      const isRejection = /reject|denied|cancel|user rejected/i.test(msg);
      setSignError(
        isRejection
          ? 'You rejected the signature request in your wallet. Click Sign to try again.'
          : msg
      );
      setSignStep('error');
    }
  }, [doc, signClient, topic, walletAddress]);

  return { doc, signStep, signError, loadDocument, refreshDocument, signDocument };
}