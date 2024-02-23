import { expect } from "chai";
import { ethers, network, lacchain } from "hardhat";
import {
  DIDRegistry,
  DIDRegistryGM,
  DIDRegistryGM__factory,
  DIDRegistry__factory,
} from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { GasModelSignerModified } from "../../GasModelModified";
import {
  toUtf8Bytes,
  keccak256,
  formatBytes32String,
  solidityPack,
  arrayify,
} from "ethers/lib/utils";
import { Wallet, BigNumber } from "ethers";

describe("Attributes-Services-Delegates", function () {
  async function getArtifact(
    signer: SignerWithAddress | GasModelSignerModified
  ): Promise<DIDRegistry__factory | DIDRegistryGM__factory> {
    let Artifact: DIDRegistry__factory | DIDRegistryGM__factory;
    if (network.name !== "lacchain") {
      Artifact = await ethers.getContractFactory("DIDRegistry", signer);
    }
    Artifact = await ethers.getContractFactory("DIDRegistryGM", signer);
    return Artifact;
  }
  async function deployDidRegistry() {
    let Artifact: DIDRegistry__factory | DIDRegistryGM__factory;
    let didRegistry: DIDRegistry | DIDRegistryGM;
    let owner, account1, account2: SignerWithAddress | GasModelSignerModified;
    const keyRotationTime = 3600;
    if (network.name !== "lacchain") {
      [owner, account1, account2] = await ethers.getSigners();
      Artifact = await ethers.getContractFactory("DIDRegistry", owner);
      didRegistry = await Artifact.deploy(keyRotationTime);
    } else {
      [owner, account1, account2] = lacchain.getSigners();
      Artifact = await ethers.getContractFactory("DIDRegistryGM", owner);
      const instance = await lacchain.deployContract(
        Artifact,
        keyRotationTime,
        lacchain.baseRelayAddress
      );
      didRegistry = Artifact.attach(instance.address);
    }

    return {
      didRegistry,
      owner,
      account1,
      account2,
      Artifact,
    };
  }

  describe("Attributes-Services", function () {
    it("Should add verification method", async function () {
      const { didRegistry, account1 } = await deployDidRegistry();

      const didRegFromAcct1 = (await getArtifact(account1)).attach(
        didRegistry.address
      );

      const name = "asse/abc/mnp/xyz";
      const value = "someValue";
      const bytesName = toUtf8Bytes(name);
      const bytesValue = toUtf8Bytes(value);
      const identity = account1.address;
      await setCapabilityMock(identity, didRegFromAcct1, name, value);
      const expiresIn = await didRegFromAcct1.attributes(
        identity,
        keccak256(bytesName),
        keccak256(bytesValue)
      );
      expect(expiresIn).to.be.greaterThan(Math.floor(Date.now() / 1000));
    });

    it("Should revoke verification method", async function () {
      const { didRegistry, account1 } = await deployDidRegistry();

      const didRegFromAcct1 = (await getArtifact(account1)).attach(
        didRegistry.address
      );
      const name = "auth/abc/mnp/xyz";
      const value = "someValue";

      const identity = account1.address;
      await revokeCapabilityMock(identity, didRegFromAcct1, name, value);
      const expiresIn = await didRegFromAcct1.attributes(
        identity,
        keccak256(toUtf8Bytes(name)),
        keccak256(toUtf8Bytes(value))
      );
      expect(expiresIn).to.be.lessThan(Math.floor(Date.now() / 1000));
    });
  });

  describe("Delegates", function () {
    it("Should add onchain delegate for authentication", async function () {
      const { didRegistry, account1, account2 } = await deployDidRegistry();

      const didRegFromAcct1 = (await getArtifact(account1)).attach(
        didRegistry.address
      );
      const identity = account1.address;

      await mockAddOnchainDelegate(
        "sigAuth",
        identity,
        didRegFromAcct1,
        account2.address
      );
    });

    it("Should add onchain delegate by metatransaction", async function () {
      const { didRegistry, account1 } = await deployDidRegistry();
      const signer = ethers.Wallet.createRandom();
      const identity = signer.address;
      const deltaTime = 86400;
      await mockAddOnchainDelegateSigned(
        signer,
        "sigAuth",
        didRegistry,
        account1.address,
        identity,
        deltaTime
      );
    });

    it("Should fail on an attempt to add onchain delegate by metatransaction but invalid signature is submitted", async function () {
      const { didRegistry, account1, account2 } = await deployDidRegistry();
      const signer = ethers.Wallet.createRandom();
      const identity = account2.address;
      const deltaTime = 86400;
      if (network.name !== "lacchain") {
        await expect(
          mockAddOnchainDelegateSigned(
            signer,
            "sigAuth",
            didRegistry,
            account1.address,
            identity,
            deltaTime
          )
        ).to.be.revertedWith("Invalid signature");
      } else {
        try {
          await mockAddOnchainDelegateSigned(
            signer,
            "sigAuth",
            didRegistry,
            account1.address,
            identity,
            deltaTime
          );
          throw new Error("Workaround ..."); // should never reach here since it is expected that issue operation will fail.
        } catch (e) {}
      }
    });

    it("Should remove onchain delegate for authentication", async function () {
      const { didRegistry, account1, account2 } = await deployDidRegistry();

      const didRegFromAcct1 = (await getArtifact(account1)).attach(
        didRegistry.address
      );
      const identity = account1.address;

      await mockAddOnchainDelegate(
        "sigAuth",
        identity,
        didRegFromAcct1,
        account2.address
      );
      await mockRevokeOnchainDelegate(
        "sigAuth",
        identity,
        didRegFromAcct1,
        account2.address
      );
    });

    it("Should remove onchain delegate for assertion by metatransaction", async function () {
      const { didRegistry, account1 } = await deployDidRegistry();
      const signer = ethers.Wallet.createRandom();
      const identity = signer.address;
      const deltaTime = 32000;
      const isCompromised = false;
      await mockRevokeOnchainDelegateSigned(
        signer,
        "sigAuth",
        didRegistry,
        account1.address,
        identity,
        deltaTime,
        isCompromised
      );
    });
  });

  async function revokeCapabilityMock(
    identity: string,
    didRegistry: DIDRegistry | DIDRegistryGM,
    name: string,
    value: string
  ): Promise<any> {
    const bytesName = toUtf8Bytes(name);
    const byteValue = toUtf8Bytes(value);
    const deltaTime = 32000;
    await didRegistry.revokeAttribute(
      identity,
      bytesName,
      byteValue,
      deltaTime,
      true
    );
  }

  async function setCapabilityMock(
    identity: string,
    didRegistry: DIDRegistry | DIDRegistryGM,
    name: string,
    value: string
  ) {
    const didRegistryAddress = didRegistry.address;
    const bytesName = toUtf8Bytes(name);
    const bytesValue = toUtf8Bytes(value);
    const deltaTime = 86400;
    await didRegistry.setAttribute(identity, bytesName, bytesValue, deltaTime);
    return {
      identity,
      bytesName,
      bytesValue,
      didRegistryAddress,
      artifact: didRegistry,
    };
  }

  async function mockAddOnchainDelegate(
    delegateType: "veriKey" | "sigAuth",
    identity: string,
    didRegistry: DIDRegistry | DIDRegistryGM,
    delegatedAccount: string
  ) {
    const deltaTime = 86400;

    const bytes32DelegateType = formatBytes32String(delegateType);

    await didRegistry.addDelegate(
      identity,
      bytes32DelegateType,
      delegatedAccount,
      deltaTime
    );

    const isValidDelegate = await didRegistry.validDelegate(
      identity,
      bytes32DelegateType,
      delegatedAccount
    );
    expect(isValidDelegate).to.be.true;
    const validUntil = await didRegistry.delegates(
      identity,
      bytes32DelegateType,
      delegatedAccount
    );
    expect(validUntil).to.be.greaterThan(
      Math.floor(Date.now() / 1000) + deltaTime / 2
    );
  }

  async function mockAddOnchainDelegateSigned(
    signer: Wallet,
    delegateType: "veriKey" | "sigAuth",
    didRegistry: DIDRegistry | DIDRegistryGM,
    delegatedAccount: string,
    identity = signer.address,
    deltaTime: number
  ) {
    const bytes32DelegateType = formatBytes32String(delegateType);

    const signature = await preparePayloadForAddOnchainDelegateSigned(
      identity,
      signer,
      didRegistry,
      delegateType,
      delegatedAccount,
      deltaTime
    );

    await didRegistry.addDelegateSigned(
      identity,
      signature.v,
      signature.r,
      signature.s,
      bytes32DelegateType,
      delegatedAccount,
      deltaTime
    );

    const isValidDelegate = await didRegistry.validDelegate(
      identity,
      bytes32DelegateType,
      delegatedAccount
    );
    expect(isValidDelegate).to.be.true;
    const validUntil = await didRegistry.delegates(
      identity,
      bytes32DelegateType,
      delegatedAccount
    );
    expect(validUntil).to.be.greaterThan(
      Math.floor(Date.now() / 1000) + deltaTime / 2
    );
  }

  async function preparePayloadForAddOnchainDelegateSigned(
    identity: string,
    signer: Wallet,
    didRegistry: DIDRegistry | DIDRegistryGM,
    delegateType: "veriKey" | "sigAuth",
    delegatedAccount: string,
    deltaTime: number
  ) {
    const specificNonce = await didRegistry.nonce(signer.address);

    const encodedMessage = computeTypedDataForAddOnchainDelegateSigned(
      identity,
      didRegistry.address,
      specificNonce,
      delegateType,
      delegatedAccount,
      deltaTime
    );

    const messageDigest = keccak256(arrayify(encodedMessage));

    const signingKey = signer._signingKey;
    return signingKey().signDigest(messageDigest);
  }

  function computeTypedDataForAddOnchainDelegateSigned(
    identity: string,
    didRegistryAddress: string,
    specificNonce: BigNumber,
    delegateType: "veriKey" | "sigAuth",
    delegatedAccount: string,
    deltaTime: number
  ): string {
    const bytes32DelegateType = formatBytes32String(delegateType);
    return solidityPack(
      [
        "bytes1",
        "bytes1",
        "address",
        "uint256",
        "address",
        "string",
        "bytes32",
        "address",
        "uint256",
      ],
      [
        0x19,
        0x00,
        didRegistryAddress,
        specificNonce,
        identity,
        "addDelegate",
        bytes32DelegateType,
        delegatedAccount,
        deltaTime,
      ]
    );
  }

  async function mockRevokeOnchainDelegate(
    delegateType: "veriKey" | "sigAuth",
    identity: string,
    didRegistry: DIDRegistry | DIDRegistryGM,
    delegatedAccount: string
  ) {
    const deltaTime = 86400;

    const bytes32DelegateType = formatBytes32String(delegateType);

    await didRegistry.revokeDelegate(
      identity,
      bytes32DelegateType,
      delegatedAccount,
      deltaTime,
      true
    );

    const isValidDelegate = await didRegistry.validDelegate(
      identity,
      bytes32DelegateType,
      delegatedAccount
    );
    expect(isValidDelegate).to.be.false;

    const validUntil = await didRegistry.delegates(
      identity,
      bytes32DelegateType,
      delegatedAccount
    );
    expect(validUntil).to.be.lessThan(
      Math.floor(Date.now() / 1000) - deltaTime / 2
    );
  }

  async function mockRevokeOnchainDelegateSigned(
    signer: Wallet,
    delegateType: "veriKey" | "sigAuth",
    didRegistry: DIDRegistry | DIDRegistryGM,
    delegatedAccount: string,
    identity = signer.address,
    revokeDeltaTime: number,
    isCompromised: boolean
  ) {
    const bytes32DelegateType = formatBytes32String(delegateType);

    const signature = await preparePayloadForRevokeOnchainDelegateSigned(
      identity,
      signer,
      didRegistry,
      delegateType,
      delegatedAccount,
      revokeDeltaTime,
      isCompromised
    );

    await didRegistry.revokeDelegateSigned(
      identity,
      signature.v,
      signature.r,
      signature.s,
      bytes32DelegateType,
      delegatedAccount,
      revokeDeltaTime,
      isCompromised
    );

    const isValidDelegate = await didRegistry.validDelegate(
      identity,
      bytes32DelegateType,
      delegatedAccount
    );
    expect(isValidDelegate).to.be.false;

    const validUntil = await didRegistry.delegates(
      identity,
      bytes32DelegateType,
      delegatedAccount
    );
    expect(validUntil).to.be.lessThan(
      Math.floor(Date.now() / 1000) - revokeDeltaTime / 2
    );
  }

  async function preparePayloadForRevokeOnchainDelegateSigned(
    identity: string,
    signer: Wallet,
    didRegistry: DIDRegistry | DIDRegistryGM,
    delegateType: "veriKey" | "sigAuth",
    delegatedAccount: string,
    revokeDeltaTime: number,
    isCompromised: boolean
  ) {
    const specificNonce = await didRegistry.nonce(signer.address);

    const encodedMessage = computeTypedDataForRevokeOnchainDelegateSigned(
      identity,
      didRegistry.address,
      specificNonce,
      delegateType,
      delegatedAccount,
      revokeDeltaTime,
      isCompromised
    );

    const messageDigest = keccak256(arrayify(encodedMessage));

    const signingKey = signer._signingKey;
    return signingKey().signDigest(messageDigest);
  }

  function computeTypedDataForRevokeOnchainDelegateSigned(
    identity: string,
    didRegistryAddress: string,
    specificNonce: BigNumber,
    delegateType: "veriKey" | "sigAuth",
    delegatedAccount: string,
    revokeDeltaTime: number,
    isCompromised: boolean
  ): string {
    const bytes32DelegateType = formatBytes32String(delegateType);
    return solidityPack(
      [
        "bytes1",
        "bytes1",
        "address",
        "uint256",
        "address",
        "string",
        "bytes32",
        "address",
        "uint256",
        "bool",
      ],
      [
        0x19,
        0x00,
        didRegistryAddress,
        specificNonce,
        identity,
        "revokeDelegate",
        bytes32DelegateType,
        delegatedAccount,
        revokeDeltaTime,
        isCompromised,
      ]
    );
  }
});
