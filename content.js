// DEFAULT_TERMS comes from defaults.js, injected ahead of this file.

// The punchline lives here. One line each, swap freely.
const CLEARANCE_LINES = [
  "CLASSIFIED — Level 5 clearance required. Your clearance: TAXPAYER.",
  "REDACTED pending review. Review scheduled for 2087.",
  "This information has been withheld to protect the innocent. And the others.",
  "Released in full. (Full is a matter of interpretation.)",
  "EXEMPTION (b)(7)(C) — would constitute an unwarranted invasion of privacy.",
  "Nothing to see here. Officially.",
  "The file exists. The file has always existed. The file is fine.",
  "Withheld in the interest of national vibes.",
  "This name appears on no list. There is no list.",
  "DECLASSIFIED — just kidding.",
];

const REDACTED_CLASS = "fbi-redacted";
const REVEALED_CLASS = "fbi-declassified";
const REVEAL_MS = 3000;

let redactRegex = null;
let enabled = true;
let pageTotal = 0;
let pendingDelta = 0;

function escapeRegex(source) {
  return source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Unicode lookarounds instead of \b: \b is ASCII-only, so umlauts and terms
// starting with a non-ASCII letter would never match.
//
// Each term also swallows an optional trailing "s" or "'s"/"’s" as part of
// the match, so genitive/possessive forms get redacted whole ("Trumps",
// "Trump's") instead of leaking the bare term with a stray "s" next to it.
// The trailing-letter boundary check still runs after that suffix, so
// unrelated words sharing the prefix ("Trumpet") are untouched.
function buildRegex(terms) {
  const cleaned = terms.map((term) => term.trim()).filter(Boolean);
  if (!cleaned.length) return null;
  const pattern = cleaned.map((term) => `${escapeRegex(term)}(?:['’]s|s)?`).join("|");
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}\\p{N}])`, "giu");
}

function clearanceLine() {
  return CLEARANCE_LINES[Math.floor(Math.random() * CLEARANCE_LINES.length)];
}

function redactTextNode(node) {
  if (!redactRegex || !node.parentNode) return 0;
  const text = node.nodeValue;
  if (!text || !text.trim()) return 0;

  redactRegex.lastIndex = 0;
  if (!redactRegex.test(text)) return 0;
  redactRegex.lastIndex = 0;

  const fragment = document.createDocumentFragment();
  let cursor = 0;
  let hits = 0;
  let match;

  while ((match = redactRegex.exec(text)) !== null) {
    if (match.index > cursor) {
      fragment.appendChild(document.createTextNode(text.slice(cursor, match.index)));
    }
    const bar = document.createElement("span");
    bar.className = REDACTED_CLASS;
    bar.textContent = match[0];
    bar.dataset.clearance = clearanceLine();
    fragment.appendChild(bar);
    cursor = match.index + match[0].length;
    hits++;
    if (match[0].length === 0) redactRegex.lastIndex++;
  }

  if (cursor < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(cursor)));
  }

  node.parentNode.replaceChild(fragment, node);
  return hits;
}

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "TITLE", "CODE", "PRE"]);

function shouldSkip(element) {
  if (!element) return true;
  if (SKIP_TAGS.has(element.nodeName)) return true;
  if (element.isContentEditable) return true;
  if (element.classList && element.classList.contains(REDACTED_CLASS)) return true;
  return false;
}

function walkNodes(root) {
  if (!root || !redactRegex) return 0;

  if (root.nodeType === Node.TEXT_NODE) {
    return shouldSkip(root.parentElement) ? 0 : redactTextNode(root);
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return 0;
  if (shouldSkip(root)) return 0;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return shouldSkip(node.parentElement) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });

  const queue = [];
  let current;
  while ((current = walker.nextNode())) queue.push(current);

  let hits = 0;
  for (const node of queue) hits += redactTextNode(node);
  return hits;
}

function report(hits) {
  if (!hits) return;
  pageTotal += hits;
  pendingDelta += hits;
  flushSoon();
}

let flushTimer = null;
function flushSoon() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    const delta = pendingDelta;
    pendingDelta = 0;
    chrome.runtime.sendMessage({ type: "redaction-count", total: pageTotal, delta }).catch(() => {});
  }, 250);
}

function unredactAll() {
  const bars = document.querySelectorAll(`.${REDACTED_CLASS}`);
  for (const bar of bars) {
    bar.replaceWith(document.createTextNode(bar.textContent));
  }
  document.body.normalize();
  pageTotal = 0;
  pendingDelta = 0;
  chrome.runtime.sendMessage({ type: "redaction-count", total: 0, delta: 0 }).catch(() => {});
}

// Our own replaceChild calls re-enter the observer; the REDACTED_CLASS check in
// shouldSkip is what keeps that from looping.
const observer = new MutationObserver((mutations) => {
  if (!enabled) return;
  let hits = 0;
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) hits += walkNodes(node);
  }
  report(hits);
});

function start() {
  const hits = walkNodes(document.body);
  report(hits);
  if (!hits) {
    // Overwrite the previous page's per-tab count even when this page is clean.
    chrome.runtime.sendMessage({ type: "redaction-count", total: 0, delta: 0 }).catch(() => {});
  }
  observer.observe(document.body, { childList: true, subtree: true });
}

document.addEventListener(
  "click",
  (event) => {
    const bar = event.target.closest && event.target.closest(`.${REDACTED_CLASS}`);
    if (!bar) return;
    // Redactions are often inside links; reveal without navigating away.
    event.preventDefault();
    event.stopPropagation();
    bar.classList.add(REVEALED_CLASS);
    clearTimeout(bar._resealTimer);
    bar._resealTimer = setTimeout(() => bar.classList.remove(REVEALED_CLASS), REVEAL_MS);
  },
  true
);

// Settings arrive via storage rather than tabs.sendMessage, which would need
// host permissions on top of the content script match.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;

  if (changes.enabled) {
    if (changes.enabled.newValue) {
      location.reload();
    } else {
      enabled = false;
      observer.disconnect();
      unredactAll();
    }
    return;
  }

  if (changes.terms && enabled) location.reload();
});

chrome.storage.sync.get({ enabled: true, terms: DEFAULT_TERMS }).then((settings) => {
  enabled = settings.enabled;
  if (!enabled) return;
  redactRegex = buildRegex(settings.terms);
  if (!redactRegex) return;
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
});
