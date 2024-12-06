import dotenv from "dotenv";
dotenv.config();

import path from "path";
import fs from "fs";
import { ethers } from "ethers";

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-contract-sizer";
import "solidity-coverage";
import "hardhat-gas-reporter";
import "hardhat-deploy";

import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";

// extends hre with dFun domain data
import "./config";

// add test helper methods
import "./utils/test";

import "./tasks";

const getRpcUrl = (network) => {
  const defaultRpcs = {
    neoXT4: "https://neoxt4seed1.ngd.network",
    neoX: "https://mainnet-2.rpc.banelabs.org/"
  };

  let rpc = defaultRpcs[network];

  const filepath = path.join("./.rpcs.json");
  if (fs.existsSync(filepath)) {
    const data = JSON.parse(fs.readFileSync(filepath).toString());
    if (data[network]) {
      rpc = data[network];
    }
  }

  return rpc;
};

const getEnvAccounts = (chainName?: string) => {
  const { ACCOUNT_KEY, ACCOUNT_KEY_FILE, NEOX_T4_ACCOUNT_KEY } = process.env;

  if (chainName === "neoXT4" && NEOX_T4_ACCOUNT_KEY) {
    return [NEOX_T4_ACCOUNT_KEY];
  }

  if (ACCOUNT_KEY) {
    return [ACCOUNT_KEY];
  }

  if (ACCOUNT_KEY_FILE) {
    const filepath = path.join("./keys/", ACCOUNT_KEY_FILE);
    const data = JSON.parse(fs.readFileSync(filepath) as unknown as string);
    if (!data) {
      throw new Error("Invalid key file");
    }

    if (data.key) {
      return [data.key];
    }

    if (!data.mnemonic) {
      throw new Error("Invalid mnemonic");
    }

    const wallet = ethers.Wallet.fromMnemonic(data.mnemonic);
    return [wallet.privateKey];
  }

  return [];
};

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10,
        details: {
          constantOptimizer: true,
        },
      },
    },
  },
  networks: {
    hardhat: {
      saveDeployments: true,
      allowUnlimitedContractSize: true,
      chainId: 31337,
      // gas: "aucto",
      mining: {
        auto: true,
        interval: 1
      }
    },
    localhost: {
      chainId: 31337.,
      saveDeployments: true,
      gas: "auto",
      mining: {
        auto: true,
        interval: 1
      }
    },
    neoXT4: {
      url: getRpcUrl("neoXT4"),
      chainId: 12227332,
      gasPrice: 55000000000,
      accounts: getEnvAccounts('neoXT4'),
      blockGasLimit: 30_000_000,
    },
    neoX: {
      url: getRpcUrl("neoX"),
      chainId: 47763,
      gasPrice: 260000000000,
      accounts: getEnvAccounts(),
      // blockGasLimit: 50_000_000,
    }
  },
  etherscan: {
    apiKey: {
      neoXT4: "example",
      neoX: "example"
    },
    customChains: [
      {
        network: "neoXT4",
        chainId: 12227332,
        urls: {
          apiURL: "https://xt4scan.ngd.network/api",
          browserURL: "https://xt4scan.ngd.network/",
        }
      },
      {
        network: "neoX",
        chainId: 47763,
        urls: {
          apiURL: "https://xexplorer.neo.org/api",
          browserURL: "https://xexplorer.neo.org",
        }
      },
    ]
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
  },
  namedAccounts: {
    deployer: 0,
    orderKeeper: 1
  },
  mocha: {
    timeout: 100000000,
  },
};

export default config;
