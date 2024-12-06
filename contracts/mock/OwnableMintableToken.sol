// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract OwnableMintableToken is ERC20, Ownable {

    uint8 private _decimals;

    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20(name_, symbol_) {
        _decimals = decimals_;
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    // @dev mint tokens to an account
    // @param account the account to mint to
    // @param amount the amount of tokens to mint
    function mint(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
    }

    // @dev Owner to burn tokens from an account
    // @param account the account to burn tokens for
    // @param amount the amount of tokens to burn
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
    
    // @dev Owner to burn tokens from an account
    // @param account the account to burn tokens for
    // @param amount the amount of tokens to burn
    function ownerBurn(address account, uint256 amount) external onlyOwner {
        _burn(account, amount);
    }
}