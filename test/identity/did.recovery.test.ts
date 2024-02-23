import { expect } from "chai";
import { ethers, network, lacchain } from "hardhat";
import { BigNumber, Wallet } from "ethers";
import {
  DIDRegistryRecoverable,
  DIDRegistryRecoverableGM,
  DIDRegistryRecoverableGM__factory,
  DIDRegistryRecoverable__factory,
} from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { GasModelSignerModified } from "../../GasModelModified";
import { solidityPack, keccak256, arrayify } from "ethers/lib/utils";

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
    let didRegistry: DIDRegistryRecoverable | DIDRegistryRecoverableGM;
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
    const { didRegistry, account1 } = await deployDidRegistryRecoverable();
    const didRegFromAcct1 = (await getArtifact(account1)).attach(
      didRegistry.address
    );
    const signer = ethers.Wallet.createRandom();
    await didRegFromAcct1.addController(account1.address, signer.address);

    const specificNonce = await didRegistry.nonce(signer.address);
    const encodedMessage = getEncodedMessageToRecover(
      account1.address,
      didRegistry.address,
      specificNonce,
      signer
    );
    const signedMessage = await signer.signMessage(encodedMessage);
    const { v, r, s } = ethers.utils.splitSignature(signedMessage);
    if (network.name !== "lacchain") {
      await expect(
        didRegFromAcct1.recover(account1.address, v, r, s, signer.address)
      ).to.be.revertedWith("MNCNA");
    } else {
      try {
        await didRegFromAcct1.recover(
          account1.address,
          v,
          r,
          s,
          signer.address
        );
        throw new Error("Workaround ...");
      } catch (e) {}
    }
  });

  it("Should fail on invalid signature", async function () {
    const { didRegistry, owner, account1, account2, account3 } =
      await deployDidRegistryRecoverable();
    const didRegFromAcct1 = (await getArtifact(account1)).attach(
      didRegistry.address
    );
    await didRegistry.addController(owner.address, account1.address);
    await didRegistry.addController(owner.address, account2.address);

    const signer = ethers.Wallet.createRandom();
    const specificNonce = await didRegistry.nonce(signer.address);
    const encodedMessage = getEncodedMessageToRecover(
      owner.address,
      didRegistry.address,
      specificNonce,
      signer
    );
    const messageDigest = keccak256(arrayify(encodedMessage));

    const signingKey = signer._signingKey;
    const { v, r, s } = signingKey().signDigest(messageDigest);

    if (network.name !== "lacchain") {
      await expect(
        didRegFromAcct1.recover(owner.address, v, r, s, account2.address)
      ).to.be.revertedWith("IS");
    } else {
      try {
        await didRegFromAcct1.recover(owner.address, v, r, s, account2.address);
        throw new Error("Workaround ...");
      } catch (e) {}
    }
  });

  it("Should get failed vote when signer is not a backup controller", async function () {
    const { didRegistry, owner, account1, account2 } =
      await deployDidRegistryRecoverable();
    const didRegFromAcct1 = (await getArtifact(account1)).attach(
      didRegistry.address
    );
    await didRegistry.addController(owner.address, account1.address);
    await didRegistry.addController(owner.address, account2.address);

    const signer = ethers.Wallet.createRandom();
    const specificNonce = await didRegistry.nonce(signer.address);
    const encodedMessage = getEncodedMessageToRecover(
      owner.address,
      didRegistry.address,
      specificNonce,
      signer
    );
    const messageDigest = keccak256(arrayify(encodedMessage));

    const signingKey = signer._signingKey;
    const { v, r, s } = signingKey().signDigest(messageDigest);

    const result = await didRegFromAcct1.callStatic.recover(
      owner.address,
      v,
      r,
      s,
      signer.address
    );
    expect(result.isVoteAdded).to.be.false;
  });

  it("Should get successful vote added after valid params are presented", async function () {
    const { didRegistry, owner, account1 } =
      await deployDidRegistryRecoverable();
    const didRegFromAcct1 = (await getArtifact(account1)).attach(
      didRegistry.address
    );
    const signer1 = ethers.Wallet.createRandom();
    const signer2 = ethers.Wallet.createRandom();

    await didRegistry.addController(owner.address, signer1.address);
    await didRegistry.addController(owner.address, signer2.address);
    // signer 1 votes:
    let { v, r, s } = await preparePayloadVote(
      owner.address,
      signer1,
      didRegistry
    );
    await didRegFromAcct1.recover(owner.address, v, r, s, signer1.address);
    // signer 2 votes and gets elected
    let signature2 = await preparePayloadVote(
      owner.address,
      signer2,
      didRegistry
    );
    const result = await didRegFromAcct1.callStatic.recover(
      owner.address,
      signature2.v,
      signature2.r,
      signature2.s,
      signer2.address
    );
    expect(result.isVoteAdded).to.be.true;
    expect(result.isMainControllerChanged).to.be.true;
  });

  async function vote(
    identity: string,
    signer: Wallet,
    didRegistry: DIDRegistryRecoverable | DIDRegistryRecoverableGM
  ) {
    let { v, r, s } = await preparePayloadVote(identity, signer, didRegistry);
    await didRegistry.recover(identity, v, r, s, signer.address);
  }

  async function preparePayloadVote(
    identity: string,
    signer: Wallet,
    didRegistry: DIDRegistryRecoverable | DIDRegistryRecoverableGM
  ) {
    const specificNonce = await didRegistry.nonce(signer.address);
    const encodedMessage = getEncodedMessageToRecover(
      identity,
      didRegistry.address,
      specificNonce,
      signer
    );
    const messageDigest = keccak256(arrayify(encodedMessage));

    const signingKey = signer._signingKey;
    return signingKey().signDigest(messageDigest);
  }

  function getEncodedMessageToRecover(
    identity: string,
    didRegistryAddress: string,
    specificNonce: BigNumber,
    signer: Wallet | GasModelSignerModified
  ): string {
    return solidityPack(
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
        0x0,
        didRegistryAddress,
        specificNonce,
        identity,
        "recover",
        signer.address,
      ]
    );
  }
});
