// src/components/CreateDocument.tsx
import React, { useState } from 'react';
import { createDocument } from '../services/documentStore';
import { ethers } from 'ethers';

interface Props {
  walletAddress: string;
  onCreated: (id: string) => void;
}

export const CreateDocument: React.FC<Props> = ({ walletAddress, onCreated }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  function handleCreate() {
    if (!title.trim() || !content.trim()) return;
    setBusy(true);
    const doc = createDocument(title.trim(), content.trim(), walletAddress);
    onCreated(doc.id);
  }

  const hash = content.trim() ? ethers.utils.id(content.trim()) : '';

  return (
    <div style={{ padding: '16px', border: '1px solid #333', borderRadius: 6, marginTop: 16 }}>
      <h3 style={{ marginBottom: 12 }}>Create Document</h3>
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#aaa' }}>
          TITLE
        </label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Partnership Agreement"
          style={{ width: '100%', padding: '8px', background: '#1a1a1a', border: '1px solid #444', color: '#fff', borderRadius: 4 }}
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#aaa' }}>
          CONTENT
        </label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={5}
          placeholder="Document text..."
          style={{ width: '100%', padding: '8px', background: '#1a1a1a', border: '1px solid #444', color: '#fff', borderRadius: 4, fontFamily: 'monospace' }}
        />
        {hash && (
          <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
            keccak256: <code style={{ color: '#0f0' }}>{hash.slice(0, 20)}…</code>
          </div>
        )}
      </div>
      <button
        onClick={handleCreate}
        disabled={busy || !title.trim() || !content.trim()}
        style={{ padding: '10px 20px', background: '#0f0', color: '#000', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer' }}
      >
        Create & Get Link
      </button>
    </div>
  );
};