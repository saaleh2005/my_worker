export default {
  async fetch(request, env) {
    if (request.method === "POST") {
      const update = await request.json();
      const message = update.message?.text || "";
      const chatId = update.message?.chat?.id;

      if (!chatId) return new Response("No chat id");

      try {
        // ارسال پیام به OpenRouter
        const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-3.5-turbo",
            messages: [{ role: "user", content: message }],
          }),
        });

        const data = await aiRes.json();

        if (!data.choices || !data.choices[0]?.message?.content) {
          return new Response("❗ OpenRouter Error: " + JSON.stringify(data));
        }

        const text = data.choices[0].message.content;

        // ارسال جواب به تلگرام
        await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text }),
        });

        return new Response("OK");
      } catch (err) {
        return new Response("❗ ERROR: " + err.toString());
      }
    }

    return new Response("Bot is running ✔️");
  }
}
