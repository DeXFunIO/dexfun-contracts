import { BigNumber } from "ethers";

export const unpackSignerData = (packedData: string): Set<string> => {
  const signerInfo = BigInt(packedData);
  const signerCount = Number(signerInfo & BigInt(0xffff)); // Extract the least significant 16 bits
  const signers = new Set<string>();

  for (let i = 0; i < signerCount; i++) {
      const signerIndex = Number((signerInfo >> BigInt(16 + i * 16)) & BigInt(0xffff)); // Extract each signer index
      const signerAddress = '0xbB32C3bCBB223f172De74e6E17a9D04C1264B1Be';
      
      if (!signerAddress) {
          throw new Error(`Signer index ${signerIndex} not found in oracleStore`);
      }

      signers.add(signerAddress);
  }

  return signers;
}

export const unpackBigNumbers = (compacted: { type: string; hex: string }[], bitLength: number): number[] => {
  const numbers: number[] = [];

  for (const item of compacted) {
      let bigNumber = BigNumber.from(item.hex);
      let bitsUsed = 0;

      while (bitsUsed < 256) {
          const mask = BigNumber.from(2).pow(bitLength).sub(1); // Create a bitmask for the specified bit length
          const number = bigNumber.and(mask); // Extract the number using the bitmask
          
          if (number.isZero()) break; // Stop if the number is zero (no more valid numbers)
          
          numbers.push(number.toNumber()); // Convert to number and add to the result
          bigNumber = bigNumber.shr(bitLength); // Shift right to process the next number
          bitsUsed += bitLength; // Increment bits used
      }
  }

  return numbers;
}

const main = async () => {
  const packedData = {
    "priceParam": {
        "signerInfo": "0x0000000000000000000000000000000000000000000000000000000000000001",
        "tokens": [
            "0x24331F9f8d366d7AE89f9A0cd7F877E46DEb1005",
            "0xAd5F9013e7bEBBEd28911D90BfC767EEf2C28A8f"
        ],
        "compactedMinOracleBlockNumbers": [
            {
                "type": "BigNumber",
                "hex": "0x0f5a2e00000000000f5a2e"
            }
        ],
        "compactedMaxOracleBlockNumbers": [
            {
                "type": "BigNumber",
                "hex": "0x0f5a2f00000000000f5a2f"
            }
        ],
        "compactedOracleTimestamps": [
            {
                "type": "BigNumber",
                "hex": "0x6750067e000000006750067e"
            }
        ],
        "compactedDecimals": [
            {
                "type": "BigNumber",
                "hex": "0x040a"
            }
        ],
        "compactedMinPrices": [
            {
                "type": "BigNumber",
                "hex": "0x05f6ca56009332d0"
            }
        ],
        "compactedMinPricesIndexes": [
            {
                "type": "BigNumber",
                "hex": "0x00"
            }
        ],
        "compactedMaxPrices": [
            {
                "type": "BigNumber",
                "hex": "0x05f6ca56009332da"
            }
        ],
        "compactedMaxPricesIndexes": [
            {
                "type": "BigNumber",
                "hex": "0x00"
            }
        ],
        "signatures": [
            "0xabda91b8a562032e7329fe0aa57b664e7eeb2e5db3f2b27ee3abee37aea9193049e5c30fef922b18e0e4908f63c6f98ea546e85cf7f978ad350b30c3e0e6e7761b",
            "0x49c3a57d0298821e76f9681d2534d81ec9a981e0e686899a71eace8450a060775aa5a97a08c5873c3739079cc0fdd527ca6263ac699028ecf9044ded9e4044381b"
        ],
        "priceFeedTokens": [],
        "realtimeFeedTokens": [],
        "realtimeFeedData": []
    }
  };

  const priceData = packedData.priceParam;

  console.log({
    signerInfo: unpackSignerData(priceData.signerInfo),
    tokens: priceData.tokens,
    minOracleBlockNumber: unpackBigNumbers(priceData.compactedMinOracleBlockNumbers, 64),
    maxOracleBlockNumber: unpackBigNumbers(priceData.compactedMaxOracleBlockNumbers, 64),
    oracleTimestamps: unpackBigNumbers(priceData.compactedOracleTimestamps, 64),
    decimals: unpackBigNumbers(priceData.compactedDecimals, 8),
    minPrices: unpackBigNumbers(priceData.compactedMinPrices, 32),
    minPricesIndices: unpackBigNumbers(priceData.compactedMinPricesIndexes, 32),
    maxPrices: unpackBigNumbers(priceData.compactedMaxPrices, 32),
    maxPricesIndices: unpackBigNumbers(priceData.compactedMaxPricesIndexes, 32),
    signatures: priceData.signatures,
    priceFeedTokens: [],
    realtimeFeedTOkens: [],
    realtimeFeedData: []
  });
};

main().catch(console.error)