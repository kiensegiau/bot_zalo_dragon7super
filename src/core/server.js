const http = require("http");

function createServer(api) {
  const { host, port } = global.config.server || {};
  if (!host || !port) {
    throw new Error("Thiếu cấu hình server.host/port trong config/default.yml");
  }

  const allowedGroupId = process.env.ALLOWED_GROUP_ID || (global.config && global.config.allowed_group_id) || "1096161385895708787";

  const server = http.createServer(async (req, res) => {
    // CORS đơn giản
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      return res.end();
    }

    if (req.method !== "POST" || req.url !== "/send") {
      res.statusCode = 404;
      return res.end(JSON.stringify({ error: "Not Found" }));
    }

    try {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      await new Promise((resolve) => req.on("end", resolve));

      let payload;
      try {
        payload = JSON.parse(body || "{}");
      } catch (_) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "Body must be JSON" }));
      }

      const { threadId, type = "Group", message } = payload;
      if (!threadId || (!message && typeof message !== "string")) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "Missing threadId or message" }));
      }

      const { ThreadType } = require("zca-js");
      const threadType = ThreadType.Group;
      const msgPayload = typeof message === "string" ? { msg: message } : message;

      // Chỉ cho phép gửi tới đúng group được cấu hình
      if (String(threadId) !== String(allowedGroupId)) {
        res.statusCode = 403;
        return res.end(JSON.stringify({ error: "Forbidden: threadId not allowed" }));
      }

      const result = await api.sendMessage(msgPayload, String(allowedGroupId), threadType);

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, result }));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err?.message || String(err) }));
    }
  });

  server.listen(port, host, () => {
    console.log(`Send server listening at http://${host}:${port}`);
  });

  return server;
}

module.exports = { createServer };


