import { expect } from "chai";
import { ethers, network } from "hardhat";
import {
  DIDRegistryGM__factory,
  DIDRegistry__factory,
} from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { GasModelSignerModified } from "../../GasModelModified";
import { deployDidRegistry, wrapCall } from "../util";
import { toUtf8Bytes } from "ethers/lib/utils";

export async function getArtifact(
  signer: SignerWithAddress | GasModelSignerModified
): Promise<DIDRegistry__factory | DIDRegistryGM__factory> {
  let Artifact: DIDRegistry__factory | DIDRegistryGM__factory;
  if (network.name !== "lacchain") {
    Artifact = await ethers.getContractFactory("DIDRegistry", signer);
  }
  Artifact = await ethers.getContractFactory("DIDRegistryGM", signer);
  return Artifact;
}

describe("Controller", function () {
  it("Should switch the main controller with one of the registered controllers, on authorized attempt", async function () {
    const { didRegistry, account1, account2, Artifact } =
      await deployDidRegistry();
    const didRegFromAcct1 = (await getArtifact(account1)).attach(
      didRegistry.address
    );
    await didRegFromAcct1.addController(account1.address, account2.address);
    const tx = await didRegFromAcct1.rotateMainController(
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
      ).to.be.revertedWith("NA");
    } else {
      try {
        await didRegistry.addController(account1.address, owner.address);
        throw new Error("Workaround ..."); // should never reach here since it is expected that issue operation will fail.
      } catch (e) {}
    }
  });
  it("Should not add an account in controllers if it is a controller already", async function () {
    const { didRegistry, account1, account2 } = await deployDidRegistry();
    const didRegFromAcct1 = (await getArtifact(account1)).attach(
      didRegistry.address
    );
    if (network.name !== "lacchain") {
      await expect(
        didRegFromAcct1.addController(account1.address, account1.address)
      ).to.be.revertedWith("CAE");
    } else {
      try {
        await didRegistry.addController(account1.address, account1.address);
        throw new Error("Workaround ..."); // should never reach here since it is expected that issue operation will fail.
      } catch (e) {}
    }
    await didRegFromAcct1.addController(account1.address, account2.address);
    let controllerLength = (
      await didRegFromAcct1.getControllers(account1.address)
    ).length;
    expect(controllerLength).to.equal(2);

    // trying to add a backup controller again
    if (network.name !== "lacchain") {
      await expect(
        didRegFromAcct1.addController(account1.address, account2.address)
      ).to.be.revertedWith("CAE");
    } else {
      try {
        await didRegistry.addController(account1.address, account1.address);
        throw new Error("Workaround ..."); // should never reach here since it is expected that issue operation will fail.
      } catch (e) {}
    }

    controllerLength = (await didRegFromAcct1.getControllers(account1.address))
      .length;
    expect(controllerLength).to.equal(2);
  });
  it("Should fail to disable key rotation if it is already disabled", async function () {
    const { didRegistry, owner, account1 } = await deployDidRegistry();
    const didRegFromAcct1 = (await getArtifact(account1)).attach(
      didRegistry.address
    );
    if (network.name !== "lacchain") {
      await expect(
        didRegFromAcct1.disableKeyRotation(account1.address)
      ).to.be.revertedWith("KRAD");
    } else {
      try {
        await didRegistry.addController(account1.address, owner.address);
        throw new Error("Workaround ..."); // should never reach here since it is expected that issue operation will fail.
      } catch (e) {}
    }
  });
  it("Should fail to enable key rotation if it is already enabled", async function () {
    const { didRegistry, owner, account1 } = await deployDidRegistry();
    const didRegFromAcct1 = (await getArtifact(account1)).attach(
      didRegistry.address
    );
    const keyRotationTime = await didRegFromAcct1.minKeyRotationTime();
    await didRegFromAcct1.enableKeyRotation(account1.address, keyRotationTime);
    if (network.name !== "lacchain") {
      await expect(
        didRegFromAcct1.enableKeyRotation(account1.address, keyRotationTime)
      ).to.be.revertedWith("KRAE");
    } else {
      try {
        await didRegistry.addController(account1.address, owner.address);
        throw new Error("Workaround ..."); // should never reach here since it is expected that issue operation will fail.
      } catch (e) {}
    }
  });

  it("Should enrol a new account and set it as the main controller ", async function () {
    const { didRegistry, account1, account2 } = await deployDidRegistry();
    const didRegFromAcct1 = (await getArtifact(account1)).attach(
      didRegistry.address
    );
    const result = await didRegFromAcct1.enrollNewAndSetMainController(
      account1.address,
      account2.address
    );
    expect(result)
      .to.emit(didRegFromAcct1, "DIDControllerAdded")
      .withArgs(account1.address, account1.address, account2.address, 0);
    expect(result)
      .to.emit(didRegFromAcct1, "DIDControllerChanged")
      .withArgs(account1.address, account2.address, 0);
    expect(await didRegFromAcct1.identityController(account1.address)).to.equal(
      account2.address
    );
    const controllers = await didRegFromAcct1.getControllers(account1.address);
    expect(controllers.length).to.equal(2);
    const isController = controllers.find((el) => el === account2.address);
    expect(isController).not.be.undefined;
  });
  it("Should fail to enrol and add  when controller already exists", async function () {
    const { didRegistry, account1, account2 } = await deployDidRegistry();
    const didRegFromAcct1 = (await getArtifact(account1)).attach(
      didRegistry.address
    );
    await didRegFromAcct1.enrollNewAndSetMainController(
      account1.address,
      account2.address
    );

    const didRegFromAcct2 = (await getArtifact(account2)).attach(
      didRegistry.address
    );
    if (network.name !== "lacchain") {
      await expect(
        didRegFromAcct2.enrollNewAndSetMainController(
          account1.address,
          account1.address
        )
      ).to.be.revertedWith("CAE");
    } else {
      try {
        await didRegFromAcct2.addController(account1.address, account1.address);
        throw new Error("Workaround ..."); // should never reach here since it is expected that issue operation will fail.
      } catch (e) {}
    }
  });

  it("Should revoke a DID", async function () {
    const { didRegistry, account1 } = await deployDidRegistry();
    const didRegFromAcct1 = (await getArtifact(account1)).attach(
      didRegistry.address
    );
    await didRegFromAcct1.deactivateAccount(account1.address);
    const currentController = await didRegFromAcct1.identityController(
      account1.address
    );
    expect(currentController).to.be.equal(ethers.constants.AddressZero);
    if (network.name !== "lacchain") {
      await expect(
        didRegFromAcct1.enrollNewAndSetMainController(
          account1.address,
          account1.address
        )
      ).to.be.revertedWith("AWD");
    } else {
      try {
        didRegFromAcct1.enrollNewAndSetMainController(
          account1.address,
          account1.address
        );
        throw new Error("Workaround ..."); // should never reach here since it is expected that issue operation will fail.
      } catch (e) {}
    }
  });

  it("Controllers deactivation", async () => {
    it("Should deactivate controllers from an identity account", async () => {
      await deactivateControllers();
    });

    it("Should not be able to add an attribute after deactivation", async () => {
      const didRegistry = await deactivateControllers();
      const bytesName = toUtf8Bytes("name");
      const bytesValue = toUtf8Bytes("value");
      const deltaTime = 86400;
      const identity = await didRegistry.signer.getAddress();
      const operation = didRegistry.setAttribute(
        identity,
        bytesName,
        bytesValue,
        deltaTime
      );
      if (network.name !== "lacchain") {
        await expect(operation).to.be.revertedWith("CAD");
      } else {
        await wrapCall(operation);
      }
    });
  });
});

async function deactivateControllers() {
  const { didRegistry, account1 } = await deployDidRegistry();
  const didRegFromAcct1 = (await getArtifact(account1)).attach(
    didRegistry.address
  );
  const tx = await didRegFromAcct1.deactivateControllers(account1.address);
  await tx.wait();
  const controllers = await didRegFromAcct1.getControllers(account1.address);
  const areControllersDeactivated =
    await didRegFromAcct1.areControllersDeactivated(account1.address);
  const isAccountDeactivated = await didRegFromAcct1.isAccountDeactivated(
    account1.address
  );
  expect(controllers.length).to.equal(0);
  expect(areControllersDeactivated).to.equal(true);
  expect(isAccountDeactivated).to.equal(false);
  return didRegFromAcct1;
}
