const GROG_API_URL = "https://api.grog.ai/v1/chat/completions";

export default {
  async fetch(request, env) {
    if (request.method === "POST") {
      const update = await request.json();
      const message = update.message?.text || "";
      const chatId = update.message?.chat?.id;

      if (!chatId || !message) return new Response("No message", { status: 200 });

      const userMessage = message.replace("@AquaWorldir_bot", "").trim();

      const grogResponse = await fetch(GROG_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.GROG_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{ role: "user", content: userMessage }]
        })
      });

      const rawText = await grogResponse.text();
      console.log("Raw Grog response:", rawText);

      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: rawText })
      });

      return new Response("OK");
    }

    return new Response("Method Not Allowed", { status: 405 });
  }
};
