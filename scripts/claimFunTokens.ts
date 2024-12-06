import hre from "hardhat";
import { FunToken } from "../typechain-types";

async function main() {
  const contract: FunToken = await hre.ethers.getContract("FUNGAS") as unknown as FunToken;
  const signature = "0x156db2e0807ac16d017e2b1e8607100602b6abcac35db8d00ecfa1addbd4bb643d950ebfabdaf4337e3535e4641f3e5265572cf638e399fb3bf85127680a208c1b";
  const sequence = 1;
  const amount = hre.ethers.BigNumber.from("1000000000000000000");
  const userId = 1;
  const itemId = 4;
  const wallet = new hre.ethers.Wallet("privatekey", hre.ethers.provider);
  const token = contract.connect(wallet);
  const txReceipt = (await (token.mint(amount, userId, itemId, sequence, signature))).wait();

  console.log((await txReceipt).transactionHash);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });
