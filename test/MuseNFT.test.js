const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { 
  deployMuseNFT, 
  registerTestModels, 
  createTestArtwork, 
  getFutureTime, 
  mineBlocks 
} = require("./helpers/contracts");
const { 
  generateRandomHash, 
  expectRevert, 
  getEvent, 
  generateMockIPFSUri 
} = require("./helpers/utils");

describe("MuseNFT", function () {
  let museNFT;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    
    const MuseNFT = await ethers.getContractFactory("MuseNFT");
    museNFT = await MuseNFT.deploy();
    await museNFT.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await museNFT.owner()).to.equal(owner.address);
    });

    it("Should set correct name and symbol", async function () {
      expect(await museNFT.name()).to.equal("Muse AI Art");
      expect(await museNFT.symbol()).to.equal("MUSE");
    });

    it("Should set evolution treasury to owner", async function () {
      expect(await museNFT.evolutionTreasury()).to.equal(owner.address);
    });
  });

  describe("AI Model Registration", function () {
    it("Should register a new AI model", async function () {
      await expect(museNFT.registerAIModel("stable-diffusion"))
        .to.emit(museNFT, "AIModelRegistered")
        .withArgs("stable-diffusion", owner.address);
      
      expect(await museNFT.registeredModels("stable-diffusion")).to.be.true;
    });

    it("Should not register duplicate model", async function () {
      await museNFT.registerAIModel("stable-diffusion");
      
      await expectRevert(
        museNFT.registerAIModel("stable-diffusion"),
        "Model already registered"
      );
    });

    it("Should not register empty model name", async function () {
      await expectRevert(
        museNFT.registerAIModel(""),
        "Model name required"
      );
    });

    it("Should allow multiple model registrations", async function () {
      const models = ["stable-diffusion", "dall-e-3", "midjourney"];
      
      for (const model of models) {
        await expect(museNFT.registerAIModel(model))
          .to.emit(museNFT, "AIModelRegistered")
          .withArgs(model, owner.address);
        
        expect(await museNFT.registeredModels(model)).to.be.true;
      }
    });
  });

  describe("Collaborative Artwork Creation", function () {
    beforeEach(async function () {
      await museNFT.registerAIModel("stable-diffusion");
    });

    it("Should create collaborative artwork", async function () {
      const prompt = "A beautiful landscape";
      const tokenURI = "https://api.muse.art/metadata/1";
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test content"));
      
      await expect(museNFT.createCollaborativeArtwork(
        "stable-diffusion",
        60, // human contribution
        40, // AI contribution
        prompt,
        tokenURI,
        contentHash,
        true // can evolve
      ))
        .to.emit(museNFT, "ArtworkCreated")
        .withArgs(1, owner.address, "stable-diffusion", 60, 40);

      expect(await museNFT.ownerOf(1)).to.equal(owner.address);
      expect(await museNFT.tokenURI(1)).to.equal(tokenURI);
      
      const collaboration = await museNFT.getCollaboration(1);
      expect(collaboration.humanCreator).to.equal(owner.address);
      expect(collaboration.aiModel).to.equal("stable-diffusion");
      expect(collaboration.humanContribution).to.equal(60);
      expect(collaboration.aiContribution).to.equal(40);
      expect(collaboration.prompt).to.equal(prompt);
      expect(collaboration.canEvolve).to.be.true;
    });

    it("Should not create artwork with unregistered model", async function () {
      await expect(museNFT.createCollaborativeArtwork(
        "unregistered-model",
        50,
        50,
        "test prompt",
        "https://api.muse.art/metadata/1",
        ethers.keccak256(ethers.toUtf8Bytes("test")),
        true
      )).to.be.revertedWith("AI model not registered");
    });

    it("Should not create artwork with invalid contributions", async function () {
      await expect(museNFT.createCollaborativeArtwork(
        "stable-diffusion",
        70,
        40, // sum is 110, not 100
        "test prompt",
        "https://api.muse.art/metadata/1",
        ethers.keccak256(ethers.toUtf8Bytes("test")),
        true
      )).to.be.revertedWith("Contributions must sum to 100");
    });

    it("Should not create artwork with empty prompt", async function () {
      await expect(museNFT.createCollaborativeArtwork(
        "stable-diffusion",
        50,
        50,
        "",
        "https://api.muse.art/metadata/1",
        ethers.keccak256(ethers.toUtf8Bytes("test")),
        true
      )).to.be.revertedWith("Prompt required");
    });

    it("Should not create artwork with zero content hash", async function () {
      await expect(museNFT.createCollaborativeArtwork(
        "stable-diffusion",
        50,
        50,
        "test prompt",
        "https://api.muse.art/metadata/1",
        ethers.ZeroHash,
        true
      )).to.be.revertedWith("Content hash required");
    });
  });

  describe("Artwork Evolution", function () {
    beforeEach(async function () {
      await museNFT.registerAIModel("stable-diffusion");
      await museNFT.createCollaborativeArtwork(
        "stable-diffusion",
        60,
        40,
        "original prompt",
        "https://api.muse.art/metadata/1",
        ethers.keccak256(ethers.toUtf8Bytes("original content")),
        true
      );
    });

    it("Should evolve artwork", async function () {
      const evolutionPrompt = "evolved version";
      const newTokenURI = "https://api.muse.art/metadata/1-evolved";
      const evolutionHash = ethers.keccak256(ethers.toUtf8Bytes("evolved content"));
      const evolutionFee = await museNFT.evolutionFee();
      
      await expect(museNFT.evolveArtwork(
        1,
        evolutionPrompt,
        newTokenURI,
        evolutionHash,
        { value: evolutionFee }
      ))
        .to.emit(museNFT, "ArtworkEvolved")
        .withArgs(1, 1, owner.address, evolutionPrompt);

      expect(await museNFT.tokenURI(1)).to.equal(newTokenURI);
      
      const collaboration = await museNFT.getCollaboration(1);
      expect(collaboration.evolutionCount).to.equal(1);
      
      const evolutionHistory = await museNFT.getEvolutionHistory(1);
      expect(evolutionHistory.length).to.equal(1);
      expect(evolutionHistory[0].evolutionPrompt).to.equal(evolutionPrompt);
    });

    it("Should not evolve without sufficient fee", async function () {
      await expect(museNFT.evolveArtwork(
        1,
        "evolution prompt",
        "https://api.muse.art/metadata/1-evolved",
        ethers.keccak256(ethers.toUtf8Bytes("evolved content")),
        { value: ethers.parseEther("0.005") } // half the required fee
      )).to.be.revertedWith("Insufficient evolution fee");
    });

    it("Should not evolve non-evolvable artwork", async function () {
      await museNFT.createCollaborativeArtwork(
        "stable-diffusion",
        50,
        50,
        "non-evolvable prompt",
        "https://api.muse.art/metadata/2",
        ethers.keccak256(ethers.toUtf8Bytes("non-evolvable content")),
        false // cannot evolve
      );

      await expect(museNFT.evolveArtwork(
        2,
        "evolution prompt",
        "https://api.muse.art/metadata/2-evolved",
        ethers.keccak256(ethers.toUtf8Bytes("evolved content")),
        { value: await museNFT.evolutionFee() }
      )).to.be.revertedWith("Token cannot evolve");
    });

    it("Should not evolve before minimum interval", async function () {
      // Set minimum interval to a very long time
      await museNFT.setMinEvolutionInterval(time.duration.days(30));
      
      await expect(museNFT.evolveArtwork(
        1,
        "evolution prompt",
        "https://api.muse.art/metadata/1-evolved",
        ethers.keccak256(ethers.toUtf8Bytes("evolved content")),
        { value: await museNFT.evolutionFee() }
      )).to.be.revertedWith("Evolution interval not met");
    });

    it("Should not evolve with empty prompt", async function () {
      await expect(museNFT.evolveArtwork(
        1,
        "",
        "https://api.muse.art/metadata/1-evolved",
        ethers.keccak256(ethers.toUtf8Bytes("evolved content")),
        { value: await museNFT.evolutionFee() }
      )).to.be.revertedWith("Evolution prompt required");
    });

    it("Should not evolve with zero evolution hash", async function () {
      await expect(museNFT.evolveArtwork(
        1,
        "evolution prompt",
        "https://api.muse.art/metadata/1-evolved",
        ethers.ZeroHash,
        { value: await museNFT.evolutionFee() }
      )).to.be.revertedWith("Evolution hash required");
    });
  });

  describe("Royalty Management", function () {
    beforeEach(async function () {
      await museNFT.registerAIModel("stable-diffusion");
      await museNFT.createCollaborativeArtwork(
        "stable-diffusion",
        60,
        40,
        "test prompt",
        "https://api.muse.art/metadata/1",
        ethers.keccak256(ethers.toUtf8Bytes("test content")),
        true
      );
    });

    it("Should set royalty percentage", async function () {
      await museNFT.setRoyalty(1, 500); // 5%
      expect(await museNFT.royaltyPercentage(1)).to.equal(500);
    });

    it("Should not set royalty for non-creator", async function () {
      await expect(museNFT.connect(addr1).setRoyalty(1, 500))
        .to.be.revertedWith("Only creator can set royalty");
    });

    it("Should not set royalty above maximum", async function () {
      await expect(museNFT.setRoyalty(1, 1500)) // 15%
        .to.be.revertedWith("Royalty exceeds maximum");
    });

    it("Should calculate royalty correctly", async function () {
      await museNFT.setRoyalty(1, 500); // 5%
      const salePrice = ethers.parseEther("1");
      const [recipient, amount] = await museNFT.royaltyInfo(1, salePrice);
      
      expect(recipient).to.equal(owner.address);
      expect(amount).to.equal(ethers.parseEther("0.05")); // 5% of 1 ETH
    });
  });

  describe("Query Functions", function () {
    beforeEach(async function () {
      await museNFT.registerAIModel("stable-diffusion");
      await museNFT.createCollaborativeArtwork(
        "stable-diffusion",
        60,
        40,
        "test prompt 1",
        "https://api.muse.art/metadata/1",
        ethers.keccak256(ethers.toUtf8Bytes("test content 1")),
        true
      );
      await museNFT.createCollaborativeArtwork(
        "stable-diffusion",
        50,
        50,
        "test prompt 2",
        "https://api.muse.art/metadata/2",
        ethers.keccak256(ethers.toUtf8Bytes("test content 2")),
        true
      );
    });

    it("Should get tokens by creator", async function () {
      const creatorTokens = await museNFT.getTokensByCreator(owner.address);
      expect(creatorTokens.length).to.equal(2);
      expect(creatorTokens[0]).to.equal(1);
      expect(creatorTokens[1]).to.equal(2);
    });

    it("Should return total supply", async function () {
      expect(await museNFT.totalSupply()).to.equal(2);
    });

    it("Should get latest evolution after evolution", async function () {
      const evolutionFee = await museNFT.evolutionFee();
      await museNFT.evolveArtwork(
        1,
        "evolution prompt",
        "https://api.muse.art/metadata/1-evolved",
        ethers.keccak256(ethers.toUtf8Bytes("evolved content")),
        { value: evolutionFee }
      );

      const latestEvolution = await museNFT.getLatestEvolution(1);
      expect(latestEvolution.evolutionPrompt).to.equal("evolution prompt");
      expect(latestEvolution.evolver).to.equal(owner.address);
    });

    it("Should revert when getting latest evolution for non-evolved token", async function () {
      await expect(museNFT.getLatestEvolution(2))
        .to.be.revertedWith("No evolutions exist");
    });
  });

  describe("Owner Functions", function () {
    it("Should update evolution fee", async function () {
      const newFee = ethers.parseEther("0.02");
      await expect(museNFT.setEvolutionFee(newFee))
        .to.emit(museNFT, "EvolutionFeeUpdated") // This event needs to be added to the contract
        .withArgs(newFee);
      
      expect(await museNFT.evolutionFee()).to.equal(newFee);
    });

    it("Should update minimum evolution interval", async function () {
      const newInterval = time.duration.days(7);
      await museNFT.setMinEvolutionInterval(newInterval);
      expect(await museNFT.minEvolutionInterval()).to.equal(newInterval);
    });

    it("Should update evolution treasury", async function () {
      await museNFT.setEvolutionTreasury(addr1.address);
      expect(await museNFT.evolutionTreasury()).to.equal(addr1.address);
    });

    it("Should not allow non-owner to update parameters", async function () {
      await expect(museNFT.connect(addr1).setEvolutionFee(ethers.parseEther("0.02")))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple evolutions correctly", async function () {
      await museNFT.registerAIModel("stable-diffusion");
      await museNFT.createCollaborativeArtwork(
        "stable-diffusion",
        60,
        40,
        "original prompt",
        "https://api.muse.art/metadata/1",
        ethers.keccak256(ethers.toUtf8Bytes("original content")),
        true
      );

      const evolutionFee = await museNFT.evolutionFee();
      
      // First evolution
      await museNFT.evolveArtwork(
        1,
        "first evolution",
        "https://api.muse.art/metadata/1-v1",
        ethers.keccak256(ethers.toUtf8Bytes("first evolution content")),
        { value: evolutionFee }
      );

      // Wait for minimum interval
      await time.increase(time.duration.days(2));

      // Second evolution
      await museNFT.evolveArtwork(
        1,
        "second evolution",
        "https://api.muse.art/metadata/1-v2",
        ethers.keccak256(ethers.toUtf8Bytes("second evolution content")),
        { value: evolutionFee }
      );

      const collaboration = await museNFT.getCollaboration(1);
      expect(collaboration.evolutionCount).to.equal(2);

      const evolutionHistory = await museNFT.getEvolutionHistory(1);
      expect(evolutionHistory.length).to.equal(2);
      expect(evolutionHistory[0].evolutionPrompt).to.equal("first evolution");
      expect(evolutionHistory[1].evolutionPrompt).to.equal("second evolution");
    });

    it("Should handle token transfer correctly", async function () {
      await museNFT.registerAIModel("stable-diffusion");
      await museNFT.createCollaborativeArtwork(
        "stable-diffusion",
        60,
        40,
        "test prompt",
        "https://api.muse.art/metadata/1",
        ethers.keccak256(ethers.toUtf8Bytes("test content")),
        true
      );

      await museNFT.transferFrom(owner.address, addr1.address, 1);
      expect(await museNFT.ownerOf(1)).to.equal(addr1.address);
      
      // Original creator should still be able to set royalty
      await museNFT.setRoyalty(1, 300);
      expect(await museNFT.royaltyPercentage(1)).to.equal(300);
    });
  });
});
