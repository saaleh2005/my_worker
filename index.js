export default {  
  async fetch(request, env) {  
    // فقط برای تست — وقتی آدرس Worker را در مرورگر باز می‌کنی  
    if (request.method === "GET") {  
      return new Response("AquaWorldBot Worker is running ✔️", {  
        headers: { "content-type": "text/plain" },  
      });  
    }  
  
    // برای Webhook تلگرام    
    if (request.method === "POST") {    
      const update = await request.json();    
  
      if (update.message) {    
        const chatId = update.message.chat.id;    
        const text = "ربات فعاله ✔️";    
  
        await fetch(`https://api.telegram.org/bot8434421974:AAH_WzRuji__zGT91cUvPQMgZLtkkTBBKq4/sendMessage`, {    
          method: "POST",    
          headers: { "content-type": "application/json" },    
          body: JSON.stringify({    
            chat_id: chatId,    
            text: text,    
          }),    
        });    
      }    
  
      return new Response("OK");    
    }    
  
    return new Response("Method Not Allowed", { status: 405 });  
  },  
};
