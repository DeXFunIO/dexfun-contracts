import { HardhatRuntimeEnvironment } from "hardhat/types";

export type RolesConfig = {
  [role: string]: {
    [account: string]: boolean;
  };
};

// roles are granted in deploy/configureRoles.ts
// to add / remove roles after deployment, scripts/updateRoles.ts can be used
export default async function (hre: HardhatRuntimeEnvironment): Promise<RolesConfig> {
  const { deployer, orderKeeper } = await hre.getNamedAccounts();
  const testnetAdmins = {
    "0xbB32C3bCBB223f172De74e6E17a9D04C1264B1Be": true,
    "0xF3e7699dfAd3E889A471A542aC5FE26CD2bD5375": true,
    "0xdd57E125E270E89443839d08A8B816c34a7ec13C": true,
    "0x342A017DbdF0354757f792E5C0314dE2e7C7AB83": true,
  };

  const mainnetExecutionKeepers = {
    "0x8C343293f7DBC045cc741CF221983A6385AE7A67": true,
    "0x04c93c3f5fC133af40F304893092f64c505483dE": true,
    "0x9db45a77BEd74fBaFDB76947B6B2d28608A22283": true
  }

  const testnetConfig = {
    CONTROLLER: testnetAdmins, // No EOA should have controller role, this is for test only
    ORDER_KEEPER: testnetAdmins,
    ADL_KEEPER: testnetAdmins,
    LIQUIDATION_KEEPER: testnetAdmins,
    MARKET_KEEPER: testnetAdmins,
    FROZEN_ORDER_KEEPER: testnetAdmins,
    FEE_KEEPER: testnetAdmins,
  };

  const config: {
    [network: string]: RolesConfig;
  } = {
    hardhat: {
      CONTROLLER: { [deployer]: true },
      ORDER_KEEPER: { 
        [deployer]: true,  
        [orderKeeper]: true,  
      },
      ADL_KEEPER: { [deployer]: true },
      LIQUIDATION_KEEPER: { [orderKeeper]: true },
      MARKET_KEEPER: { [deployer]: true },
      FROZEN_ORDER_KEEPER: { [deployer]: true },
      FEE_KEEPER: { [deployer]: true },
    },
    neoXT4: {
      CONFIG_KEEPER: {
        "0xbB32C3bCBB223f172De74e6E17a9D04C1264B1Be": true,
        "0x6a468499DEAc56D54AbA959cfF7FE3166FdE55e4": true,
        "0xF3e7699dfAd3E889A471A542aC5FE26CD2bD5375": true,
      },
      ...testnetConfig,
    },
    neoX: { // TODO: this whole neoX roles need to change.
      CONTROLLER: { [deployer]: true },
      CONFIG_KEEPER: {
        "0x2190c63DBBB5f57AC55017aD274AC8826cDE1634": true,
      },
      ORDER_KEEPER: mainnetExecutionKeepers,
      ADL_KEEPER: mainnetExecutionKeepers,
      LIQUIDATION_KEEPER: mainnetExecutionKeepers,
      FROZEN_ORDER_KEEPER: mainnetExecutionKeepers,
      FEE_KEEPER: {
        "0xEAB251263fADA76DB54d6C381582Fab3d62F1587": true
      },
      MARKET_KEEPER: {
        "0x2190c63DBBB5f57AC55017aD274AC8826cDE1634": true,
        [deployer]: true
      },
    },
  };
  
  return config[hre.network.name];
}
