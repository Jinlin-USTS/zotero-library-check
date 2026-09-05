const test = require("node:test");
const assert = require("node:assert/strict");

require("../src/shared/core.js");
const core = globalThis.PaperMatcherCore;

test("normalizes common DOI representations", () => {
  assert.equal(core.normalizeDoi("https://doi.org/10.1016/J.TEST.2025.001."), "10.1016/j.test.2025.001");
  assert.equal(core.normalizeDoi("doi: 10.1000/ABC)"), "10.1000/abc");
  assert.equal(core.normalizeDoi("no identifier"), "");
});

test("normalizes punctuation and accents in titles", () => {
  assert.equal(
    core.normalizeTitle("Café & Climate: A Review"),
    "cafe and climate a review"
  );
});

test("matches DOI before title", () => {
  const result = core.matchCandidate(
    { title: "Different title", doi: "10.1000/xyz" },
    [{ key: "A1", title: "Stored title", normalizedTitle: "stored title", dois: ["10.1000/xyz"] }]
  );
  assert.equal(result.status, "exists");
  assert.equal(result.reason, "doi");
});

test("matches normalized title with corroborating year", () => {
  const result = core.matchCandidate(
    { title: "A useful paper", year: "2024", firstAuthor: "Li" },
    [{
      key: "A2",
      title: "A Useful Paper",
      normalizedTitle: "a useful paper",
      dois: [],
      year: "2024",
      firstAuthor: "Li"
    }]
  );
  assert.equal(result.status, "exists");
  assert.equal(result.reason, "title");
});

test("reports an uncorroborated exact title as possible", () => {
  const result = core.matchCandidate(
    { title: "A useful paper" },
    [{
      key: "A2",
      title: "A Useful Paper",
      normalizedTitle: "a useful paper",
      dois: []
    }]
  );
  assert.equal(result.status, "possible");
});

test("does not turn a weak title similarity into a match", () => {
  const result = core.matchCandidate(
    { title: "Remote sensing of historic buildings", year: "2024" },
    [{
      key: "A3",
      title: "Protein folding in bacterial cells",
      normalizedTitle: "protein folding in bacterial cells",
      dois: [],
      year: "2024"
    }]
  );
  assert.equal(result.status, "not_found");
});
