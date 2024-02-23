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
import { toUtf8Bytes, keccak256, formatBytes32String } from "ethers/lib/utils";

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
});
