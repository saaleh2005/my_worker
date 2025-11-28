export default {
  async fetch(request, env) {
    // فقط برای تست وقتی آدرس Worker را در مرورگر باز می‌کنید
    if (request.method === "GET") {
      return new Response("AquaWorldBot Worker is running ✔️", {
        headers: { "content-type": "text/plain" },
      });
    }

    if (request.method === "POST") {
      try {
        const update = await request.json();
        console.log("Update received:", JSON.stringify(update));

        const botUsername = "@AquaWorldir_bot"; // آیدی ربات
        let userMessage = "";

        if (update.message && update.message.text) {
          if (update.message.text.includes(botUsername)) {
            userMessage = update.message.text.replace(botUsername, "").trim();
            console.log("User message:", userMessage);
          }
        }

        if (!userMessage) {
          console.log("No user message to process");
          return new Response("No user message", { status: 200 });
        }

        const chatId = update.message.chat.id;

        // فراخوانی Hugging Face برای پاسخ‌دهی
        console.log("Sending request to Hugging Face...");
        const hfResponse = await fetch(
          "https://api-inference.huggingface.co/models/gpt2", // می‌تونی مدل دقیق‌تر بذاری
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${env.HF_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: userMessage }),
          }
        );

        console.log("HF Response status:", hfResponse.status);
        let text = "متأسفم، باسخ در دسترس نیست.";
        try {
          const json = await hfResponse.json();
          console.log("HF Response JSON:", JSON.stringify(json));
          if (json && json[0] && json[0].generated_text) {
            text = json[0].generated_text;
          }
        } catch (e) {
          console.error("HF parsing error:", e);
        }

        // ارسال پاسخ به تلگرام
        await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text }),
        });

        return new Response("OK", { status: 200 });
      } catch (err) {
        console.error("Worker error:", err);
        return new Response("Internal Server Error", { status: 500 });
      }
    }

    return new Response("Method Not Allowed", { status: 405 });
  },
};
