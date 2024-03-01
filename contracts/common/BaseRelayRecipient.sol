// SPDX-License-Identifier:MIT
pragma solidity 0.8.18;

/**
 * A base contract to be inherited by any contract that want to receive relayed transactions
 * A subclass must use "_msgSender()" instead of "msg.sender"
 */
abstract contract BaseRelayRecipient {
    /*
     * Forwarder singleton we accept calls from
     */
    address internal trustedForwarder;

    constructor(address trustedForwarderAddr) {
        trustedForwarder = trustedForwarderAddr;
    }

    /**
     * return the sender of this call.
     * if the call came through our Relay Hub, return the original sender.
     * should be used in the contract anywhere instead of msg.sender
     */
    function _msgSender() internal view virtual returns (address sender) {
        bytes memory bytesRelayHub;
        bool s;
        (s, bytesRelayHub) = trustedForwarder.staticcall(
            abi.encodeWithSignature("getRelayHub()")
        );
        require(s, "SCF");

        if (msg.sender == abi.decode(bytesRelayHub, (address))) {
            bytes memory bytesSender;
            (s, bytesSender) = trustedForwarder.staticcall(
                abi.encodeWithSignature("getMsgSender()")
            );
            require(s, "SCF");

            return abi.decode(bytesSender, (address));
        } else {
            return msg.sender;
        }
    }
}
