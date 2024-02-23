import { expect } from "chai";
import { ethers, network, lacchain } from "hardhat";
import { BigNumber } from "ethers";
import {
  DIDRegistry,
  DIDRegistryGM,
  DIDRegistryRecoverableGM__factory,
  DIDRegistryRecoverable__factory,
} from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { GasModelSignerModified } from "../../GasModelModified";
import { defaultAbiCoder } from "ethers/lib/utils";

describe("Recovery", function () {
  async function getArtifact(
    signer: SignerWithAddress | GasModelSignerModified
  ): Promise<
    DIDRegistryRecoverable__factory | DIDRegistryRecoverableGM__factory
  > {
    let Artifact:
      | DIDRegistryRecoverable__factory
      | DIDRegistryRecoverableGM__factory;
    if (network.name !== "lacchain") {
      Artifact = await ethers.getContractFactory(
        "DIDRegistryRecoverable",
        signer
      );
    }
    Artifact = await ethers.getContractFactory(
      "DIDRegistryRecoverableGM",
      signer
    );
    return Artifact;
  }
  async function deployDidRegistryRecoverable() {
    let Artifact:
      | DIDRegistryRecoverable__factory
      | DIDRegistryRecoverableGM__factory;
    let didRegistry: DIDRegistry | DIDRegistryGM;
    let owner,
      account1,
      account2,
      account3: SignerWithAddress | GasModelSignerModified;
    const keyRotationTime = 3600;
    const maxAttempts = 2;
    const minimumNumberOfControllers = 3;
    const resetSeconds = 10;
    if (network.name !== "lacchain") {
      [owner, account1, account2, account3] = await ethers.getSigners();
      Artifact = await ethers.getContractFactory(
        "DIDRegistryRecoverable",
        owner
      );
      didRegistry = await Artifact.deploy(
        keyRotationTime,
        maxAttempts,
        minimumNumberOfControllers,
        resetSeconds
      );
    } else {
      [owner, account1, account2, account3] = lacchain.getSigners();
      Artifact = await ethers.getContractFactory(
        "DIDRegistryRecoverableGM",
        owner
      );
      const instance = await lacchain.deployContract(
        Artifact,
        keyRotationTime,
        maxAttempts,
        minimumNumberOfControllers,
        resetSeconds,
        lacchain.baseRelayAddress
      );
      didRegistry = Artifact.attach(instance.address);
    }

    return {
      didRegistry,
      owner,
      account1,
      account2,
      account3,
      Artifact,
    };
  }

  it("Should have the minimum controllers as set on contract deployment", async function () {
    const { didRegistry, account1, account2 } =
      await deployDidRegistryRecoverable();
    const didRegFromAcct1 = (await getArtifact(account1)).attach(
      didRegistry.address
    );
    await didRegFromAcct1.addController(account1.address, account2.address);

    const specificNonce = await didRegistry.nonce(account2.address);
    const encodedMessage = getEncodedMessageToRecover(
      account1.address,
      didRegistry.address,
      specificNonce,
      account2
    );
    const signedMessage = await account2.signMessage(encodedMessage);
    const { v, r, s } = ethers.utils.splitSignature(signedMessage);
    if (network.name !== "lacchain") {
      await expect(
        didRegFromAcct1.recover(account1.address, v, r, s, account2.address)
      ).to.be.revertedWith("Identity must have the minimum of controllers");
    } else {
      try {
        await didRegFromAcct1.recover(
          account1.address,
          v,
          r,
          s,
          account2.address
        );
        throw new Error("Workaround ...");
      } catch (e) {}
    }
  });
  function getEncodedMessageToRecover(
    identity: string,
    didRegistryAddress: string,
    specificNonce: BigNumber,
    signer: SignerWithAddress | GasModelSignerModified
  ): string {
    return defaultAbiCoder.encode(
      [
        "bytes1",
        "bytes1",
        "address",
        "uint256",
        "address",
        "string",
        "address",
      ],
      [
        0x19,
        0x1,
        didRegistryAddress,
        specificNonce,
        identity,
        "recover",
        signer.address,
      ]
    );
  }
});
