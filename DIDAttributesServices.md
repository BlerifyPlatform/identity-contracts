## Verification Methods

The name of the attribute added should follow this format:
`{type}/{controller}/{algorithm}/{encoding}`

Where `{type}` can be:

- **vm**: for a generic Verification Method
- **auth**: for an Authentication Method
- **asse**: for an Assertion Purpose
- **keya**: for a Key Agreement
- **dele**: for a Delegation Key
- **invo**: for an Invocation Capability Key
- **svc**: for a Service

The `{controller}` represents the Verification Method controller, and can be any string DID or DID fragment.

The `{algorithm}` can be one of the following in compliance with the W3C specification https://w3c.github.io/did-spec-registries/:

- **jwk**: JsonWebKey2020,
- **esecp256k1vk**: EcdsaSecp256k1VerificationKey2019,
- **esecp256k1rm**: EcdsaSecp256k1RecoveryMethod2020,
- **edd25519vk**: Ed25519VerificationKey2018,
- **gpgvk**: GpgVerificationKey2020,
- **rsavk**: RsaVerificationKey2018,
- **x25519ka**: X25519KeyAgreementKey2019,
- **ssecp256k1vk**: SchnorrSecp256k1VerificationKey2019

And the `{encoding}` is the Public Key encoding type, the possible values are:

- **hex**: Hexadecimal -> Produces publicKeyHex field in the DID Document
- **base64**: Base64 -> Produces publicKeyBase64 field in the DID Document
- **base58**: Base58 -> Produces publicKeyBase58 field in the DID Document
- **pem**: PEM X.509 -> Produces publicKeyPem field in the DID Document
- **json**: JSON -> Produces a Json Web Key field in the DID Document

> **Note:** The `{encoding}` only refers to the key encoding in the resolved DID document.
> Attribute values sent to the smart contract registry should always be hex encodings of the raw public key data.

## Service Endpoints

The name of the attribute should follow this format:

`svc//{type}/hex`

Where: `{type}` is the service type field in the DID Document.

And, the `serviceEndpoint` must be in the `value` field of `setAttribute` function.
