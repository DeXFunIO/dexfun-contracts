import { verify } from 'crypto';
import { ethers, Wallet } from 'ethers';

// Assuming ABIValue is defined similarly to how it's used in C#
type ABIValue = {
    type: string;  // The type of the value (e.g., BYTE_32, UINT_256, etc.)
    value: any;    // The actual value
};

// Utility functions (you may need to implement these based on your requirements)
const HashUtility = {
    BYTE_32: 'bytes32',
    UINT_256: 'uint256',
    ADDRESS: 'address',
    // Add other types as needed

    // Example function to hash data (you may need to adjust this)
    async hashData(abiValues: ABIValue[]): Promise<string> {
        const abiEncoded = ethers.utils.defaultAbiCoder.encode(
            abiValues.map(v => v.type),
            abiValues.map(v => v.value)
        );
        return ethers.utils.keccak256(abiEncoded);
    },

    // Function to convert hex string to byte array
    hexToBytes(hex: string): Uint8Array {
        return ethers.utils.arrayify(hex);
    }
};

async function createSignature(
    abiValues: ABIValue[],
    privateKey: string,
): Promise<string> {
    // Create a wallet instance from the private key
    const wallet = new ethers.Wallet(privateKey);

    // Encode the data
    const messageHash = await HashUtility.hashData(abiValues);

    // Create Ethereum signed message hash
    const ethSignedMessageHash = ethers.utils.hashMessage(messageHash);

    // Sign the Ethereum signed message hash
    const signature = await wallet.signMessage(ethSignedMessageHash);

    return signature;
}

async function verifySignature(
  abiValues: { type: string; value: any }[],
  signature: string,
  expectedSigner: string
): Promise<void> {
  // Recreate the message hash
  const messageHash = await HashUtility.hashData(abiValues);
  
  // Create Ethereum signed message hash
  const ethSignedMessageHash = ethers.utils.hashMessage(messageHash);

  // Recover the signer from the signature
  const recoveredSigner = ethers.utils.verifyMessage(ethSignedMessageHash, signature);

  // Compare with expected signer
  if (recoveredSigner.toLowerCase() !== expectedSigner.toLowerCase()) {
      throw new Error(`Invalid Signature: Recovered ${recoveredSigner}, Expected ${expectedSigner}`);
  }

  console.log('Signature is valid. Recovered signer:', recoveredSigner);
}

// Example usage
async function main() {

  const values = {
    salt: '0xccd7c7afd74e8a0196f4715fd5dfee8df44074ac77aa5208cf7069e2d245c5ab',
    minBlockNumber: 1006160,
    maxBlockNumber: 1006161,
    timestamp: 1733298013,
    maxBlockHash: '0x06198e44a7dcc52326609cb3c2ec88b89c2a59c0c8b768a186308b11ff199cab',
    tokenAddress: '0x24331F9f8d366d7AE89f9A0cd7F877E46DEb1005',
    oracleType: '0x273d968b62e572a67bccffe361015a831243bf8765d81768b4abee0e83398855',
    precision: 100000000000000000000n,
    minPrice: 9646800n,
    maxPrice: 9646810n,
    signature: '0x6693fc4e31398c94be1a7e7843dd4f4d9842a1e6042f2649a272041251dfc8e766b5a49a2cf46bb4d9c129f3c78cb73ed9a49cd00764c705087a09233bab04221c'
  }

  const signatureAbiValues: ABIValue[] = [
      { type: HashUtility.BYTE_32, value: HashUtility.hexToBytes(values.salt) },
      { type: HashUtility.UINT_256, value: values.minBlockNumber },
      { type: HashUtility.UINT_256, value: values.maxBlockNumber },
      { type: HashUtility.UINT_256, value: values.timestamp },
      { type: HashUtility.BYTE_32, value: HashUtility.hexToBytes(values.maxBlockHash) },
      { type: HashUtility.ADDRESS, value: values.tokenAddress },
      { type: HashUtility.BYTE_32, value: HashUtility.hexToBytes(values.oracleType) },
      { type: HashUtility.UINT_256, value: values.precision },
      { type: HashUtility.UINT_256, value:  values.minPrice},
      { type: HashUtility.UINT_256, value: values.maxPrice }
  ];

  const privateKey = '346c86992baa0d5bbbb69edaceac252502814eef252ac27c87aad25377e6d21a'; // Replace with your actual private key
  const wallet = new Wallet(privateKey);
  const signature = await createSignature(signatureAbiValues, privateKey);
  
  await verifySignature(signatureAbiValues, signature, wallet.address);

  console.log('Signature:', signature);
  0x12A881169BCFB278e9508CF411c4CeAEe861Cd24
}

main().catch(console.error);