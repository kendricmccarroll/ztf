## CoSign Extension — Cooperative Document Signing

### Running

Same as tutorial-2:
```bash
npm install
npm start
```
Open two browser profiles to http://localhost:3000

### Flow
1. **Profile A**: Log in via ZTF, connect wallet → Create a document → copy the `?doc=<id>` URL
2. **Profile B**: Open the URL → log in as a different user → connect a different wallet → Sign

### Design Rationale: Signature Format

Each signer calls `personal_sign` over a JSON-serialised `SigningPayload`:
```typescript
{
  documentId: string;   // ties signature to one document
  contentHash: string;  // keccak256 of the content — same value both parties sign
  title: string;
  signerAddress: string;
  timestamp: number;
}
```

**Why this is secure:** The `contentHash` (keccak256 of the document text) is included in every payload. Since both signers' payloads reference the same hash, and the hash is deterministically derived from the content, it's mathematically impossible for them to have signed different versions of the document without the hashes diverging.

**Third-party verification:** The `signedPayload` string is stored alongside the signature. Any party can independently run `ethers.utils.verifyMessage(signedPayload, signature)` — if the recovered address matches the stored `signerAddress`, the signature is valid. No backend or trusted service required.

**Why `personal_sign` and not EIP-712:** This extends tutorial-2's existing `personal_sign` pattern directly — same WalletConnect request method, same ethers verification. For production, EIP-712 typed data would be preferable for richer wallet UI and on-chain verifiability.



### Next Steps
After running this tutorial successfully, you are all set to be able to modify the transaction demo for your specific use case.
