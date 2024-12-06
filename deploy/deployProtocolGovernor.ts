import { createDeployFunction } from "../utils/deploy";
import { expandDecimals } from "../utils/math";

const func = createDeployFunction({
  contractName: "ProtocolGovernor",
  id: "ProtocolGovernor_1",
  dependencyNames: ["GovToken", "GovTimelockController"],
  getDeployArgs: async ({ dependencyContracts }) => {
    return [
      dependencyContracts.GovToken.address, // token
      dependencyContracts.GovTimelockController.address, // timelock
      "DFUN Governor", // name
      "v2.0", // version
      24 * 60 * 60, // votingDelay
      5 * 24 * 60 * 60, // votingPeriod
      expandDecimals(30_000, 18), // proposalThreshold
      4, // quorumNumeratorValue
    ];
  },
});

func.skip = async () => true

export default func;
