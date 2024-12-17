import { run } from "hardhat";

// Define the types for the parameters
async function verify(contractAddress: string, args: any[]): Promise<void> {
  console.log("Verifying contract...");
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    });
  } catch (error: any) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log("Already Verified");
    } else {
      console.log(error);
    }
  }
}

export { verify };
