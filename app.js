let provider;
let signer;

// ZenChain Testnet details
const ZENCHAIN_PARAMS = {
  chainId: "0x20E8", // 8408 in hex
  chainName: "ZenChain Testnet",
  nativeCurrency: {
    name: "ZenChain Test Coin",
    symbol: "ZTC",
    decimals: 18,
  },
  rpcUrls: ["https://zenchain-testnet.api.onfinality.io/public"],
  blockExplorerUrls: ["https://zentrace.io/"], // you can add explorer URL here if available
};

// Connect wallet
async function connectWallet() {
  if (!window.ethereum) {
    alert("Please install MetaMask!");
    return;
  }

  provider = new ethers.providers.Web3Provider(window.ethereum);

  try {
    // Check if the network is ZenChain Testnet
    const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
    if (currentChainId !== ZENCHAIN_PARAMS.chainId) {
      try {
        // Try to switch
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: ZENCHAIN_PARAMS.chainId }],
        });
      } catch (switchError) {
        // If not added, then add
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [ZENCHAIN_PARAMS],
          });
        } else {
          throw switchError;
        }
      }
    }

    // Request account connection
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    const address = await signer.getAddress();
    document.getElementById("walletAddress").innerText = "Wallet: " + address;

    // Show balance
    const balance = await provider.getBalance(address);
    document.getElementById("balance").innerText =
      "Balance: " + ethers.utils.formatEther(balance) + " ZTC";

  } catch (err) {
    console.error(err);
    alert("Error connecting wallet: " + err.message);
  }
}

// Send transaction
async function sendTransaction() {
  if (!signer) {
    alert("Please connect wallet first!");
    return;
  }

  const to = document.getElementById("toAddress").value;
  const amount = document.getElementById("amount").value;

  if (!to || !amount) {
    alert("Please enter recipient and amount");
    return;
  }

  try {
    const tx = await signer.sendTransaction({
      to: to,
      value: ethers.utils.parseEther(amount), // in ZTC
    });

    document.getElementById("status").innerText =
      "Transaction sent! Hash: " + tx.hash;

  } catch (err) {
    console.error(err);
    document.getElementById("status").innerText = "Error: " + err.message;
  }
}
