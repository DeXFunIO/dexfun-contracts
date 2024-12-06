import { createDeployFunction } from "../utils/deploy";

const func = createDeployFunction({
  contractName: "Multicall3",
  id: "Multicall3",
});
// override tags
func.tags = ["Multicall"];

// We skip this because there should be a multicall on networsk that we deploy on.
func.skip = async (_) => true;

export default func;
