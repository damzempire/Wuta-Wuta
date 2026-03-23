const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Marketplace Integration Flow", function () {
  let museNFT;
  let projectManager;
  let owner;
  let artist;
  let collector;
  let maintainer;

  beforeEach(async function () {
    [owner, artist, collector, maintainer] = await ethers.getSigners();
    
    // Deploy contracts
    const MuseNFT = await ethers.getContractFactory("MuseNFT");
    museNFT = await MuseNFT.deploy();
    await museNFT.waitForDeployment();

    const ProjectManager = await ethers.getContractFactory("ProjectManager");
    projectManager = await ProjectManager.deploy();
    await projectManager.waitForDeployment();

    // Register AI models
    await museNFT.registerAIModel("stable-diffusion");
    await museNFT.registerAIModel("dall-e-3");
  });

  describe("Complete Artwork Lifecycle", function () {
    it("Should handle complete artwork creation, evolution, and marketplace flow", async function () {
      // 1. Artist creates collaborative artwork
      const prompt = "A surreal landscape with floating islands";
      const tokenURI = "https://api.muse.art/metadata/1";
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("artwork content"));
      
      const createTx = await museNFT.connect(artist).createCollaborativeArtwork(
        "stable-diffusion",
        70, // human contribution
        30, // AI contribution
        prompt,
        tokenURI,
        contentHash,
        true // can evolve
      );
      
      const receipt = await createTx.wait();
      const tokenId = 1; // First token
      
      // Verify creation
      expect(await museNFT.ownerOf(tokenId)).to.equal(artist.address);
      
      const collaboration = await museNFT.getCollaboration(tokenId);
      expect(collaboration.humanCreator).to.equal(artist.address);
      expect(collaboration.humanContribution).to.equal(70);
      expect(collaboration.aiContribution).to.equal(30);
      expect(collaboration.canEvolve).to.be.true;
      
      // 2. Set royalty
      await museNFT.connect(artist).setRoyalty(tokenId, 500); // 5%
      expect(await museNFT.royaltyPercentage(tokenId)).to.equal(500);
      
      // 3. Wait for evolution interval and evolve artwork
      await time.increase(time.duration.days(2));
      
      const evolutionPrompt = "Add dragons flying between islands";
      const newTokenURI = "https://api.muse.art/metadata/1-evolved";
      const evolutionHash = ethers.keccak256(ethers.toUtf8Bytes("evolved content"));
      const evolutionFee = await museNFT.evolutionFee();
      
      const evolveTx = await museNFT.connect(collector).evolveArtwork(
        tokenId,
        evolutionPrompt,
        newTokenURI,
        evolutionHash,
        { value: evolutionFee }
      );
      
      // Verify evolution
      expect(await museNFT.tokenURI(tokenId)).to.equal(newTokenURI);
      
      const evolvedCollaboration = await museNFT.getCollaboration(tokenId);
      expect(evolvedCollaboration.evolutionCount).to.equal(1);
      
      const evolutionHistory = await museNFT.getEvolutionHistory(tokenId);
      expect(evolutionHistory.length).to.equal(1);
      expect(evolutionHistory[0].evolver).to.equal(collector.address);
      expect(evolutionHistory[0].evolutionPrompt).to.equal(evolutionPrompt);
      
      // 4. Transfer to collector
      await museNFT.connect(artist).transferFrom(artist.address, collector.address, tokenId);
      expect(await museNFT.ownerOf(tokenId)).to.equal(collector.address);
      
      // 5. Verify royalty info remains correct
      const [royaltyRecipient, royaltyAmount] = await museNFT.royaltyInfo(
        tokenId, 
        ethers.parseEther("1")
      );
      expect(royaltyRecipient).to.equal(artist.address);
      expect(royaltyAmount).to.equal(ethers.parseEther("0.05")); // 5% of 1 ETH
    });

    it("Should handle multiple artworks and evolutions", async function () {
      // Create multiple artworks
      const artworks = [];
      
      for (let i = 0; i < 3; i++) {
        await museNFT.connect(artist).createCollaborativeArtwork(
          "stable-diffusion",
          60,
          40,
          `Artwork ${i + 1}`,
          `https://api.muse.art/metadata/${i + 1}`,
          ethers.keccak256(ethers.toUtf8Bytes(`content ${i + 1}`)),
          true
        );
        artworks.push(i + 1);
      }
      
      expect(await museNFT.totalSupply()).to.equal(3);
      
      // Get artist's tokens
      const artistTokens = await museNFT.getTokensByCreator(artist.address);
      expect(artistTokens.length).to.equal(3);
      
      // Evolve second artwork multiple times
      await time.increase(time.duration.days(2));
      
      // First evolution
      await museNFT.connect(collector).evolveArtwork(
        2,
        "First evolution",
        "https://api.muse.art/metadata/2-v1",
        ethers.keccak256(ethers.toUtf8Bytes("evolution 1")),
        { value: await museNFT.evolutionFee() }
      );
      
      // Wait and evolve again
      await time.increase(time.duration.days(2));
      
      await museNFT.connect(artist).evolveArtwork(
        2,
        "Second evolution",
        "https://api.muse.art/metadata/2-v2",
        ethers.keccak256(ethers.toUtf8Bytes("evolution 2")),
        { value: await museNFT.evolutionFee() }
      );
      
      // Verify multiple evolutions
      const collaboration = await museNFT.getCollaboration(2);
      expect(collaboration.evolutionCount).to.equal(2);
      
      const evolutionHistory = await museNFT.getEvolutionHistory(2);
      expect(evolutionHistory.length).to.equal(2);
      expect(evolutionHistory[0].evolver).to.equal(collector.address);
      expect(evolutionHistory[1].evolver).to.equal(artist.address);
    });
  });

  describe("Project and Issue Management Integration", function () {
    it("Should handle complete project lifecycle with issues", async function () {
      // 1. Maintainer creates project
      const projectTx = await projectManager.connect(maintainer).createProject(
        "Muse Art Marketplace",
        "AI-human collaborative art marketplace platform",
        "https://github.com/muse-org/art-marketplace"
      );
      
      const projectId = 1;
      
      // Verify project creation
      const project = await projectManager.getProject(projectId);
      expect(project.name).to.equal("Muse Art Marketplace");
      expect(project.maintainer).to.equal(maintainer.address);
      expect(project.isActive).to.be.true;
      
      // 2. Create multiple issues
      const issue1Tx = await projectManager.connect(owner).createIssue(
        projectId,
        "Implement NFT minting",
        "Add functionality to mint NFTs with AI collaboration",
        ethers.parseEther("0.5")
      );
      
      const issue2Tx = await projectManager.connect(artist).createIssue(
        projectId,
        "Add evolution feature",
        "Allow artworks to evolve over time",
        ethers.parseEther("0.3")
      );
      
      const issue3Tx = await projectManager.connect(collector).createIssue(
        projectId,
        "Fix UI bug",
        "Gallery view is not loading properly",
        ethers.parseEther("0.1")
      );
      
      expect(await projectManager.getTotalIssues()).to.equal(3);
      
      const projectIssues = await projectManager.getProjectIssues(projectId);
      expect(projectIssues.length).to.equal(3);
      
      // 3. Update issue statuses through workflow
      await projectManager.connect(maintainer).updateIssueStatus(1, 1); // InProgress
      await projectManager.connect(maintainer).updateIssueStatus(2, 1); // InProgress
      await projectManager.connect(maintainer).updateIssueStatus(3, 3); // Closed (directly)
      
      // Complete first issue
      await projectManager.connect(maintainer).updateIssueStatus(1, 2); // Completed
      await projectManager.connect(maintainer).updateIssueStatus(1, 3); // Closed
      
      // Verify final states
      const issue1 = await projectManager.getIssue(1);
      const issue2 = await projectManager.getIssue(2);
      const issue3 = await projectManager.getIssue(3);
      
      expect(issue1.status).to.equal(3); // Closed
      expect(issue2.status).to.equal(1); // InProgress
      expect(issue3.status).to.equal(3); // Closed
      
      expect(issue1.bounty).to.equal(ethers.parseEther("0.5"));
      expect(issue2.bounty).to.equal(ethers.parseEther("0.3"));
      expect(issue3.bounty).to.equal(ethers.parseEther("0.1"));
    });

    it("Should handle multiple projects with different maintainers", async function () {
      // Create projects by different maintainers
      await projectManager.connect(maintainer).createProject(
        "Project A",
        "First project",
        "https://github.com/user/project-a"
      );
      
      await projectManager.connect(artist).createProject(
        "Project B",
        "Second project",
        "https://github.com/user/project-b"
      );
      
      await projectManager.connect(collector).createProject(
        "Project C",
        "Third project",
        "https://github.com/user/project-c"
      );
      
      expect(await projectManager.getTotalProjects()).to.equal(3);
      
      // Each maintainer should have their own projects
      const maintainerProjects = await projectManager.getMaintainerProjects(maintainer.address);
      const artistProjects = await projectManager.getMaintainerProjects(artist.address);
      const collectorProjects = await projectManager.getMaintainerProjects(collector.address);
      
      expect(maintainerProjects.length).to.equal(1);
      expect(artistProjects.length).to.equal(1);
      expect(collectorProjects.length).to.equal(1);
      
      // Create issues in each project
      await projectManager.connect(owner).createIssue(1, "Issue A1", "Description", ethers.parseEther("0.1"));
      await projectManager.connect(owner).createIssue(2, "Issue B1", "Description", ethers.parseEther("0.2"));
      await projectManager.connect(owner).createIssue(3, "Issue C1", "Description", ethers.parseEther("0.3"));
      
      // Only respective maintainers can update issues
      await expect(projectManager.connect(maintainer).updateIssueStatus(1, 1)).to.not.be.reverted;
      await expect(projectManager.connect(artist).updateIssueStatus(2, 1)).to.not.be.reverted;
      await expect(projectManager.connect(collector).updateIssueStatus(3, 1)).to.not.be.reverted;
      
      // Cross-maintainer updates should fail
      await expect(projectManager.connect(artist).updateIssueStatus(1, 2))
        .to.be.revertedWith("Only project maintainer can perform this action");
      await expect(projectManager.connect(maintainer).updateIssueStatus(2, 2))
        .to.be.revertedWith("Only project maintainer can perform this action");
    });
  });

  describe("Cross-Contract Integration", function () {
    it("Should handle artwork creation linked to project issues", async function () {
      // 1. Create project and issue
      await projectManager.connect(maintainer).createProject(
        "Art Generation Platform",
        "Platform for AI art generation",
        "https://github.com/art/platform"
      );
      
      await projectManager.connect(artist).createIssue(
        1,
        "Create stable diffusion integration",
        "Integrate stable diffusion for artwork generation",
        ethers.parseEther("1.0")
      );
      
      // 2. Create artwork as part of issue resolution
      await museNFT.connect(artist).createCollaborativeArtwork(
        "stable-diffusion",
        80,
        20,
        "First stable diffusion artwork",
        "https://api.muse.art/metadata/1",
        ethers.keccak256(ethers.toUtf8Bytes("stable diffusion artwork")),
        true
      );
      
      // 3. Mark issue as completed
      await projectManager.connect(maintainer).updateIssueStatus(1, 1); // InProgress
      await projectManager.connect(maintainer).updateIssueStatus(1, 2); // Completed
      await projectManager.connect(maintainer).updateIssueStatus(1, 3); // Closed
      
      // Verify both systems are updated
      const issue = await projectManager.getIssue(1);
      expect(issue.status).to.equal(3); // Closed
      
      const artwork = await museNFT.getCollaboration(1);
      expect(artwork.aiModel).to.equal("stable-diffusion");
      expect(artwork.humanCreator).to.equal(artist.address);
    });

    it("Should handle royalty distribution for collaborative projects", async function () {
      // Create artwork with multiple stakeholders
      await museNFT.connect(artist).createCollaborativeArtwork(
        "dall-e-3",
        50,
        50,
        "Collaborative masterpiece",
        "https://api.muse.art/metadata/1",
        ethers.keccak256(ethers.toUtf8Bytes("masterpiece")),
        true
      );
      
      // Set royalty
      await museNFT.connect(artist).setRoyalty(1, 1000); // 10%
      
      // Simulate sale (in real implementation, this would go through marketplace)
      const salePrice = ethers.parseEther("2");
      const [royaltyRecipient, royaltyAmount] = await museNFT.royaltyInfo(1, salePrice);
      
      expect(royaltyRecipient).to.equal(artist.address);
      expect(royaltyAmount).to.equal(ethers.parseEther("0.2")); // 10% of 2 ETH
      
      // Transfer to collector
      await museNFT.connect(artist).transferFrom(artist.address, collector.address, 1);
      
      // Royalty recipient should remain the same
      const [newRoyaltyRecipient, newRoyaltyAmount] = await museNFT.royaltyInfo(1, salePrice);
      expect(newRoyaltyRecipient).to.equal(artist.address);
      expect(newRoyaltyAmount).to.equal(ethers.parseEther("0.2"));
    });
  });

  describe("Error Handling and Edge Cases", function () {
    it("Should handle concurrent operations gracefully", async function () {
      // Create multiple artworks concurrently
      const createPromises = [];
      
      for (let i = 0; i < 5; i++) {
        createPromises.push(
          museNFT.connect(artist).createCollaborativeArtwork(
            "stable-diffusion",
            60,
            40,
            `Concurrent artwork ${i}`,
            `https://api.muse.art/metadata/${i}`,
            ethers.keccak256(ethers.toUtf8Bytes(`content ${i}`)),
            true
          )
        );
      }
      
      await Promise.all(createPromises);
      
      expect(await museNFT.totalSupply()).to.equal(5);
      
      const artistTokens = await museNFT.getTokensByCreator(artist.address);
      expect(artistTokens.length).to.equal(5);
    });

    it("Should handle evolution fee distribution correctly", async function () {
      // Create artwork
      await museNFT.connect(artist).createCollaborativeArtwork(
        "stable-diffusion",
        70,
        30,
        "Test artwork",
        "https://api.muse.art/metadata/1",
        ethers.keccak256(ethers.toUtf8Bytes("test")),
        true
      );
      
      await time.increase(time.duration.days(2));
      
      // Get initial treasury balance
      const initialBalance = await ethers.provider.getBalance(await museNFT.evolutionTreasury());
      const evolutionFee = await museNFT.evolutionFee();
      
      // Evolve artwork
      const tx = await museNFT.connect(collector).evolveArtwork(
        1,
        "Evolution",
        "https://api.muse.art/metadata/1-evolved",
        ethers.keccak256(ethers.toUtf8Bytes("evolved")),
        { value: evolutionFee }
      );
      
      // Check fee was transferred to treasury
      const finalBalance = await ethers.provider.getBalance(await museNFT.evolutionTreasury());
      expect(finalBalance).to.equal(initialBalance + evolutionFee);
    });

    it("Should handle maximum royalty correctly", async function () {
      await museNFT.connect(artist).createCollaborativeArtwork(
        "stable-diffusion",
        50,
        50,
        "Test artwork",
        "https://api.muse.art/metadata/1",
        ethers.keccak256(ethers.toUtf8Bytes("test")),
        true
      );
      
      // Set maximum royalty (10%)
      await museNFT.connect(artist).setRoyalty(1, 1000);
      expect(await museNFT.royaltyPercentage(1)).to.equal(1000);
      
      // Should not allow exceeding maximum
      await expect(museNFT.connect(artist).setRoyalty(1, 1001))
        .to.be.revertedWith("Royalty exceeds maximum");
      
      // Calculate royalty at maximum
      const salePrice = ethers.parseEther("1");
      const [recipient, amount] = await museNFT.royaltyInfo(1, salePrice);
      expect(amount).to.equal(ethers.parseEther("0.1")); // 10% of 1 ETH
    });
  });
});
