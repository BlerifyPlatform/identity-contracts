# did:lac1 method

### Author

- LACChain

### Introduction

In compliance with the [W3C did core specs](https://www.w3.org/TR/did-core/) this Did method Specification allows to resolve a `DID Document` starting from an instance of the proposed DID (Decentralized Identifier).

We propose a new DID method based on [ethr did method](https://github.com/decentralized-identity/ethr-did-resolver/blob/master/doc/did-method-spec.md) and the [LAC did method](https://github.com/lacchain/lacchain-did-registry/blob/master/DID_SPEC.md). The values added in the proposed did method are the capability to encode the exact path, in the DID, to resolve the underlying did registry. Secondly, the resolved did document allows to specify a time in the past from which the attribute being revoked stops being valid, additionally the underlying did registry shows transparency by giving anyone the ability to verify every change in regards to that attribute.

### Abstract

The following DID method inherits from ethr the creation of off-chain DIDs, but different from that specification we also encode the on-chain DID registry as well as other relevant params as part of the final DID identifier. Any Ethereum contract account or any ethereum externally Owned Account can be a valid param to comprise a valid DID identifier. Such an identifier doesn't need to be registered on any registry. If attributes or services need to be registered those can be added to the instance of [did registry](./contracts/identity/didRegistry/DIDRegistry.sol) obtained after decoding the DID.

The account abstraction as proposed by the ethr underlying ERC1056 standard is also inherited so any account can delegate the transaction sending to a third party account.

### Identifier Controller

Each identifier can be controlled by just one ethereum address which can be either an externally owned account or a contract account.

### Target System

The target system is the one where the DID registry is deployed. In general it can be any EVM compatible network.

### Additional Advantages to ethr and lac DID methods

- backwads revocation time support
- ability to directly resolve the DID registry from the DID
- ability to handle improvements while maintaining backwards compatibility

### DID Method Name

- The method name for the proposed DID registry is "lac1"

### Specific identifier definition

Let us assume the DID is `did:lac1":base58-specific-identifier`, then the `base58-specific-identifier` is defined as follows:

```sh
did = "did:lac1":base58-specific-identifier
base58-specific-identifier = base58(specific-identifier-bytes)

specific-identifier-bytes = payload.push(checksum)
checksum = hashFunction(payload)[0:4] # first 4 bytes of checksum
palyload = Array.concat(<did-version-bytes>, <did-type-bytes>, <data-buffer-bytes>)
```

Where:

- `did-type-bytes` - (2 bytes) - represents the transformation to bytes of the `did-type-hex`
- `did-version-bytes` - (2 bytes) - represents the transformation to bytes of `did-version-hex`

Note that `data-buffer-bytes` is variable depending on the `did-version-bytes` and `did-type-bytes`.

For example when `did-version-hex` is `0x0001` (in bytes -> <00 01>) and `did-type-hex` is `0x0001` (in bytes -> <00 01>) the `data-buffer-bytes` is defined as [follows](./type-version/0001-0001.md)

Having the capability to define different types and different versions allows to better handle any improvements while also maintaining backwards compatibility.

### Underlying DID Registry

[DID registry](./contracts/identity/didRegistry/DIDRegistry.sol)

### CRUD Operation Definitions

#### Create

As long as you have all the required inputs the DID creation process will not require any transaction to the underlying ethereum based network. For example for type ["0001" and version "0001"](./type-version/0001-0001.md) the creation will consist of the following operations as mentioned in its `create` section

A sucessful create operation will render a value like `did:lac1:1iT4aTtv4iMBEvQMtdXtWwK4R3r55paDyDywrGXGUZ4EdeCgkBb4mh1EAHrzY1KwKBia` where initially the DID Document will look like:

```sh
{
  "@context": "https://www.w3.org/ns/did/v1",
  "id": "did:lac1:1iT4Zoku28ehvub6qrZtEp8VTCmqAjxqU5wFUBz4qCDyR8RkTa8uPdNc1MfAV7fSLd7i",
  "controller": "did:lac1:1iT4Zoku28ehvub6qrZtEp8VTCmqAjxqU5wFUBz4qCDyR8RkTa8uPdNc1MfAV7fSLd7i",
  "verificationMethod": [],
  "authentication": [],
  "assertionMethod": [],
  "keyAgreement": [],
  "capabilityInvocation": [],
  "capabilityDelegation": []
}
```

#### Read

To construct a valid DID document, first find all changes in history for an identity:

1. perform an eth_call to changed(address identity) on the [DID Registry smart contract](./contracts/identity/didRegistry/DIDRegistry.sol) to get the latst block where a change occurred.
2. If result is zero return.
3. For the given block, filter events where

   - signature `DIDAttributeChanged` (for attributes)

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

   - and `DIDDelegateChanged` (for onchain delegates)

   ```js
       event DIDDelegateChanged(
           address indexed identity,
           bytes32 delegateType,
           address delegate,
           uint validTo,
           uint changeTime,
           uint previousChange,
           bool reason
       );
   ```

4. In any case if `DIDAttributeChanged` or `DIDDelegateChanged` has the attribute `previousChange` different to zero then go back to step 3 where block=<value of previousChange>
5. After building the history of events for an address, interpret each event to build the DID document given the following:

##### Attributes (DIDAttributeChanged)

While any attribute can be emited in the `DIDAttributeChanged`, for the DID document we currently support adding to each of these sections of the DID
document:

- [Verification Methods](./DIDAttributesServices.md#verification-methods)
- [Service Endpoints](./DIDAttributesServices.md#service-endpoints)

##### Delegate Keys (DIDDelegateChanged)

Delegate keys are Ethereum addresses that can either be general signing keys or optionally also perform authentication.

They are also verifiable from Solidity (on-chain).

When a delegate is added or revoked, a `DIDDelegateChanged` event is published which MUST be used to update the DID document.

The only 2 delegateTypes that are currently published in the DID document are:

**veriKey** which adds a EcdsaSecp256k1RecoveryMethod2020 to the verificationMethod section of the DID document with the blockchainAccountId(ethereumAddress) of the delegate, and adds a reference to it in the assertionMethod section.

**sigAuth** which adds a EcdsaSecp256k1RecoveryMethod2020 to the verificationMethod section of document and a reference to it in the authentication section.

_Note_ the delegateType is a bytes32 type.

Valid on-chain delegates MUST be added to the verificationMethod array as EcdsaSecp256k1RecoveryMethod2020 entries, with the delegate address listed in the blockchainAccountId property and prefixed with eip155:<chainId>:, according to CAIP10

Example:

```js
{
"id": "did:lac1:1iT5jsMUTRkENt6WspMf5CGJNc9bUxt38urgGGxqaFhrLn4cmsC6XNddWb1pAUfonk33#vm-1",
"type": "EcdsaSecp256k1RecoveryMethod2020",
"controller": "did:lac1:1iT5jsMUTRkENt6WspMf5CGJNc9bUxt38urgGGxqaFhrLn4cmsC6XNddWb1pAUfonk33",
"blockchainAccountId": "eip155:648540:0x95d7723676AE52E71281Bc6868A05dB843aD8410"
}

```

##### DID Document versions

Only events with a `validTo` (measured in seconds) greater or equal to the current time should be included in the DID document. It is also possible to know a DID Document where given a `versionTime` (specified the didURL query string) the resolution yields **all keys configured valid _since_ that time**; in such case the `validTo` entry MUST be greater or equal than `versionTime`.

##### id properties of entries

- Attribute or delegate changes that result in verificationMethod entries MUST set the id ${did}#vm-${eventIndex}.
- Attributes that result in service entries MUST set the id to ${did}#service-${eventIndex}

where eventIndex is the index of the event that modifies that section of the DID document.

Example

- add key => #vm-1 is added
- add another key => #vm-2 is added
- add delegate => #vm-3 is added
- add service => #service-1 ia added
- revoke first key => #vm-1 gets removed from the DID document; #vm-2 and #delegte-3 remain.
- add another delegate => #vm-5 is added (earlier revocation is counted as an event)
- first delegate expires => vm-3 is removed, #vm-5 remains intact

#### Update

The DID Document may be updated by invoking the relevant smart contract functions as defined by the [DID registry](./contracts/identity/didRegistry/DIDRegistry.sol). This includes changes to the account owner, adding delegates and adding additional attributes. Please find a detailed description in the [DID Registry Documentation](./DidRegistry.md)

These functions will trigger the respective Ethereum events which are used to build the DID Document for a given account as described in Enumerating Contract Events to build the DID Document.

**Note**: Extending the validity of some attribute/delegate in the DID Registry will create a new input in the DID Document.

#### Delete

To revoke a DID, the controller of the DID needs to be set to 0x0. Although, 0x0 is a valid Ethereum address, this will indicate the identity has no controller which is a common approach for invalidation.

```sh
changeController(address identity, '0x0');
```

If there is any other changes to the DID document after such a change, all preexisting keys and services will be considered revoked.

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

### Security considerations of DID versioning

Applications MUST take precautions when using versioned DID URIs. If a key is compromised and revoked then it can still be used to issue signatures on behalf of the "older" DID URI. The use of versioned DID URIs is only recommended in some limited situations where the timestamp of signatures can also be verified, where malicious signatures can be easily revoked, and where applications can afford to check for these explicit revocations of either keys or signatures. Wherever versioned DIDs are in use, it SHOULD be made obvious to users that they are dealing with potentially revoked data.

### Reference Implementations

TBD
