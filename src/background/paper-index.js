(function initPaperIndex(scope) {
  "use strict";

  const DB_NAME = "zotero-library-check";
  const DB_VERSION = 1;
  const STORE_NAME = "papers";

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("dois", "dois", { multiEntry: true });
        store.createIndex("normalizedTitle", "normalizedTitle", { unique: false });
        store.createIndex("titleHead", "titleHead", { unique: false });
      };
    });
  }

  function requestValue(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error("索引事务已中止"));
    });
  }

  function valuesFromExtra(extra, pattern) {
    const matches = [];
    const text = String(extra || "");
    let match;
    while ((match = pattern.exec(text))) matches.push(match[1]);
    return matches;
  }

  function compactItem(entry) {
    const data = entry && entry.data ? entry.data : entry;
    if (!data || !data.key || !data.title) return null;
    if (["attachment", "note", "annotation"].includes(data.itemType)) return null;

    const doiValues = [data.DOI, data.url, data.extra]
      .map(PaperMatcherCore.extractDoi)
      .filter(Boolean);
    const firstCreator = Array.isArray(data.creators) ? data.creators[0] : null;
    const firstAuthor = firstCreator
      ? firstCreator.lastName || firstCreator.name || firstCreator.firstName || ""
      : "";
    const libraryType = entry && entry.library ? entry.library.type : "user";
    const libraryId = entry && entry.library ? entry.library.id : 0;

    return {
      id: `${libraryType}:${libraryId}:${data.key}`,
      key: data.key,
      libraryType,
      libraryId,
      itemType: data.itemType || "",
      title: data.title,
      normalizedTitle: PaperMatcherCore.normalizeTitle(data.title),
      titleHead: PaperMatcherCore.titleHead(data.title),
      dois: [...new Set(doiValues)],
      pmids: valuesFromExtra(data.extra, /\bPMID\s*:\s*(\d+)\b/gi),
      arxivIds: valuesFromExtra(data.extra, /\barXiv\s*:\s*([^\s;]+)/gi),
      year: PaperMatcherCore.extractYear(data.date),
      firstAuthor,
      publicationTitle: data.publicationTitle || data.bookTitle || "",
      dateAdded: data.dateAdded || ""
    };
  }

  async function rebuild(entries) {
    const db = await openDatabase();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    let count = 0;
    for (const entry of entries) {
      const record = compactItem(entry);
      if (!record) continue;
      store.put(record);
      count += 1;
    }
    await transactionDone(transaction);
    db.close();
    return count;
  }

  async function indexMatches(indexName, value) {
    if (!value) return [];
    const db = await openDatabase();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const result = await requestValue(transaction.objectStore(STORE_NAME).index(indexName).getAll(value));
    db.close();
    return result;
  }

  async function match(paper) {
    const doi = PaperMatcherCore.normalizeDoi(paper.doi);
    if (doi) {
      const doiRecords = await indexMatches("dois", doi);
      if (doiRecords.length) return PaperMatcherCore.matchCandidate(paper, doiRecords);
    }

    const titles = [paper.title, ...(Array.isArray(paper.alternateTitles) ? paper.alternateTitles : [])]
      .filter(Boolean)
      .filter((title, index, values) => {
        const normalized = PaperMatcherCore.normalizeTitle(title);
        return values.findIndex((value) => PaperMatcherCore.normalizeTitle(value) === normalized) === index;
      });
    let bestPossible = null;

    for (const title of titles) {
      const candidate = { ...paper, title };
      const normalizedTitle = PaperMatcherCore.normalizeTitle(title);
      const exactRecords = await indexMatches("normalizedTitle", normalizedTitle);
      if (!exactRecords.length) continue;
      const result = PaperMatcherCore.matchCandidate(candidate, exactRecords);
      if (result.status === "exists") return result;
      if (!bestPossible || result.score > bestPossible.score) bestPossible = result;
    }

    for (const title of titles) {
      const candidate = { ...paper, title };
      const nearbyRecords = await indexMatches("titleHead", PaperMatcherCore.titleHead(title));
      if (!nearbyRecords.length) continue;
      const result = PaperMatcherCore.matchCandidate(candidate, nearbyRecords);
      if (result.status === "exists") return result;
      if (result.status === "possible" && (!bestPossible || result.score > bestPossible.score)) {
        bestPossible = result;
      }
    }

    return bestPossible || { status: "not_found", reason: "no_match", score: 0 };
  }

  async function matchMany(papers) {
    return Promise.all(papers.map(match));
  }

  scope.PaperIndex = { compactItem, match, matchMany, rebuild };
})(globalThis);
