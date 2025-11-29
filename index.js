const HF_URL = "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-0.5B-Instruct";

export default {
  async fetch(request, env) {

    if (request.method === "POST") {
      const update = await request.json();
      const message = update.message?.text || "";
      const chatId = update.message?.chat?.id;

      if (!chatId) return new Response("No chat id");

      // ارسال به HuggingFace
      const hfRes = await fetch(HF_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: message,
        }),
      });

      let text = "متأسفم، جوابی در دسترس نیست.";

      try {
        const data = await hfRes.json();
        if (data && data.generated_text) {
          text = data.generated_text;
        }
        if (Array.isArray(data) && data[0]?.generated_text) {
          text = data[0].generated_text;
        }
      } catch (e) {}

      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      });

      return new Response("OK");
    }

    return new Response("AquaWorldBot is Running ✔️");
  },
};
