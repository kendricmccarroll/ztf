import React, { useState, useEffect, useCallback } from 'react';
import Keycloak from 'keycloak-js';
import SignClient from '@walletconnect/sign-client';
import type { ISignClient } from '@walletconnect/types';
import type { SessionTypes } from '@walletconnect/types';
import { CreateDocument } from './components/CreateDocument';
import { DocumentView } from './components/DocumentView';
import { WalletConnectModal } from '@walletconnect/modal';



// ── Keycloak (unchanged from tutorial-2) ─────────────────────────────────────

const keycloak = new Keycloak({
  url: process.env.REACT_APP_KEYCLOAK_URL || 'http://localhost:8080',
  realm: process.env.REACT_APP_KEYCLOAK_REALM || 'ztf',
  clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'ztf-tutorial-2',
});

// ── Types ─────────────────────────────────────────────────────────────────────

type AuthState = 'loading' | 'unauthenticated' | 'authenticated';

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  // Auth state (tutorial-2, unchanged)
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [username, setUsername] = useState<string>('');

  // WalletConnect state (tutorial-2, unchanged)
  const [signClient, setSignClient] = useState<ISignClient | null>(null);
  const [session, setSession] = useState<SessionTypes.Struct | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // CoSign: URL-based document routing (new)
  const [activeDocId, setActiveDocId] = useState<string | null>(() => {
    return new URLSearchParams(window.location.search).get('doc');
  });

  // ── Keycloak init (tutorial-2) ──────────────────────────────────────────────

  useEffect(() => {
    keycloak
      .init({ onLoad: 'login-required', pkceMethod: 'S256',  checkLoginIframe: false })
      .then((authenticated) => {
        if (authenticated) {
          setAuthState('authenticated');
          setUsername(keycloak.tokenParsed?.preferred_username || '');
        } else {
          setAuthState('unauthenticated');
        }
      })
      .catch(() => setAuthState('unauthenticated'));

    keycloak.onTokenExpired = () => keycloak.updateToken(30).catch(() => keycloak.login());
  }, []);

  // ── WalletConnect init (tutorial-2) ────────────────────────────────────────

  useEffect(() => {
    if (authState !== 'authenticated') return;

    SignClient.init({
      projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || '',
      metadata: {
        name: 'ZTF CoSign',
        description: 'Cooperative Document Signing — ZTF Tutorial 2 Extension',
        url: window.location.origin,
        icons: [],
      },
    }).then((client) => {
      setSignClient(client);

      // Restore existing session if present
      const sessions = client.session.getAll();
      if (sessions.length > 0) {
        const existing = sessions[sessions.length - 1];
        setSession(existing);
        const addr = Object.values(existing.namespaces)
          .flatMap((ns) => ns.accounts)
          .map((a) => a.split(':')[2])[0];
        if (addr) setWalletAddress(addr);
      }
    });
  }, [authState]);

  // ── Connect wallet (tutorial-2) ─────────────────────────────────────────────

  const connectWallet = useCallback(async () => {
    if (!signClient) return;

    try {
      const { uri, approval } = await signClient.connect({
        requiredNamespaces: {
          eip155: {
            methods: ['personal_sign', 'eth_sign'],
            chains: ['eip155:1'],
            events: ['accountsChanged', 'chainChanged'],
          },
        },
      });

      if (uri) {
        // In tutorial-2 this opens the WalletConnect QR modal
        // Replace with however tutorial-2 opens the QR (Web3Modal or custom)
        console.log('WalletConnect URI:', uri);
        if (uri) {
          wcModal.openModal({ uri });
        }
        // If tutorial-2 uses @walletconnect/modal:
        // wcModal.openModal({ uri });
      }

      const approvedSession = await approval();
      wcModal.closeModal();  // add this line
      setSession(approvedSession);

      const addr = Object.values(approvedSession.namespaces)
        .flatMap((ns: { accounts: string[] }) => ns.accounts)
        .map((a) => a.split(':')[2])[0];
      if (addr) setWalletAddress(addr);

      // wcModal.closeModal();
    } catch (err) {
      console.error('WalletConnect connection failed:', err);
    }
  }, [signClient]);

  // ── Disconnect wallet (tutorial-2) ──────────────────────────────────────────

  const disconnectWallet = useCallback(async () => {
    if (!signClient || !session) return;
    try {
      await signClient.disconnect({
        topic: session.topic,
        reason: { code: 6000, message: 'User disconnected' },
      });
    } catch {
      // Session may already be gone
    }
    setSession(null);
    setWalletAddress(null);
  }, [signClient, session]);

  // ── CoSign: document routing (new) ──────────────────────────────────────────

  function handleDocumentCreated(id: string) {
    window.history.pushState({}, '', `/?doc=${id}`);
    setActiveDocId(id);
  }

  function handleBackToCreate() {
    window.history.pushState({}, '', '/');
    setActiveDocId(null);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  const wcModal = new WalletConnectModal({
    projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || '',
    chains: ['eip155:1'],
  });


  if (authState === 'loading') {
    return <div style={styles.center}><p>Initialising ZTF session…</p></div>;
  }

  if (authState === 'unauthenticated') {
    return (
      <div style={styles.center}>
        <h2>CoSign — Cooperative Document Signing</h2>
        <p style={{ color: '#aaa', margin: '12px 0 24px' }}>
          Authenticate with VIA ZTF to continue
        </p>
        <button style={styles.primaryBtn} onClick={() => keycloak.login()}>
          Sign in with VIA ZTF
        </button>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      {/* ── Header ── */}
      <header style={styles.header}>
        <span style={styles.logo}>✦ COSIGN</span>
        <div style={styles.headerRight}>
          {walletAddress ? (
            <button style={styles.walletBtn} onClick={disconnectWallet} title="Click to disconnect">
              <span style={styles.dot} />
              {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
            </button>
          ) : (
            <button style={styles.walletBtnIdle} onClick={connectWallet} disabled={!signClient}>
              Connect Wallet
            </button>
          )}
          <span style={styles.username}>{username}</span>
          <button style={styles.logoutBtn} onClick={() => keycloak.logout()}>
            Sign out
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={styles.main}>
        {!walletAddress ? (
          // Wallet not connected — prompt to connect (mirrors tutorial-2 step-up gate)
          <div style={styles.center}>
            <p style={{ color: '#f0a500', marginBottom: 16 }}>
              Connect your VIA Wallet to create or sign documents
            </p>
            <button style={styles.primaryBtn} onClick={connectWallet} disabled={!signClient}>
              Connect Wallet via WalletConnect
            </button>
          </div>
        ) : activeDocId ? (
          // Document view
          <>
            <DocumentView
              documentId={activeDocId}
              signClient={signClient}
              topic={session?.topic ?? null}
              walletAddress={walletAddress}
            />
            <button style={styles.backBtn} onClick={handleBackToCreate}>
              ← Create new document
            </button>
          </>
        ) : (
          // Create document
          <CreateDocument
            walletAddress={walletAddress}
            onCreated={handleDocumentCreated}
          />
        )}
      </main>
    </div>
  );
}

// ── Minimal inline styles (keeping tutorial-2's no-CSS-framework approach) ────

const styles = {
  app: {
    minHeight: '100vh',
    background: '#0a0a0b',
    color: '#e8e8ed',
    fontFamily: 'monospace',
  } as React.CSSProperties,
  center: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: 24,
    textAlign: 'center' as const,
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    height: 52,
    borderBottom: '1px solid #222',
    background: '#111',
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
  } as React.CSSProperties,
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 } as React.CSSProperties,
  logo: { fontFamily: 'monospace', fontSize: 13, letterSpacing: '0.18em', color: '#00e5a0' },
  walletBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '5px 12px', borderRadius: 20,
    background: 'rgba(0,229,160,0.1)', color: '#00e5a0',
    border: '1px solid rgba(0,229,160,0.25)',
    cursor: 'pointer', fontSize: 12, fontFamily: 'monospace',
  } as React.CSSProperties,
  walletBtnIdle: {
    padding: '5px 12px', borderRadius: 20,
    background: 'transparent', color: '#aaa',
    border: '1px solid #444', cursor: 'pointer', fontSize: 12,
  } as React.CSSProperties,
  dot: {
    width: 7, height: 7, borderRadius: '50%',
    background: '#00e5a0', display: 'inline-block',
  } as React.CSSProperties,
  username: { fontSize: 13, color: '#888' },
  logoutBtn: {
    background: 'transparent', border: '1px solid transparent',
    color: '#555', cursor: 'pointer', fontSize: 12, padding: '4px 8px',
  } as React.CSSProperties,
  main: { maxWidth: 680, margin: '0 auto', padding: '40px 24px' } as React.CSSProperties,
  primaryBtn: {
    padding: '12px 28px', background: '#00e5a0', color: '#000',
    border: 'none', borderRadius: 4, fontWeight: 700, cursor: 'pointer', fontSize: 14,
  } as React.CSSProperties,
  backBtn: {
    marginTop: 12, background: 'transparent',
    border: '1px solid #333', color: '#666',
    padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
  } as React.CSSProperties,
} as const;

export default App;