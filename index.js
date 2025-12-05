export default {
  async fetch(request, env) {

    if (request.method === "POST") {
      const update = await request.json();
      const msg = update.message?.text;
      const chatId = update.message?.chat?.id;

      if (!msg || !chatId) {
        return new Response("No message");
      }

      // --- ارسال به OpenAI ---
      let aiText = "متأسفم، جوابی در دسترس نیست.";

      try {
        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "user", content: msg }
            ]
          }),
        });

        const data = await aiRes.json();

        if (data?.choices?.[0]?.message?.content) {
          aiText = data.choices[0].message.content;
        } else if (data?.error) {
          aiText = "❗ OpenAI ERROR:\n" + JSON.stringify(data.error);
        }

      } catch (err) {
        aiText = "خطا در اتصال به OpenAI";
      }


      // --- ارسال پاسخ به تلگرام ---
      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: aiText }),
      });

      return new Response("OK");
    }

    return new Response("Bot is Running ✔️");
  },
};
