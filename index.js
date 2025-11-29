// HuggingFace Router URL
const HF_URL = "https://router.huggingface.co/inference";

export default {
  async fetch(request, env) {
    if (request.method === "POST") {
      const update = await request.json();
      const message = update.message?.text || "";
      const chatId = update.message?.chat?.id;

      if (!chatId) return new Response("No chat id");

      // 1) ارسال درخواست به HuggingFace Router
      const hfRes = await fetch(HF_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.HF_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "meta-llama/Llama-3.2-1B-Instruct",
          input: message
        })
      });

      let text = "متأسفم، جوابی در دسترس نیست.";

      try {
        const data = await hfRes.json();

        if (data?.generated_text) {
          text = data.generated_text;
        }

        if (data?.error) {
          text = "❗ HF ERROR:\n" + JSON.stringify(data.error);
        }
      } catch (err) {
        text = "❗ JSON Parse Error";
      }

      // 2) ارسال پاسخ به تلگرام
      await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text
          })
        }
      );

      return new Response("OK");
    }

    return new Response("Telegram AI Bot Running ✔️");
  }
};
