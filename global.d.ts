import { ethers as ethersModule } from "ethers";
import { TokensConfig } from "./config/tokens";
import { MarketConfig } from "./config/markets";
import { OracleConfig } from "./config/oracle";
import { RolesConfig } from "./config/roles";

declare module 'hardhat/types' {
  interface HardhatRuntimeEnvironment {
    dFun: {
      getTokens: () => Promise<TokensConfig>;
      getOracle: () => Promise<OracleConfig>;
      getMarkets:  () => Promise<MarketConfig[]>;
      getGeneral: () => Promise<any>;
      getRoles: RolesConfig;
    }
  }
}

declare global {
  let ethers: typeof ethersModule;
}
