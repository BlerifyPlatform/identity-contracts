//SPDX-License-Identifier: APACHE-2.0

pragma solidity 0.8.18;

interface IDIDRegistry {
    struct DIDConfig {
        uint currentController;
        bool automaticRotation;
        uint keyRotationTime;
    }

    event DIDControllerChanged(
        address indexed identity,
        address controller,
        uint previousChange
    );

    event DIDAttributeChanged(
        address indexed identity,
        bytes name,
        bytes value,
        uint validTo,
        uint changeTime,
        uint previousChange,
        bool compromised
    );

    event DIDDelegateChanged(
        address indexed identity,
        bytes32 delegateType,
        address delegate,
        uint validTo,
        uint changeTime,
        uint previousChange,
        bool compromised
    );

    /**
     * Returns an array of one or more controllers. By default the controller of any identity is the identity itself.
     * @param identity The account to find controllers for
     */
    function getControllers(
        address identity
    ) external returns (address[] memory);

    function identityController(
        address identity
    ) external view returns (address);

    function addController(address identity, address controller) external;

    function removeController(address identity, address controller) external;

    /**
     * @dev Updates the main controller for an `identity`
     * @param identity The main account
     * @param newController Candidate to be the current main controller
     */
    function changeController(address identity, address newController) external;

    function expirationAttribute(
        address identity,
        bytes32 attributeNameHash,
        bytes32 attributeValueHash
    ) external view returns (uint256);

    function changeControllerSigned(
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        address newController
    ) external;

    function setAttribute(
        address identity,
        bytes memory name,
        bytes memory value,
        uint validity
    ) external;

    function setAttributeSigned(
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        bytes memory name,
        bytes memory value,
        uint validity
    ) external;

    function revokeAttribute(
        address identity,
        bytes memory name,
        bytes memory value,
        uint256 revokeDeltaTime,
        bool compromised
    ) external;

    function revokeAttributeSigned(
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        bytes memory name,
        bytes memory value,
        uint256 revokeDeltaTime,
        bool compromised
    ) external;

    function validDelegate(
        address identity,
        bytes32 delegateType,
        address delegate
    ) external view returns (bool);

    function addDelegate(
        address identity,
        bytes32 delegateType,
        address delegate,
        uint validity
    ) external;

    function addDelegateSigned(
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        bytes32 delegateType,
        address delegate,
        uint validity
    ) external;

    function revokeDelegate(
        address identity,
        bytes32 delegateType,
        address delegate,
        uint256 revokeDeltaTime,
        bool compromised
    ) external;

    function revokeDelegateSigned(
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        bytes32 delegateType,
        address delegate,
        uint256 revokeDeltaTime,
        bool compromised
    ) external;

    function enableKeyRotation(address identity, uint keyRotationTime) external;

    function disableKeyRotation(address identity) external;

    /**
     * Reurns whether key automatic rotation is enabled. This is, for a set of controllers candidate it is automatically chosen one
     * for a time window whose value is set at the time of enabling the automatic rotation or a global value set at contract deployment.
     * @param identity main identifier
     */
    function isKeyRotationEnabled(
        address identity
    ) external view returns (bool);
}
