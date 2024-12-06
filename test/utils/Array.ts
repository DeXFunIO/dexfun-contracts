import { expect } from "chai";
import { ethers } from "hardhat";
const { provider } = ethers;
import { deployContract } from "../../utils/deploy";

describe("Array", () => {
  let arrayTest;

  beforeEach(async () => {
    arrayTest = await deployContract("ArrayTest", []);
    await provider.send("evm_setAutomine", [true])
  });

  it("getMedian", async () => {
    for (const [arr, expected] of [
      [[1, 2, 3], 2],
      [[1, 2, 3, 4], 2],
      [[11, 12, 14, 15], 13],
      [[1, 12, 14, 10000], 13],
      [[1000000, 1000050, 1000100, 2000000], 1000075],
    ]) {
      const median = await arrayTest.getMedian(arr);
      expect(median).to.equal(expected);
    }
  });
});
