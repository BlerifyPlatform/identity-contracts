//SPDX-License-Identifier: APACHE-2.0

pragma solidity 0.8.18;

import "../didRegistry/DIDRegistryRecoverable.sol";
import "../../common/BaseRelayRecipient.sol";
import "../SafeMath.sol";

contract DIDRegistryRecoverableGM is
    DIDRegistryRecoverable,
    BaseRelayRecipient
{
    constructor(
        uint _minKeyRotationTime,
        uint _maxAttempts,
        uint _minControllers,
        uint _resetSeconds,
        address trustedForwarderAddr
    )
        DIDRegistryRecoverable(
            _minKeyRotationTime,
            _maxAttempts,
            _minControllers,
            _resetSeconds
        )
        BaseRelayRecipient(trustedForwarderAddr)
    {}

    /**
     * return the sender of this call.
     * if the call came through our Relay Hub, return the original sender.
     * should be used in the contract anywhere instead of msg.sender
     */
    function _msgSender()
        internal
        view
        override(BaseRelayRecipient, Context)
        returns (address sender)
    {
        return BaseRelayRecipient._msgSender();
    }
}
