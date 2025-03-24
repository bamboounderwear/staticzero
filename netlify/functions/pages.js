import { getStore } from "@netlify/blobs";

export default async function handler(req) {
  try {
    // Use the global store for pages
    const store = getStore("pages");

    if (req.method === "GET") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");

      if (id) {
        // Retrieve a single page by key "page/{id}.md"
        const key = `page/${id}.md`;
        const content = await store.get(key, { type: "text" });
        if (!content) {
          return new Response(JSON.stringify({ error: "Page not found" }), { status: 404 });
        }
        return new Response(JSON.stringify({ id, content }), { status: 200 });
      } else {
        // List all pages (keys formatted as "page/{id}.md")
        const result = await store.list({ prefix: "page/" });
        const pages = result.blobs.map(blob => {
          const key = blob.key;
          const pageId = key.substring("page/".length, key.length - ".md".length);
          return { id: pageId, etag: blob.etag };
        });
        return new Response(JSON.stringify(pages), { status: 200 });
      }
    }

    if (req.method === "PUT" || req.method === "POST") {
      const body = await req.json();
      // Use provided id or generate a new one if missing
      const id = body.id || `page-${Date.now()}`;
      const title = body.title || "";
      const content = body.content || "";
      // Prepend a markdown title if provided
      const markdown = title ? `# ${title}\n\n${content}` : content;
      const key = `page/${id}.md`;
      await store.set(key, markdown, { metadata: { title } });
      return new Response(JSON.stringify({ message: "Page saved", id }), { status: 200 });
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(JSON.stringify({ error: "No id provided" }), { status: 400 });
      }
      const key = `page/${id}.md`;
      await store.delete(key);
      return new Response(JSON.stringify({ message: "Page deleted" }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
