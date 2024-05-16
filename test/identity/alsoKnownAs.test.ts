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
import { sleep, wrapCall } from "../util";
import { ContractReceipt } from "ethers";

describe("Also Known As", function () {
  async function getArtifact(
    signer: SignerWithAddress | GasModelSignerModified
  ): Promise<DIDRegistry__factory | DIDRegistryGM__factory> {
    let Artifact: DIDRegistry__factory | DIDRegistryGM__factory;
    if (network.name !== "lacchain") {
      Artifact = await ethers.getContractFactory("DIDRegistry", signer);
    } else {
      Artifact = await ethers.getContractFactory("DIDRegistryGM", signer);
    }
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

  it("Should add a alsoKnownAs identifier", async () => {
    const { didRegistry, account1 } = await deployDidRegistry();
    const didRegFromAcct1 = (await getArtifact(account1)).attach(
      didRegistry.address
    );
    const akaId = "did:abc:mnp";
    await addAKAIdentifier(didRegFromAcct1, account1.address, akaId);
  });
  it("Should resolve all alsoKnownAs registered identifiers", async () => {
    const akaIds = ["id1", "id2", "id3", "id4"];
    const { didRegistry, account1 } = await deployDidRegistry();
    const didRegFromAcct1 = (await getArtifact(account1)).attach(
      didRegistry.address
    );
    for (const akaId of akaIds) {
      await addAKAIdentifier(didRegFromAcct1, account1.address, akaId);
    }
    const blockChange = await didRegFromAcct1.changed(account1.address);
    let blockToSearch = blockChange.toNumber();
    let index = akaIds.length - 1;
    while (blockToSearch > 0) {
      const t = await extractAKAIdFromEvent(blockToSearch, didRegistry);
      sleep(1);
      expect(akaIds[index]).to.equal(t.akaId);
      blockToSearch = t.previousChange;
      index--;
    }
  });
  it("Should remove a alsoKnownAs identifier", async () => {
    const { didRegistry, account1 } = await deployDidRegistry();
    const didRegFromAcct1 = (await getArtifact(account1)).attach(
      didRegistry.address
    );
    const akaId = "did:abc:mnp";
    await removeAKAIdentifier(didRegFromAcct1, account1.address, akaId);
  });
});

export async function addAKAIdentifier(
  didRegistry: DIDRegistry,
  identity: string,
  akaId: string,
  deltaTime = 86400
): Promise<ContractReceipt> {
  const tx = await didRegistry.addAKAIdentifier(identity, akaId, deltaTime);
  const txReceipt = await tx.wait();
  const akaAddedEvent = txReceipt.events?.find(
    (el) => el.event === "AKAChanged"
  );
  const akaAdded = akaAddedEvent?.args!["akaId"];
  expect(akaAdded).to.equal(akaId);
  return txReceipt;
}

export async function removeAKAIdentifier(
  didRegistry: DIDRegistry,
  identity: string,
  akaId: string
): Promise<ContractReceipt> {
  const tx = await didRegistry.removeAKAIdentifier(identity, akaId);
  const txReceipt = await tx.wait();
  const akaAddedEvent = txReceipt.events?.find(
    (el) => el.event === "AKAChanged"
  );
  const akaAdded = akaAddedEvent?.args!["akaId"];
  expect(akaAdded).to.equal(akaId);
  return txReceipt;
}

export async function extractAKAIdFromEvent(
  block: number,
  didRegistry: DIDRegistry
) {
  const filter = didRegistry.filters.AKAChanged(
    null,
    null,
    null,
    null,
    null,
    null
  );
  const t = await didRegistry.queryFilter(filter, block, block);
  const akaId = t[0]?.args!["akaId"];
  const previousChange = t[0]?.args!["previousChange"];
  return { akaId, previousChange: previousChange.toNumber() };
}
