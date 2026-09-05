(function initCore(scope) {
  "use strict";

  const DOI_PATTERN = /10\.\d{4,9}\/[-._;()/:a-z0-9]+/i;

  function normalizeDoi(value) {
    if (!value) return "";
    let text = String(value).trim();
    try {
      text = decodeURIComponent(text);
    } catch (_) {
      // Keep malformed percent-encoded input usable.
    }
    text = text
      .replace(/^\s*(?:doi\s*:\s*)/i, "")
      .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
    const match = text.match(DOI_PATTERN);
    return match ? match[0].replace(/[\s.,;:)}\]>]+$/g, "").toLowerCase() : "";
  }

  function extractDoi(value) {
    return normalizeDoi(value);
  }

  function normalizeTitle(value) {
    if (!value) return "";
    return String(value)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("en-US")
      .replace(/&/g, " and ")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function titleHead(value) {
    return normalizeTitle(value).replace(/\s/g, "").slice(0, 42);
  }

  function normalizeAuthor(value) {
    return normalizeTitle(value)
      .replace(/\b(?:dr|prof|phd|md)\b/g, "")
      .trim()
      .split(/[ ,]+/)[0] || "";
  }

  function extractYear(value) {
    const match = String(value || "").match(/\b(18|19|20|21)\d{2}\b/);
    return match ? match[0] : "";
  }

  function tokenSimilarity(left, right) {
    const a = new Set(normalizeTitle(left).split(" ").filter(Boolean));
    const b = new Set(normalizeTitle(right).split(" ").filter(Boolean));
    if (!a.size || !b.size) return 0;
    let overlap = 0;
    for (const token of a) if (b.has(token)) overlap += 1;
    return (2 * overlap) / (a.size + b.size);
  }

  function matchCandidate(paper, records) {
    const paperDoi = normalizeDoi(paper.doi);
    if (paperDoi) {
      const exactDoi = records.find((record) => (record.dois || []).includes(paperDoi));
      if (exactDoi) return { status: "exists", reason: "doi", score: 1, item: exactDoi };
    }

    const normalized = normalizeTitle(paper.title);
    if (!normalized) return { status: "not_found", reason: "insufficient_metadata", score: 0 };

    const exactTitle = records.find((record) => record.normalizedTitle === normalized);
    if (exactTitle) {
      const yearMatches = Boolean(paper.year && exactTitle.year && paper.year === exactTitle.year);
      const authorMatches = Boolean(
        paper.firstAuthor &&
        exactTitle.firstAuthor &&
        normalizeAuthor(paper.firstAuthor) === normalizeAuthor(exactTitle.firstAuthor)
      );
      return {
        status: yearMatches || authorMatches ? "exists" : "possible",
        reason: "title",
        score: yearMatches || authorMatches ? 0.99 : 0.93,
        item: exactTitle
      };
    }

    let best = null;
    for (const record of records) {
      const score = tokenSimilarity(paper.title, record.title);
      if (!best || score > best.score) best = { record, score };
    }
    if (best && best.score >= 0.92) {
      const yearMatches = !paper.year || !best.record.year || paper.year === best.record.year;
      const authorMatches =
        paper.firstAuthor &&
        best.record.firstAuthor &&
        normalizeAuthor(paper.firstAuthor) === normalizeAuthor(best.record.firstAuthor);
      if (yearMatches || authorMatches) {
        return { status: "possible", reason: "similar_title", score: best.score, item: best.record };
      }
    }

    return { status: "not_found", reason: "no_match", score: best ? best.score : 0 };
  }

  scope.PaperMatcherCore = {
    extractDoi,
    extractYear,
    matchCandidate,
    normalizeAuthor,
    normalizeDoi,
    normalizeTitle,
    titleHead,
    tokenSimilarity
  };
})(globalThis);
