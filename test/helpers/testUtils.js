const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

/**
 * Test utilities for smart contract testing
 */

class TestContractFactory {
  static async deployMuseNFT() {
    const MuseNFT = await ethers.getContractFactory("MuseNFT");
    const museNFT = await MuseNFT.deploy();
    await museNFT.waitForDeployment();
    return museNFT;
  }

  static async deployProjectManager() {
    const ProjectManager = await ethers.getContractFactory("ProjectManager");
    const projectManager = await ProjectManager.deploy();
    await projectManager.waitForDeployment();
    return projectManager;
  }

  static async deployAll() {
    const museNFT = await this.deployMuseNFT();
    const projectManager = await this.deployProjectManager();
    return { museNFT, projectManager };
  }
}

class TestDataGenerator {
  static generateArtworkData(overrides = {}) {
    return {
      aiModel: "stable-diffusion",
      humanContribution: 60,
      aiContribution: 40,
      prompt: "A beautiful landscape",
      tokenURI: "https://api.muse.art/metadata/1",
      contentHash: ethers.keccak256(ethers.toUtf8Bytes("test content")),
      canEvolve: true,
      ...overrides,
    };
  }

  static generateProjectData(overrides = {}) {
    return {
      name: "Test Project",
      description: "A test project for unit testing",
      repositoryUrl: "https://github.com/test/project",
      ...overrides,
    };
  }

  static generateIssueData(overrides = {}) {
    return {
      title: "Test Issue",
      description: "A test issue for unit testing",
      bounty: ethers.parseEther("0.1"),
      ...overrides,
    };
  }

  static generateEvolutionData(overrides = {}) {
    return {
      evolutionPrompt: "Evolved version",
      newTokenURI: "https://api.muse.art/metadata/1-evolved",
      evolutionHash: ethers.keccak256(ethers.toUtf8Bytes("evolved content")),
      ...overrides,
    };
  }
}

class TestHelpers {
  /**
   * Create a complete artwork with all necessary setup
   */
  static async createCompleteArtwork(museNFT, signer, artworkData) {
    // Register AI model if not already registered
    const aiModel = artworkData.aiModel;
    try {
      await museNFT.registerAIModel(aiModel);
    } catch (error) {
      // Model might already be registered
      if (!error.message.includes("Model already registered")) {
        throw error;
      }
    }

    // Create artwork
    const tx = await museNFT.connect(signer).createCollaborativeArtwork(
      artworkData.aiModel,
      artworkData.humanContribution,
      artworkData.aiContribution,
      artworkData.prompt,
      artworkData.tokenURI,
      artworkData.contentHash,
      artworkData.canEvolve
    );

    const receipt = await tx.wait();
    const tokenId = 1; // Assuming this is the first token

    // Set royalty if specified
    if (artworkData.royalty) {
      await museNFT.connect(signer).setRoyalty(tokenId, artworkData.royalty);
    }

    return { tokenId, receipt };
  }

  /**
   * Create a complete project with issues
   */
  static async createCompleteProject(projectManager, maintainer, projectData, issueDataArray = []) {
    // Create project
    const tx = await projectManager.connect(maintainer).createProject(
      projectData.name,
      projectData.description,
      projectData.repositoryUrl
    );

    const receipt = await tx.wait();
    const projectId = 1; // Assuming this is the first project

    // Create issues if provided
    const issues = [];
    for (const issueData of issueDataArray) {
      const issueTx = await projectManager.connect(issueData.creator || maintainer).createIssue(
        projectId,
        issueData.title,
        issueData.description,
        issueData.bounty
      );
      
      const issueReceipt = await issueTx.wait();
      issues.push({
        issueId: issues.length + 1,
        receipt: issueReceipt,
        data: issueData
      });
    }

    return { projectId, receipt, issues };
  }

  /**
   * Evolve artwork with all necessary setup
   */
  static async evolveArtwork(museNFT, signer, tokenId, evolutionData) {
    // Wait for minimum evolution interval
    await time.increase(time.duration.days(2));

    const evolutionFee = await museNFT.evolutionFee();

    const tx = await museNFT.connect(signer).evolveArtwork(
      tokenId,
      evolutionData.evolutionPrompt,
      evolutionData.newTokenURI,
      evolutionData.evolutionHash,
      { value: evolutionFee }
    );

    const receipt = await tx.wait();
    return { receipt };
  }

  /**
   * Get contract events from transaction receipt
   */
  static getEvents(receipt, eventName) {
    return receipt.logs.filter(log => log.fragment && log.fragment.name === eventName);
  }

  /**
   * Calculate expected royalty
   */
  static calculateRoyalty(salePrice, royaltyPercentage) {
    return (salePrice * BigInt(royaltyPercentage)) / BigInt(10000);
  }

  /**
   * Wait for blocks to be mined
   */
  static async waitBlocks(blockCount) {
    for (let i = 0; i < blockCount; i++) {
      await ethers.provider.send("evm_mine", []);
    }
  }

  /**
   * Get current timestamp
   */
  static async getCurrentTimestamp() {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
  }

  /**
   * Increase time by duration
   */
  static async increaseTime(duration) {
    await time.increase(duration);
  }

  /**
   * Check if address is a contract
   */
  static async isContract(address) {
    const code = await ethers.provider.getCode(address);
    return code !== "0x";
  }

  /**
   * Get balance of address
   */
  static async getBalance(address) {
    return await ethers.provider.getBalance(address);
  }

  /**
   * Estimate gas for transaction
   */
  static async estimateGas(contract, function_name, ...args) {
    return await contract[function_name].estimateGas(...args);
  }

  /**
   * Revert with specific error message
   */
  static async expectRevert(promise, expectedError) {
    try {
      await promise;
      throw new Error("Expected transaction to revert");
    } catch (error) {
      if (error.message.includes("Expected transaction to revert")) {
        throw error;
      }
      if (!error.message.includes(expectedError)) {
        throw new Error(`Expected error "${expectedError}" but got "${error.message}"`);
      }
    }
  }

  /**
   * Compare big numbers with tolerance
   */
  static compareBigNumbers(actual, expected, tolerance = 0) {
    const diff = actual > expected ? actual - expected : expected - actual;
    return diff <= BigInt(tolerance);
  }

  /**
   * Generate random address
   */
  static generateRandomAddress() {
    return ethers.Wallet.createRandom().address;
  }

  /**
   * Generate random bytes32
   */
  static generateRandomBytes32() {
    return ethers.hexlify(ethers.randomBytes(32));
  }

  /**
   * Generate random string
   */
  static generateRandomString(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

class MockData {
  static AI_MODELS = [
    "stable-diffusion",
    "dall-e-3",
    "gpt-4",
    "midjourney"
  ];

  static SAMPLE_PROMPTS = [
    "A beautiful landscape",
    "Abstract geometric patterns",
    "Futuristic cityscape",
    "Portrait of a robot",
    "Underwater scene",
    "Space exploration",
    "Fantasy castle",
    "Modern art piece"
  ];

  static SAMPLE_PROJECT_NAMES = [
    "Art Generation Platform",
    "NFT Marketplace",
    "Collaborative Canvas",
    "Digital Gallery",
    "AI Art Studio"
  ];

  static SAMPLE_ISSUE_TITLES = [
    "Implement user authentication",
    "Add NFT minting feature",
    "Fix gallery loading bug",
    "Optimize image processing",
    "Add evolution mechanism",
    "Improve UI/UX design"
  ];

  static getRandomAIModel() {
    return this.AI_MODELS[Math.floor(Math.random() * this.AI_MODELS.length)];
  }

  static getRandomPrompt() {
    return this.SAMPLE_PROMPTS[Math.floor(Math.random() * this.SAMPLE_PROMPTS.length)];
  }

  static getRandomProjectName() {
    return this.SAMPLE_PROJECT_NAMES[Math.floor(Math.random() * this.SAMPLE_PROJECT_NAMES.length)];
  }

  static getRandomIssueTitle() {
    return this.SAMPLE_ISSUE_TITLES[Math.floor(Math.random() * this.SAMPLE_ISSUE_TITLES.length)];
  }

  static getRandomContribution() {
    const human = Math.floor(Math.random() * 80) + 10; // 10-90
    const ai = 100 - human;
    return { human, ai };
  }

  static getRandomBounty() {
    const min = ethers.parseEther("0.01");
    const max = ethers.parseEther("1.0");
    return ethers.getRandomBytes(32).then(bytes => {
      const randomValue = BigInt(ethers.hexlify(bytes)) % (max - min + 1n);
      return min + randomValue;
    });
  }
}

module.exports = {
  TestContractFactory,
  TestDataGenerator,
  TestHelpers,
  MockData
};
