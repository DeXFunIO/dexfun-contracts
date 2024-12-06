import hre from "hardhat";
import { OwnableMintableToken } from "../typechain-types";

async function main() {
  const tokensToMint = ['WETH', 'USDT', 'WBTC', 'USDC'];
  const addresses = [
    // '0x4123aee82c51530027584355115009a4670ecabe',
    // '0xe185E8ef62d092f5861ADd7087dD248bF891BCD3',
    // '0x3A00dfbB197852E4F7210C6b2579458819678e19',
    // '0xF1174AEe57b9d91EB79d699B89Aa0753dCA1e1Ca',
    // '0x8419f47aAcC9D1ABB9A43Bd672043F3B7E8811B1',
    // '0xF3e7699dfAd3E889A471A542aC5FE26CD2bD5375'
    '0xA7930A4FF854bD15fDdffA0019398E15Ae0E73bF'
  ];

  for (const receiver of addresses) {
    for (const tokenName of tokensToMint) {
      const token = await hre.ethers.getContract(tokenName) as OwnableMintableToken;
      const signer = (await hre.ethers.getSigners());
      console.log(await token.owner(), signer);
      const amount = hre.ethers.utils.parseEther('100000');
      const tx = await token.mint(receiver, amount);
      const receipt = await tx.wait();
      console.log(receipt.transactionHash);
    
      console.log((`${tokenName}: ${(await token.balanceOf(receiver)).toString()}`));
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
