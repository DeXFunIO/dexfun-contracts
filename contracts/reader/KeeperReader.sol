// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.0;

import "../data/Keys.sol";
import "../position/Position.sol";
import "../position/PositionUtils.sol";
import "../position/PositionStoreUtils.sol";
import "../order/OrderStoreUtils.sol";

// @title KeeperReader
// @dev Library for read functions

contract KeeperReader {
    function getOrders(DataStore dataStore, uint256 start, uint256 end) external view returns (Order.Props[] memory) {
        bytes32[] memory orderKeys = OrderStoreUtils.getOrderKeys(dataStore, start, end);
        Order.Props[] memory orders = new Order.Props[](orderKeys.length);
        for (uint256 i; i < orderKeys.length; i++) {
            bytes32 orderKey = orderKeys[i];
            orders[i] = OrderStoreUtils.get(dataStore, orderKey);
        }
        return orders;
    }

    function isPositionLiquidatable(
      DataStore dataStore,
      IReferralStorage referralStorage,
      MarketUtils.MarketPrices memory marketPrices,
      Position.Props memory position,
      Market.Props memory market,
      bool shouldValidateMinCollateralUsd
    ) external view returns (bool, string memory, PositionUtils.IsPositionLiquidatableInfo memory) {
      return PositionUtils.isPositionLiquidatable(
        dataStore, 
        referralStorage, 
        position, 
        market, 
        marketPrices, 
        shouldValidateMinCollateralUsd
      );
    }
}
