(function initZoteroClient(scope) {
  "use strict";

  // Prefer the numeric loopback address. Some VPN/PAC configurations proxy the
  // hostname `localhost`, while 127.0.0.1 is normally kept on the local machine.
  const BASE_URLS = ["http://127.0.0.1:23119/api", "http://localhost:23119/api"];
  const REQUEST_HEADERS = {
    "Zotero-API-Version": "3",
    // Zotero intentionally drops browser-originated requests without this
    // opt-in header. It is required even for read-only Local API calls.
    "Zotero-Allowed-Request": "true"
  };

  async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function connect() {
    const failures = [];
    for (const baseUrl of BASE_URLS) {
      try {
        const response = await fetchWithTimeout(`${baseUrl}/`, { headers: REQUEST_HEADERS });
        if (response.status === 403) {
          throw new Error("Zotero 已运行，但尚未允许本机应用访问");
        }
        if (!response.ok) throw new Error(`Zotero 返回 HTTP ${response.status}`);
        return {
          baseUrl,
          serverId: response.headers.get("Zotero-Server-ID") || "legacy-local-server"
        };
      } catch (error) {
        failures.push(`${baseUrl}: ${error && error.message ? error.message : String(error)}`);
      }
    }
    throw new Error(
      `无法连接本机 Zotero。请启动 Zotero 并启用本地 API。详细信息：${failures.join("；")}`
    );
  }

  async function getLibraryVersion(connection) {
    const response = await fetchWithTimeout(
      `${connection.baseUrl}/users/0/items/top?format=versions&limit=1`,
      { headers: REQUEST_HEADERS }
    );
    if (!response.ok) throw new Error(`读取 Zotero 文库版本失败（HTTP ${response.status}）`);
    return response.headers.get("Last-Modified-Version") || "0";
  }

  async function getTopLevelItems(connection) {
    const items = [];
    // The local API accepts larger pages than the hosted Web API. Keeping this
    // explicit avoids one request per 100 items for larger literature libraries.
    const pageSize = 1000;
    let start = 0;
    let total = Infinity;

    while (start < total) {
      const url = new URL(`${connection.baseUrl}/users/0/items/top`);
      url.searchParams.set("format", "json");
      url.searchParams.set("includeTrashed", "0");
      url.searchParams.set("limit", String(pageSize));
      url.searchParams.set("start", String(start));
      const response = await fetchWithTimeout(url.toString(), { headers: REQUEST_HEADERS }, 15000);
      if (!response.ok) throw new Error(`读取 Zotero 文库失败（HTTP ${response.status}）`);
      const page = await response.json();
      if (!Array.isArray(page)) throw new Error("Zotero 返回了无法识别的数据格式");
      items.push(...page);
      total = Number(response.headers.get("Total-Results") || page.length);
      if (page.length === 0) break;
      start += page.length;
    }

    return {
      items,
      libraryVersion: String(await getLibraryVersion(connection))
    };
  }

  scope.ZoteroLocalClient = { connect, getLibraryVersion, getTopLevelItems };
})(globalThis);
