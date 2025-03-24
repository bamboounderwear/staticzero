import { getStore, getDeployStore } from "@netlify/blobs";

// Updated getBlobStore function that supplies a deployID when using getDeployStore.
function getBlobStore(name) {
  if (Netlify.context && Netlify.context.deploy && Netlify.context.deploy.context === 'production') {
    return getStore(name);
  }
  // Use the deploy.id from the context if available; fallback to 'local'
  const deployID = (Netlify.context && Netlify.context.deploy && Netlify.context.deploy.id) || 'local';
  return getDeployStore({ name, deployID });
}

const store = getBlobStore("pages");

export default async function handler(req, context) {
  const url = new URL(req.url);
  const basePath = "/api/pages";
  // Get the relative path after the base (will be empty or "/{id}")
  const relativePath = url.pathname.slice(basePath.length);
  const id = relativePath.startsWith("/") ? relativePath.slice(1) : null;

  if (req.method === "GET") {
    if (!id) {
      // List all pages (all blob keys with prefix "page/")
      const list = await store.list({ prefix: "page/" });
      const pages = list.blobs.map(blob => {
        // Blob keys are formatted as "page/{id}.md"
        const key = blob.key;
        const pageId = key.substring("page/".length, key.length - ".md".length);
        return { id: pageId, etag: blob.etag };
      });
      return new Response(JSON.stringify({ pages }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      // Retrieve a specific page
      const key = `page/${id}.md`;
      const blob = await store.get(key, { type: "text" });
      if (blob === null) {
        return new Response(JSON.stringify({ error: "Page not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ id, content: blob }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  } else if (req.method === "POST") {
    // Create a new page. Expects JSON body: { id, title, content }
    const body = await req.json();
    const { id, title, content } = body;
    if (!id || !content) {
      return new Response(JSON.stringify({ error: "Missing id or content" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const key = `page/${id}.md`;
    // Prepend a markdown title if provided.
    const markdown = title ? `# ${title}\n\n${content}` : content;
    await store.set(key, markdown, { metadata: { title } });
    return new Response(JSON.stringify({ message: "Page created", id }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } else if (req.method === "PUT") {
    // Update an existing page (URL must include page ID)
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing page id in URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const body = await req.json();
    const { title, content } = body;
    if (!content) {
      return new Response(JSON.stringify({ error: "Missing content" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const key = `page/${id}.md`;
    const markdown = title ? `# ${title}\n\n${content}` : content;
    await store.set(key, markdown, { metadata: { title } });
    return new Response(JSON.stringify({ message: "Page updated", id }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } else if (req.method === "DELETE") {
    // Delete a page (URL must include page ID)
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing page id in URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const key = `page/${id}.md`;
    await store.delete(key);
    return new Response(JSON.stringify({ message: "Page deleted", id }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } else {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export const config = {
  path: "/api/pages/*"
};
