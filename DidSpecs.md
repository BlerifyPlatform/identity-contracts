# LAC1 DID Method Specification

### Introduction

In compliance with the [W3C did core specs](https://www.w3.org/TR/did-core/) we propose a new DID method based on [ethr did method](https://github.com/decentralized-identity/ethr-did-resolver/blob/master/doc/did-method-spec.md) and the [LAC did method](https://github.com/lacchain/lacchain-did-registry/blob/master/DID_SPEC.md). The values added in the proposed DID method are the capability to encode the exact path, in the DID, to resolve the underlying DID registry.
Secondly, the resolved DID document allows to specify a time in the past from which the attribute being revoked stops being valid, additionally the underlying DID registry shows transparency by giving anyone the ability to verify every change in regards to that attribute.

### Abstract

The following DID method inherits from `ethr` the creation of off-chain DIDs, but different from this we also encode the on-chain DID registry as well as other relevant params as part of the final DID identifier. Any Ethereum contract account or any ethereum externally Owned Account can be a valid param to comprise a valid DID identifier. Such an identifier doesn't need to be registered on any registry. If attributes or services need to be registered those can be added to the instance of [did registry](./contracts/identity/didRegistry/DIDRegistry.sol) obtained after decoding the DID.

The account abstraction as proposed by the ethr underlying ERC1056 standard is also inherited so any account can delegate the transaction sending to a third party account.

### Identifier Controller

Each identifier can be controlled by just one ethereum address which can be either an externally owned account or a contract account.

### Target System

The target system is the one where the DID registry is deployed. In general it can be any EVM compatible network.

### Additional Advantages to ethr and lac DID methods

- backwards revocation time support: With this feature the the controller of a DID can not only revoke from the moment the controller is performing the revocation of a key but can also specify the time in the past (let us call it t_1) after which the key is considered revoked, this is especially useful for cases when it is necessary to revoke a key without affecting all cryptographically verifiable statements signed with such key but just part of them issued after t_1. This opens two main considerations:
  - Transparency: Since revocations are logged in the blockchain all changes pertaining any key are perfectly traced and thus transparent.
  - Key compromise: Imagine a scenario where a key, associated to a DID for some purpose, was compromised. In such case, the controller behind the DID can fully revoke the key and thus affect all cryptographically verifiable statements made with that key; or to avoid affecting all cryptographically verifiable statements, the controller can make a revocation by specifying a time in the past when that key stops being valid. For example if it is identified that the vulnerability occurred X days ago, then the controller can revoke the key specifying that all cryptographically verifiable statements made earlier than X days ago are still valid. The natural question here is how a verifier relies that some cryptographically verifiable statement was made earlier than X days ago?, well it is an issue that the verifiable statement should address; for example, by using a proof of time that can be anchored to a blockchain so the verifier can be sure of the existence of that verifiable statement at that time.
- ability to directly resolve the DID registry from the DID
- ability to handle improvements while maintaining backwards compatibility
- ability to migrate to another DID by using [alsoKnownAs](https://www.w3.org/ns/did/#properties) attribute

### DID Method Name

- The method name for the proposed DID registry is "lac1"

### Specific identifier definition

Let us assume the DID is `did:lac1":base58-specific-identifier`, then the `base58-specific-identifier` is defined as follows:

```sh
did = "did:lac1":base58-specific-identifier
base58-specific-identifier = base58(specific-identifier-bytes)

specific-identifier-bytes = payload.push(checksum)
checksum = hashFunction(payload)[0:4] # first 4 bytes of checksum
payload = Array.concat(<did-version-bytes>, <did-type-bytes>, <data-buffer-bytes>)
```

Where:

- `did-type-bytes` - (2 bytes) - represents the transformation to bytes of the `did-type-hex`
- `did-version-bytes` - (2 bytes) - represents the transformation to bytes of `did-version-hex`

Note that `data-buffer-bytes` is variable depending on the `did-version-bytes` and `did-type-bytes`.

For example when `did-version-hex` is `0x0001` (in bytes -> <00 01>) and `did-type-hex` is `0x0001` (in bytes -> <00 01>) the `data-buffer-bytes` is defined as [follows](./type-version/0001-0001.md#data-buffer-bytes-definition)

Having the capability to define different types and different versions allows to better handle any improvements while also maintaining backwards compatibility.

### Underlying DID Registry

[DID registry](./contracts/identity/didRegistry/DIDRegistry.sol)

The DID Registry holds its own control of versions. Each DID type-version defines the didRegistryVersions it supports. [For example for type 1 version 1 the supported contract versions are](./type-version/0001-0001.md#supported-did-registry-smart-contract-versions)

### CRUD Operation Definitions

#### Create

As long as you have all the required inputs the DID creation process will not require any transaction to the underlying ethereum based network. For example for type ["0001" and version "0001"](./type-version/0001-0001.md) the creation will consist of the following operations as mentioned in its [create](./type-version/0001-0001.md#create) section

A successful create operation will render a value like `did:lac1:1iT6937zvW4RJxfyrxbi3NGtNq7tUMbpsKPEFC5VX3H1xfa8R15aWq7g2X6RZD8gLuQU` where initially the DID Document will look like:

```sh
{
  "@context": "https://www.w3.org/ns/did/v1",
  "id": "did:lac1:4Kx9Qj58rAH7Cnhfx3sCWvc5qT65qtGfwXoYj4MnCsJBEHH4maNJBqAj8fzFDbhu7p2YR",
  "controller": "did:lac1:4Kx9Qj58rAH7Cnhfx3sCWvc5qT65qtGfwXoYj4MnCsJBEHH4maNJBqAj8fzFDbhu7p2YR",
  "verificationMethod": [
    {
      "id": "did:lac1:4Kx9Qj58rAH7Cnhfx3sCWvc5qT65qtGfwXoYj4MnCsJBEHH4maNJBqAj8fzFDbhu7p2YR#GbinyzS1o2jhiS7vu8mqWyaobLGE8iatXuN8wyAXGVGM",
      "type": "EcdsaSecp256k1RecoveryMethod2020",
      "controller": "did:lac1:4Kx9Qj58rAH7Cnhfx3sCWvc5qT65qtGfwXoYj4MnCsJBEHH4maNJBqAj8fzFDbhu7p2YR",
      "blockchainAccountId": "eip155:648540:0x56dD32c6Bc704FE2eB73f821222Aa299DfA25740"
    }
  ],
  "authentication": [
    "did:lac1:4Kx9Qj58rAH7Cnhfx3sCWvc5qT65qtGfwXoYj4MnCsJBEHH4maNJBqAj8fzFDbhu7p2YR#GbinyzS1o2jhiS7vu8mqWyaobLGE8iatXuN8wyAXGVGM"
  ],
  "assertionMethod": [
    "did:lac1:4Kx9Qj58rAH7Cnhfx3sCWvc5qT65qtGfwXoYj4MnCsJBEHH4maNJBqAj8fzFDbhu7p2YR#GbinyzS1o2jhiS7vu8mqWyaobLGE8iatXuN8wyAXGVGM"
  ],
  "keyAgreement": [],
  "capabilityInvocation": [],
  "capabilityDelegation": []
}
```

By default the current active controller is added as a default verification method with `authentication` and `assertion` relationships.

The Id of the default verification method follows the format:

```js
"id": "<did>#<vm-identifier>",
```

Where:

- `did` is the decentralized identifier string.
- vm-identifier is calculated as follows:
  - Convert `did` to utf-8 array: utf8_array_controller
  - Convert to bytes the hex value corresponding to the current DID controller (it is an etherum address) retrieved from the underlying DID Registry with the method `getController()`: value_array_value
  - concatenate both utf8_array_controller and value_array_value: concatenated_value
  - Compute the keccak256 digest of `concatenated_value`: digest
  - obtain the base58 representation of `digest`.

#### Read

##### Controller Address

Each identifier always has a controller address. By default, it is the same as the identifier address, but the resolver MUST check the read only contract function `identityController(address identity)` on the deployed [DID Registry smart contract](./contracts/identity/didRegistry/).

This controller address MUST be represented in the DID document in the attribute `controller` and MUST be formatted following the guidance as specified in the [DID Creation process](./DidSpecs.md#create)

##### Enumerating Contract events to build the DID document

To construct a valid DID document, first find all changes in history for an identity:

1. perform an eth_call to changed(address identity) on the [DID Registry smart contract](./contracts/identity/didRegistry/DIDRegistry.sol) to get the last block where a change occurred.
2. If result is zero return.
3. For the given block, filter events where

   - event name is `DIDAttributeChanged` for attributes:

   ```js
       event DIDAttributeChanged(
           address indexed identity,
           bytes name,
           bytes value,
           uint validTo,
           uint changeTime,
           uint previousChange,
           bool compromised
       )
   ```

   - and event name is `DIDDelegateChanged` for onchain delegates:

   ```js
       event DIDDelegateChanged(
           address indexed identity,
           bytes32 delegateType,
           address delegate,
           uint validTo,
           uint changeTime,
           uint previousChange,
           bool compromised
       );
   ```

4. In any case if the mentioned events have the attribute `previousChange` different to zero then go back to step 3 where `block=<value of previousChange>`
5. After building the history of events for an address, interpret each event to build the DID document given the following:

###### Attributes (DIDAttributeChanged)

While any attribute can be emitted in the `DIDAttributeChanged`, for the DID document we currently support adding to each of these sections of the DID Document the following properties:

- [Verification Methods](./DIDAttributesServices.md#verification-methods)
- [Service Endpoints](./DIDAttributesServices.md#service-endpoints)

###### Delegate Keys (DIDDelegateChanged)

Delegate keys are Ethereum addresses that can either be general signing keys or optionally also perform authentication.

They are also verifiable from Solidity (on-chain).

When a delegate is added or revoked, a `DIDDelegateChanged` event is published which MUST be used to update the DID document.

The only 2 delegateTypes that are currently published in the DID document are:

###### _'veriKey' delegate type_

Which adds a EcdsaSecp256k1RecoveryMethod2020 to the verificationMethod section of the DID document with the blockchainAccountId(ethereumAddress) of the delegate, and adds a reference to it in the assertionMethod section.

###### _'sigAuth' delegate type_

Which adds a EcdsaSecp256k1RecoveryMethod2020 to the verificationMethod section of document and a reference to it in the authentication section.

_Note_ the delegateType is a bytes32 type.

Valid on-chain delegates MUST be added to the verificationMethod array as EcdsaSecp256k1RecoveryMethod2020 entries, with the delegate address listed in the blockchainAccountId property and prefixed with `eip155:<chainId>:`, according to [CAIP10](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-10.md)

Example:

```js
{
  "id": "did:lac1:4Kx9Qj58rAH7Cnhfx3sCWvc5qT65qtGfwXoYj4MnCsJBEHH4maNJBqAj8fzFDbhu7p2YR#GbinyzS1o2jhiS7vu8mqWyaobLGE8iatXuN8wyAXGVGM",
  "type": "EcdsaSecp256k1RecoveryMethod2020",
  "controller": "did:lac1:4Kx9Qj58rAH7Cnhfx3sCWvc5qT65qtGfwXoYj4MnCsJBEHH4maNJBqAj8fzFDbhu7p2YR",
  "blockchainAccountId": "eip155:648540:0x56dD32c6Bc704FE2eB73f821222Aa299DfA25740"
}
```

##### DID Document versions

Only events with a `validTo` (measured in seconds) greater or equal to the current time should be included in the DID document. It is also possible to know a DID Document where given a `versionTime` or `versionId` (specified the didURL query string)

##### id property for verification methods

- Attribute or delegate changes that result in verificationMethod entries MUST set the id `${did}#${vm-identifier}`.
- Attributes that result in service entries MUST set the id to `${did}#service-${service-identifier}`

`vm-identifier` and `service-identifier` are explained in this section.

Verification methods are added through the smart contract method `setAttribute`. Any verification method (except verification methods derived from onchain delegates) follows the structure:

```js
{
"id": "<did>#<vm-identifier>",
"type": "<type>",
"controller": "<did>",
"<publicKeyJwk>": "<key>"
}
```

Where:

- `did` is the `controller` string coming in `name` property ([according to this specification](./DIDAttributesServices.md#verification-methods)) of the `DIDAttributeChanged` smart contract log.
- vm-identifier is calculated as follows (algorithm intended to be used by did resolvers):
  - Convert `did` to utf-8 array: utf8_array_controller
  - Convert the the hex value coming from the retrieved `DIDAttributeChanged` `value` attribute bytes: value_array_value
  - concatenate both utf8_array_controller and value_array_value: concatenated_value
  - Compute the keccak256 digest of `concatenated_value`: digest
  - obtain the base58 representation of `digest`.
  - Note: vm-identifier can also be calculated from the parameters set in the [setAttribute](./DIDAttributesServices.md#saving-data-to-the-did-registry) smart contract method

Example: The following object represents a valid verification method.

```js
{
"id": "did:lac1:1iT5gtL8winNLChdgSEK57ZoV7H4qDXDUDoALVtNbfDXb3uaD4QTSExWZGrYfdbC4XvA#4LGkasnLfsqWNULhKT1yzz4i2mBQrmgeQB3McKM3x5Wt",
"type": "EcdsaSecp256k1RecoveryMethod2020",
"controller": "did:lac1:1iT5gtL8winNLChdgSEK57ZoV7H4qDXDUDoALVtNbfDXb3uaD4QTSExWZGrYfdbC4XvA",
"publicKeyJwk": {"crv":"P-256","kty":"EC","x":"EfMVtKPj-_7IxvUcgF0YxTtYNLmhALLtl_ikdu90wRk","y":"eAGxKVSJzSid9CJqt8lBBFzBRolOP8HafIYONWHUxTA"}
}
```

In this example `publicKeyJwk` represents the value of the attribute `value` corresponding to a particular `DIDAttributeChanged` log.

##### id property for verification methods derived from onchain delegates

For verification methods derived from onchain delegates, the structure is the following:

```js
{
"id": "<did>#<vm-identifier>",
"type": "EcdsaSecp256k1RecoveryMethod2020",
"controller": "<did>",
"blockchainAccountId": "eip155:<chainId>:<ethereum_account_address>"
}

```

In this case, the `id` property has the following structure: `${did}#${vm-identifier}`; where:

- `did` is the DID identifier coming from the request asking for the DID Document.
- vm-identifier is calculated as follows:
  - Convert `did` to utf-8 array: utf8_array_controller
  - Convert the the hex value coming from the retrieved `DIDDelegateChanged` `value` attribute bytes: value_array_value
  - concatenate both utf8_array_controller and value_array_value: concatenated_value
  - Compute the keccak256 digest of `concatenated_value`: digest
  - obtain the base58 representation of `digest`.
  - Note: vm-identifier can also be calculated from the parameters set in the [setAttribute](./DIDAttributesServices.md#saving-data-to-the-did-registry) smart contract method
- Note: Verification methods derived from onchain delegates will only support `blockchainAccountId` to express the blockchain key associated to the DID.

Example:

```js
{
"id": "did:lac1:1iT5gtL8winNLChdgSEK57ZoV7H4qDXDUDoALVtNbfDXb3uaD4QTSExWZGrYfdbC4XvA#GsvAUXzoBg1KLM1kvXkZxYsrBg6dYfMegWNmWftBJ2hv",
"type": "EcdsaSecp256k1RecoveryMethod2020",
"controller": "did:lac1:1iT5gtL8winNLChdgSEK57ZoV7H4qDXDUDoALVtNbfDXb3uaD4QTSExWZGrYfdbC4XvA",
"blockchainAccountId": "eip155:648540:0x95d7723676AE52E71281Bc6868A05dB843aD8410"
}

```

In this example `blockchainAccountId` represents the value of the attribute `value` corresponding to a particular `DIDDelegateChanged` log.

##### id property for services

For services, the structure is the following:

```js
{
"id": "<did>#<svc-identifier>",
"type": "<service_type>",
"serviceEndpoint": "<service_url>"
}
```

In this case, the `id` property has the following structure: `${did}#${svc-identifier}`; where:

- `did` is the DID identifier coming from the request asking for the DID Document.
- svc-identifier is calculated as follows:
  - Convert `type` string, coming in `name` property ([according to this specification](./DIDAttributesServices.md#verification-methods)) of the `DIDAttributeChanged`, to utf-8 array: utf8_array_type
  - Convert the the hex value coming from the retrieved `DIDAttributeChanged` `value` attribute bytes: value_array_value
  - concatenate both utf8_array_type and value_array_value: concatenated_value
  - Compute the keccak256 digest of `concatenated_value`: digest
  - obtain the base58 representation of `digest`.
  - Note: vm-identifier can also be calculated from the parameters set in the [setAttribute](./DIDAttributesServices.md#saving-data-to-the-did-registry) smart contract method

Example:

```js
{
  "id": "did:lac1:1iT5gtL8winNLChdgSEK57ZoV7H4qDXDUDoALVtNbfDXb3uaD4QTSExWZGrYfdbC4XvA#enpoh49epeEtzeq8TZbu7TatJrQEHmLtBfQZbrhYUci",
  "type": "LinkedDomains",
  "serviceEndpoint": "https://auth-svcs.com"
}
```

In this example `serviceEndpoint` represents the value of the attribute `value` corresponding to a particular `DIDAttributeChanged` log.

#### Update

The DID Document may be updated by invoking the relevant smart contract functions as defined by the [DID registry](./contracts/identity/didRegistry/DIDRegistry.sol). This includes changes to the account owner, adding delegates and adding additional attributes. Please find a detailed description in the [DID Registry Documentation](./DidRegistry.md)

These functions will trigger the respective Ethereum events which are used to build the DID Document for a given account as described in [Enumerating Contract Events](./DidSpecs.md#enumerating-contract-events-to-build-the-did-document) to build the DID Document.

#### Delete

To revoke a DID, the controller of the DID needs to be set to 0x0. Although, 0x0 is a valid Ethereum address, this will indicate the identity has no controller which is a common approach for invalidation.

```sh
deactivateAccount(address identity);
```

No more changes will be added to the DID Registry.

If the intention is to revoke all the signatures corresponding to the DID, this option MUST be used.

The DID resolution result for a deactivated DID has the following shape:

```js
{
  "didDocumentMetadata": {
    "deactivated": true
  },
  "didResolutionMetadata": {
    "contentType": "application/did+ld+json"
  },
  "didDocument": {
    "@context": "https://www.w3.org/ns/did/v1",
    "id": "<the deactivated DID>",
    "verificationMethod": [],
    "assertionMethod": [],
    "authentication": []
  }
}
```

### Associating multiple identifiers to a subject (alsoKnownAs)

A DID Document derived from `LAC1` may have more than one [alsoKnownAs property](https://www.w3.org/TR/did-core/#also-known-as). Such association requires passing to the method `addAKAIdentifier` a validity time for the linkage between the represented identity and the alsoKnownAs identifier.

```javascript
function addAKAIdentifier(
        address identity,
        string memory akaId,
        uint256 validity
    )
```

Removing a alsoKnownAs identifier from the subject is possible with the method `removeAKAIdentifier`

```javascript
function removeAKAIdentifier(
        address identity,
        string memory akaId
    )
```

### Disabling controllers

A DID "lac1" can be set to have no controllers. This way the DID is not longer updatable. This feature doesn't necessarily mean the DID is deactivated. Once a DID is moved to this state the DID cannot be deactivated.

### Security considerations of DID versioning

Applications MUST take precautions when using versioned DID URIs. If a key is compromised and revoked then it can still be used to issue signatures on behalf of the "older" DID URI. The use of versioned DID URIs is only recommended in some limited situations where the timestamp of signatures can also be verified, where malicious signatures can be easily revoked, and where applications can afford to check for these explicit revocations of either keys or signatures. Wherever versioned DIDs are in use, it SHOULD be made obvious to users that they are dealing with potentially revoked data.

### Metadata

The resolve method returns an object with the following properties: didDocument, didDocumentMetadata, didResolutionMetadata.

#### DID Document Metadata

When resolving a DID document that has had updates, the latest update MUST be listed in the didDocumentMetadata.

- versionId MUST be the block number of the latest update. This can be obtained from the `changed` state variable by passing the respective address.
- updated MUST be the ISO date string of the block time of the latest update (without sub-second resolution). In the `DIDAttributeChanged` and `DIDDelegateChanged` it is the `changeTime` attribute.
  Example:

```js
{
  "didDocumentMetadata": {
    "versionId": "12090175",
    "updated": "2021-03-22T18:14:29Z"
  }
}

```

### DID Resolution metadata

```js
{
  "didResolutionMetadata": {
    "contentType": "application/did+ld+json"
  }
}
```

### Resolving DID URIs with query parameters

#### _versionId_ query string parameter

This DID method supports resolving previous versions of the DID document by specifying a `versionId` parameter.

Example: did:lac1:1iT5jsMUTRkENt6WspMf5CGJNc9bUxt38urgGGxqaFhrLn4cmsC6XNddWb1pAUfonk33?versionId=12090175

The `versionId` is the block number at which the DID resolution MUST be performed. Only `DIDAttributeChanged` and `DIDDelegateChanged` events, from [DID Registry](./contracts/identity/didRegistry/DIDRegistry.sol) prior to or contained in this block number are to be considered when building the event history.

`updated` MUST be the ISO date string of the block time at which the DID resolution MUST be performed (without sub-second resolution). In the `DIDAttributeChanged` and `DIDDelegateChanged` it is the `changeTime` attribute.

If there are any events after that block that mutate the DID, the earliest of them SHOULD be used to populate the properties of the didDocumentMetadata:

- `nextVersionId` MUST be the block number of the next update to the DID document.
- `nextUpdate` MUST be the ISO date string of the block time of the next update (without sub-second resolution). In the `DIDAttributeChanged` and `DIDDelegateChanged` it is the `changeTime` attribute.

In case the DID has had updates prior to or included in the `versionId` block number, the `updated` and `versionId` properties of the didDocumentMetadata MUST correspond to the latest block prior to the versionId query string param.

Any timestamp comparisons of validTo fields of the event history MUST be done against the versionId block timestamp.

Example: ?versionId=12101682

```js
{
  "didDocumentMetadata": {
  "versionId": "12090175",
  "updated": "2021-03-22T18:14:29Z",
  "nextVersionId": "12276565",
  "nextUpdate": "2021-04-20T10:48:42Z"
  }
}
```

#### _versionTime_ query string parameter

This DID method supports resolving previous versions of the DID document by specifying a `versionTime` parameter.

Example: did:lac1:1iT5jsMUTRkENt6WspMf5CGJNc9bUxt38urgGGxqaFhrLn4cmsC6XNddWb1pAUfonk33?versionTime=2021-05-10T17:00:00Z

The `versionTime` is the **time related to a block number** at which the DID resolution MUST be performed. Only `DIDAttributeChanged` and `DIDDelegateChanged` events, from [DID Registry](./contracts/identity/didRegistry/DIDRegistry.sol) prior to or contained in that block number are to be considered when building the event history. `versionTime` parameter MUST be compared with the `changeTime` parameter in the mentioned events to filter the ones to be considered in the DID document.

`updated` MUST be the ISO date string of the block time at which the DID resolution MUST be performed (without sub-second resolution). In the `DIDAttributeChanged` and `DIDDelegateChanged` it is the `changeTime` attribute.

If there are any events after that block that mutate the DID, the earliest of them SHOULD be used to populate the properties of the didDocumentMetadata:

- `nextVersionId` MUST be the block number of the next update to the DID document.
- `nextUpdate` MUST be the ISO date string of the block time of the next update (without sub-second resolution). In the `DIDAttributeChanged` and `DIDDelegateChanged` it is the `changeTime` attribute.

In case the DID has had updates prior to or included in the block number correspondent to the mapped `versionTime`, the `updated` and `versionId` properties of the didDocumentMetadata MUST correspond to the latest block prior to the `versionTime` query string param.

Any timestamp comparisons of validTo fields of the event history MUST be done against the timestamp block number mapped from`versionTime` or otherwise the prior nearest block timestamp to `versionTime` where a change occurred.

Example: ?versionTime=2021-05-10T17:00:00Z

```js
{
  "didDocumentMetadata": {
  "versionId": "12090175",
  "updated": "2021-03-22T18:14:29Z",
  "nextVersionId": "12276565",
  "nextUpdate": "2021-06-20T10:48:42Z"
  }
}
```

#### _forTime_ query string parameter

Given a `forTime` query string it **defines a time window where all returned keys in the DID document were set to be valid since `forTime` up to the latest change**; in plain terms it returns all coincidences where `forTime =< validTo` for each event `DIDAttributeChanged` and `DIDDelegateChanged` from [DID Registry](./contracts/identity/didRegistry/DIDRegistry.sol)

For this case the `versionId` attribute is a **block range** starting from the minimum block number where events `DIDAttributeChanged` and `DIDDelegateChanged` (from [DID Registry](./contracts/identity/didRegistry/DIDRegistry.sol)) accomplish the condition `forTime =< validTo` up to the last block number where changes were made to the DID document.

`updated` MUST be the ISO date string of the block time at which the DID resolution MUST be performed (without sub-second resolution). In the `DIDAttributeChanged` and `DIDDelegateChanged` it is the `changeTime` attribute.

Since the returned DID document will always return the latest authorized keys starting from a certain time (`forTime`), params `nextVersionId` and `nextUpdate` are omitted.

Example: ?forTime=2021-05-10T17:00:00Z

```js
{
  "didDocumentMetadata": {
  "versionId": "11565924-12090175",
  "updated": "2022-03-22T18:14:29Z",
  }
}
```

### Reference Implementations

TBD
