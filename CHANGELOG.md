# Changelog

### 2.7.0

- feat: Add support to make DID not updatable by removing controllers

### 2.6.0

- feat: Add alsoKnownAs support
- handles version numbering following x.y.z

### 0.0.2

- Add LAC1 DID Specification
- Refactor contracts enhance code reusability
- Set contract License to Apache-2.0
- Add unit tests
- Reduce error message length in contracts
- fix nonce verification in DIDRegistryRecoverable `recover` method.
- Improve DIDRegistryRecoverable `recover` method response
- return identity address itself when there are no additional backup controllers set.

#### Bug Fixes

- Fix: UpdateBaseRelayRecipient `_msgSender()` method
- remove hashing operation on `delegateType` parameter since it of 32 bytes length already.
- fix: Increment nonce when sending signed recover transaction

## 0.0.1

- First contracts version for

  - Any Ethereum Network
  - LACchain with gas model on top of the network

- inherits from LAC did registry and ERC1056 standard
- Add backwards revocation capability
- Add onchain delegates as specified in ERC1056
- Add versioning for contracts

### Additions and improvements

### Bug Fixes

-
