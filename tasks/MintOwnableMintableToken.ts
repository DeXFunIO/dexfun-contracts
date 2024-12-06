import { task } from "hardhat/config";

task("MintToken", "Mint Ownable Mintable Token")
    .addParam("token", "token to mint")
    .addParam("amount", "mint amount")
    .addOptionalParam("receiver", "receiver")
    .setAction(async ({token, amount, receiver}, { deployments, ethers, network})=>{
        const tokenContract = await ethers.getContract(token);
        const [signer] = await ethers.getSigners();

        const decimals = await tokenContract.decimals();
        const tokenAmount = ethers.utils.parseUnits(amount, decimals);
        const to = receiver ? receiver : signer.address;
        const tx = await tokenContract.mint(to, tokenAmount);
        console.log(`Minted ${amount} ${token}`);
    });