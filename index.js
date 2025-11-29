const HF_URL = "https://router.huggingface.co/inference";

export default {
  async fetch(request, env) {

    if (request.method === "POST") {
      const update = await request.json();
      const message = update.message?.text || "";
      const chatId = update.message?.chat?.id;

      if (!chatId) 
        return new Response("No chat id");

      // درخواست به HuggingFace
      const hfRes = await fetch(HF_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/Llama-3.2-1B-Instruct",
          input: message,
        }),
      });

      // 🔥 پاسخ خام HuggingFace به‌صورت متن → برای تست
      const rawText = await hfRes.text();

      // 🔎 سعی می‌کنیم JSON تشخیص دهیم
      let finalText = rawText;
      try {
        const json = JSON.parse(rawText);

        if (json.generated_text) {
          finalText = json.generated_text;
        } else if (json.error) {
          finalText = "❗ HF ERROR:\n" + JSON.stringify(json.error);
        }

      } catch (err) {
        finalText = "❗ RAW HF RESPONSE:\n" + rawText;
      }

      // ✉️ ارسال پاسخ
      await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: finalText
          })
        }
      );

      return new Response("OK");
    }

    return new Response("Telegram AI Bot Running ✔️");
  }
};
