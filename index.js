export default {
  async fetch(request, env) {
    // تست وقتی آدرس Worker را باز می‌کنی
    if (request.method === "GET") {
      return new Response("AquaWorldBot Worker is running ✔️", {
        headers: { "content-type": "text/plain" },
      });
    }

    // Webhook تلگرام
    if (request.method === "POST") {
      const update = await request.json();

      const botUsername = "@AquaWorldir_bot"; // آیدی ربات
      let userMessage = "";
      if (update.message && update.message.text) {
        if (update.message.text.includes(botUsername)) {
          userMessage = update.message.text.replace(botUsername, "").trim();
        }
      }

      if (userMessage) {
        const chatId = update.message.chat.id;

        // فراخوانی Hugging Face مدل Falcon یا هر مدل instruct
        const hfResponse = await fetch(
          "https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${env.HF_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inputs: `سوال: ${userMessage}`,
            }),
          }
        );

        let text = "متأسفم،اا پاسخ در دسترس نیست.";
        try {
          const json = await hfResponse.json();
          if (json && json.generated_text) {
            text = json.generated_text;
          } else if (json && json[0] && json[0].generated_text) {
            text = json[0].generated_text;
          } else if (json && json[0] && json[0].text) {
            text = json[0].text;
          }
        } catch (e) {
          console.error("HF Error:", e);
        }

        // ارسال پاسخ به تلگرام
        await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text }),
        });
      }

      return new Response("OK");
    }

    return new Response("Method Not Allowed", { status: 405 });
  },
};
