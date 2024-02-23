//SPDX-License-Identifier: APACHE-2.0

pragma solidity 0.8.18;

import "./DIDRegistry.sol";

import "../IDIDRegistryRecoverable.sol";
import "../SafeMath.sol";

contract DIDRegistryRecoverable is DIDRegistry, IDIDRegistryRecoverable {
    uint private maxAttempts;
    uint private minControllers;
    uint private resetSeconds;
    using SafeMath for uint256;

    constructor(
        uint _minKeyRotationTime,
        uint _maxAttempts,
        uint _minControllers,
        uint _resetSeconds
    ) DIDRegistry(_minKeyRotationTime) {
        maxAttempts = _maxAttempts;
        minControllers = _minControllers;
        resetSeconds = _resetSeconds;
    }

    mapping(address => address[]) public recoveredKeys;
    mapping(address => uint) public failedAttempts;
    mapping(address => uint) public lastAttempt;

    function recover(
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        address backupController
    ) public returns (DIDRecoverResult memory result) {
        require(
            controllers[identity].length >= minControllers,
            "Identity must have the minimum of controllers"
        );
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0x19),
                bytes1(0),
                this,
                nonce[identityController(identity)],
                identity,
                "recover",
                backupController
            )
        );
        address signer = ecrecover(hash, sigV, sigR, sigS);
        require(signer == backupController, "Invalid signature");

        require(
            failedAttempts[identity] < maxAttempts ||
                block.timestamp - lastAttempt[identity] > resetSeconds,
            "Exceeded attempts"
        );

        if (_getControllerIndex(identity, backupController) < 0) {
            return result;
        }

        if (block.timestamp - lastAttempt[identity] > resetSeconds) {
            failedAttempts[identity] = 0;
            delete recoveredKeys[identity];
        }
        lastAttempt[identity] = block.timestamp;

        int recoveredIndex = _getRecoveredIndex(identity, backupController);
        if (recoveredIndex >= 0) {
            failedAttempts[identity] += 1;
            return result;
        }

        recoveredKeys[identity].push(backupController);

        /* 50% +1 of backup controllers must agree to add the candidate controller as a main controller */
        if (
            recoveredKeys[identity].length >=
            controllers[identity].length.div(2).add(1)
        ) {
            changeController(identity, identity, backupController);
            delete recoveredKeys[identity];
            result.isMainControllerChanged = true;
            result.isVoteAdded = true;
            return result;
        }
        result.isVoteAdded = true;
        return result;
    }

    function _getRecoveredIndex(
        address identity,
        address controller
    ) internal view returns (int) {
        for (uint i = 0; i < recoveredKeys[identity].length; i++) {
            if (recoveredKeys[identity][i] == controller) {
                return int(i);
            }
        }
        return -1;
    }
}
