import { HardhatRuntimeEnvironment } from "hardhat/types";

const func = async ({ network, run }: HardhatRuntimeEnvironment) => {
  const networksToSkip = ['localhost', 'hardhat']
  if (networksToSkip.includes(network.name)) {
    return;
  }
  run("FeeKeeperAddresses");
}

func.runAtTheEnd = true;
export default func;