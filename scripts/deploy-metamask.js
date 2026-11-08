const button = document.querySelector("#deploy");
const statusText = document.querySelector("#status");
const explorer = document.querySelector("#explorer");
const details = document.querySelector("#plan");
let config;

async function readPlan() {
  const response = await fetch("/plan");
  if (!response.ok) throw new Error("Không đọc được kế hoạch deploy.");
  return response.json();
}

function showState(state) {
  if (!state) return;
  button.disabled = true;
  if (state.transactionUrl) {
    explorer.href = state.transactionUrl;
    explorer.hidden = false;
  }
  if (state.status === "success") {
    statusText.textContent = "Deploy thành công.\nHợp đồng: " + state.address + "\nPhí đã trả: " + state.feeUSDC + " USDC testnet";
  } else if (state.status === "error") {
    statusText.textContent = state.message;
  } else {
    statusText.textContent = state.hash ? "Đã gửi. Đang chờ Hadrian xác nhận…" : "Đang chờ MetaMask. Kiểm tra lịch sử ví trước khi thử lại.";
  }
}

async function post(path) {
  const response = await fetch(path, { method: "POST", headers: { "X-Deployment-Token": config.token } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}

async function connect() {
  const provider = [...(window.ethereum?.providers ?? []), window.ethereum]
    .find((item) => item?.isMetaMask && item !== window.phantom?.ethereum);
  if (!provider) throw new Error("Hãy mở đường dẫn bằng trình duyệt đã cài MetaMask.");
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (accounts[0]?.toLowerCase() !== config.info.deployer.toLowerCase()) {
    throw new Error("Hãy chọn đúng ví trong MetaMask: " + config.info.deployer);
  }
  const chainId = "0x" + config.info.chainId.toString(16);
  if (await provider.request({ method: "eth_chainId" }) !== chainId) {
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
    } catch (error) {
      if (error.code !== 4902) throw error;
      await provider.request({ method: "wallet_addEthereumChain", params: [{
        chainId, chainName: config.info.network, rpcUrls: [config.info.rpc],
        blockExplorerUrls: [config.info.explorer], nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
      }] });
    }
  }
  if (await provider.request({ method: "eth_chainId" }) !== chainId) {
    throw new Error("Hãy chuyển MetaMask sang Rome Hadrian rồi bấm lại.");
  }
  return provider;
}

button.addEventListener("click", async () => {
  button.disabled = true;
  let reserved = false;
  let requested = false;
  let hash;
  try {
    statusText.textContent = "Đang kết nối MetaMask…";
    const provider = await connect();
    const tx = await post("/prepare");
    reserved = true;
    const accounts = await provider.request({ method: "eth_accounts" });
    if (accounts[0]?.toLowerCase() !== tx.from.toLowerCase() || await provider.request({ method: "eth_chainId" }) !== tx.chainId) {
      throw new Error("Tài khoản hoặc mạng đã đổi. Hãy kiểm tra MetaMask rồi thử lại.");
    }
    statusText.textContent = "Kiểm tra ví, mạng và phí trong MetaMask. Chỉ xác nhận nếu phí tối đa không vượt mức hiển thị trên trang.";
    requested = true;
    hash = await provider.request({ method: "eth_sendTransaction", params: [tx] });
    showState(await post("/submitted/" + hash));
  } catch (error) {
    let retry = !reserved;
    if (reserved && (!requested || error.code === 4001)) {
      try {
        await post("/cancel");
        retry = true;
      } catch {
        retry = false;
      }
    }
    statusText.textContent = hash
      ? "Ví đã gửi giao dịch " + hash + ". Lưu mã này và kiểm tra trước khi thử lại."
      : (error.message || "Không thể mở yêu cầu trong MetaMask.");
    button.disabled = !retry;
  }
});

async function start() {
  config = await readPlan();
  for (const [label, value] of [
    ["Mạng", config.info.network + " · " + config.info.chainId],
    ["Ví deploy và chủ hợp đồng", config.info.deployer],
    ["Phí tối đa đã báo", config.capUSDC + " USDC testnet"],
    ["Số dư khi kiểm tra", config.info.balanceUSDC + " USDC testnet"],
  ]) {
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    details.append(term, description);
  }
  statusText.textContent = "Sẵn sàng. Hãy mở khóa MetaMask.";
  button.disabled = Boolean(config.state);
  showState(config.state);
  setInterval(async () => {
    try {
      const { state } = await readPlan();
      if (state?.status !== "broadcasting") showState(state);
    } catch {
      // Keep the last receipt and link visible during a transient local outage.
    }
  }, 2500);
}

void start().catch((error) => { statusText.textContent = error.message; });
