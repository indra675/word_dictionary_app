// -----------------------------------------------------------------------
// Where the FastAPI backend is running. If you start it with
//   uvicorn main:app --reload
// it defaults to http://127.0.0.1:8000 — change this if yours differs.
// -----------------------------------------------------------------------
const API_BASE = "http://127.0.0.1:8001";

// -------------------- Elements --------------------
const entriesEl = document.getElementById("entries");
const emptyStateEl = document.getElementById("emptyState");
const loadingStateEl = document.getElementById("loadingState");
const statusStripEl = document.getElementById("statusStrip");
const searchInputEl = document.getElementById("searchInput");
const guideFirstEl = document.getElementById("guideFirst");
const guideLastEl = document.getElementById("guideLast");
const entryCountEl = document.getElementById("entryCount");

const scrimEl = document.getElementById("scrim");
const cardFormEl = document.getElementById("cardForm");
const entryFormEl = document.getElementById("entryForm");
const formLabelEl = document.getElementById("formLabel");
const wordInputEl = document.getElementById("wordInput");
const meaningInputEl = document.getElementById("meaningInput");
const openAddBtn = document.getElementById("openAddBtn");
const cancelBtn = document.getElementById("cancelBtn");
const saveBtn = document.getElementById("saveBtn");

// -------------------- State --------------------
let allWords = [];      // full list from the server, sorted A→Z
let editingWord = null; // the word currently being edited, or null when adding

// -------------------- Status messages --------------------
let statusTimer = null;
function showStatus(message, kind) {
  statusStripEl.textContent = message;
  statusStripEl.className = "status" + (kind ? ` is-${kind}` : "");
  clearTimeout(statusTimer);
  if (kind !== "error") {
    statusTimer = setTimeout(() => {
      statusStripEl.textContent = "";
      statusStripEl.className = "status";
    }, 3500);
  }
}

// -------------------- API helpers --------------------
async function apiRequest(path, options) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (err) {
    throw new Error(
      "Can't reach the server. Is uvicorn running at " + API_BASE + "?"
    );
  }

  let data = null;
  try {
    data = await response.json();
  } catch (_) {
    // no body — fine for some responses
  }

  if (!response.ok) {
    const detail = (data && data.detail) || `Request failed (${response.status})`;
    throw new Error(detail);
  }
  return data;
}

const api = {
  list: () => apiRequest("/words"),
  add: (word, meaning) =>
    apiRequest(`/words/${encodeURIComponent(word)}`, {
      method: "POST",
      body: JSON.stringify({ meaning }),
    }),
  update: (word, meaning) =>
    apiRequest(`/words/${encodeURIComponent(word)}`, {
      method: "PUT",
      body: JSON.stringify({ meaning }),
    }),
  remove: (word) =>
    apiRequest(`/words/${encodeURIComponent(word)}`, { method: "DELETE" }),
};

// -------------------- Rendering --------------------
function currentQuery() {
  return searchInputEl.value.trim().toLowerCase();
}

function visibleWords() {
  const q = currentQuery();
  const filtered = q
    ? allWords.filter(
        (w) =>
          w.word.toLowerCase().includes(q) ||
          w.meaning.toLowerCase().includes(q)
      )
    : allWords;
  return [...filtered].sort((a, b) => a.word.localeCompare(b.word));
}

function render() {
  const words = visibleWords();

  entriesEl.innerHTML = "";
  words.forEach((entry, i) => {
    entriesEl.appendChild(buildEntryEl(entry, i + 1));
  });

  emptyStateEl.hidden = words.length !== 0;
  if (words.length === 0 && currentQuery()) {
    emptyStateEl.querySelector(".empty__title").textContent = "No matches on this page.";
    emptyStateEl.querySelector(".empty__body").textContent =
      "Try a different word, or add a new entry.";
  } else {
    emptyStateEl.querySelector(".empty__title").textContent = "This page is blank.";
    emptyStateEl.querySelector(".empty__body").textContent =
      "Add your first word to begin the lexicon.";
  }

  guideFirstEl.textContent = words.length ? words[0].word : "—";
  guideLastEl.textContent = words.length ? words[words.length - 1].word : "—";
  entryCountEl.textContent = `${allWords.length} ${allWords.length === 1 ? "entry" : "entries"}`;
}

function buildEntryEl(entry, index) {
  const li = document.createElement("li");
  li.className = "entry";

  const idx = document.createElement("span");
  idx.className = "entry__index";
  idx.textContent = String(index).padStart(2, "0");

  const word = document.createElement("h2");
  word.className = "entry__word";
  word.textContent = entry.word;

  const actions = document.createElement("div");
  actions.className = "entry__actions";

  const editBtn = document.createElement("button");
  editBtn.className = "btn--icon";
  editBtn.type = "button";
  editBtn.textContent = "edit";
  editBtn.setAttribute("aria-label", `Edit ${entry.word}`);
  editBtn.addEventListener("click", () => openForm("edit", entry));

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn--icon danger";
  deleteBtn.type = "button";
  deleteBtn.textContent = "delete";
  deleteBtn.setAttribute("aria-label", `Delete ${entry.word}`);
  deleteBtn.addEventListener("click", () => handleDelete(entry.word));

  actions.append(editBtn, deleteBtn);

  const meaning = document.createElement("p");
  meaning.className = "entry__meaning";
  meaning.textContent = entry.meaning;

  li.append(idx, word, actions, meaning);
  return li;
}

// -------------------- Loading data --------------------
async function loadWords() {
  loadingStateEl.hidden = false;
  emptyStateEl.hidden = true;
  entriesEl.innerHTML = "";
  try {
    const data = await api.list();
    allWords = data.sort((a, b) => a.word.localeCompare(b.word));
    render();
  } catch (err) {
    showStatus(err.message, "error");
    allWords = [];
    render();
  } finally {
    loadingStateEl.hidden = true;
  }
}

// -------------------- Form (add / edit) --------------------
function openForm(mode, entry) {
  editingWord = mode === "edit" ? entry.word : null;
  formLabelEl.textContent = mode === "edit" ? `Editing “${entry.word}”` : "New entry";
  wordInputEl.value = mode === "edit" ? entry.word : "";
  meaningInputEl.value = mode === "edit" ? entry.meaning : "";
  wordInputEl.disabled = mode === "edit"; // word is the primary key — don't let it change
  saveBtn.textContent = mode === "edit" ? "Save changes" : "Save entry";

  scrimEl.hidden = false;
  cardFormEl.hidden = false;
  cardFormEl.setAttribute("aria-hidden", "false");
  (mode === "edit" ? meaningInputEl : wordInputEl).focus();
}

function closeForm() {
  scrimEl.hidden = true;
  cardFormEl.hidden = true;
  cardFormEl.setAttribute("aria-hidden", "true");
  entryFormEl.reset();
  wordInputEl.disabled = false;
  editingWord = null;
}

openAddBtn.addEventListener("click", () => openForm("add"));
cancelBtn.addEventListener("click", closeForm);
scrimEl.addEventListener("click", closeForm);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !cardFormEl.hidden) closeForm();
});

entryFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const word = wordInputEl.value.trim();
  const meaning = meaningInputEl.value.trim();
  if (!word || !meaning) return;

  saveBtn.disabled = true;
  try {
    if (editingWord) {
      await api.update(editingWord, meaning);
      showStatus(`“${editingWord}” updated.`, "ok");
    } else {
      await api.add(word, meaning);
      showStatus(`“${word}” added.`, "ok");
    }
    closeForm();
    await loadWords();
  } catch (err) {
    showStatus(err.message, "error");
  } finally {
    saveBtn.disabled = false;
  }
});

// -------------------- Delete --------------------
async function handleDelete(word) {
  const confirmed = window.confirm(`Remove “${word}” from the lexicon?`);
  if (!confirmed) return;
  try {
    await api.remove(word);
    showStatus(`“${word}” deleted.`, "ok");
    await loadWords();
  } catch (err) {
    showStatus(err.message, "error");
  }
}

// -------------------- Search --------------------
searchInputEl.addEventListener("input", render);

// -------------------- Init --------------------
loadWords();
