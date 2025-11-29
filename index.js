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
        body: JSON.stringify({ inputs: message }),
      });

      let text = "متأسفم، پاسخ در دسترس نیست.";

      // DEBUG MODE: هر چیزی HF برگرداند مستقیم چاپ کن
      let raw = await hfRes.text();  // مهم: به جای json از text میگیریم
      let parsed;

      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        parsed = raw;
      }

      let finalMessage = "";

      // اگر generated_text بود
      if (Array.isArray(parsed) && parsed[0]?.generated_text) {
        finalMessage = parsed[0].generated_text;
      }
      else if (parsed?.generated_text) {
        finalMessage = parsed.generated_text;
      }
      else {
        // اگر error برگرداند خود متن را چاپ کن
        finalMessage = "HF RAW:\n" + raw;
      }

      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: finalMessage }),
      });

      return new Response("OK");
    }

    return new Response("AquaWorldBot Debug Mode ✔️");
  },
};
