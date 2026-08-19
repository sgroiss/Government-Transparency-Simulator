// DEFAULT_TERMS comes from defaults.js, loaded before this file.

const MAX_TERMS = 200;
const MAX_TERM_LENGTH = 64;

const termsInput = document.getElementById("terms");
const saveBtn = document.getElementById("save-btn");
const resetBtn = document.getElementById("reset-btn");
const savedNote = document.getElementById("saved-note");

let noteTimer = null;

function parseTerms(raw) {
  const seen = new Set();
  const terms = [];
  for (const line of raw.split("\n")) {
    const term = line.trim().slice(0, MAX_TERM_LENGTH);
    if (!term) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
    if (terms.length >= MAX_TERMS) break;
  }
  return terms;
}

function showSaved() {
  savedNote.hidden = false;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => { savedNote.hidden = true; }, 2500);
}

async function save(terms) {
  await chrome.storage.sync.set({ terms });
  termsInput.value = terms.join("\n");
  showSaved();
}

saveBtn.addEventListener("click", () => {
  const terms = parseTerms(termsInput.value);
  // An empty registry redacts nothing; that is a valid, if naive, policy.
  save(terms);
});

resetBtn.addEventListener("click", () => save([...DEFAULT_TERMS]));

chrome.storage.sync.get({ terms: DEFAULT_TERMS }).then(({ terms }) => {
  termsInput.value = terms.join("\n");
});
