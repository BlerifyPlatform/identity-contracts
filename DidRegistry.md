# Did Registry

Did-Registry stack of contracts are based on [Lacchain did registry](https://github.com/lacchain/lacchain-did-registry/tree/master).

## Terminology

## Base Considerations

- Contracts consider versioning; this helps to better handle changes and improvements in case the logic changes.
- Closer to ERC-1056 this contract considers:
  - onchain delegates
- Additionally a flag was added on revocations that indicates whether the attribute/delegate was removed because of compromission or because of a planned change.

## Smart Contract Considerations

- Additionally, on managing attributes it registers the attributes in a double mapping which allows to query the validity of these attributes by querying the smart contract state of the did registry
- Considers lacchain gas model by extending the BaseRelayRecipient contract and passing the base relay address as a param to the constructor.

## Smart contracts

- [DidRegistry](../../contracts/identity/didRegistry/DIDRegistry.sol)
- [DidRegistry Recoverable](../../contracts/identity/didRegistry/DIDRegistryRecoverable.sol)

The same as above, but with Gas Model support:

- [DidRegistry](../../contracts/identity/didRegistryGasModel/DIDRegistry.sol)
- [DidRegistry Recoverable](../../contracts/identity/didRegistryGasModel/DIDRegistryRecoverable.sol)

## Smart contracts Methods and Emmitted events

- [Did Registry](../../contracts/identity/IDIDRegistry.sol)
