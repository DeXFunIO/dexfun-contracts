import { createDeployFunction } from "../utils/deploy";

const func = createDeployFunction({
  contractName: "KeeperReader",
  libraryNames: [
    "MarketStoreUtils",
    "PositionStoreUtils",
    "PositionUtils",
    "OrderStoreUtils"
  ],
});

export default func;
