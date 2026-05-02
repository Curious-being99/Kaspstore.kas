# Kaspstore.kas

Kaspstore.kas is a decentralized appstore built on the Kaspa blockchain. It provides a secure, censorship-resistant platform where users can discover, install, and manage applications, manage their digital assets, and participate in community-driven governance.

## Features

- **Decentralized Marketplace:** Explore and install dApps directly from the blockchain.
- **KNS Identity & Wallet Integration:** Authenticate using Kaspa wallets and manage your digital identity with KNS.
- **Community Governance:** Participate in decentralized proposals to influence protocol trajectory, with voting linked to KNS identities.

## Deployment & Requirements

This project is configured for modern Node.js environments.

- **Engine:** Node.js 20 or higher.
- **Build System:** Uses Vite and esbuild for efficient production builds.

### Development

```bash
npm install
npm run dev
```

### Build and Deploy

```bash
npm run build
npm start
```

The build command compiles the server entry point (`server.ts`) to `dist/server.cjs` and bundles the frontend.
