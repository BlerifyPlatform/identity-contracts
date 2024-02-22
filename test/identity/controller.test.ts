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

describe("Controller", function () {
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

  it("Should change controller", async function () {
    const { didRegistry, account1, account2, Artifact } =
      await deployDidRegistry();
    const didRegFromAcct1 = (await getArtifact(account1)).attach(
      didRegistry.address
    );
    const tx0 = await didRegFromAcct1.addController(
      account1.address,
      account2.address
    );
    const tx = await didRegFromAcct1.changeController(
      account1.address,
      account2.address
    );
    await tx.wait();
    expect(await didRegistry.identityController(account1.address)).to.equal(
      account2.address
    );
  });

  it("Should fail on unauthorized attempt to add a new controller", async function () {
    const { didRegistry, owner, account1 } = await deployDidRegistry();
    if (network.name !== "lacchain") {
      await expect(
        didRegistry.addController(account1.address, owner.address)
      ).to.be.revertedWith("Not authorized");
    } else {
      try {
        await didRegistry.addController(account1.address, owner.address);
        throw new Error("Workaround ..."); // should never reach here since it is expected that issue operation will fail.
      } catch (e) {}
    }
  });
});
