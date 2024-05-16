//SPDX-License-Identifier: APACHE-2.0

pragma solidity 0.8.18;

interface IDIDRegistry {
    struct DIDConfig {
        uint currentController;
        bool automaticRotation;
        uint keyRotationTime;
    }

    /**
     * @dev Emitted event when ak alsoKnownAs identifier (akaId) is added or removed
     * if `validTo` is greater than `changeTime` akaId is added otherwise removed.
     * @param identity The main account representing a unique idenfier
     * @param actor The controller that executed the action on behalf of `identity`.
     * @param akaId RFC3986 compliant identifier
     * @param validTo number representing 10 digit unix timestamp (in seconds) for which the association/disassociation will be/was valid
     * @param changeTime the time at which the association/disassociation is made, typically block.timestamp
     * @param previousChange indicates the block number at which a previous change was recorded for `identity`
     */
    event AKAChanged(
        address indexed identity,
        address indexed actor,
        string akaId,
        uint validTo,
        uint changeTime,
        uint previousChange
    );

    /**
     *
     * @param identity The main account representing a unique idenfier
     * @param actor The controller that executed the action on behalf of `identity`.
     * @param newController The new controller added
     * @param previousChange indicates the block number at which a previous change was recorded for `identity`
     */
    event DIDControllerAdded(
        address indexed identity,
        address indexed actor,
        address indexed newController,
        uint previousChange
    );

    /**
     *
     * @param identity the main account representing a unique idenfier
     * @param actor The controller that executed the action on behalf of `identity`.
     * @param removedController The controller to be removed
     * @param previousChange indicates the block number at which a previous change was recorded for `identity`
     */
    event DIDControllerRemoved(
        address indexed identity,
        address indexed actor,
        address indexed removedController,
        uint previousChange
    );

    /**
     *
     * @param identity the main account representing a unique idenfier
     * @param controller the controller to be the main controller for `identity`.
     * @param previousChange indicates the block number at which a previous change was recorded for `identity`
     */
    event DIDControllerChanged(
        address indexed identity,
        address controller,
        uint previousChange
    );

    /**
     * Event emitted when a DID is deactivated
     * @param identity the main account representing a unique idenfier
     * @param actor The controller that executed the action on behalf of `identity`.
     */
    event DIDDeactivated(
        address indexed identity,
        address actor,
        uint256 previousChange
    );

    /**
     * Event emitted when DID controllers are deactivated, that means the DID is no longer updatable.
     * @param identity the main account representing a unique idenfier
     * @param actor The controller that executed the action on behalf of `identity`.
     */
    event DIDControllersDeactivated(
        address indexed identity,
        address actor,
        uint256 previousChange
    );

    /**
     *
     * @param identity The main account representing a unique idenfier
     * @param actor The controller that executed the action on behalf of `identity`.
     * @param keyRotationStatus It is `true` when automatic key rotation is enabled, `false` when automatic key rotation is disabled
     */
    event KeyRotationStatusChanged(
        address indexed identity,
        address indexed actor,
        bool keyRotationStatus
    );

    /**
     *
     * @param identity the main account representing a unique idenfier
     * @param name the metadata identifying the param `value`
     * @param value the value representing the attribute value
     * @param validTo number representing 10 digit unix timestamp (in seconds) for which the association/disassociation will be/was valid
     * @param changeTime the time at which the association/disassociation is made, typically block.timestamp
     * @param previousChange indicates the block number at which a previous change was recorded for `identity`
     * @param compromised By default `compromised` is false. When `validTo` is less or equal to changeTime this event will represent a
     * disassociation `delegate`/`delegateType` from `identity` in such scenario `compromised` can be set to true to inform that such disassociation
     * was made because of compromission of the `attribute` (for example, when the attribute is a cryptographic key)
     */
    event DIDAttributeChanged(
        address indexed identity,
        bytes name,
        bytes value,
        uint validTo,
        uint changeTime,
        uint previousChange,
        bool compromised
    );

    /**
     * @param identity the main account representing a unique idenfier
     * @param delegateType the type of delegate associated/disassociated to `delegate` for `identity`
     * @param delegate the account assigned as a delegate
     * @param validTo number representing 10 digit unix timestamp (in seconds) for which the association/disassociation will be/was valid
     * @param changeTime the time at which the association/disassociation `delegate`/`delegateType` for `identity` is registered
     * @param previousChange indicates the block number at which a previous change was recorded for `identity`
     * @param compromised By default `compromised` is false. When `validTo` is less or equal to changeTime this event will represent a
     * disassociation `delegate`/`delegateType` from `identity` in such scenario `compromised` can be set to true to inform that such disassociation
     * was made because of compromission of the `delegate` account
     */
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

    /**
     * @dev returns the current main controller for `identity`
     * @param identity the main account representing a unique idenfier
     */
    function identityController(
        address identity
    ) external view returns (address);

    function addController(address identity, address controller) external;

    /**
     * @dev By using this method, an identity can handle its backup controllers
     * @param identity the main account representing a unique idenfier
     * @param controller of the controllers backup to be disassociated from `identity`
     */
    function removeController(address identity, address controller) external;

    /**
     * @dev Updates the main controller for an `identity`
     * @param identity the main account representing a unique idenfier
     * @param newController Candidate to be the current main controller
     */
    function rotateMainController(
        address identity,
        address newController
    ) external;

    /**
     * @dev The same as `rotateMainController` method but rather than directly signing the transaction it is signed by any account but
     * the main intention is presented alongside a signature (with params v,r,s) which is used to verify that the signer (who generated v,r,s)
     * is authorized and that the intention is valid.
     * @param identity the main account representing a unique idenfier
     * @param sigV The `v` param after signing following ecdsa algorithm
     * @param sigR The `r` param after signing following ecdsa algorithm
     * @param sigS The `s` param after signing following ecdsa algorithm
     * @param newController Candidate to be the current main controller
     */
    function rotateMainControllerSigned(
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        address newController
    ) external;

    /**
     * @dev This method not only adds `newController` in the set of backup controllers but also sets such account as the main controller.
     * Reverts if `newController` already exists
     * @param identity the main account representing a unique idenfier
     * @param newController Candidate to be the current main controller
     */
    function enrollNewAndSetMainController(
        address identity,
        address newController
    ) external;

    /**
     * @dev This method allows to make an association `name`/`value` with `identity`
     * @param identity the main account representing a unique idenfier
     * @param name the metadata identifying the param `value`
     * @param value the value representing the attribute to be associated with `identity`
     * @param validity number representing 10 digit unix timestamp (in seconds) for which the association will be/was valid
     */
    function setAttribute(
        address identity,
        bytes memory name,
        bytes memory value,
        uint validity
    ) external;

    /**
     * @dev The same as `setAttribute` method but rather than directly signing the transaction it is signed by any account but
     * the main intention is presented alongside a signature (with params v,r,s) which is used to verify that the signer (who generated v,r,s)
     * is authorized and that the intention is valid.
     * @param identity the main account representing a unique idenfier
     * @param sigV The `v` param after signing following ecdsa algorithm
     * @param sigR The `r` param after signing following ecdsa algorithm
     * @param sigS The `s` param after signing following ecdsa algorithm
     * @param name the metadata identifying the param `value`
     * @param value the value representing the attribute to be associated with `identity`
     * @param validity number, 10 digit unix timestamp (in seconds), representing a period of time for which the association will be valid
     */
    function setAttributeSigned(
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        bytes memory name,
        bytes memory value,
        uint validity
    ) external;

    /**
     *
     * @param identity the main account representing a unique idenfier
     * @param name the metadata identifying the param `value`
     * @param value the value representing the attribute to be associated with `identity`
     * @param revokeDeltaTime number, 10 digit unix timestamp (in seconds), representing a period of time until which the
     * association was valid
     * @param compromised can be set to true to inform that the disassociation is made because of compromission of the
     * attribute (for example, when the attribute is a cryptographic key)
     */
    function revokeAttribute(
        address identity,
        bytes memory name,
        bytes memory value,
        uint256 revokeDeltaTime,
        bool compromised
    ) external;

    /**
     * @dev The same as `revokeAttribute` method but rather than directly signing the transaction it is signed by any account but
     * the main intention is presented alongside a signature (with params v,r,s) which is used to verify that the signer (who generated v,r,s)
     * is authorized and that the intention is valid.
     * @param identity the main account representing a unique idenfier
     * @param sigV The `v` param after signing following ecdsa algorithm
     * @param sigR The `r` param after signing following ecdsa algorithm
     * @param sigS The `s` param after signing following ecdsa algorithm
     * @param name the metadata identifying the param `value`
     * @param value the value representing the attribute to be associated with `identity`
     * @param revokeDeltaTime number, 10 digit unix timestamp (in seconds), representing a period of time until which the
     * association was valid
     * @param compromised can be set to true to inform that the disassociation is made because of compromission of the
     * attribute (for example, when the attribute is a cryptographic key)
     */
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

    /**
     * @dev This method allows to make an association `delegateType`/`delegate` with `identity`.
     * @param identity the main account representing a unique idenfier
     * @param delegateType the type of delegate associated to `delegate` for `identity`
     * @param delegate the account assigned as a delegate
     * @param validity number, 10 digit unix timestamp (in seconds), representing a period of time for which the association will be valid
     */
    function addDelegate(
        address identity,
        bytes32 delegateType,
        address delegate,
        uint validity
    ) external;

    /**
     * @dev The same as `addDelegate` method but rather than directly signing the transaction it is signed by any account but
     * the main intention is presented alongside a signature (with params v,r,s) which is used to verify that the signer (who generated v,r,s)
     * is authorized and that the intention is valid.
     * @param identity the main account representing a unique idenfier
     * @param sigV The `v` param after signing following ecdsa algorithm
     * @param sigR The `r` param after signing following ecdsa algorithm
     * @param sigS The `s` param after signing following ecdsa algorithm
     * @param delegateType the type of delegate associated to `delegate` for `identity`
     * @param delegate the account assigned as a delegate
     * @param validity number, 10 digit unix timestamp (in seconds), representing a period of time for which the association will be valid
     */
    function addDelegateSigned(
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        bytes32 delegateType,
        address delegate,
        uint validity
    ) external;

    /**
     *
     * @param identity the main account representing a unique idenfier
     * @param delegateType the type of delegate associated to `delegate` for `identity`
     * @param delegate the account assigned as a delegate
     * @param revokeDeltaTime number, 10 digit unix timestamp (in seconds), representing a period of time until which the
     * association was valid
     * @param compromised can be set to true to inform that the disassociation is made because of compromission of the
     * `delegate` account
     */
    function revokeDelegate(
        address identity,
        bytes32 delegateType,
        address delegate,
        uint256 revokeDeltaTime,
        bool compromised
    ) external;

    /**
     * @dev The same as `revokeDelegate` method but rather than directly signing the transaction it is signed by any account but
     * the main intention is presented alongside a signature (with params v,r,s) which is used to verify that the signer (who generated v,r,s)
     * is authorized and that the intention is valid.
     * @param identity the main account representing a unique idenfier
     * @param sigV The `v` param after signing following ecdsa algorithm
     * @param sigR The `r` param after signing following ecdsa algorithm
     * @param sigS The `s` param after signing following ecdsa algorithm
     * @param delegateType the type of delegate associated to `delegate` for `identity`
     * @param delegate the account assigned as a delegate
     * @param revokeDeltaTime number, 10 digit unix timestamp (in seconds), representing a period of time until which the
     * association was valid
     * @param compromised can be set to true to inform that the disassociation is made because of compromission of the
     * `delegate` account
     */
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

    /**
     * @dev `enableKeyRotation` allows a user with more than one backup controller key to rotate such key automatically. Let's say `keyRotationTime`
     * is 3600 seconds (1 hour) and a particular identity `identity` has 3 backup controller keys; so that means that every hour,
     * in a deterministic manner, the cotroller privilege will switch to one of the 3 backup controller keys.
     * @param identity the main account representing a unique idenfier
     * @param keyRotationTime period of time, in seconds, representing the intervals at which the rey rotation takes place
     */
    function enableKeyRotation(address identity, uint keyRotationTime) external;

    /**
     * @dev disables key rotation feature. For the implementation `DIDRegistry` key rotation is disabled by default.
     * @param identity the main account representing a unique idenfier
     */
    function disableKeyRotation(address identity) external;

    /**
     * Returns whether key automatic rotation is enabled. This is, for a set of controllers candidate it is automatically chosen one
     * for a time window whose value is set at the time of enabling the automatic rotation or a global value set at contract deployment.
     * @param identity main identifier
     */
    function isKeyRotationEnabled(
        address identity
    ) external view returns (bool);

    /**
     * Deactivates the DID represented by `identity`. This means any writing method gets permanently disabled for such DID
     * @param identity  the main account representing a unique idenfier
     */
    function deactivateAccount(address identity) external;

    /**
     * @dev Allows adding another identifier to `ìdentity`. The main intention of doing this is for DID migration purposes
     * @param identity the main account representing a unique idenfier
     * @param akaId RFC3986 compliant identifier
     * @param validity number, 10 digit unix timestamp (in seconds), representing a period of time for which the association will be valid
     */
    function addAKAIdentifier(
        address identity,
        string memory akaId,
        uint256 validity
    ) external;

    /**
     * @dev Removes an `akaId` identifier
     * @param identity the main account representing a unique idenfier
     * @param akaId RFC3986 compliant identifier
     */
    function removeAKAIdentifier(
        address identity,
        string memory akaId
    ) external;
}
