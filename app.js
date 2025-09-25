let contract;
let signer;

// ZenChain Testnet network info
const network = {
  chainId: '0x2098', // 8408 in hex
  chainName: 'ZenChain Testnet',
  nativeCurrency: { name: 'ZenChain Token', symbol: 'ZTC', decimals: 18 },
  rpcUrls: ['https://zenchain-testnet.api.onfinality.io/public'],
  blockExplorerUrls: []
};

// Replace with your deployed contract address
const contractAddress = "0xYourDeployedContractAddressHere";

// ZenArt contract ABI
const contractABI = [
  {
    "inputs":[
      {"internalType":"string","name":"_title","type":"string"},
      {"internalType":"string","name":"_artist","type":"string"},
      {"internalType":"string","name":"_description","type":"string"},
      {"internalType":"string","name":"_imageHash","type":"string"}
    ],
    "name":"createArtwork",
    "outputs":[],
    "stateMutability":"nonpayable",
    "type":"function"
  },
  {
    "inputs":[{"internalType":"uint256","name":"_id","type":"uint256"}],
    "name":"getArtwork",
    "outputs":[
      {"components":[
        {"internalType":"uint256","name":"id","type":"uint256"},
        {"internalType":"string","name":"title","type":"string"},
        {"internalType":"string","name":"artist","type":"string"},
        {"internalType":"string","name":"description","type":"string"},
        {"internalType":"string","name":"imageHash","type":"string"},
        {"internalType":"uint256","name":"likes","type":"uint256"},
        {"internalType":"address","name":"owner","type":"address"}
      ],
      "internalType":"struct ZenArt.Artwork","name":"","type":"tuple"}
    ],
    "stateMutability":"view",
    "type":"function"
  },
  {
    "inputs":[{"internalType":"uint256","name":"_id","type":"uint256"}],
    "name":"likeArtwork",
    "outputs":[],
    "stateMutability":"nonpayable",
    "type":"function"
  },
  {
    "inputs":[],
    "name":"artworkCount",
    "outputs":[{"internalType":"uint256","name":"","type":"uint256"}],
    "stateMutability":"view",
    "type":"function"
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
        return;
      }
    }

    contract = new ethers.Contract(contractAddress, contractABI, signer);
    alert("Wallet connected! You can now register artworks or like them.");
    document.getElementById("walletNotice").style.display = "none";
  } catch (err) {
    console.error(err);
    alert("Error connecting wallet");
  }
};

// Register artwork
document.getElementById("artForm").onsubmit = async (e) => {
  e.preventDefault();
  if (!contract) {
    alert("Connect your wallet first!");
    return;
  }
  const title = document.getElementById("title").value;
  const artist = document.getElementById("artist").value;
  const description = document.getElementById("description").value;
  const imageHash = document.getElementById("imageHash").value;

  try {
    const tx = await contract.createArtwork(title, artist, description, imageHash);
    await tx.wait();
    alert("Artwork registered successfully!");
    loadArtworks();
  } catch (err) {
    console.error(err);
    alert("Error registering artwork");
  }
};

// Like artwork
async function likeArtwork(id) {
  if (!contract) {
    alert("Connect your wallet first!");
    return;
  }
  try {
    const tx = await contract.likeArtwork(id);
    await tx.wait();
    alert("Artwork liked! #" + id);
    loadArtworks();
  } catch (err) {
    console.error(err);
    alert("Error liking artwork");
  }
}

// Load artworks and chart
async function loadArtworks() {
  const artworksDiv = document.getElementById("artworks");
  artworksDiv.innerHTML = "";

  const count = await publicContract.artworkCount();
  let labels = [];
  let data = [];

  for (let i = 0; i < count; i++) {
    const art = await publicContract.getArtwork(i);
    const div = document.createElement("div");
    div.className = "art-card";
    let likeButton = `<button onclick="likeArtwork(${art.id})" ${!contract ? 'disabled' : ''}>❤️ Like</button>`;
    div.innerHTML = `
      <h3>${art.title}</h3>
      <p><b>Artist:</b> ${art.artist}</p>
      <p>${art.description}</p>
      <img src="https://ipfs.io/ipfs/${art.imageHash}" alt="Artwork"/>
      <p>Likes: ${art.likes}</p>
      ${likeButton}
    `;
    artworksDiv.appendChild(div);

    labels.push(art.title);
    data.push(parseInt(art.likes));
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
    }
  });
}

// Initial load
loadArtworks();
