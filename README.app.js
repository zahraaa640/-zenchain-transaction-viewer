let contract;
let signer;

// ZenChain Testnet network info
const network = {
  chainId: "0x20D8", // 8408 in hex
  chainName: "ZenChain Testnet",
  nativeCurrency: { name: "ZenChain Token", symbol: "ZTC", decimals: 18 },
  rpcUrls: ["https://zenchain-testnet.api.onfinality.io/public"],
  blockExplorerUrls: [],
};

// Contract address
const contractAddress = "0xA35f5C4bc858F5cA918f78Bc22290472709E8639";

// ABI
const contractABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "id", type: "uint256" },
      { indexed: false, internalType: "address", name: "creator", type: "address" },
    ],
    name: "ArtworkRegistered",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "id", type: "uint256" },
      { indexed: false, internalType: "address", name: "signer", type: "address" },
    ],
    name: "ArtworkSigned",
    type: "event",
  },
  {
    inputs: [],
    name: "artworkCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "artworks",
    outputs: [
      { internalType: "string", name: "title", type: "string" },
      { internalType: "string", name: "artist", type: "string" },
      { internalType: "string", name: "description", type: "string" },
      { internalType: "string", name: "imageHash", type: "string" },
      { internalType: "address", name: "creator", type: "address" },
      { internalType: "uint256", name: "timestamp", type: "uint256" },
      { internalType: "uint256", name: "likes", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_id", type: "uint256" }],
    name: "getArtwork",
    outputs: [
      { internalType: "string", name: "", type: "string" },
      { internalType: "string", name: "", type: "string" },
      { internalType: "string", name: "", type: "string" },
      { internalType: "string", name: "", type: "string" },
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "_title", type: "string" },
      { internalType: "string", name: "_artist", type: "string" },
      { internalType: "string", name: "_description", type: "string" },
      { internalType: "string", name: "_imageHash", type: "string" },
    ],
    name: "registerArtwork",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_id", type: "uint256" }],
    name: "signArtwork",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

// Provider for read-only
const provider = new ethers.providers.JsonRpcProvider(network.rpcUrls[0]);
const publicContract = new ethers.Contract(contractAddress, contractABI, provider);

// Connect wallet
document.getElementById("connectWallet").onclick = async () => {
  if (typeof window.ethereum === "undefined") {
    alert("MetaMask نصب نیست! لطفاً نصبش کن.");
    return;
  }

  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const account = accounts[0];
    console.log("Wallet connected:", account);

    const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = web3Provider.getSigner();

    // Switch/add ZenChain Testnet
    const chainId = await ethereum.request({ method: "eth_chainId" });
    if (chainId !== network.chainId) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [network],
      });
    }

    contract = new ethers.Contract(contractAddress, contractABI, signer);
    alert("کیف پول وصل شد ✅: " + account);
    document.getElementById("walletNotice").style.display = "none";
    loadArtworks();
  } catch (err) {
    console.error("Wallet connect error:", err);
    alert("اتصال کیف پول ناموفق بود ❌");
  }
};

// Register artwork
document.getElementById("artForm").onsubmit = async (e) => {
  e.preventDefault();
  if (!contract) {
    alert("اول کیف پولت رو وصل کن!");
    return;
  }

  const title = document.getElementById("title").value;
  const artist = document.getElementById("artist").value;
  const description = document.getElementById("description").value;
  const imageHash = document.getElementById("imageHash").value;

  try {
    const tx = await contract.registerArtwork(title, artist, description, imageHash);
    await tx.wait();
    alert("اثر هنری ثبت شد ✅");
    document.getElementById("artForm").reset();
    loadArtworks();
  } catch (err) {
    console.error(err);
    alert("خطا در ثبت اثر ❌");
  }
};

// Like artwork
async function signArtwork(id) {
  if (!contract) {
    alert("اول کیف پولت رو وصل کن!");
    return;
  }
  try {
    const tx = await contract.signArtwork(id);
    await tx.wait();
    alert("اثر لایک شد ❤️ #" + id);
    loadArtworks();
  } catch (err) {
    console.error(err);
    alert("خطا در لایک ❌");
  }
}

// Load artworks
async function loadArtworks() {
  const artworksDiv = document.getElementById("artworks");
  artworksDiv.innerHTML = "";

  try {
    const count = await publicContract.artworkCount();
    if (count.eq(0)) {
      artworksDiv.innerHTML = "<p>No artworks yet. Be the first to register one!</p>";
      document.getElementById("chartSection").style.display = "none";
      return;
    }

    document.getElementById("chartSection").style.display = "block";
    let labels = [];
    let data = [];

    for (let i = 1; i <= count; i++) {
      const art = await publicContract.getArtwork(i);
      const div = document.createElement("div");
      div.className = "art-card";

      div.innerHTML = `
        <img src="https://ipfs.io/ipfs/${art[3]}" alt="${art[0]}" onerror="this.src='https://via.placeholder.com/150'"/>
        <h3>${art[0]}</h3>
        <p><b>Artist:</b> ${art[1]}</p>
        <p>${art[2]}</p>
        <p><b>Likes:</b> ${art[6].toNumber()}</p>
        <p><b>Creator:</b> ${art[4]}</p>
        <button onclick="signArtwork(${i})">❤️ Like</button>
      `;
      artworksDiv.appendChild(div);

      labels.push(art[0]);
      data.push(art[6].toNumber());
    }

    const ctx = document.getElementById("likesChart").getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Likes",
            data: data,
            backgroundColor: "rgba(46,139,87,0.7)",
          },
        ],
      },
      options: {
        scales: { y: { beginAtZero: true } },
      },
    });
  } catch (err) {
    console.error("Error loading artworks:", err);
    artworksDiv.innerHTML = "<p>Error loading artworks ❌</p>";
  }
}

// Initial load
window.onload = loadArtworks;
