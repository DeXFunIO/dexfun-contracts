import fs from "fs";
import { task } from "hardhat/config";

task("FeeKeeperAddresses", "Print the addresses needed for fee")
    .setAction(async (_, { deployments, ethers, network }) =>  {
        const requiredContracts = ["DataStore", "FeeHandler", "Multicall3", "Reader", "Router", "Timelock"];
        const fieldNames = ["dataStore", "feeHandler", "multicall", "readerV2", "router", "timelock"];
        const requiredTokens = ["StakedDFunTracker", "BonusDFunTracker", "FeeDFunTracker"];
        const tokenNames = ["sDFUN", "sbDFUN", "sbfDFUN"];
        const data = {
            contracts: {},
            tokens: {}
        };
        for (let i=0; i<requiredContracts.length; i++) {
            if (requiredContracts[i] === 'Multicall3') {
              if (network.name === 'neoXT4') {
                data.contracts[fieldNames[i]] = {address: '0x82096F92248dF7afDdef72E545F06e5be0cf0F99' };
              }
            } else {
              const contract = await deployments.get(requiredContracts[i]);
              data.contracts[fieldNames[i]] = {address: contract.address};
            }
        }
        for (let i=0; i<requiredTokens.length; i++) {
            const contract = await deployments.get(requiredTokens[i]);
            data.tokens[tokenNames[i]] = contract.address;
        }
        const networkName = network.name == "hardhat" ? "localhost" : network.name;
        fs.writeFileSync(`deployments/${networkName}/FeeKeeperContracts.json`, JSON.stringify(data));
    });