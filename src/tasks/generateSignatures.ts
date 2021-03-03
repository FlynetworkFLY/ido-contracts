import fs from "fs";

import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";

import { TypedDataDomain } from "../../src/ts/ethers";

export function domain(
  chainId: number,
  verifyingContract: string,
): TypedDataDomain {
  return {
    name: "AccessManager",
    version: "v1",
    chainId,
    verifyingContract,
  };
}
import { getAllowListOffChainManagedContract } from "./utils";

// interface Signature {
//   address: string;
//   signature: string;
// }

// interface SignatureSet {
//   auctionId: number;
//   chainId: number;
//   signatures: Signature;
// }

const generateSignatures: () => void = () => {
  task(
    "generateSignatures",
    "Generates the signatures for the allowListManager",
  )
    .addParam("auctionId", "Id of the auction ")
    .addParam(
      "fileWithAddress",
      "File with comma separated addresses that should be allow-listed",
    )
    .setAction(async (taskArgs, hardhatRuntime) => {
      const [caller] = await hardhatRuntime.ethers.getSigners();
      console.log(
        "Using the account: ",
        caller.address,
        " to generate signatures",
      );
      const allowListContract = await getAllowListOffChainManagedContract(
        hardhatRuntime,
      );
      const { chainId } = await hardhatRuntime.ethers.provider.getNetwork();

      const contractDomain = domain(chainId, allowListContract.address);

      const file = fs.readFileSync(taskArgs.fileWithAddress, "utf8");
      const addresses = file.split(",");
      console.log(addresses);
      const signatures = [];
      for (const address of addresses) {
        console.log("signing ", address);
        const auctioneerMessage = hardhatRuntime.ethers.utils.keccak256(
          hardhatRuntime.ethers.utils.defaultAbiCoder.encode(
            ["bytes32", "address", "uint256"],
            [
              hardhatRuntime.ethers.utils._TypedDataEncoder.hashDomain(
                contractDomain,
              ),
              address,
              taskArgs.auctionId,
            ],
          ),
        );
        const auctioneerSignature = await caller.signMessage(
          hardhatRuntime.ethers.utils.arrayify(auctioneerMessage),
        );
        const sig = hardhatRuntime.ethers.utils.splitSignature(
          auctioneerSignature,
        );
        const auctioneerSignatureEncoded = hardhatRuntime.ethers.utils.defaultAbiCoder.encode(
          ["uint8", "bytes32", "bytes32"],
          [sig.v, sig.r, sig.s], // < error in signature
        );
        signatures.push(
          JSON.stringify({
            address: address,
            signature: auctioneerSignatureEncoded,
          }),
        );
      }
      console.log(
        JSON.stringify({
          auctionId: taskArgs.auctionId,
          chainId: chainId,
          allowListContract: allowListContract.address,
          signatures: signatures,
        }),
      );
    });
};
export { generateSignatures };