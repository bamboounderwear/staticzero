import { getStore } from "@netlify/blobs";

export default async function handler(req) {
  try {
    // Initialize the global store for pages.
    const store = getStore("pages");
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (req.method === "GET") {
      if (id) {
        // Retrieve a specific page. Pages are stored with keys formatted as "page/{id}.md"
        const key = `page/${id}.md`;
        const content = await store.get(key, { type: "text" });
        if (!content) {
          return new Response(JSON.stringify({ error: "Page not found" }), { 
            status: 404, 
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ id, content }), { 
          status: 200, 
          headers: { "Content-Type": "application/json" }
        });
      } else {
        // List all pages with keys starting with "page/"
        const result = await store.list({ prefix: "page/" });
        const pages = result.blobs.map(blob => {
          // Extract the page id from key "page/{id}.md"
          const key = blob.key;
          const pageId = key.substring("page/".length, key.length - ".md".length);
          return { id: pageId, etag: blob.etag };
        });
        return new Response(JSON.stringify(pages), { 
          status: 200, 
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    if (req.method === "PUT" || req.method === "POST") {
      // Read the JSON body containing { id, title, content }
      const body = await req.json();
      // Use provided id or generate one if not provided.
      const pageId = body.id || `page-${Date.now()}`;
      const title = body.title || "";
      const content = body.content || "";
      // Prepend a markdown title if available.
      const markdown = title ? `# ${title}\n\n${content}` : content;
      const key = `page/${pageId}.md`;
      await store.set(key, markdown, { metadata: { title } });
      return new Response(
        JSON.stringify({ message: "Page saved", id: pageId }), 
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (req.method === "DELETE") {
      // For DELETE requests, the page id must be provided as a query parameter.
      if (!id) {
        return new Response(
          JSON.stringify({ error: "No id provided" }), 
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      const key = `page/${id}.md`;
      await store.delete(key);
      return new Response(
        JSON.stringify({ message: "Page deleted" }), 
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }), 
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
