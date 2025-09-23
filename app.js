/* app.js - ZenChain Micro Payment DApp (Testnet)
   - auto-switch/add ZenChain Testnet in MetaMask
   - connect wallet, show balance
   - send micro payment (signer.sendTransaction)
   - save history in localStorage and poll status
*/

let provider;
let signer;

const STORAGE_KEY = "zenchain_micro_history_v1";

// ZenChain Testnet params
const ZENCHAIN_PARAMS = {
  chainId: "0x20E8", // 8408 decimal -> 0x20E8 hex
  chainName: "ZenChain Testnet",
  nativeCurrency: { name: "ZenChain Test Coin", symbol: "ZTC", decimals: 18 },
  rpcUrls: ["https://zenchain-testnet.api.onfinality.io/public"],
  blockExplorerUrls: [] // add explorer if available
};

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("connectBtn").addEventListener("click", connectWallet);
  document.getElementById("sendBtn").addEventListener("click", sendTransaction);
  document.getElementById("refreshBtn").addEventListener("click", refreshAllStatuses);
  document.getElementById("clearBtn").addEventListener("click", clearLocalHistory);

  loadHistoryToTable();
  // start polling every 8 seconds to update pending tx statuses
  setInterval(pollPendingTransactions, 8000);
});

/* --------- Wallet & Network --------- */
async function connectWallet() {
  if (!window.ethereum) {
    alert("Please install MetaMask to use this DApp.");
    return;
  }

  try {
    provider = new ethers.providers.Web3Provider(window.ethereum, "any");

    // ensure correct network: try to switch; if not present, add
    const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
    if (currentChainId !== ZENCHAIN_PARAMS.chainId) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: ZENCHAIN_PARAMS.chainId }]
        });
      } catch (switchError) {
        // 4902 -> chain not added
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [ZENCHAIN_PARAMS]
          });
        } else {
          throw switchError;
        }
      }
    }

    // request accounts
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    const address = await signer.getAddress();
    document.getElementById("walletAddress").innerText = "Wallet: " + address;

    // show balance
    await updateBalance();

    // Watch for account or network changes
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    showStatus("Wallet connected");
  } catch (err) {
    console.error("connectWallet error:", err);
    alert("Failed to connect or switch network: " + (err.message || err));
  }
}

function handleAccountsChanged(accounts) {
  if (!accounts || accounts.length === 0) {
    document.getElementById("walletAddress").innerText = "Wallet: Not connected";
    document.getElementById("balance").innerText = "Balance: -";
    signer = null;
    provider = null;
    showStatus("Wallet disconnected");
  } else {
    // refresh display
    connectWallet().catch(console.error);
  }
}

function handleChainChanged(chainId) {
  // reload to reinitialize provider network-sensitive data
  console.log("chain changed to", chainId);
  connectWallet().catch(console.error);
}

/* --------- Balance --------- */
async function updateBalance() {
  try {
    const address = await signer.getAddress();
    const bal = await provider.getBalance(address);
    document.getElementById("balance").innerText = "Balance: " + ethers.utils.formatEther(bal) + " ZTC";
  } catch (err) {
    console.error("updateBalance error:", err);
    document.getElementById("balance").innerText = "Balance: -";
  }
}

/* --------- Send transaction --------- */
async function sendTransaction() {
  if (!signer) {
    alert("Connect your wallet first");
    return;
  }

  const to = document.getElementById("toAddress").value.trim();
  const amountStr = document.getElementById("amount").value.trim();

  if (!to || !amountStr) {
    alert("Please enter recipient address and amount");
    return;
  }

  // validate amount is positive number
  const amountNum = Number(amountStr);
  if (isNaN(amountNum) || amountNum <= 0) {
    alert("Invalid amount");
    return;
  }

  // small safety limit for micro payments (optional)
  if (amountNum > 10) {
    if (!confirm("You are sending a relatively large amount (> 10 ZTC). Proceed?")) {
      return;
    }
  }

  try {
    showStatus("Sending transaction... (confirm in MetaMask)");

    const txResponse = await signer.sendTransaction({
      to: to,
      value: ethers.utils.parseEther(amountStr)
    });

    // store to local history immediately as pending
    const record = {
      time: new Date().toISOString(),
      to,
      amount: amountStr,
      hash: txResponse.hash,
      status: "pending"
    };
    saveHistoryRecord(record);
    addRowToTable(record);
    showStatus("Transaction sent. Hash: " + txResponse.hash);

    // update balance (optimistic)
    setTimeout(updateBalance, 2500);

    // wait for receipt in background (non-blocking)
    provider.waitForTransaction(txResponse.hash, 1, 60000).then(receipt => {
      if (receipt && receipt.confirmations && receipt.confirmations > 0) {
        updateHistoryStatus(txResponse.hash, "confirmed");
        showStatus("Transaction confirmed: " + txResponse.hash);
      } else {
        updateHistoryStatus(txResponse.hash, "unknown");
      }
      updateBalance().catch(console.error);
    }).catch(err => {
      console.log("waitForTransaction error:", err);
      // keep as pending; user can refresh status manually
    });

  } catch (err) {
    console.error("sendTransaction error:", err);
    showStatus("Error: " + (err.message || err));
  }
}

/* --------- Local history (localStorage) --------- */
function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error("loadHistory parse error", e);
    return [];
  }
}

function saveHistory(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr || []));
}

function saveHistoryRecord(rec) {
  const hist = loadHistory();
  hist.unshift(rec); // newest first
  saveHistory(hist);
}

function clearLocalHistory() {
  if (!confirm("Clear local transaction history? This cannot be undone.")) return;
  localStorage.removeItem(STORAGE_KEY);
  loadHistoryToTable();
}

/* --------- Render table --------- */
function loadHistoryToTable() {
  const tbody = document.querySelector("#historyTable tbody");
  tbody.innerHTML = "";
  const hist = loadHistory();
  hist.forEach(addRowToTable);
}

function addRowToTable(rec) {
  const tbody = document.querySelector("#historyTable tbody");
  const tr = document.createElement("tr");

  const timeTd = document.createElement("td");
  timeTd.textContent = (new Date(rec.time)).toLocaleString();

  const toTd = document.createElement("td");
  toTd.textContent = rec.to;

  const amountTd = document.createElement("td");
  amountTd.textContent = rec.amount;

  const hashTd = document.createElement("td");
  const short = rec.hash ? (rec.hash.slice(0, 8) + "..." + rec.hash.slice(-6)) : "-";
  if (rec.hash) {
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = short;
    a.onclick = (e) => {
      e.preventDefault();
      // open in explorer if provided, else show full hash in alert
      if (ZENCHAIN_PARAMS.blockExplorerUrls && ZENCHAIN_PARAMS.blockExplorerUrls.length > 0) {
        const url = ZENCHAIN_PARAMS.blockExplorerUrls[0] + "/tx/" + rec.hash;
        window.open(url, "_blank");
      } else {
        alert("Tx hash:\n" + rec.hash);
      }
    };
    hashTd.appendChild(a);
  } else {
    hashTd.textContent = "-";
  }

  const statusTd = document.createElement("td");
  statusTd.textContent = rec.status || "unknown";
  statusTd.dataset.hash = rec.hash || "";

  tr.appendChild(timeTd);
  tr.appendChild(toTd);
  tr.appendChild(amountTd);
  tr.appendChild(hashTd);
  tr.appendChild(statusTd);

  // prepend row
  const first = tbody.firstChild;
  if (first) tbody.insertBefore(tr, first);
  else tbody.appendChild(tr);
}

/* --------- Update statuses --------- */
async function refreshAllStatuses() {
  showStatus("Refreshing statuses...");
  await pollPendingTransactions();
  showStatus("Status refresh complete");
}

async function pollPendingTransactions() {
  try {
    const hist = loadHistory();
    if (!hist.length || !provider) {
      // nothing to do
      return;
    }

    let changed = false;
    for (let i = 0; i < hist.length; i++) {
      const r = hist[i];
      if (!r.hash) continue;
      // skip already confirmed
      if (r.status === "confirmed") continue;

      try {
        const receipt = await provider.getTransactionReceipt(r.hash);
        if (receipt && receipt.confirmations && receipt.confirmations > 0) {
          hist[i].status = "confirmed";
          changed = true;
        } else if (receipt && receipt.status === 0) {
          hist[i].status = "failed";
          changed = true;
        } else {
          // still pending; leave as-is
        }
      } catch (err) {
        console.log("getTransactionReceipt error for", r.hash, err);
      }
    }

    if (changed) {
      saveHistory(hist);
      // re-render table
      loadHistoryToTable();
    }
  } catch (err) {
    console.error("pollPendingTransactions error:", err);
  }
}

function updateHistoryStatus(hash, newStatus) {
  const hist = loadHistory();
  let changed = false;
  for (let i = 0; i < hist.length; i++) {
    if (hist[i].hash === hash) {
      hist[i].status = newStatus;
      changed = true;
      break;
    }
  }
  if (changed) {
    saveHistory(hist);
    loadHistoryToTable();
  }
}

/* --------- UI helper --------- */
function showStatus(text) {
  const el = document.getElementById("status");
  el.innerText = text || "";
    }
