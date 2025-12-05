const GROG_API_URL = "https://api.grog.ai/v1/chat/completions";

export default {
  async fetch(request, env) {

    if (request.method === "GET") {
      return new Response("AquaWorldBot Worker is running ✔️", {
        headers: { "content-type": "text/plain" },
      });
    }

    if (request.method === "POST") {
      try {
        const update = await request.json();
        const message = update.message?.text || "";
        const chatId = update.message?.chat?.id;

        if (!chatId || !message) return new Response("No message", { status: 200 });

        // فقط وقتی کاربر ربات رو تگ کرد
        const botUsername = "@AquaWorldir_bot";
        if (!message.includes(botUsername)) return new Response("Bot not mentioned", { status: 200 });

        const userMessage = message.replace(botUsername, "").trim();

        // فراخوانی API Grog
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

        let replyText = "متأسفم، پاسخ در دسترس نیست.";

        try {
          const data = await grogResponse.json();
          if (data.choices && data.choices[0].message && data.choices[0].message.content) {
            replyText = data.choices[0].message.content;
          }
        } catch(e) {
          console.error("Grog JSON parse error:", e);
        }

        // ارسال پاسخ به تلگرام
        await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: replyText })
        });

        return new Response("OK");
      } catch (err) {
        console.error("Worker error:", err);
        return new Response("Internal Server Error", { status: 500 });
      }
    }

    return new Response("Method Not Allowed", { status: 405 });
  }
};
