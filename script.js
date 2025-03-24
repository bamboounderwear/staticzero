// Very minimal front-end code. 
// Communicates with our Serverless Function at /api/pages

const pageList = document.getElementById("pagesContainer");
const createPageBtn = document.getElementById("createPageBtn");
const editor = document.getElementById("editor");
const editorTitle = document.getElementById("editorTitle");
const contentArea = document.getElementById("contentArea");
const saveBtn = document.getElementById("saveBtn");
const deleteBtn = document.getElementById("deleteBtn");

let currentPageId = null;

// ----- Fetch & display the list of all pages -----
async function loadPages() {
  const resp = await fetch("/api/pages", { method: "GET" });
  if (!resp.ok) {
    alert("Failed to load pages");
    return;
  }
  const pages = await resp.json();
  pageList.innerHTML = "";
  pages.forEach((p) => {
    const div = document.createElement("div");
    div.className = "page-item";
    div.textContent = p;
    div.addEventListener("click", () => loadPageContent(p));
    pageList.appendChild(div);
  });
}

async function loadPageContent(pageId) {
  const resp = await fetch(`/api/pages/${encodeURIComponent(pageId)}`, {
    method: "GET",
  });
  if (!resp.ok) {
    alert("Unable to load page: " + pageId);
    return;
  }
  const data = await resp.json();
  currentPageId = pageId;
  editorTitle.textContent = "Editing: " + pageId;
  contentArea.value = data.content || "";
  editor.classList.remove("hidden");
}

// ----- Create a new page -----
createPageBtn.addEventListener("click", async () => {
  // Create it empty
  const resp = await fetch("/api/pages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "# New Page\n\nStart typing..." }),
  });
  if (!resp.ok) {
    alert("Failed to create page");
    return;
  }
  const data = await resp.json();
  // Reload list, then open the new page
  await loadPages();
  loadPageContent(data.id);
});

// ----- Save changes to the current page -----
saveBtn.addEventListener("click", async () => {
  if (!currentPageId) return;
  const resp = await fetch(`/api/pages/${encodeURIComponent(currentPageId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: contentArea.value }),
  });
  if (!resp.ok) {
    alert("Failed to save");
    return;
  }
  alert("Saved!");
});

// ----- Delete the current page -----
deleteBtn.addEventListener("click", async () => {
  if (!currentPageId) return;
  if (!confirm("Are you sure you want to delete this page?")) return;
  const resp = await fetch(`/api/pages/${encodeURIComponent(currentPageId)}`, {
    method: "DELETE",
  });
  if (!resp.ok) {
    alert("Failed to delete");
    return;
  }
  alert("Page deleted.");
  editor.classList.add("hidden");
  currentPageId = null;
  await loadPages();
});

// Load the list on page load
loadPages();
