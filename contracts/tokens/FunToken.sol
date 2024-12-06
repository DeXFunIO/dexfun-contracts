// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FunToken is ERC20, Ownable {
    uint8 private _decimals;
    address private _adminSigner;
    uint256 private _itemId;
    uint256 public _maxSupply;

    mapping(address => uint256) public claimSequence;

    constructor(
      string memory name, 
      string memory symbol, 
      uint8 decimals,
      uint256 itemId, 
      address adminSigner,
      uint256 maxSupply) 
    ERC20(name, symbol) {
        _decimals = decimals;
        _adminSigner = adminSigner;
        _itemId = itemId;
        _maxSupply = maxSupply;
    }

    function mint(
      uint256 amount,
      uint256 userId,
      uint256 itemId,
      uint256 claimSequenceNumber,
      bytes calldata signature
    ) external {
      require(totalSupply() + amount <= _maxSupply, "Max supply reached");
      require(amount > 0, "Amount must be greater than zero");
      require(claimSequenceNumber == claimSequence[msg.sender] + 1, "Invalid claim number");
      require(itemId == _itemId, "Cannot claim this token");

      bytes32 digest = ECDSA.toEthSignedMessageHash(
        keccak256(
          abi.encodePacked(
            msg.sender, 
            itemId,
            userId, 
            claimSequenceNumber,
            amount
          )
        )
      );

      address signer = ECDSA.recover(digest, signature);
      require(signer == _adminSigner, "Invalid signature");
      claimSequence[msg.sender]++;
      // Mint the tokens
      _mint(msg.sender, amount);
    }
      
    function ownerMint(address to, uint256 amount) external onlyOwner {
      require(totalSupply() + amount <= _maxSupply, "Max supply reached");
      _mint(to, amount);
    }

    function burn(uint256 amount) external {
      _burn(msg.sender, amount);
    }

    function ownerBurn(address account, uint256 amount) external onlyOwner {
      _burn(account, amount);
    }

    function setAdminSigner(address signer) external onlyOwner {
      _adminSigner = signer;
    }

    function setItemId(uint256 itemId) external onlyOwner {
      _itemId = itemId;
    }
}