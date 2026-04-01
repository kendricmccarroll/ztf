// src/components/DocumentView.tsx
import React, { useEffect, useRef } from 'react';
import { useCoSign } from '../hooks/useCoSign';
import type { DocumentStatus } from '../types/document';
import type { ISignClient } from '@walletconnect/types';


const STATUS_COLOR: Record<DocumentStatus, string> = {
  waiting_creator: '#f0a500',
  waiting_counterparty: '#5599ff',
  fully_executed: '#00cc66',
};

const STATUS_LABEL: Record<DocumentStatus, string> = {
  waiting_creator: 'Waiting for creator to sign',
  waiting_counterparty: 'Partially signed — waiting for counterparty',
  fully_executed: '✓ Fully Executed',
};

interface Props {
  documentId: string;
  signClient: ISignClient | null;
  topic: string | null;
  walletAddress: string | null;
}

export const DocumentView: React.FC<Props> = ({
  documentId,
  signClient,
  topic,
  walletAddress,
}) => {
  const { doc, signStep, signError, loadDocument, refreshDocument, signDocument } =
    useCoSign(signClient, topic, walletAddress);

  // Poll localStorage every 3s for counterparty signature (simulates real-time)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    loadDocument(documentId);
    pollRef.current = setInterval(() => refreshDocument(documentId), 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [documentId, loadDocument, refreshDocument]);

  if (!doc) {
    return <p style={{ color: '#f55' }}>Document not found: {documentId}</p>;
  }

  const alreadySigned = walletAddress
    ? doc.signatures.some(s => s.signerAddress.toLowerCase() === walletAddress.toLowerCase())
    : false;

  const busy = signStep === 'awaiting_wallet' || signStep === 'verifying';

  return (
    <div style={{ padding: 16, border: '1px solid #333', borderRadius: 6, marginTop: 16 }}>
      {/* Status */}
      <div style={{
        padding: '8px 14px',
        background: STATUS_COLOR[doc.status] + '22',
        border: `1px solid ${STATUS_COLOR[doc.status]}44`,
        borderRadius: 4,
        color: STATUS_COLOR[doc.status],
        fontWeight: 600,
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: STATUS_COLOR[doc.status],
          display: 'inline-block',
          animation: doc.status !== 'fully_executed' ? 'pulse 1.5s ease infinite' : undefined,
        }} />
        {STATUS_LABEL[doc.status]}
      </div>

      {/* Document content */}
      <h3 style={{ marginBottom: 8 }}>{doc.title}</h3>
      <pre style={{
        background: '#111', border: '1px solid #333', borderRadius: 4,
        padding: 12, fontFamily: 'monospace', fontSize: 13,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 12,
      }}>
        {doc.content}
      </pre>

      {/* Content hash */}
      <div style={{ fontSize: 11, color: '#555', marginBottom: 16 }}>
        Content hash (keccak256):{' '}
        <code style={{ color: '#0a0' }}>{doc.contentHash}</code>
      </div>

      {/* Signatures */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 8, letterSpacing: '0.1em' }}>
          SIGNATURES ({doc.signatures.length})
        </div>
        {doc.signatures.length === 0 && (
          <p style={{ fontSize: 13, color: '#555' }}>No signatures yet</p>
        )}
        {doc.signatures.map(sig => (
          <div key={sig.signerAddress} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 12px', background: '#1a1a1a', border: '1px solid #2a2a2a',
            borderRadius: 4, marginBottom: 6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#0f0', fontWeight: 700 }}>✓</span>
              <code style={{ fontSize: 12 }}>
                {sig.signerAddress.slice(0, 8)}…{sig.signerAddress.slice(-6)}
              </code>
              {walletAddress && sig.signerAddress.toLowerCase() === walletAddress.toLowerCase() && (
                <span style={{ fontSize: 10, background: '#0f022a', color: '#0f0', padding: '2px 6px', borderRadius: 10 }}>you</span>
              )}
            </div>
            <span style={{ fontSize: 11, color: '#555' }}>
              {new Date(sig.signedAt).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>

      {/* Share URL */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 6, letterSpacing: '0.1em' }}>
          SHARE WITH COUNTERPARTY
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <code style={{
            flex: 1, padding: '8px 10px', background: '#111',
            border: '1px solid #333', borderRadius: 4, fontSize: 11, wordBreak: 'break-all',
          }}>
            {window.location.origin}/?doc={doc.id}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/?doc=${doc.id}`)}
            style={{ padding: '8px 12px', background: 'transparent', border: '1px solid #444', color: '#aaa', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Copy
          </button>
        </div>
      </div>

      {/* Sign button */}
      {!walletAddress ? (
        <p style={{ color: '#f0a500', fontSize: 13 }}>Connect your wallet to sign</p>
      ) : alreadySigned ? (
        <div style={{ padding: '10px 14px', background: '#0f022a', border: '1px solid #0f044a', borderRadius: 4, color: '#0f0', fontWeight: 600 }}>
          ✓ You have signed this document
        </div>
      ) : (
        <button
          onClick={signDocument}
          disabled={busy || signStep === 'success'}
          style={{
            width: '100%', padding: '12px', fontWeight: 700, fontSize: 14,
            background: signStep === 'success' ? 'transparent' : '#0f0',
            color: signStep === 'success' ? '#0f0' : '#000',
            border: signStep === 'success' ? '1px solid #0f0' : 'none',
            borderRadius: 4, cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {signStep === 'awaiting_wallet' && 'Check your wallet…'}
          {signStep === 'verifying' && 'Verifying…'}
          {signStep === 'success' && '✓ Signed'}
          {(signStep === 'idle' || signStep === 'error') && 'Sign Document with VIA Wallet'}
        </button>
      )}

      {signError && (
        <p style={{ color: '#f55', fontSize: 12, marginTop: 8, fontFamily: 'monospace' }}>
          {signError}
        </p>
      )}

      {signStep === 'awaiting_wallet' && (
        <p style={{ color: '#f0a500', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
          ↑ Approve the signature request in your VIA Wallet
        </p>
      )}
    </div>
  );
};