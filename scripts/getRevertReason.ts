import { ethers } from "ethers";

async function getRevertReason(txHash, provider) {
  // Fetch the transaction details
  const tx = await provider.getTransaction(txHash);
  
  // If the transaction is not found or has not been mined yet
  if (!tx || !tx.blockNumber) {
      console.log("Transaction not found or not mined yet.");
      return;
  }

  // Call the transaction to simulate it and capture revert reason
  try {
      const tx1 = await provider.call({
          to: tx.to,
          from: tx.from,
          nonce: tx.nonce,
          gasLimit: tx.gasLimit,
          gasPrice: tx.gasPrice,
          data: tx.data,
          value: tx.value,
          chainId: tx.chainId,
          type: tx.type ?? undefined,
          accessList: tx.accessList
      }, tx.blockNumber);

      console.log("logging tx1", tx1);
  } catch (error) {
      // Extract revert reason from error
      const reason = error.data ? ethers.utils.toUtf8String("0x" + error.data.substring(138)) : "No revert reason available";
      console.log("Revert reason:", reason);
  }
}

const main = async () => {
  const provider = new ethers.providers.JsonRpcProvider("https://neoxt4seed1.ngd.network");
  const hash = '0x05188d1e6ea7913c94b661095f5f0d4289972c6181c58cfe2ae1bc97dbbb4b2d';
  getRevertReason(hash, provider);
};

main().catch(console.error);