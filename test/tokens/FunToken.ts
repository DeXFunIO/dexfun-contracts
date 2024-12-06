// test/MyToken.test.js
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { FunToken } from '../../typechain-types';
import { ContractFactory } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe("FunToken", function () {
  let funToken: ContractFactory;
  let token: FunToken;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  beforeEach(async function () {
    funToken = await ethers.getContractFactory("FunToken");
    [owner, addr1, addr2] = await ethers.getSigners();
    token = await funToken.deploy("funUSDC", "fUSDC", 18, 1, owner.address, ethers.utils.parseEther("100")) as FunToken;
    await token.deployed();
  });

  describe("Minting", function () {
    it("Should mint tokens with a valid signature", async function () {
      const amount = ethers.utils.parseEther("10");
      const itemId = 1;
      const userId = 1;
      const claimSequenceNumber = 1;

      // Create a message hash
      const messageHash = ethers.utils.solidityKeccak256(
          ["address", "uint256", "uint256", "uint256", "uint256"],
          [addr1.address, itemId, userId, claimSequenceNumber, amount]
      );

      // Sign the message
      const signature = await owner.signMessage(ethers.utils.arrayify(messageHash));

      // Mint tokens
      await token.connect(addr1).mint(amount, userId, itemId, claimSequenceNumber, signature);

      // Check the balance
      expect(await token.balanceOf(addr1.address)).to.equal(amount);
    });

    it("Should revert with an invalid signature", async function () {
      const amount = ethers.utils.parseEther("10");
      const itemId = 1;
      const userId = 1;
      const claimSequenceNumber = 1;

      // Create a message hash
      const messageHash = ethers.utils.solidityKeccak256(
        ["address", "uint256", "uint256", "uint256", "uint256"],
        [addr1.address, itemId, userId, claimSequenceNumber, amount]
      );

      // Sign the message with a different account
      const signature = await addr2.signMessage(ethers.utils.arrayify(messageHash));

      // Attempt to mint tokens
      await expect(
        token.connect(addr1).mint(amount, userId, itemId, claimSequenceNumber, signature)
      ).to.be.revertedWith("Invalid signature");
    });

    it("Should revert with an invalid signature owner sign another person use", async function () {
      const amount = ethers.utils.parseEther("10");
      const itemId = 1;
      const userId = 1;
      const claimSequenceNumber = 1;

      // Create a message hash
      const messageHash = ethers.utils.solidityKeccak256(
        ["address", "uint256", "uint256", "uint256", "uint256"],
        [addr1.address, itemId, userId, claimSequenceNumber, amount]
      );

      // Sign the message with a different account
      const signature = await owner.signMessage(ethers.utils.arrayify(messageHash));

      // Attempt to mint tokens
      await expect(
        token.connect(addr2).mint(amount, userId, itemId, claimSequenceNumber, signature)
      ).to.be.revertedWith("Invalid signature");
    });

    it("Should revert if incorrect itemId is passed", async function () {
      const amount = ethers.utils.parseEther("10");
      const itemId = 2;
      const userId = 1;
      const claimSequenceNumber = 1;

      // Create a message hash
      const messageHash = ethers.utils.solidityKeccak256(
        ["address", "uint256", "uint256", "uint256", "uint256"],
        [addr1.address, itemId, userId, claimSequenceNumber, amount]
      );

      // Sign the message
      const signature = await owner.signMessage(ethers.utils.arrayify(messageHash));

      // Attempt to mint with zero amount
      await expect(
        token.connect(addr1).mint(amount, userId, itemId, claimSequenceNumber, signature)
      ).to.be.revertedWith("Cannot claim this token"); // Adjust the revert message as needed
    });

    it("Should revert if the claim sequence number is not greater than the stored sequence", async function () {
      const amount = ethers.utils.parseEther("10");
      const itemId = 1;
      const userId = 1;
      const claimSequenceNumber = 0;

      // Create a message hash
      const messageHash = ethers.utils.solidityKeccak256(
        ["address", "uint256", "uint256", "uint256", "uint256"],
        [addr1.address, itemId, userId, claimSequenceNumber, amount]
      );

      // Sign the message
      const signature = await owner.signMessage(ethers.utils.arrayify(messageHash));

      // Attempt to mint tokens
      await expect(
        token.connect(addr1).mint(amount, userId, itemId, claimSequenceNumber, signature)
      ).to.be.revertedWith("Invalid claim number");
    });

    it("Should revert if the amount is zero", async function () {
      const amount = ethers.utils.parseEther("0");
      const itemId = 1;
      const userId = 1;
      const claimSequenceNumber = 1;

      // Create a message hash
      const messageHash = ethers.utils.solidityKeccak256(
        ["address", "uint256", "uint256", "uint256", "uint256"],
        [addr1.address, itemId, userId, claimSequenceNumber, amount]
      );

      // Sign the message
      const signature = await owner.signMessage(ethers.utils.arrayify(messageHash));

      // Attempt to mint with zero amount
      await expect(
        token.connect(addr1).mint(amount, userId, itemId, claimSequenceNumber, signature)
      ).to.be.revertedWith("Amount must be greater than zero"); // Adjust the revert message as needed
    });

    it('Should revert if trying to mint above max supply', async function () {
      const amount = ethers.utils.parseEther("101");
      const itemId = 1;
      const userId = 1;
      const claimSequenceNumber = 1;

      // Create a message hash
      const messageHash = ethers.utils.solidityKeccak256(
        ["address", "uint256", "uint256", "uint256", "uint256"],
        [addr1.address, itemId, userId, claimSequenceNumber, amount]
      );

      // Sign the message
      const signature = await owner.signMessage(ethers.utils.arrayify(messageHash));

      // Attempt to mint with zero amount
      await expect(
        token.connect(addr1).mint(amount, userId, itemId, claimSequenceNumber, signature)
      ).to.be.revertedWith("Max supply reached"); // Adjust the revert message as needed
    });
  });

  describe("Owner Functions", function () {
    it("Should allow the owner to mint tokens", async function () {
      const amount = ethers.utils.parseEther("20");

      // Owner mints tokens to addr1
      await token.ownerMint(owner.address, amount);

      // Check the balance of the owner
      expect(await token.balanceOf(owner.address)).to.equal(amount);
    });

    it("Should allow the owner to burn tokens", async function () {
      const mintAmount = ethers.utils.parseEther("20");
      await token.ownerMint(owner.address, mintAmount);

      // Owner burns tokens from their own balance
      await token.ownerBurn(owner.address, mintAmount);

      // Check the balance of the owner
      expect(await token.balanceOf(owner.address)).to.equal(0);
    });

    it("Should revert when non-owner tries to mint", async function () {
      const amount = ethers.utils.parseEther("10");

      // Attempt to mint tokens as a non-owner
      await expect(
        token.connect(addr1).ownerMint(addr1.address, amount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should revert when non-owner tries to burn", async function () {
      const mintAmount = ethers.utils.parseEther("20");
      await token.ownerMint(owner.address, mintAmount);

      // Attempt to burn tokens as a non-owner
      await expect(
        token.connect(addr1).ownerBurn(owner.address, mintAmount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it('Should revert if trying to mint above max supply', async function () {
      const amount = ethers.utils.parseEther("101");

      // Attempt to mint with zero amount
      await expect(
        token.ownerMint(owner.address, amount)
      ).to.be.revertedWith("Max supply reached"); // Adjust the revert message as needed
    });
  });

  describe("Burn Function", function () {
    it("Should allow users to burn their own tokens", async function () {
      const amount = ethers.utils.parseEther("10");
      const itemId = 1;
      const userId = 1;
      const claimSequenceNumber = 1;

      // Create a message hash
      const messageHash = ethers.utils.solidityKeccak256(
        ["address", "uint256", "uint256", "uint256", "uint256"],
        [addr1.address, itemId, userId, claimSequenceNumber, amount]
      );

    // Sign the message
      const signature = await owner.signMessage(ethers.utils.arrayify(messageHash));

      // addr1 mints tokens to their own balance
      await token.connect(addr1).mint(amount, userId, itemId, claimSequenceNumber, signature);

      // addr1 burns tokens from their own balance
      await token.connect(addr1).burn(amount);

      // Check the balance of addr1
      expect(await token.balanceOf(addr1.address)).to.equal(0);
    });

    it("Should revert when trying to burn more tokens than owned", async function () {
      const burnAmount = ethers.utils.parseEther("20");

      await expect(
        token.connect(addr1).burn(burnAmount)
      ).to.be.revertedWith("ERC20: burn amount exceeds balance");
    });
  });
});