const { ethers } = require("ethers");
const { FlashbotsBundleProvider, FlashbotsBundleResolution } = require("@flashbots/ethers-provider-bundle");
require("dotenv").config();

const CHAIN_ID = 1; // for ethereum mainnet
const provider = new ethers.providers.JsonRpcProvider("https://ethereum-rpc.publicnode.com");

const safe_wallet_key = process.env.SAFE_WALLET_KEY;
const hacked_wallet_key = process.env.HACKED_WALLET_KEY;

const safeWallet = new ethers.Wallet(safe_wallet_key, provider);
const hackedWallet = new ethers.Wallet(hacked_wallet_key, provider);

const poolAddress = "0x0a7Df7BC7a01A4b6C9889d5994196C1600D4244a";
const claimAddress = "0x784fDeBfD4779579B4cc2bac484129D29200412a";
const claimABI = require("./abi/claim.json");
const claimInterface = new ethers.utils.Interface(claimABI);

const ethAmount = ethers.utils.parseEther("0.08401316");

async function main() {
    const flashbotsProvider = await FlashbotsBundleProvider.create(provider, ethers.Wallet.createRandom());
    provider.on("block", async (blockNumber) => {
        try {
            const gasPrice = ethers.utils.parseUnits("5", 'gwei');
            const gasLimit = 205000;
            const valueCalculate = (gasPrice.toNumber() * gasLimit / 1e9).toFixed(8);

            const bundle = [
                {
                    transaction: {
                        chainId: CHAIN_ID,
                        to: hackedWallet.address,
                        value: ethers.utils.parseEther(valueCalculate.toString()),
                        type: 2,
                        gasLimit: 21000,
                        maxFeePerGas: gasPrice,
                        maxPriorityFeePerGas: gasPrice,
                    },
                    signer: safeWallet
                },
                {
                    transaction: {
                      chainId: CHAIN_ID,
                      to: claimAddress,
                      data: claimInterface.encodeFunctionData("claimWithdraw", [poolAddress]),
                      type: 2,
                      gasLimit: 170000,
                      maxFeePerGas: gasPrice,
                      maxPriorityFeePerGas: gasPrice,
                    },
                    signer: hackedWallet,
                  },
                  {
                    transaction: {
                        chainId: CHAIN_ID,
                        to: safeWallet.address,
                        value: ethAmount,
                        type: 2,
                        gasLimit: 21000,
                        maxFeePerGas: gasPrice,
                        maxPriorityFeePerGas: gasPrice,
                    },
                    signer: hackedWallet
                },
            ];

            const flashbotsTransactionResponse = await flashbotsProvider.sendBundle(bundle, blockNumber + 1);
            const resolution = await flashbotsTransactionResponse.wait();
      
            if (resolution === FlashbotsBundleResolution.BundleIncluded) {
              console.log(`Congrats, included in ${blockNumber + 1}`);
              process.exit(0);
            }
      
            console.log(await flashbotsTransactionResponse.simulate());

        }

        catch (error) {
            console.log(error);
        }
    })
}

main();
