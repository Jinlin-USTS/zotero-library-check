(function startContentScript() {
  "use strict";

  const BADGE_CLASS = "zlc-match-badge";
  const SUMMARY_ID = "zlc-page-summary";
  let scanTimer = null;
  let scanRunning = false;

  function runtimeMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        if (!response || !response.ok) return reject(new Error(response && response.error || "扩展后台无响应"));
        resolve(response.data);
      });
    });
  }

  function itemUrl(item) {
    if (!item) return "";
    if (item.libraryType === "group") return `zotero://select/groups/${item.libraryId}/items/${item.key}`;
    return `zotero://select/library/items/${item.key}`;
  }

  function badgeLabel(result) {
    if (result.status === "exists") return "✓ Zotero 已有";
    if (result.status === "possible") return "≈ 可能已有";
    return "＋ 未收录";
  }

  function renderBadge(titleElement, result) {
    let badge = titleElement.parentElement && titleElement.parentElement.querySelector(`:scope > .${BADGE_CLASS}`);
    if (!badge) {
      badge = document.createElement("button");
      badge.type = "button";
      badge.className = BADGE_CLASS;
      titleElement.insertAdjacentElement("afterend", badge);
    }
    badge.dataset.status = result.status;
    badge.textContent = badgeLabel(result);
    const detail = result.item
      ? `${result.item.title}\n匹配依据：${result.reason}\n点击在 Zotero 中定位`
      : "当前本地 Zotero 索引中未找到";
    badge.title = detail;
    badge.onclick = () => {
      const url = itemUrl(result.item);
      if (url) location.href = url;
    };
  }

  function renderUnavailable(elements, message) {
    for (const titleElement of elements) {
      const paper = WosAdapter.extractPaper(titleElement);
      titleElement.dataset.zlcPaperKey = WosAdapter.makeKey(paper);
      titleElement.dataset.zlcUnavailable = "true";
      renderBadge(titleElement, { status: "unavailable" });
      const badge = titleElement.parentElement.querySelector(`:scope > .${BADGE_CLASS}`);
      badge.textContent = "! Zotero 未连接";
      badge.title = message;
    }
    renderSummary([], message);
  }

  function renderSummary(results, error = "") {
    let summary = document.getElementById(SUMMARY_ID);
    if (!summary) {
      summary = document.createElement("div");
      summary.id = SUMMARY_ID;
      document.documentElement.appendChild(summary);
    }
    if (error) {
      summary.dataset.state = "error";
      summary.textContent = `Zotero 检查：${error}`;
      return;
    }
    const pageStatuses = [...document.querySelectorAll(`.${BADGE_CLASS}`)]
      .map((badge) => badge.dataset.status)
      .filter(Boolean);
    const statuses = pageStatuses.length ? pageStatuses : results.map((result) => result.status);
    const counts = statuses.reduce((value, status) => {
      value[status] = (value[status] || 0) + 1;
      return value;
    }, {});
    summary.dataset.state = "ready";
    summary.textContent = `Zotero 检查：已识别 ${statuses.length} 篇｜已有 ${counts.exists || 0}｜可能 ${counts.possible || 0}｜未收录 ${counts.not_found || 0}`;
  }

  async function scan() {
    if (scanRunning) return;
    scanRunning = true;
    try {
      const titleElements = WosAdapter.findTitleElements();
      const entries = titleElements.map((element) => {
        const paper = WosAdapter.extractPaper(element);
        return { element, paper, key: WosAdapter.makeKey(paper) };
      });
      const pendingEntries = entries.filter(({ element, key }) => element.dataset.zlcPaperKey !== key);
      if (!pendingEntries.length) return;
      const pending = pendingEntries.map(({ element }) => element);
      const papers = pendingEntries.map(({ paper }) => paper);
      const data = await runtimeMessage({ type: "MATCH_PAPERS", papers });
      if (!data.status || data.status.state !== "ready") {
        renderUnavailable(pending, data.status && data.status.error || "Zotero 索引尚未就绪");
        return;
      }
      pendingEntries.forEach(({ element, key }, index) => {
        element.dataset.zlcPaperKey = key;
        delete element.dataset.zlcUnavailable;
        renderBadge(element, data.results[index] || { status: "not_found" });
      });
      renderSummary(data.results);
    } catch (error) {
      renderUnavailable(WosAdapter.findTitleElements(), error.message || String(error));
    } finally {
      scanRunning = false;
    }
  }

  function scheduleScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 250);
  }

  new MutationObserver(scheduleScan).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  window.addEventListener("focus", () => {
    for (const element of document.querySelectorAll('[data-zlc-unavailable="true"]')) {
      delete element.dataset.zlcPaperKey;
      delete element.dataset.zlcUnavailable;
    }
    scheduleScan();
  });
  window.addEventListener("popstate", scheduleScan);
  scheduleScan();
})();
