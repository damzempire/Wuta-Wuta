const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("MuseNFT", function () {
  // Test constants
  const VALID_TOKEN_URI = "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";
  const VALID_IMAGE_CID = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";
  const AI_MODEL = "stable-diffusion";
  const ROYALTY_BPS = 500; // 5%

  // Fixture for deployment
  async function deployMuseNFTFixture() {
    const [owner, artist, collector] = await ethers.getSigners();
    const MuseNFT = await ethers.getContractFactory("MuseNFT");
    const contract = await MuseNFT.deploy();
    await contract.waitForDeployment();
    
    // Register default AI model
    await contract.registerAIModel(AI_MODEL);
    
    return { contract, owner, artist, collector };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { contract, owner } = await loadFixture(deployMuseNFTFixture);
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      const { contract } = await loadFixture(deployMuseNFTFixture);
      expect(await contract.name()).to.equal("Muse AI Art");
      expect(await contract.symbol()).to.equal("MUSE");
    });
  });

  describe("AI Model Registration", function () {
    it("Should allow registering new models", async function () {
      const { contract, owner } = await loadFixture(deployMuseNFTFixture);
      await expect(contract.registerAIModel("dall-e-3"))
        .to.emit(contract, "AIModelRegistered")
        .withArgs("dall-e-3", owner.address);
      expect(await contract.registeredModels("dall-e-3")).to.be.true;
    });

    it("Should not allow duplicate models", async function () {
      const { contract } = await loadFixture(deployMuseNFTFixture);
      await expect(contract.registerAIModel("duplicate-model")).to.not.be.reverted;
      await expect(contract.registerAIModel("duplicate-model"))
        .to.be.revertedWith("Model already registered");
    });
  });

  describe("mintArtwork (Issue #39)", function () {
    it("Should mint successfully with valid parameters", async function () {
      const { contract, artist } = await loadFixture(deployMuseNFTFixture);
      
      await expect(contract.mintArtwork(
        artist.address,
        VALID_TOKEN_URI,
        VALID_IMAGE_CID,
        AI_MODEL,
        ROYALTY_BPS
      )).to.emit(contract, "ArtworkMinted")
        .withArgs(1, artist.address, VALID_TOKEN_URI, VALID_IMAGE_CID, AI_MODEL);
        
      expect(await contract.ownerOf(1)).to.equal(artist.address);
      expect(await contract.tokenURI(1)).to.equal(VALID_TOKEN_URI);
      expect(await contract.artworkImageCID(1)).to.equal(VALID_IMAGE_CID);
      expect(await contract.artworkAIModel(1)).to.equal(AI_MODEL);
      expect(await contract.artworkArtist(1)).to.equal(artist.address);
      expect(await contract.totalMinted()).to.equal(1);
    });

    it("Should enforce IPFS URI security (Issue #6)", async function () {
      const { contract, artist } = await loadFixture(deployMuseNFTFixture);
      
      await expect(contract.mintArtwork(
        artist.address,
        "https://example.com/metadata.json",
        VALID_IMAGE_CID,
        AI_MODEL,
        ROYALTY_BPS
      )).to.be.revertedWith("MuseNFT: tokenURI must be an IPFS URI (ipfs://...)");
    });

    it("Should prevent empty image CID", async function () {
      const { contract, artist } = await loadFixture(deployMuseNFTFixture);
      
      await expect(contract.mintArtwork(
        artist.address,
        VALID_TOKEN_URI,
        "",
        AI_MODEL,
        ROYALTY_BPS
      )).to.be.revertedWith("MuseNFT: imageCID cannot be empty");
    });

    it("Should prevent excessive royalty", async function () {
      const { contract, artist } = await loadFixture(deployMuseNFTFixture);
      
      await expect(contract.mintArtwork(
        artist.address,
        VALID_TOKEN_URI,
        VALID_IMAGE_CID,
        AI_MODEL,
        1001 // 10.01%
      )).to.be.revertedWith("MuseNFT: royalty cannot exceed 10%");
    });
  });

  describe("artworkGatewayURL", function () {
    it("Should return correct Pinata gateway URL", async function () {
      const { contract, artist } = await loadFixture(deployMuseNFTFixture);
      
      await contract.mintArtwork(
        artist.address,
        VALID_TOKEN_URI,
        VALID_IMAGE_CID,
        AI_MODEL,
        ROYALTY_BPS
      );
      
      const gatewayURL = await contract.artworkGatewayURL(1);
      expect(gatewayURL).to.equal(`https://gateway.pinata.cloud/ipfs/${VALID_IMAGE_CID}`);
    });
  });

  describe("createCollaborativeArtwork", function () {
    it("Should create collaborative artwork successfully", async function () {
      const { contract, artist } = await loadFixture(deployMuseNFTFixture);
      
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("content"));
      
      await expect(contract.connect(artist).createCollaborativeArtwork(
        AI_MODEL,
        60, // human
        40, // AI
        "A futuristic city",
        VALID_TOKEN_URI,
        contentHash,
        true
      )).to.emit(contract, "ArtworkCreated");
      
      const collaboration = await contract.getCollaboration(1);
      expect(collaboration.humanCreator).to.equal(artist.address);
      expect(collaboration.aiModel).to.equal(AI_MODEL);
      expect(collaboration.humanContribution).to.equal(60);
      expect(collaboration.aiContribution).to.equal(40);
    });
  });
});
