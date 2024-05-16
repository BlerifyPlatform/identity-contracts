import { ethers, network, lacchain } from "hardhat";
import { keccak256 } from "ethers/lib/utils";
import { ContractTransaction } from "ethers";

import {
  DIDRegistry,
  DIDRegistryGM,
  DIDRegistryGM__factory,
  DIDRegistry__factory,
} from "../typechain-types";

export async function deployDidRegistry() {
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

export const getAddressFromDid = (did: string): string => {
  const codedDid = ethers.utils.defaultAbiCoder.encode(["string"], [did]);
  const hash = keccak256(codedDid);
  return hash.substring(26);
};

export const sleep = (seconds: number) =>
  new Promise((resolve, reject) => {
    setTimeout(() => resolve(true), seconds * 1000);
  });

/**
 * Util to evaluate fail desired cases in gas model networks
 * @param txPromise
 */
export async function wrapCall(txPromise: Promise<ContractTransaction>) {
  let s = false;
  try {
    await (await txPromise).wait();
  } catch (err: any) {
    s = true;
  } finally {
    if (!s) {
      throw new Error("Unexpected behavior");
    }
  }
}
