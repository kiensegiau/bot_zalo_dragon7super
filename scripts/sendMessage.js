const fs = require("fs");
const path = require("path");
const YAML = require("yaml");
const { ThreadType } = require("zca-js");
const login = require("../src/core/auth/login");

(async () => {
  try {
    const [,, threadIdArg, ...messageParts] = process.argv;
    if (!threadIdArg) {
      console.error("Thiếu threadId. Cách dùng: node scripts/sendMessage.js <threadId> [message]");
      process.exit(1);
    }
    const threadId = String(threadIdArg);
    const message = messageParts.length ? messageParts.join(" ") : "Test message";

    // Nạp cấu hình vào global như app
    const configPath = path.join(__dirname, "../config/default.yml");
    const fileContent = fs.readFileSync(configPath, "utf8");
    const config = YAML.parse(fileContent);
    global.config = config;

    // Đăng nhập (ưu tiên cookie, fallback QR nếu bật login_qrcode)
    const api = await login();

    // Gửi tin nhắn tới nhóm
    const result = await api.sendMessage({ msg: message, ttl: 0 }, threadId, ThreadType.Group);
    console.log("Đã gửi tin nhắn:", { threadId, result });
    process.exit(0);
  } catch (err) {
    console.error("Lỗi khi gửi tin nhắn:", err?.message || err);
    process.exit(1);
  }
})();


