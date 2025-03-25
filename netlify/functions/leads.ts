import { getStore } from "@netlify/blobs";

export default async function handler(req: Request): Promise<Response> {
  try {
    // Use a blob store named "leads"
    const store = getStore("leads");

    // List all stored leads (if needed)
    if (req.method === "GET") {
      const result = await store.list();
      const keys = result.blobs.map((blob) => blob.key);
      const leads = await Promise.all(
        keys.map(async (key) => {
          const data = await store.get(key, { type: "json" });
          return { id: key, ...data };
        })
      );
      return new Response(JSON.stringify(leads), { status: 200 });
    }

    // Save a new lead (the form will use this)
    if (req.method === "PUT") {
      const body = await req.json();
      // Use a unique key based on timestamp (or include an id from the client if you wish)
      const leadId = body.id || `lead-${Date.now()}`;
      await store.setJSON(leadId, body);
      return new Response(
        JSON.stringify({ message: "Lead saved", id: leadId }),
        { status: 200 }
      );
    }

    // Optionally, delete a lead
    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(
          JSON.stringify({ error: "No id provided" }),
          { status: 400 }
        );
      }
      await store.delete(id);
      return new Response(
        JSON.stringify({ message: "Lead deleted" }),
        { status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}
