//SPDX-License-Identifier: APACHE-2.0

pragma solidity 0.8.18;

interface IDIDRegistryRecoverable {
    struct DIDRecoverResult {
        bool isVoteAdded;
        bool isMainControllerChanged;
    }

    /**
     * @dev For a group of already set backup controllers, it must happen that 50% of them have voted to add one of them as the new main controller
     * The last backup controller taking submitting the intention whose vote reaches the 50% +1 is the one that gets automatically chosen as the
     * new main controller
     * Recovery is not possible when the account is deactivated
     * @param identity The main identity to recover control
     * @param sigV 'v' param in ecrecover
     * @param sigR 'r' param in ecrecover
     * @param sigS 's' param in ecrecover
     * @param backupController The address of the backup controller who created v,r,s
     */
    function recover(
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        address backupController
    ) external returns (DIDRecoverResult memory result);
}
