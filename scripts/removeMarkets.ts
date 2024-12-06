import hre from "hardhat";

import { MarketStoreUtilsTest } from "../typechain-types";

const { ethers } = hre;

async function main() {
  const dataStore = await ethers.getContract("DataStore");
  const wallet = (await ethers.getSigners())[0];
  console.log(wallet);
  const marketStoreUtilsTest = (await ethers.getContract("MarketStoreUtilsTest")).connect(wallet) as MarketStoreUtilsTest;

  const marketAddresses = [
    '0xFdf0F3891174825c893C87B3a32F2f64826cf51e',
    '0x72fA70487aFdA5BCC98771039F50eCF9F17A1b30',
    '0xf5d8F21Eca9Cf7E6333f751a065F92C317442340',
    '0xb5CCa44D5b41C2afA32dbF09291c76ffAA10C307',
    '0x4c779F4CF51DDCFc321d79fCaAd21245AE8D58a0'
  ]

  for (const address of marketAddresses) {
    const tx = await marketStoreUtilsTest.removeMarket(dataStore.address, address, { gasLimit: 1000000 });
    const contractReceipt = await tx.wait();
    console.log(`Deleted market ${address}`, contractReceipt.transactionHash);
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

