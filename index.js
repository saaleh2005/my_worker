const HF_URL = "https://router.huggingface.co/hf-inference/models/Qwen/Qwen2.5-0.5B-Instruct";

export default {
  async fetch(request, env) {
    if (request.method === "POST") {
      const update = await request.json();

      const message = update.message?.text;
      const chatId = update.message?.chat?.id;

      if (!message || !chatId) {
        return new Response("No message", { status: 200 });
      }

      // ارسال پیام به HuggingFace Router
      const hfRes = await fetch(HF_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: message,
          parameters: {
            max_new_tokens: 150,
            temperature: 0.7,
            repetition_penalty: 1.1,
          }
        }),
      });

      let text = "متأسفم، جوابی در دسترس نیست.";

      try {
        const data = await hfRes.json();

        // روش جدید خروجی Router
        if (data.generated_text) text = data.generated_text;
        if (data[0]?.generated_text) text = data[0].generated_text;
      } catch (e) {}

      // ارسال پاسخ به تلگرام
      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text
        }),
      });

      return new Response("OK");
    }

    return new Response("AquaWorldBot is Running ✔️");
  },
};
