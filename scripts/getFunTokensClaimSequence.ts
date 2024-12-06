import hre, { ethers } from "hardhat";
import { FunToken } from "../typechain-types";

async function main() {
  const tokensToMint = ['FUNETH', 'FUNUSDT', 'FUNBTC', 'FUNGAS'];
  const addresses = [
    '0x3dcB98ed9E5184E26a753bD5af106E17450b6321',
  ];

  for (const receiver of addresses) {
    for (const tokenName of tokensToMint) {
      const token = await hre.ethers.getContract(tokenName) as FunToken;
      const signer = (await hre.ethers.getSigners());
      const sequence = await token.claimSequence(receiver);
    
      console.log((`${receiver} - ${tokenName}: ${sequence}`));
    }
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
