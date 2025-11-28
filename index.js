export default {
  async fetch(request, env) {

    // تست GET
    if (request.method === "GET") {
      return new Response("AquaWorldBot Worker is running ✔️", {
        headers: { "content-type": "text/plain" },
      });
    }

    // هندل وبهوک تلگرام
    if (request.method === "POST") {
      try {
        const update = await request.json();

        // پیام کاربر
        const message = update?.message?.text;
        const chatId = update?.message?.chat?.id;

        if (!message || !chatId) {
          return new Response("No message", { status: 200 });
        }

        // فراخوانی مدل بهتر HuggingFace — کاملاً رایگان
        const hfResponse = await fetch(
          "https://api-inference.huggingface.co/models/google/flan-t5-large",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${env.HF_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inputs: `پاسخ بده: ${message}`,
            }),
          }
        );

        let text = "متأسفم، باسخ در دسترس نیست.";

        try {
          const data = await hfResponse.json();
          if (data && data[0] && data[0].generated_text) {
            text = data[0].generated_text;
          } else if (data && data[0] && data[0].generated_text === undefined && data[0].output_text) {
            text = data[0].output_text;
          }
        } catch (_) {}

        // ارسال پاسخ به تلگرام
        await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text }),
        });

        return new Response("OK", { status: 200 });

      } catch (err) {
        return new Response("Internal Error", { status: 500 });
      }
    }

    return new Response("Method Not Allowed", { status: 405 });
  },
};
