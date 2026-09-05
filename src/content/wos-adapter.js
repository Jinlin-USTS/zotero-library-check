(function initWosAdapter(scope) {
  "use strict";

  const TITLE_SELECTORS = [
    'a[data-ta="title-link"]',
    'a[data-ta="summary-record-title-link"]',
    "app-summary-title a",
    "#FullRTa-fullRecordtitle-0",
    "a.snowplow-full-record",
    'a[href*="/wos/woscc/full-record/"]',
    'a[href*="/full-record/"]'
  ];
  const CONTAINER_SELECTORS = [
    '[data-ta="search-record"]',
    '[data-ta="summary-record"]',
    '[data-ta="full-record"]',
    "app-summary-record",
    "div.summary-record",
    "app-full-record",
    "app-record",
    "wos-record",
    "article",
    "li"
  ];
  const TRANSLATION_NODE_SELECTOR = [
    "[data-immersive-translate-translation-element-mark]",
    ".immersive-translate-target-wrapper",
    ".immersive-translate-target-inner",
    ".immersive-translate-target-translation-block-wrapper",
    ".immersive-translate-target-translation-inline-wrapper",
    '[class*="immersive-translate-target-translation"]'
  ].join(",");

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function meaningfulTitle(value) {
    const title = cleanText(value);
    if (title.length < 8) return "";
    if (/^(?:view|open|show|link|full record)$/i.test(title)) return "";
    return title;
  }

  function textWithoutTranslations(element) {
    const clone = element.cloneNode(true);
    for (const translated of clone.querySelectorAll(TRANSLATION_NODE_SELECTOR)) translated.remove();
    return meaningfulTitle(clone.textContent);
  }

  function extractTitleCandidates(titleElement) {
    const candidates = [
      titleElement.dataset.zlcOriginalTitle,
      textWithoutTranslations(titleElement),
      titleElement.getAttribute("aria-label"),
      titleElement.getAttribute("title"),
      titleElement.textContent
    ]
      .map(meaningfulTitle)
      .filter(Boolean);
    const unique = [];
    const seen = new Set();
    for (const candidate of candidates) {
      const normalized = PaperMatcherCore.normalizeTitle(candidate);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      unique.push(candidate);
    }
    if (unique[0] && !titleElement.dataset.zlcOriginalTitle) {
      // Dataset attributes are not translated by Immersive Translate, so this
      // preserves the original title if our content script runs first.
      titleElement.dataset.zlcOriginalTitle = unique[0];
    }
    return unique;
  }

  function uniqueElements(elements) {
    return [...new Set(elements)];
  }

  function findTitleElements(root = document) {
    const elements = TITLE_SELECTORS.flatMap((selector) => [...root.querySelectorAll(selector)]);
    return uniqueElements(elements).filter((element) =>
      !element.closest(TRANSLATION_NODE_SELECTOR) && cleanText(element.textContent).length >= 8
    );
  }

  function findContainer(titleElement) {
    for (const selector of CONTAINER_SELECTORS) {
      const container = titleElement.closest(selector);
      if (container && cleanText(container.textContent).length < 15000) return container;
    }
    let current = titleElement.parentElement;
    for (let depth = 0; current && depth < 5; depth += 1, current = current.parentElement) {
      if (cleanText(current.textContent).length >= 40) return current;
    }
    return titleElement.parentElement || titleElement;
  }

  function metaContent(names) {
    for (const name of names) {
      const element = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
      if (element && element.content) return cleanText(element.content);
    }
    return "";
  }

  function firstText(container, selectors) {
    for (const selector of selectors) {
      const element = container.querySelector(selector);
      if (element) {
        const value = cleanText(element.textContent);
        if (value) return value;
      }
    }
    return "";
  }

  function extractPaper(titleElement) {
    const container = findContainer(titleElement);
    const containerText = cleanText(container.textContent);
    const metaTitle = meaningfulTitle(metaContent(["citation_title", "dc.Title"]));
    const titleCandidates = extractTitleCandidates(titleElement);
    if (metaTitle) titleCandidates.unshift(metaTitle);
    const deduplicatedTitles = titleCandidates.filter((candidate, index, values) => {
      const normalized = PaperMatcherCore.normalizeTitle(candidate);
      return values.findIndex((value) => PaperMatcherCore.normalizeTitle(value) === normalized) === index;
    });
    const title = deduplicatedTitles[0] || "";
    const doi =
      PaperMatcherCore.extractDoi(containerText) ||
      PaperMatcherCore.extractDoi(metaContent(["citation_doi", "dc.Identifier"]));
    const firstAuthor = firstText(container, [
      '[data-ta*="author"]',
      '[class*="author"]',
      'a[href*="author-record"]'
    ]) || metaContent(["citation_author", "dc.Creator"]);
    const year = PaperMatcherCore.extractYear(containerText) ||
      PaperMatcherCore.extractYear(metaContent(["citation_publication_date", "dc.Date"]));
    return { title, alternateTitles: deduplicatedTitles.slice(1), doi, firstAuthor, year };
  }

  function makeKey(paper) {
    return paper.doi || `${PaperMatcherCore.normalizeTitle(paper.title)}|${paper.year}`;
  }

  scope.WosAdapter = { extractPaper, extractTitleCandidates, findTitleElements, makeKey };
})(globalThis);
