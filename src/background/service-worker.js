importScripts("../shared/core.js", "zotero-client.js", "paper-index.js");

const STATUS_KEY = "zoteroLibraryStatus";
let refreshPromise = null;

async function saveStatus(update) {
  const current = (await chrome.storage.local.get(STATUS_KEY))[STATUS_KEY] || {};
  const next = { ...current, ...update };
  await chrome.storage.local.set({ [STATUS_KEY]: next });
  return next;
}

async function getStatus() {
  return (await chrome.storage.local.get(STATUS_KEY))[STATUS_KEY] || {
    state: "never_synced",
    itemCount: 0
  };
}

async function refreshIndex(force = false) {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    await saveStatus({ state: "syncing", error: "" });
    try {
      const connection = await ZoteroLocalClient.connect();
      const current = await getStatus();
      const libraryVersion = await ZoteroLocalClient.getLibraryVersion(connection);
      if (
        !force &&
        current.state === "ready" &&
        current.serverId === connection.serverId &&
        current.libraryVersion === libraryVersion
      ) {
        return saveStatus({ lastCheckedAt: new Date().toISOString() });
      }

      const response = await ZoteroLocalClient.getTopLevelItems(connection);
      const itemCount = await PaperIndex.rebuild(response.items);
      return saveStatus({
        state: "ready",
        error: "",
        serverId: connection.serverId,
        libraryVersion: response.libraryVersion,
        itemCount,
        lastCheckedAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString()
      });
    } catch (error) {
      return saveStatus({
        state: "unavailable",
        error: error && error.message ? error.message : String(error),
        lastCheckedAt: new Date().toISOString()
      });
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function ensureIndex() {
  const status = await getStatus();
  const checkedAt = status.lastCheckedAt ? Date.parse(status.lastCheckedAt) : 0;
  if (status.state !== "ready" || Date.now() - checkedAt > 60_000) {
    return refreshIndex(false);
  }
  return status;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("refresh-zotero-index", { periodInMinutes: 5 });
  refreshIndex(true);
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("refresh-zotero-index", { periodInMinutes: 5 });
  refreshIndex(false);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "refresh-zotero-index") refreshIndex(false);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (!message || !message.type) throw new Error("缺少消息类型");
    if (message.type === "GET_STATUS") return getStatus();
    if (message.type === "REFRESH_INDEX") return refreshIndex(true);
    if (message.type === "MATCH_PAPERS") {
      const status = await ensureIndex();
      if (status.state !== "ready") return { status, results: [] };
      const papers = Array.isArray(message.papers) ? message.papers.slice(0, 200) : [];
      return { status, results: await PaperIndex.matchMany(papers) };
    }
    throw new Error(`未知消息类型：${message.type}`);
  })()
    .then((result) => sendResponse({ ok: true, data: result }))
    .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
  return true;
});
