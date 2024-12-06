import { deployContract } from "../../utils/deploy";
import { deployFixture } from "../../utils/fixture";
import { ethers } from "hardhat";
import { grantRole } from "../../utils/role";
import { validateStoreUtils } from "../../utils/storeUtils";
import {
  getPositionCount,
  getPositionKeys,
  getAccountPositionCount,
  getAccountPositionKeys,
} from "../../utils/position";

describe("PositionStoreUtils", () => {
  const { provider } = ethers;
  let fixture;
  let roleStore, reader, positionStoreUtils, positionStoreUtilsTest;

  beforeEach(async () => {
    fixture = await deployFixture();
    ({ roleStore, reader, positionStoreUtils } = fixture.contracts);

    positionStoreUtilsTest = await deployContract(
      "PositionStoreUtilsTest",
      [],
      {
        libraries: {
          PositionStoreUtils: positionStoreUtils.address,
        },
      }
    );
    await provider.send("evm_setAutomine", [true]);
    await grantRole(roleStore, positionStoreUtilsTest.address, "CONTROLLER");
  });

  it("get, set, remove", async () => {
    await validateStoreUtils({
      fixture,
      getEmptyItem: positionStoreUtilsTest.getEmptyPosition,
      getItem: async (dataStore, key) => {
        return await reader.getPosition(dataStore.address, key);
      },
      setItem: async (dataStore, key, sampleItem) => {
        return await positionStoreUtilsTest.setPosition(
          dataStore.address,
          key,
          sampleItem
        );
      },
      removeItem: async (dataStore, itemKey, sampleItem) => {
        return await positionStoreUtilsTest.removePosition(
          dataStore.address,
          itemKey,
          sampleItem.addresses.account
        );
      },
      getItemCount: getPositionCount,
      getItemKeys: getPositionKeys,
      getAccountItemCount: getAccountPositionCount,
      getAccountItemKeys: getAccountPositionKeys,
    });
  });
});
