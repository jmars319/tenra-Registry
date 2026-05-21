# Registry Handoff Registry

Generated from `@tenra-handoff` source annotations by `scripts/generate-handoff-registry.mjs`.

Registry owns two business handoff payloads: Ledger exports and Assembly document requests. Handoffs are explicit JSON payloads moved through local UI actions, API routes, exports, imports, or fixtures. Apps should not read another app's private storage directly.

Envelope baseline:

- `schema`: exact contract id when the payload has one.
- `sourceApp`: producing app when the contract supports it.
- `exportId`: stable producer export id when duplicate-safe reconciliation is needed.
- `exportedAt` or `exportedAtMs`: creation timestamp.
- `traceId` or source artifact metadata when a downstream app needs audit context.
- Target apps are advisory routing metadata, not hidden coupling.

Registered contracts:

| Contract | Owner | Consumers |
| --- | --- | --- |
| `tenra-registry.ledger-export.v1` | Registry | Ledger |
| `tenra-registry.assembly-document-request.v1` | Registry | Assembly |

Validation entrypoint:

- Run the repository's `verify:handoffs` script before changing or consuming a handoff fixture.
