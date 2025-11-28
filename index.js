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

        const chatId = update?.message?.chat?.id;
        const text = update?.message?.text;

        if (!chatId || !text) {
          return new Response("No message", { status: 200 });
        }

        // حذف تگ اگر وجود داشت — اما پیام حتی بدون تگ هم جواب داده می‌شود
        const botUsername = "@AquaWorldir_bot";
        let userMessage = text.replace(botUsername, "").trim();

        if (!userMessage) userMessage = text;

        // درخواست به HuggingFace — مدل T5 بهتره
        const hfResponse = await fetch(
          "https://api-inference.huggingface.co/models/google/flan-t5-large",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${env.HF_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inputs: userMessage
            }),
          }
        );

        let aiText = "متأسفم، جوابی در دسترس نیست.";

        const data = await hfResponse.json();

        // انواع حالت‌های خروجی برای مدل‌های HF
        if (Array.isArray(data) && data[0]) {
          if (data[0].generated_text) aiText = data[0].generated_text;
          else if (data[0].output_text) aiText = data[0].output_text;
        }

        // ارسال پیام به تلگرام
        await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: aiText,
          }),
        });

        return new Response("OK", { status: 200 });

      } catch (err) {
        return new Response("Internal Error", { status: 500 });
      }
    }

    return new Response("Method Not Allowed", { status: 405 });
  },
};
