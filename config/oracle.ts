import { HardhatRuntimeEnvironment } from "hardhat/types";
import { TOKEN_ORACLE_TYPES } from "../utils/oracle";
import { decimalToFloat } from "../utils/math";
import { ethers, BigNumberish, BigNumber } from "ethers";

type OracleRealPriceFeed = {
  address: string;
  decimals: number;
  heartbeatDuration: number;
  stablePrice?: number;
  deploy?: never;
  initPrice?: never;
};

type OracleTestPriceFeed = {
  address?: string | undefined;
  decimals: number;
  heartbeatDuration: number;
  stablePrice?: number | BigNumber;
  deploy: true;
  initPrice: string;
};

type OraclePriceFeed = OracleRealPriceFeed | OracleTestPriceFeed;

export type OracleConfig = {
  realtimeFeedVerifier: string;
  signers: string[];
  minOracleSigners: number;
  minOracleBlockConfirmations: number;
  maxOraclePriceAge: number;
  maxRefPriceDeviationFactor: BigNumberish;
  tokens?: {
    [tokenSymbol: string]: {
      priceFeed?: OraclePriceFeed;
      oracleType?: string;
    };
  };
};

export default async function (hre: HardhatRuntimeEnvironment): Promise<OracleConfig> {
  const network = hre.network;

  let testSigners: string[];
  if (!network.live) {
    testSigners = (await hre.ethers.getSigners()).slice(10).map((signer) => signer.address);
  }

  const config: { [network: string]: OracleConfig } = {
    localhost: {
      realtimeFeedVerifier: ethers.constants.AddressZero,
      signers: testSigners,
      minOracleSigners: 0,
      minOracleBlockConfirmations: 255,
      maxOraclePriceAge: 60 * 60 * 24,
      maxRefPriceDeviationFactor: decimalToFloat(5, 1), // 50%
    },

    hardhat: {
      realtimeFeedVerifier: ethers.constants.AddressZero,
      signers: testSigners,
      minOracleSigners: 0,
      minOracleBlockConfirmations: 255,
      maxOraclePriceAge: 60 * 60,
      maxRefPriceDeviationFactor: decimalToFloat(5, 1), // 50%
      tokens: process.env.IS_TEST ? {
        USDC: {
          priceFeed: {
            decimals: 8,
            heartbeatDuration: 24 * 60 * 60,
            deploy: true,
            initPrice: "100000000",
          },
        },
        USDT: {
          priceFeed: {
            decimals: 8,
            heartbeatDuration: 24 * 60 * 60,
            deploy: true,
            initPrice: "100000000",
          },
        },
      } : {}
    },
    neoXT4: {
      realtimeFeedVerifier: ethers.constants.AddressZero,
      signers: ["0xbB32C3bCBB223f172De74e6E17a9D04C1264B1Be"],
      minOracleSigners: 1,
      minOracleBlockConfirmations: 255,
      maxOraclePriceAge: 5 * 60,
      maxRefPriceDeviationFactor: decimalToFloat(5, 1), // 50%
    },
    neoX: {
      realtimeFeedVerifier: ethers.constants.AddressZero,
      signers: ["0xFE0c9A8E92F7c1821d343bA4187Ae1Fb57E6Ef0c"],
      minOracleSigners: 1,
      minOracleBlockConfirmations: 255,
      maxOraclePriceAge: 5 * 60,
      maxRefPriceDeviationFactor: decimalToFloat(5, 1), // 50%
    }
  };

  const oracleConfig: OracleConfig = config[hre.network.name];
  if (!oracleConfig.tokens) {
    oracleConfig.tokens = {};
  }

  const tokens = await hre.dFun.getTokens();

  // to make sure all tokens have an oracle type so oracle deployment/configuration script works correctly
  for (const tokenSymbol of Object.keys(tokens)) {
    if (oracleConfig.tokens[tokenSymbol] === undefined) {
      oracleConfig.tokens[tokenSymbol] = {};
    }
  }

  // validate there are corresponding tokens for price feeds
  for (const tokenSymbol of Object.keys(oracleConfig.tokens)) {
    if (!tokens[tokenSymbol]) {
      throw new Error(`Missing token for ${tokenSymbol}`);
    }

    if (oracleConfig.tokens[tokenSymbol].oracleType === undefined) {
      oracleConfig.tokens[tokenSymbol].oracleType = TOKEN_ORACLE_TYPES.DEFAULT;
    }
  }

  return oracleConfig;
}
