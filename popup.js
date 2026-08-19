const DONATE_URL = "https://buymeacoffee.com/innocentump";

const FINEPRINT = [
  "No documents required redaction on this page. Suspicious.",
  "A limited number of materials have been withheld in the public interest.",
  "This page has been reviewed. Extensively.",
  "Significant redactions applied. The public interest was served vigorously.",
  "This page is now 100% transparent, in the technical sense.",
];

const toggle = document.getElementById("toggle");
const statusText = document.getElementById("status-text");
const pageCount = document.getElementById("page-count");
const lifetimeCount = document.getElementById("lifetime-count");
const fineprint = document.getElementById("fineprint");
const donateBtn = document.getElementById("donate-btn");
const optionsBtn = document.getElementById("options-btn");

donateBtn.href = DONATE_URL;

function fineprintFor(count) {
  if (count === 0) return FINEPRINT[0];
  if (count < 3) return FINEPRINT[1];
  if (count < 10) return FINEPRINT[2];
  if (count < 40) return FINEPRINT[3];
  return FINEPRINT[4];
}

function paintStatus(enabled) {
  document.body.classList.toggle("off", !enabled);
  statusText.textContent = enabled ? "Active" : "Suspended";
  toggle.checked = enabled;
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function load() {
  const [{ enabled }, { lifetime = 0 }] = await Promise.all([
    chrome.storage.sync.get({ enabled: true }),
    chrome.storage.local.get({ lifetime: 0 }),
  ]);

  paintStatus(enabled);
  lifetimeCount.textContent = lifetime.toLocaleString("en-US");

  let total = 0;
  if (enabled) {
    const tab = await activeTab();
    // Stays 0 where no content script runs: chrome:// pages, the store, new tabs.
    if (tab && tab.id !== undefined) {
      const key = `tab:${tab.id}`;
      const stored = await chrome.storage.session.get(key).catch(() => ({}));
      total = stored[key] || 0;
    }
  }

  pageCount.textContent = total.toLocaleString("en-US");
  fineprint.textContent = enabled ? fineprintFor(total) : "Transparency suspended. Enjoy the unfiltered internet while it lasts.";
}

// The content script picks this up via storage.onChanged.
toggle.addEventListener("change", async () => {
  const enabled = toggle.checked;
  await chrome.storage.sync.set({ enabled });
  paintStatus(enabled);
  setTimeout(load, 200);
});

optionsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

load();
