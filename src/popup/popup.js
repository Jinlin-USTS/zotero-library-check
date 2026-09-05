const stateElement = document.querySelector("#state");
const countElement = document.querySelector("#item-count");
const syncedElement = document.querySelector("#last-synced");
const errorElement = document.querySelector("#error");
const refreshButton = document.querySelector("#refresh");

function send(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      if (!response || !response.ok) return reject(new Error(response && response.error || "扩展后台无响应"));
      resolve(response.data);
    });
  });
}

async function requestLocalNetworkAccess() {
  const endpoints = ["http://127.0.0.1:23119/api/", "http://localhost:23119/api/"];
  const failures = [];
  for (const endpoint of endpoints) {
    try {
      // A fetch from the visible popup and inside a click gesture lets current
      // Chrome versions display their Local Network Access permission prompt.
      const response = await fetch(endpoint, {
        cache: "no-store",
        targetAddressSpace: "local",
        headers: {
          "Zotero-API-Version": "3",
          "Zotero-Allowed-Request": "true"
        }
      });
      if (response.ok) return;
      failures.push(`${endpoint}：HTTP ${response.status}`);
    } catch (error) {
      failures.push(`${endpoint}：${error.message || String(error)}`);
    }
  }
  throw new Error(`Chrome 无法访问 Zotero 本地接口。${failures.join("；")}`);
}

function render(status) {
  const labels = {
    ready: "已连接本机 Zotero",
    syncing: "正在同步 Zotero 文库…",
    unavailable: "Zotero 当前不可用",
    never_synced: "尚未建立索引"
  };
  stateElement.textContent = labels[status.state] || status.state;
  stateElement.className = `state ${status.state || ""}`;
  countElement.textContent = Number.isFinite(status.itemCount) ? status.itemCount.toLocaleString() : "—";
  syncedElement.textContent = status.lastSyncedAt
    ? new Date(status.lastSyncedAt).toLocaleString("zh-CN")
    : "—";
  errorElement.hidden = !status.error;
  errorElement.textContent = status.error || "";
}

async function load() {
  try {
    render(await send({ type: "GET_STATUS" }));
  } catch (error) {
    render({ state: "unavailable", error: error.message });
  }
}

refreshButton.addEventListener("click", async () => {
  refreshButton.disabled = true;
  refreshButton.textContent = "正在刷新…";
  try {
    await requestLocalNetworkAccess();
    render(await send({ type: "REFRESH_INDEX" }));
  } catch (error) {
    render({ state: "unavailable", error: error.message });
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = "刷新 Zotero 索引";
  }
});

load();
