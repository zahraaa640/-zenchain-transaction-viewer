let contract;
let signer;

// ZenChain Testnet network info
const network = {
  chainId: '0x20D8', // 8408 in hex
  chainName: 'ZenChain Testnet',
  nativeCurrency: { name: 'ZenChain Token', symbol: 'ZTC', decimals: 18 },
  rpcUrls: ['https://zenchain-testnet.api.onfinality.io/public'],
  blockExplorerUrls: []
};

// Contract address
const contractAddress = "0xA35f5C4bc858F5cA918f78Bc22290472709E8639";

// ZenArt contract ABI
const contractABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": false, "internalType": "address", "name": "creator", "type": "address" }
    ],
    "name": "ArtworkRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": false, "internalType": "address", "name": "signer", "type": "address" }
    ],
    "name": "ArtworkSigned",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "artworkCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "artworks",
    "outputs": [
      { "internalType": "string", "name": "title", "type": "string" },
      { "internalType": "string", "name": "artist", "type": "string" },
      { "internalType": "string", "name": "description", "type": "string" },
      { "internalType": "string", "name": "imageHash", "type": "string" },
      { "internalType": "address", "name": "creator", "type": "address" },
      { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
      { "internalType": "uint256", "name": "likes", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_id", "type": "uint256" }],
    "name": "getArtwork",
    "outputs": [
      { "internalType": "string", "name": "", "type": "string" },
      { "internalType": "string", "name": "", "type": "string" },
      { "internalType": "string", "name": "", "type": "string" },
      { "internalType": "string", "name": "", "type": "string" },
      { "internalType": "address", "name": "", "type": "address" },
      { "internalType": "uint256", "name": "", "type": "uint256" },
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "_title", "type": "string" },
      { "internalType": "string", "name": "_artist", "type": "string" },
      { "internalType": "string", "name": "_description", "type": "string" },
      { "internalType": "string", "name": "_imageHash", "type": "string" }
    ],
    "name": "registerArtwork",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_id", "type": "uint256" }],
    "name": "signArtwork",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Provider for public view (no wallet needed)
const provider = new ethers.providers.JsonRpcProvider(network.rpcUrls[0]);
const publicContract = new ethers.Contract(contractAddress, contractABI, provider);

// Wallet connection
document.getElementById("connectWallet").onclick = async () => {
  if (!window.ethereum) {
    alert("Please install MetaMask!");
    return;
  }
  try {
    await ethereum.request({ method: 'eth_requestAccounts' });
    signer = new ethers.providers.Web3Provider(window.ethereum).getSigner();

    const chainId = await ethereum.request({ method: 'eth_chainId' });
    if (chainId !== network.chainId) {
      try {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [network]
        });
      } catch (addError) {
        console.error("Error adding network:", addError);
        alert("Failed to add ZenChain Testnet");
        return;
      }
    }

    contract = new ethers.Contract(contractAddress, contractABI, signer);
    alert("Wallet connected! You can now register artworks or like them.");
    document.getElementById("walletNotice").style.display = "none";
    loadArtworks(); // Load artworks after connection
  } catch (err) {
    console.error("Error connecting wallet:", err);
    alert("Error connecting wallet: " + (err.reason || err.message));
  }
};

// Register artwork
document.getElementById("artForm").onsubmit = async (e) => {
  e.preventDefault();
  if (!contract) {
    alert("Please connect your wallet first!");
    return;
  }
  const title = document.getElementById("title").value;
  const artist = document.getElementById("artist").value;
  const description = document.getElementById("description").value;
  const imageHash = document.getElementById("imageHash").value;

  if (!title || !artist || !description || !imageHash) {
    alert("Please fill all fields!");
    return;
  }

  try {
    const tx = await contract.registerArtwork(title, artist, description, imageHash);
    await tx.wait();
    alert("Artwork registered successfully!");
    document.getElementById("artForm").reset();
    loadArtworks();
  } catch (err) {
    console.error("Error registering artwork:", err);
    alert("Error registering artwork: " + (err.reason || err.message));
  }
};

// Like (Sign) artwork
async function signArtwork(id) {
  if (!contract) {
    alert("Please connect your wallet first!");
    return;
  }
  try {
    const tx = await contract.signArtwork(id);
    await tx.wait();
    alert("Artwork liked! #" + id);
    loadArtworks();
  } catch (err) {
    console.error("Error liking artwork:", err);
    alert("Error liking artwork: " + (err.reason || err.message));
  }
}

// Load artworks and chart
async function loadArtworks() {
  const artworksDiv = document.getElementById("artworks");
  artworksDiv.innerHTML = "";

  try {
    const count = await publicContract.artworkCount();
    if (count.eq(0)) {
      artworksDiv.innerHTML = '<p>No artworks yet. Be the first to register one!</p>';
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
      let likeButton = `<button onclick="signArtwork(${i})" ${!contract ? 'disabled' : ''}>❤️ Like</button>`;
      div.innerHTML = `
        <img src="https://ipfs.io/ipfs/${art[3]}" alt="${art[0]}" onerror="this.src='https://via.placeholder.com/150'"/>
        <h3>${art[0]}</h3>
        <p><b>Artist:</b> ${art[1]}</p>
        <p>${art[2]}</p>
        <p><b>Likes:</b> ${art[6].toNumber()}</p>
        <p><b>Creator:</b> ${art[4]}</p>
        ${likeButton}
      `;
      artworksDiv.appendChild(div);

      labels.push(art[0]); // title
      data.push(art[6].toNumber()); // likes
    }

    const ctx = document.getElementById("likesChart").getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Likes",
          data: data,
          backgroundColor: "rgba(46,139,87,0.7)"
        }]
      },
      options: {
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  } catch (err) {
    console.error("Error loading artworks:", err);
    artworksDiv.innerHTML = '<p>Error loading artworks. Please try again.</p>';
  }
}

// Initial load
window.onload = loadArtworks;
