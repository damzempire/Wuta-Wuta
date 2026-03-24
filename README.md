# Wuta-Wuta

"Wuta-Wuta: The engine powering the Muse ecosystem. This monorepo houses the complete source code for the AI-generated art trading platform, from UI components to blockchain logic." muse-fullstack-dapp

## Overview

Wuta-Wuta is a comprehensive AI-human collaborative art marketplace built on blockchain technology. It enables artists to create collaborative artworks with AI models, mint them as NFTs, and trade them in a decentralized marketplace.

## Features

- **AI-Human Collaboration**: Create artworks collaboratively with AI models like Stable Diffusion, DALL-E, and Midjourney
- **NFT Minting**: Mint collaborative artworks as unique NFTs with royalty support
- **Artwork Evolution**: Allow artworks to evolve over time through community contributions
- **Decentralized Marketplace**: Trade artworks in a peer-to-peer marketplace
- **Project Management**: Integrated project and issue tracking system
- **Royalty System**: Fair royalty distribution for creators

## Architecture

### Smart Contracts

- **MuseNFT**: Core NFT contract for collaborative artworks
- **ProjectManager**: Project and issue management system

### Frontend

- **React**: Modern React application with TypeScript
- **Zustand**: State management for blockchain interactions
- **Tailwind CSS**: Modern styling framework

### Testing

Comprehensive testing suite including:

- **Unit Tests**: Individual component and function testing
- **Integration Tests**: Cross-contract and frontend-backend integration
- **Security Tests**: Smart contract security analysis
- **Performance Tests**: Gas optimization and load testing

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/olaleyeolajide81-sketch/Wuta-Wuta.git
cd Wuta-Wuta

# Install dependencies
npm install

# Install Hardhat dependencies
npm install --save-dev @nomicfoundation/hardhat-toolbox @openzeppelin/contracts @openzeppelin/test-helpers
```

### Database Setup

Once you have a PostgreSQL instance running, synchronize your database with the Prisma schema:

```bash
# Initialize and sync the database
npx prisma migrate dev --name init_marketplace_schema
```


### Development

```bash
# Start the development server
npm start

# Run tests
npm test

# Run smart contract tests
npm run test:contracts

# Compile contracts
npm run compile

# Deploy to local network
npm run deploy:local
```

### Testing

```bash
# Run all tests
npm run test:ci

# Run contract tests with coverage
npm run test:contracts:coverage

# Run integration tests
npm run test:integration

# Run security analysis
npm run security:slither
```

## Smart Contract Testing

The project includes comprehensive smart contract tests:

```bash
# Run all contract tests
npx hardhat test

# Run specific test file
npx hardhat test test/MuseNFT.test.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run coverage
npx hardhat coverage
```

### Test Structure

- `test/MuseNFT.test.js`: Tests for the main NFT contract
- `test/ProjectManager.test.js`: Tests for project management
- `test/integration/`: Integration tests
- `test/helpers/`: Test utilities and helpers

## Frontend Testing

```bash
# Run React component tests
npm test

# Run with coverage
npm run test:coverage

# Run in CI mode
npm run test:ci
```

## Security

This project implements multiple security measures:

- **Smart Contract Audits**: Regular security analysis with Slither and Mythril
- **Dependency Scanning**: Automated vulnerability scanning
- **Code Quality**: Static analysis and linting
- **Fuzz Testing**: Property-based testing for edge cases

## CI/CD Pipeline

The project includes automated testing and deployment:

- **GitHub Actions**: Automated testing on every push and PR
- **Security Scanning**: Regular security analysis
- **Coverage Reporting**: Code coverage tracking
- **Multi-environment**: Support for development, staging, and production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test:ci`
5. Run linting: `npm run lint`
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- OpenZeppelin for secure smart contract libraries
- Hardhat for development framework
- React and TypeScript community
- AI model providers (Stable Diffusion, DALL-E, etc.)p
