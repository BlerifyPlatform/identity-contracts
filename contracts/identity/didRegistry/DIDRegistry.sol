//SPDX-License-Identifier: APACHE-2.0

pragma solidity 0.8.18;

import "../SafeMath.sol";
import "../IDIDRegistry.sol";
import "@openzeppelin/contracts/utils/Context.sol";

contract DIDRegistry is IDIDRegistry, Context {
    using SafeMath for uint256;

    mapping(address => address[]) public controllers;
    mapping(address => mapping(bytes32 => mapping(address => uint)))
        public delegates;
    mapping(address => mapping(bytes32 => mapping(bytes32 => uint)))
        public attributes;
    mapping(address => DIDConfig) private configs;
    mapping(address => uint) public changed;
    mapping(address => uint) public nonce;

    uint public minKeyRotationTime;
    uint16 public constant version = 2;

    constructor(uint _minKeyRotationTime) {
        minKeyRotationTime = _minKeyRotationTime;
    }

    modifier onlyController(address identity, address actor) {
        require(actor == identityController(identity), "NA");
        _;
    }

    function getControllers(
        address identity
    ) public view returns (address[] memory controllerList) {
        controllerList = controllers[identity];
        uint len = controllerList.length;
        if (len == 0) {
            address[] memory c = new address[](1);
            c[0] = identity;
            return c;
        }
        return controllerList;
    }

    function identityController(
        address identity
    ) public view returns (address) {
        uint len = controllers[identity].length;
        if (len == 0) return identity;
        if (len == 1) return controllers[identity][0];
        DIDConfig memory config = configs[identity];
        address controller = address(0);
        if (config.automaticRotation) {
            uint currentController = block
                .timestamp
                .div(config.keyRotationTime)
                .mod(len);
            controller = controllers[identity][currentController];
        } else {
            if (config.currentController >= len) {
                controller = controllers[identity][0];
            } else {
                controller = controllers[identity][config.currentController];
            }
        }
        if (controller != address(0)) return controller;
        return identity;
    }

    function checkSignature(
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        bytes32 hash
    ) internal returns (address) {
        address signer = ecrecover(hash, sigV, sigR, sigS);
        require(signer == identityController(identity), "IS");
        nonce[signer]++;
        return signer;
    }

    function setCurrentController(address identity, uint index) internal {
        DIDConfig storage config = configs[identity];
        config.currentController = index;
    }

    /**
     * Returns the index for a passed address `controller`. If the passed address is not registered as a controller it returns -1
     */
    function _getControllerIndex(
        address identity,
        address controller
    ) internal view returns (int) {
        for (uint i = 0; i < controllers[identity].length; i++) {
            if (controllers[identity][i] == controller) {
                return int(i);
            }
        }
        return -1;
    }

    function addController(
        address identity,
        address actor,
        address newController,
        uint256 blockChangeBeforeUpdate
    ) internal onlyController(identity, actor) {
        int controllerIndex = _getControllerIndex(identity, newController);

        bool condition1 = identityController(identity) != newController;
        bool condition2 = controllerIndex < 0;
        require(condition1 && condition2, "CAE");
        if (controllers[identity].length == 0) {
            controllers[identity].push(identity);
        }
        controllers[identity].push(newController);
        emit DIDControllerAdded(
            identity,
            actor,
            newController,
            blockChangeBeforeUpdate
        );
        setLastBlockChangeIfNeeded(identity);
    }

    function removeController(
        address identity,
        address actor,
        address controller,
        uint256 blockChangeBeforeUpdate
    ) internal onlyController(identity, actor) {
        require(controllers[identity].length > 1, "ALTCR");
        require(identityController(identity) != controller, "CDMC");
        int controllerIndex = _getControllerIndex(identity, controller);

        require(controllerIndex >= 0, "CDNE");

        uint len = controllers[identity].length;
        address lastController = controllers[identity][len - 1];
        controllers[identity][uint(controllerIndex)] = lastController;
        if (lastController == identityController(identity)) {
            configs[identity].currentController = uint(controllerIndex);
        }
        delete controllers[identity][len - 1];
        controllers[identity].pop();
        emit DIDControllerRemoved(
            identity,
            actor,
            controller,
            blockChangeBeforeUpdate
        );
        setLastBlockChangeIfNeeded(identity);
    }

    function rotateMainController(
        address identity,
        address actor,
        address newController,
        uint256 blockChangeBeforeUpdate
    ) internal onlyController(identity, actor) {
        int controllerIndex = _getControllerIndex(identity, newController);

        require(controllerIndex >= 0, "CDNE");

        setCurrentController(identity, uint(controllerIndex));

        emit DIDControllerChanged(
            identity,
            newController,
            blockChangeBeforeUpdate
        );
        setLastBlockChangeIfNeeded(identity);
    }

    function enableKeyRotation(
        address identity,
        address actor,
        uint keyRotationTime
    ) internal onlyController(identity, actor) {
        require(keyRotationTime >= minKeyRotationTime, "VLTGRT");
        bool currentRotationStatus = configs[identity].automaticRotation;
        require(!currentRotationStatus, "KRAE");
        configs[identity].automaticRotation = true;
        configs[identity].keyRotationTime = keyRotationTime;
        emit KeyRotationStatusChanged(identity, actor, true);
    }

    function disableKeyRotation(
        address identity,
        address actor
    ) internal onlyController(identity, actor) {
        bool currentRotationStatus = configs[identity].automaticRotation;
        require(currentRotationStatus, "KRAD");
        configs[identity].automaticRotation = false;
        emit KeyRotationStatusChanged(identity, actor, false);
    }

    function isKeyRotationEnabled(
        address identity
    ) external view returns (bool) {
        return configs[identity].automaticRotation;
    }

    function addController(
        address identity,
        address controller
    ) external override {
        addController(identity, _msgSender(), controller, changed[identity]);
    }

    function removeController(
        address identity,
        address controller
    ) external override {
        removeController(identity, _msgSender(), controller, changed[identity]);
    }

    function rotateMainController(
        address identity,
        address newController
    ) external override {
        rotateMainController(
            identity,
            _msgSender(),
            newController,
            changed[identity]
        );
    }

    function rotateMainControllerSigned(
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        address newController
    ) external override {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0x19),
                bytes1(0),
                this,
                nonce[identityController(identity)],
                identity,
                "rotateMainController",
                newController
            )
        );
        rotateMainController(
            identity,
            checkSignature(identity, sigV, sigR, sigS, hash),
            newController,
            changed[identity]
        );
    }

    function enrollNewAndSetMainController(
        address identity,
        address newController
    ) external {
        address actor = _msgSender();
        uint256 blockChangeBeforeUpdate = changed[identity];
        addController(identity, actor, newController, blockChangeBeforeUpdate);
        rotateMainController(
            identity,
            actor,
            newController,
            blockChangeBeforeUpdate
        );
    }

    function setAttribute(
        address identity,
        address actor,
        bytes memory name,
        bytes memory value,
        uint validity,
        uint256 blockChangeBeforeUpdate
    ) internal onlyController(identity, actor) {
        uint256 currentTime = block.timestamp;
        attributes[identity][keccak256(name)][keccak256(value)] =
            currentTime +
            validity;
        emit DIDAttributeChanged(
            identity,
            name,
            value,
            currentTime + validity,
            currentTime,
            blockChangeBeforeUpdate,
            false
        );
        setLastBlockChangeIfNeeded(identity);
    }

    function setAttribute(
        address identity,
        bytes memory name,
        bytes memory value,
        uint validity
    ) external override {
        setAttribute(
            identity,
            _msgSender(),
            name,
            value,
            validity,
            changed[identity]
        );
    }

    function setAttributeSigned(
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        bytes memory name,
        bytes memory value,
        uint validity
    ) external override {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0x19),
                bytes1(0),
                this,
                nonce[identityController(identity)],
                identity,
                "setAttribute",
                name,
                value,
                validity
            )
        );
        setAttribute(
            identity,
            checkSignature(identity, sigV, sigR, sigS, hash),
            name,
            value,
            validity,
            changed[identity]
        );
    }

    function revokeAttribute(
        address identity,
        address actor,
        bytes memory name,
        bytes memory value,
        uint256 revokeDeltaTime,
        bool compromised,
        uint256 blockChangeBeforeUpdate
    ) internal onlyController(identity, actor) {
        bytes32 attributeNameHash = keccak256(name);
        bytes32 attributeValueHash = keccak256(value);
        uint256 currentTime = block.timestamp;
        // no matter if the attribute was issued before it just sets the revoked time
        uint256 revoked = currentTime - revokeDeltaTime;
        attributes[identity][attributeNameHash][attributeValueHash] = revoked;
        address id = identity;
        emit DIDAttributeChanged(
            id,
            name,
            value,
            revoked,
            currentTime,
            blockChangeBeforeUpdate,
            compromised
        );
        setLastBlockChangeIfNeeded(id);
    }

    function revokeAttribute(
        address identity,
        bytes memory name,
        bytes memory value,
        uint256 revokeDeltaTime,
        bool compromised
    ) external override {
        revokeAttribute(
            identity,
            _msgSender(),
            name,
            value,
            revokeDeltaTime,
            compromised,
            changed[identity]
        );
    }

    function revokeAttributeSigned(
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        bytes memory name,
        bytes memory value,
        uint256 revokeDeltaTime,
        bool compromised
    ) external override {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0x19),
                bytes1(0),
                this,
                nonce[identityController(identity)],
                identity,
                "revokeAttribute",
                name,
                value,
                revokeDeltaTime,
                compromised
            )
        );
        address id = identity;
        revokeAttribute(
            identity,
            checkSignature(identity, sigV, sigR, sigS, hash),
            name,
            value,
            revokeDeltaTime,
            compromised,
            changed[id]
        );
    }

    function enableKeyRotation(
        address identity,
        uint keyRotationTime
    ) external override {
        enableKeyRotation(identity, _msgSender(), keyRotationTime);
    }

    function disableKeyRotation(address identity) external override {
        disableKeyRotation(identity, _msgSender());
    }

    function validDelegate(
        address identity,
        bytes32 delegateType,
        address delegate
    ) public view returns (bool) {
        uint validity = delegates[identity][delegateType][delegate];
        return (validity > block.timestamp);
    }

    function addDelegate(
        address identity,
        address actor,
        bytes32 delegateType,
        address delegate,
        uint validity,
        uint256 blockChangeBeforeUpdate
    ) internal onlyController(identity, actor) {
        uint256 currentTime = block.timestamp;
        delegates[identity][delegateType][delegate] = currentTime + validity;
        emit DIDDelegateChanged(
            identity,
            delegateType,
            delegate,
            currentTime + validity,
            currentTime,
            blockChangeBeforeUpdate,
            false
        );
        setLastBlockChangeIfNeeded(identity);
    }

    function addDelegate(
        address identity,
        bytes32 delegateType,
        address delegate,
        uint validity
    ) external {
        addDelegate(
            identity,
            _msgSender(),
            delegateType,
            delegate,
            validity,
            changed[identity]
        );
    }

    function addDelegateSigned(
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        bytes32 delegateType,
        address delegate,
        uint validity
    ) external {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0x19),
                bytes1(0),
                this,
                nonce[identityController(identity)],
                identity,
                "addDelegate",
                delegateType,
                delegate,
                validity
            )
        );
        addDelegate(
            identity,
            checkSignature(identity, sigV, sigR, sigS, hash),
            delegateType,
            delegate,
            validity,
            changed[identity]
        );
    }

    function revokeDelegate(
        address identity,
        address actor,
        bytes32 delegateType,
        address delegate,
        uint256 revokeDeltaTime,
        bool compromised,
        uint256 blockChangeBeforeUpdate
    ) internal onlyController(identity, actor) {
        uint256 currentTime = block.timestamp;
        // no matter if the attribute was issued before it just sets the revoked time
        uint256 expirationTime = currentTime - revokeDeltaTime;
        address id = identity;
        delegates[id][delegateType][delegate] = expirationTime;
        emit DIDDelegateChanged(
            id,
            delegateType,
            delegate,
            expirationTime,
            currentTime,
            blockChangeBeforeUpdate,
            compromised
        );
        setLastBlockChangeIfNeeded(id);
    }

    function revokeDelegate(
        address identity,
        bytes32 delegateType,
        address delegate,
        uint256 revokeDeltaTime,
        bool compromised
    ) external {
        revokeDelegate(
            identity,
            _msgSender(),
            delegateType,
            delegate,
            revokeDeltaTime,
            compromised,
            changed[identity]
        );
    }

    function revokeDelegateSigned(
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        bytes32 delegateType,
        address delegate,
        uint256 revokeDeltaTime,
        bool compromised
    ) external {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0x19),
                bytes1(0),
                this,
                nonce[identityController(identity)],
                identity,
                "revokeDelegate",
                delegateType,
                delegate,
                revokeDeltaTime,
                compromised
            )
        );
        address id = identity;
        revokeDelegate(
            identity,
            checkSignature(identity, sigV, sigR, sigS, hash),
            delegateType,
            delegate,
            revokeDeltaTime,
            compromised,
            changed[id]
        );
    }

    function setLastBlockChangeIfNeeded(address account) internal {
        uint256 blockNumber = block.number;
        if (changed[account] == blockNumber) {
            return;
        }
        changed[account] = blockNumber;
    }
}
