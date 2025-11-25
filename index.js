export default {
  async fetch(request) {
    return new Response("Hello World from AquaWorldBot (ESM)", {
      headers: { "content-type": "text/plain" },
    });
  },
};
