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
        const chatType = update.message?.chat?.type; // "private" یا "group"

        if (!chatId || !message) return new Response("No message", { status: 200 });

        // فقط وقتی کاربر ربات رو در گروه تگ کرد، یا در چت خصوصی
        const botUsername = "@AquaWorldir_bot";
        if (chatType === "group" && !message.includes(botUsername)) {
          return new Response("Bot not mentioned in group", { status: 200 });
        }

        // پیام کاربر برای Grog
        let userMessage = message;
        if (chatType === "group") {
          userMessage = message.replace(botUsername, "").trim();
        }

        // فراخوانی Grog API
        const grogResponse = await fetch(GROG_API_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.GROG_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4", // مطمئن شو مدل درست باشه
            messages: [{ role: "user", content: userMessage }]
          })
        });

        let replyText = "متأسفم، پاسخ در دسترس نیست.";

        if (!grogResponse.ok) {
          const errorText = await grogResponse.text();
          console.error("Grog API error:", grogResponse.status, errorText);
        } else {
          try {
            const data = await grogResponse.json();
            console.log("Grog response:", data);

            // بررسی دقیق پاسخ
            if (data.choices && data.choices[0]?.message?.content) {
              replyText = data.choices[0].message.content;
            } else {
              console.error("Unexpected Grog response structure:", data);
            }
          } catch (e) {
            console.error("Grog JSON parse error:", e);
          }
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
