# KaspaStore Identity (KSI) Protocol Specification

KSI is a pure decentralized identity protocol etched directly onto the Kaspa GHOSTDAG. It enables sovereign users to claim unique handles (`.ks`) through cryptographic proof without relying on a central registry, auction house, or recurring fees.

## Protocol Highlights

-   **Sovereign:** Handles are owned by the private key holder.
-   **Zero-Fee Registry:** No protocol fees. Users only pay Kaspa network gas for the proof-of-ownership transaction (memo).
-   **Universal Resolution:** Any Kaspa indexer can reconstruct the identity state by scanning for specific DAG headers.

## Data Payload (ksi-v1)

A KSI registration consists of a JSON payload following this schema:

```json
{
  "p": "ksi-v1",
  "op": "reg",
  "name": "vitalik.ks",
  "address": "kaspa:q...",
  "timestamp": 1714579200000
}
```

## Proof of Ownership

Ownership is established by signing a specific message with the private key associated with the `address`. The message format is:

`[KSI Identity Proof]\nProtocol: ksi-v1\nHandle: {name}\nOwner: {address}\nIssued: {isoTimestamp}`

## Resolution Logic

Indexers scan the Kaspa DAG for:
1.  Transactions containing the `ksi-v1` registration payload.
2.  Validating that the transaction was sent FROM the `address` specified in the payload.
3.  First-come, first-served rule applies to unique handles.

## Open Source Registry
The indexer and registry logic are open-source and part of the KaspaStore ecosystem.
