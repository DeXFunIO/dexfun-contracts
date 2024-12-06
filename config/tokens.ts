import { ethers } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { getSyntheticTokenAddress } from "../utils/token";

// synthetic token without corresponding token
// address will be generated in runtime in hardhat.config.ts
// should not be deployed
// should not be wrappedNative
type SyntheticTokenConfig = {
  address?: string;
  decimals: number;
  synthetic: true;
  wrappedNative?: never;
  deploy?: never;
  transferGasLimit?: never;
  realtimeFeedId?: string;
  realtimeFeedDecimals?: number;
};

type RealTokenConfig = {
  address: string;
  decimals: number;
  transferGasLimit: number;
  synthetic?: never;
  wrappedNative?: true;
  deploy?: never;
  realtimeFeedId?: string;
  realtimeFeedDecimals?: number;
};

// test token to deploy in local and test networks
// automatically deployed in localhost and hardhat networks
// `deploy` should be set to `true` to deploy on live networks
export type TestTokenConfig = {
  address?: string;
  decimals: number;
  transferGasLimit: number;
  deploy: true;
  wrappedNative?: boolean;
  synthetic?: never;
  realtimeFeedId?: string;
};

export type TokenConfig = SyntheticTokenConfig | RealTokenConfig | TestTokenConfig;
export type TokensConfig = { [tokenSymbol: string]: TokenConfig };

const config: {
  [network: string]: TokensConfig;
} = {
  neoX: { // TODO: only fun tokens to be deployed for now.
    FUNGAS: {
      address: "0xf0d90Ff703Befe9553Bd3ee5dCB35A418b93bC86",
      decimals: 18,
      transferGasLimit: 200 * 1000,
    },
    FUNETH: {
      address: "0xd62FE80692350A3aD621d7Eb3fe34dE0aDf3DCA2",
      decimals: 18,
      transferGasLimit: 200 * 1000,
    },
    FUNBTC: {
      address: "0x714D5b8f7Bd2aBef50Cd4B7acb84Bc4A1944e03d",
      decimals: 18,
      transferGasLimit: 200 * 1000,
    },
    FUNUSDC: {
      address: "0x76C8D51B551F64518E8029FDE469451F7598EcfB",
      decimals: 18,
      transferGasLimit: 200 * 1000,
    },
    FUNUSDT: {
      address: "0x44E5fEdb9712610f7Ff36ff20C36B7198ef970Aa",
      decimals: 18,
      transferGasLimit: 200 * 1000,
    },
  },
  neoXT4: {
    WGAS: {
      address: "0x1CE16390FD09040486221e912B87551E4e44Ab17",
      wrappedNative: true,
      decimals: 18,
      transferGasLimit: 200 * 1000,
    },
    WBTC: {
      address: "0x24331F9f8d366d7AE89f9A0cd7F877E46DEb1005",
      decimals: 18,
      transferGasLimit: 200 * 1000,
    },
    WETH: {
      address: "0x86fee0fbab3aD976f652F79B57027a20522fee05",
      decimals: 18,
      transferGasLimit: 200 * 1000,
    },
    USDC: {
      address: "0x35a2E19f4737f797E109C403Aef25f1950623531",
      decimals: 18,
      transferGasLimit: 200 * 1000
    },
    USDT: {
      address: "0xAd5F9013e7bEBBEd28911D90BfC767EEf2C28A8f",
      decimals: 18,
      transferGasLimit: 200 * 1000,
    },
    FUNGAS: {
      address: "0xE3117853aD4C07ef745aD27e2E1BD42F16fa5Aa3",
      decimals: 18,
      transferGasLimit: 200 * 1000,
    },
    FUNETH: {
      address: "0xDFbA76902F840fd6fe9E7C7Bb232505F45070458",
      decimals: 18,
      transferGasLimit: 200 * 1000,
    },
    FUNBTC: {
      address: "0x51d5caAD83DC4DC559459Ddc392cFa408c2acd42",
      decimals: 18,
      transferGasLimit: 200 * 1000,
    },
    FUNUSDC: {
      address: "0xb377007125aD8103bCEC7B886902740B54E7a6cd",
      decimals: 18,
      transferGasLimit: 200 * 1000,
    },
    FUNUSDT: {
      address: "0xB8Cdb7c6fd3221fBeBEd4b56dF0F44C367A53a00",
      decimals: 18,
      transferGasLimit: 200 * 1000,
    },
  },
  // token addresses are retrieved in runtime for hardhat and localhost networks
  hardhat: {
    WGAS: {
      wrappedNative: true,
      decimals: 18,
      transferGasLimit: 200 * 1000,
      deploy: true,
    },
    WETH: {
      decimals: 18,
      transferGasLimit: 200 * 1000,
      deploy: true,
    },
    WBTC: {
      decimals: 8,
      transferGasLimit: 200 * 1000,
      deploy: true,
    },
    USDC: {
      decimals: 6,
      transferGasLimit: 200 * 1000,
      deploy: true,
    },
    USDT: {
      decimals: 6,
      transferGasLimit: 200 * 1000,
      deploy: true,
    },
    SOL: {
      synthetic: true,
      decimals: 18,
    },
  },
  localhost: {
    WGAS: {
      wrappedNative: true,
      decimals: 18,
      transferGasLimit: 200 * 1000,
      deploy: true,
    },
    WETH: {
      decimals: 18,
      transferGasLimit: 200 * 1000,
      deploy: true,
    },
    WBTC: {
      decimals: 8,
      transferGasLimit: 200 * 1000,
      deploy: true,
    },
    USDC: {
      decimals: 6,
      transferGasLimit: 200 * 1000,
      deploy: true,
    },
    USDT: {
      decimals: 6,
      transferGasLimit: 200 * 1000,
      deploy: true,
    },
    SOL: {
      synthetic: true,
      decimals: 18,
    },
  },
};

export default async function (hre: HardhatRuntimeEnvironment): Promise<TokensConfig> {
  const tokens = config[hre.network.name];
  for (const [tokenSymbol, token] of Object.entries(tokens as TokensConfig)) {
    console.log(token);
    if (token.synthetic) {
      (token as any).address = getSyntheticTokenAddress(hre.network.config.chainId, tokenSymbol);
    }
    if (token.address) {
      (token as any).address = ethers.utils.getAddress(token.address);
    }

    // if (!hre.network.live) {
    //   (token as any).deploy = true;
    // }
  }

  return tokens;
}
