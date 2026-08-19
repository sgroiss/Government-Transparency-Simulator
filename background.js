const BADGE_BG = "#000000";
const BADGE_FG = "#FFE14D";

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: BADGE_BG });
  if (chrome.action.setBadgeTextColor) {
    chrome.action.setBadgeTextColor({ color: BADGE_FG });
  }
});

// storage.local has no atomic increment and the worker handles messages
// concurrently, so serialise read-modify-write through one chain.
let writeChain = Promise.resolve();

function addToLifetime(delta) {
  writeChain = writeChain
    .then(async () => {
      if (delta <= 0) return;
      const { lifetime = 0 } = await chrome.storage.local.get({ lifetime: 0 });
      await chrome.storage.local.set({ lifetime: lifetime + delta });
    })
    .catch(() => {});
  return writeChain;
}

function badgeFor(total) {
  if (!total) return "";
  if (total > 999) return "999+";
  return String(total);
}

const tabKey = (tabId) => `tab:${tabId}`;

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type !== "redaction-count") return false;
  const tabId = sender.tab && sender.tab.id;
  if (tabId === undefined) return false;

  chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_BG });
  chrome.action.setBadgeText({ tabId, text: badgeFor(message.total) });
  // The popup reads the per-tab total from here; session storage survives a
  // service worker restart, a plain Map would not.
  chrome.storage.session.set({ [tabKey(tabId)]: message.total }).catch(() => {});
  addToLifetime(message.delta || 0);
  return false;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(tabKey(tabId)).catch(() => {});
});
