export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      return new Response("AquaWorldBot Worker is running ✔️", {
        headers: { "content-type": "text/plain" },
      });
    }

    if (request.method === "POST") {
      const update = await request.json();
      const botUsername = "@AquaWorldir_bot";
      let userMessage = "";

      if (update.message && update.message.text) {
        if (update.message.text.includes(botUsername)) {
          userMessage = update.message.text.replace(botUsername, "").trim();
        }
      }

      if (userMessage) {
        const chatId = update.message.chat.id;
        let text = "در حال پردازش پاسخ...";
        let photoUrl = "";

        try {
          // فراخوانی Hugging Face
          const hfResponse = await fetch(
            "https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct",
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${env.HF_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                inputs: `سوال تخصصی آکواریوم، ماهی‌ها و نیمه‌آبزی‌ها: ${userMessage}\nلطفاً پاسخ را به فارسی، جامع، آموزشی و با نکات کاربردی بده. اگر لازم است لینک منابع و عکس مرتبط اضافه کن. پاسخ را با Markdown قالب‌بندی کن.`,
                parameters: { max_new_tokens: 500, temperature: 0.7, top_p: 0.9 },
              }),
            }
          );

          const json = await hfResponse.json();
          if (json && json[0] && json[0].generated_text) {
            const fullText = json[0].generated_text.trim();

            // اگر لینک عکس در پاسخ موجود بود استخراج کن
            const imgMatch = fullText.match(/https?:\/\/\S+\.(?:jpg|jpeg|png|gif)/i);
            if (imgMatch) {
              photoUrl = imgMatch[0];
              text = fullText.replace(photoUrl, "").trim();
            } else {
              text = fullText;
            }
          } else if (json && json.error) {
            text = `خطا در پاسخ‌دهی: ${json.error}`;
          }
        } catch (e) {
          console.error("HF Error:", e);
          text = "خطا در اتصال به Hugging Face. لطفاً بعداً دوباره امتحان کنید.";
        }

        // اگر عکس وجود داشت اول عکس رو بفرست
        if (photoUrl) {
          await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendPhoto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption: text, parse_mode: "Markdown" }),
          });
        } else {
          await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
          });
        }
      }

      return new Response("OK");
    }

    return new Response("Method Not Allowed", { status: 405 });
  },
};
