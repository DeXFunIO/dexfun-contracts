import hre from "hardhat";
import { OwnableMintableToken } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

async function main() {
  const signer: SignerWithAddress = (await ethers.getSigners())[0];
  const tokensToMint = ['WETH', 'USDT', 'WBTC', 'USDC', 'FUNUSDT', 'FUNGAS', 'FUNBTC', 'FUNETH', 'FUNUSDC'];
  const owner: string = '0xF3e7699dfAd3E889A471A542aC5FE26CD2bD5375';

  for (const tokenName of tokensToMint) {
    const token: OwnableMintableToken = await hre.ethers.getContract(tokenName) as OwnableMintableToken;
    if (signer.address !== await token.owner()) {
      continue;
    }
    const tx = await token.transferOwnership(owner);
    const receipt = await tx.wait();
    console.log(receipt.transactionHash);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });
