const HF_URL = "https://router.huggingface.co/microsoft/phi-4";

export default {
  async fetch(request, env) {

    if (request.method === "POST") {

      let update = await request.json();
      let message = update.message?.text || "";
      let chatId = update.message?.chat?.id;

      if (!chatId) return new Response("No chat ID");

      // ارسال پیام کاربر به HuggingFace Router (رایگان)
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

      let reply = "متأسفم، پاسخی دریافت نشد.";

      try {
        const data = await hfRes.json();

        // فرمت Router معمولا این شکلیه:
        // { generated_text: "..." }
        if (data?.generated_text) reply = data.generated_text;

        // بعضی مدل‌ها خروجی آرایه میدن
        if (Array.isArray(data) && data[0]?.generated_text)
          reply = data[0].generated_text;

      } catch (err) {}

      // ارسال پاسخ به تلگرام
      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: reply,
        }),
      });

      return new Response("OK");
    }

    return new Response("Bot is running ✔️");
  }
};
