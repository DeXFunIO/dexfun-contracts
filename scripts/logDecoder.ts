import { ethers } from 'ethers';
import * as eventEmitter from '../deployments/neoXT4/EventEmitter.json';

// Connect to an Ethereum provider (e.g., Infura)
// const provider = new ethers.providers.JsonRpcProvider('https://neoxt4seed1.ngd.network');
const provider = new ethers.providers.JsonRpcBatchProvider('http://localhost:8545');

// Replace with the transaction hash you want to analyze
const txHash = "0x377321f9da982916f44c460026b071f92508254c510e3b4e55202803152a4491" // Your transaction hash here

async function fetchAndDecodeLogs() {
    try {
        // Fetch the transaction receipt
        const txReceipt = await provider.getTransactionReceipt(txHash);

        // Check if the transaction was found
        if (!txReceipt) {
            console.log("Transaction not found");
            return;
        }

        // Create an interface for the contract
        const contractInterface = new ethers.utils.Interface(eventEmitter.abi);

        // Decode each log
        const decodedLogs = [];
        txReceipt.logs.forEach(log => {
            try {
                // Decode the log
                let decodedLog = contractInterface.parseLog(log);
                delete decodedLog['eventFragment'];
                decodedLogs.push(decodedLog);
            } catch (error) {
                console.error("Error decoding log:", error);
            }
        });

        console.log(JSON.stringify(decodedLogs));
    } catch (error) {
        console.error("Error fetching transaction:", error);
    }
}

// Call the function
fetchAndDecodeLogs();