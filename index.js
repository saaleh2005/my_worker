export default {
  async fetch(request, env) {
    if (request.method === "POST") {
      const update = await request.json();
      const message = update.message?.text || "";
      const chatId = update.message?.chat?.id;

      if (!chatId) return new Response("No chat id");

      // --- ارسال پیام به OpenRouter ---
      const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OR_API_KEY}`, // کلید OpenRouter
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: env.MODEL, // مدل انتخاب‌شده
          messages: [{ role: "user", content: message }],
        }),
      });

      let text = "❗ OpenRouter ERROR";

      const raw = await orRes.text();

      try {
        const data = JSON.parse(raw);

        if (data.choices?.[0]?.message?.content) {
          text = data.choices[0].message.content;
        } else {
          text = `❗ RAW ERROR:\n${raw}`;
        }
      } catch {
        text = `❗ JSON ERROR:\n${raw}`;
      }

      // --- ارسال پیام به تلگرام ---
      await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      });

      return new Response("OK");
    }

    return new Response("AquaWorldBot is Running ✔️");
  },
};
