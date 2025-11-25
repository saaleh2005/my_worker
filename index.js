export default {
  async fetch(request, env) {
    // فقط تست
    if (request.method === "GET") {
      return new Response("AquaWorldBot Worker Online");
    }

    // تلگرام باید POST بفرستد
    if (request.method === "POST") {
      const update = await request.json();

      // اگر پیام دارد
      if (update.message) {
        const chatId = update.message.chat.id;
        const text = update.message.text || "";

        // پاسخ ساده
        await sendMessage(env.TELEGRAM_TOKEN, chatId, "ربات روشن شد ✔️\nپیامت رسید!");
      }

      return new Response("OK");
    }

    return new Response("Method Not Allowed", { status: 405 });
  },
};

// تابع ارسال پیام به تلگرام
async function sendMessage(token, chatId, text) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
}
