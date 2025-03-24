import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// Create or open a global store named "pages"
const store = getStore("pages");

export default async function handler(req: Request, context: Context) {
  const url = new URL(req.url);
  const { pathname } = url;
  // The base path is /api/pages or /api/pages/...
  // If there's a sub-path, it should be the page ID (if any).
  // Netlify by default will pass the entire path to us.
  // We can parse it using standard string manipulation.

  // Example: /api/pages => [ '', 'api', 'pages' ]
  // Example: /api/pages/123 => [ '', 'api', 'pages', '123' ]
  const segments = pathname.split("/").filter(Boolean); // remove empty
  // segments[0] = 'api', segments[1] = 'pages', segments[2] = optional page ID

  const method = req.method.toUpperCase();

  // 1) If path === /api/pages (no ID)
  if (segments.length === 2) {
    // /api/pages
    if (method === "GET") {
      // List all pages in the store
      return listPages();
    } else if (method === "POST") {
      return createPage(req);
    } else {
      return new Response("Not allowed", { status: 405 });
    }
  }

  // 2) If path === /api/pages/:id
  if (segments.length === 3) {
    const pageId = decodeURIComponent(segments[2]);
    if (method === "GET") {
      return getPage(pageId);
    } else if (method === "PUT") {
      return updatePage(pageId, req);
    } else if (method === "DELETE") {
      return deletePage(pageId);
    }
  }

  return new Response("Not Found", { status: 404 });
}

// GET -> List all page IDs
async function listPages(): Promise<Response> {
  // We store each page with a key = the ID. So let's just list them:
  // The store.list() returns an array of { etag, key }, among other data.
  const { blobs } = await store.list();
  const keys = blobs.map((b) => b.key);
  // Return as JSON
  return new Response(JSON.stringify(keys), {
    headers: { "Content-Type": "application/json" },
  });
}

// POST -> Create new page
async function createPage(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content : "";

  // Generate a simple unique ID using the built-in crypto (Node 18+).
  const id = crypto.randomUUID();

  // Store the content in the "pages" store, key = id
  await store.set(id, content);

  const responseData = { id, content };
  return new Response(JSON.stringify(responseData), {
    headers: { "Content-Type": "application/json" },
    status: 201,
  });
}

// GET -> Retrieve a single page’s Markdown
async function getPage(pageId: string): Promise<Response> {
  const content = await store.get(pageId, { type: "text" });
  if (content === null) {
    return new Response(JSON.stringify({ error: "Page not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  // Return as JSON
  return new Response(JSON.stringify({ id: pageId, content }), {
    headers: { "Content-Type": "application/json" },
  });
}

// PUT -> Update a page’s content
async function updatePage(pageId: string, req: Request): Promise<Response> {
  const existingContent = await store.get(pageId, { type: "text" });
  if (existingContent === null) {
    return new Response(JSON.stringify({ error: "Page not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const newContent = typeof body.content === "string" ? body.content : "";

  await store.set(pageId, newContent);

  return new Response(JSON.stringify({ id: pageId, content: newContent }), {
    headers: { "Content-Type": "application/json" },
  });
}

// DELETE -> Remove a page
async function deletePage(pageId: string): Promise<Response> {
  await store.delete(pageId);
  return new Response(null, { status: 204 });
}

// Expose the function at /api/pages/*
export const config: Config = {
  path: ["/api/pages", "/api/pages/*"],
};
