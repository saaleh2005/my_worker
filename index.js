/**
 * AquaWorldBot - Cloudflare Worker
 * @AquaWorldir_bot
 */

export default {
  async fetch(req, env) {
    return handleRequest(req, env);
  }
};

async function handleRequest(req, env) {
  const url = new URL(req.url);

  if (req.method === "GET")
    return new Response("AquaWorldBot Worker running.");

  if (req.method !== "POST")
    return new Response("Method Not Allowed", { status: 405 });

  // وبهوک باید شامل secret باشد
  if (!url.pathname.includes("/" + env.WEBHOOK_SECRET))
    return new Response("Forbidden", { status: 403 });

  let body = {};
  try {
    body = await req.json();
  } catch {}

  if (body.message)
    await handleMessage(body.message, env);

  return new Response("ok");
}

/* ---------------------------- Helpers ---------------------------- */

async function tg(method, params, env) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });

  let json = {};
  try {
    json = await res.json();
  } catch {}

  if (!json.ok) console.log("TG ERROR:", method, json);
  return json;
}

async function callOpenAI(query, env, aquariumMode = false) {
  if (!env.OPENAI_API_KEY)
    return "کلید OpenAI تنظیم نشده.";

  const system = aquariumMode
    ? "You are an expert aquarium assistant. Answer in Persian."
    : "You are a helpful assistant. Answer in Persian.";

  const body = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: query }
    ]
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const json = await res.json().catch(() => null);
  return json?.choices?.[0]?.message?.content || "پاسخی دریافت نشد.";
}

/* ----------------------------- KV ----------------------------- */

async function getSettings(chatId, env) {
  const raw = await env.WARNINGS_KV.get(`settings:${chatId}`);
  if (!raw) {
    const defaults = {
      delete_links: true,
      delete_profanity: true,
      delete_media: false,
      anti_spam: true,
      welcome: true,
      ai_on_mention: true,
      ai_on_command: true,
      admins: env.ADMIN_IDS ? env.ADMIN_IDS.split(",").map(Number) : [],
      profanity_list: ["کیر","کس","سکس","حرومزاده","خفه‌شو","مزخرف"]
    };

    await env.WARNINGS_KV.put(`settings:${chatId}`, JSON.stringify(defaults));
    return defaults;
  }

  try { return JSON.parse(raw); } catch { return {}; }
}

async function saveSettings(chatId, settings, env) {
  await env.WARNINGS_KV.put(`settings:${chatId}`, JSON.stringify(settings));
}

async function getWarn(chatId, userId, env) {
  return Number(await env.WARNINGS_KV.get(`warn:${chatId}:${userId}`) || 0);
}

async function setWarn(chatId, userId, count, env) {
  await env.WARNINGS_KV.put(`warn:${chatId}:${userId}`, String(count));
}

async function clearWarn(chatId, userId, env) {
  await env.WARNINGS_KV.delete(`warn:${chatId}:${userId}`);
}

/* ---------------------------- Main ---------------------------- */

function isAdmin(id, settings) {
  return settings.admins.includes(Number(id));
}

async function handleMessage(msg, env) {
  const chatId = msg.chat.id;
  const from = msg.from;
  const text = msg.text || "";

  const settings = await getSettings(chatId, env);

  /* ---- Admin Commands ---- */
  if (text && isAdmin(from.id, settings)) {
    // تنظیم on/off
    const match = text.match(/^\/تنظیم\s+(\S+)\s+(on|off)/i);
    if (match) {
      const map = {
        "لینک": "delete_links",
        "فحش": "delete_profanity",
        "رسانه": "delete_media",
        "ضداسپم": "anti_spam",
        "هوش": "ai_on_mention",
        "دستوری": "ai_on_command",
        "خوشامد": "welcome"
      };

      const key = map[match[1]];
      settings[key] = match[2] === "on";

      await saveSettings(chatId, settings, env);
      await tg("sendMessage", {
        chat_id: chatId,
        text: `تنظیم ${match[1]} روی ${match[2]} شد.`
      }, env);
      return;
    }

    // بن
    if (text.startsWith("/بن") && msg.reply_to_message) {
      const user = msg.reply_to_message.from;
      await tg("banChatMember", { chat_id: chatId, user_id: user.id }, env);
      await tg("sendMessage", { chat_id: chatId, text: `کاربر بن شد.` }, env);
      return;
    }

    // سکوت
    const mm = text.match(/^\/سکوت\s*(\d+)?/);
    if (mm && msg.reply_to_message) {
      const sec = mm[1] ? Number(mm[1]) : 3600;
      const user = msg.reply_to_message.from;

      await tg("restrictChatMember", {
        chat_id: chatId,
        user_id: user.id,
        permissions: { can_send_messages: false },
        until_date: Math.floor(Date.now()/1000) + sec
      }, env);

      await tg("sendMessage", {
        chat_id: chatId,
        text: `${user.first_name} برای ${sec} ثانیه سکوت شد.`
      }, env);

      return;
    }
  }

  /* ---- Moderation ---- */
  if (!isAdmin(from.id, settings)) {
    // حذف لینک
    if (settings.delete_links && /(https?:\/\/|www\.|@)/.test(text))
      await tg("deleteMessage", { chat_id: chatId, message_id: msg.message_id }, env);

    // فحش
    for (const bad of settings.profanity_list)
      if (text.includes(bad))
        await tg("deleteMessage", { chat_id: chatId, message_id: msg.message_id }, env);
  }

  /* ---- AI ---- */
  const mention = text.includes("@AquaWorldir_bot");
  const ask = text.match(/^\/ask\s+(.+)/i);

  if ((mention && settings.ai_on_mention) || ask) {
    const query = ask ? ask[1] : text.replace("@AquaWorldir_bot", "").trim();

    const aqWords = ["ماهی","آکواریوم","ph","فیلتر","شریمپ","shrimp"];
    const isAq = aqWords.some(k => query.includes(k));

    const reply = await callOpenAI(query, env, isAq);

    await tg("sendMessage", {
      chat_id: chatId,
      text: reply,
      reply_to_message_id: msg.message_id
    }, env);
  }
                      }
